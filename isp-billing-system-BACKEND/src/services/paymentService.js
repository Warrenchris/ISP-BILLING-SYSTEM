const { Payment, Subscription, DataPlan, User, Invoice, InvoiceItem, sequelize } = require('../models');
const { PaymentStatus, SubscriptionStatus, InvoiceStatus } = require('../config/constants');
const MpesaService = require('./mpesaService');
const mpesaService = new MpesaService();

class PaymentService {
    /**
     * Initiate a payment for a subscription
     * @param {string} userId - ID of the user
     * @param {string} subscriptionId - ID of the subscription
     * @param {string} phoneNumber - Phone number to charge
     * @returns {Promise<Object>} Payment result
     */
    async initiateSubscriptionPayment(userId, subscriptionId, phoneNumber) {
        if (!subscriptionId || !phoneNumber) {
            throw { statusCode: 400, message: 'Subscription ID and phone number are required' };
        }

        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            // Find subscription with lock to prevent race conditions (optional but good for strict consistency)
            const subscription = await Subscription.findOne({
                where: { id: subscriptionId, userId },
                include: [
                    { model: DataPlan, as: 'plan' },
                    { model: User, as: 'User' }
                ],
                transaction
            });

            if (!subscription) {
                throw { statusCode: 404, message: 'Subscription not found' };
            }

            // Check if subscription is already active and paid
            if (subscription.status === SubscriptionStatus.ACTIVE && subscription.nextBillingDate > new Date()) {
                throw { statusCode: 400, message: 'Subscription is already active and paid' };
            }

            // Check for pending payments
            const pendingPayment = await Payment.findOne({
                where: {
                    subscriptionId,
                    status: [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
                },
                transaction
            });

            if (pendingPayment && !pendingPayment.isExpired()) {
                throw {
                    statusCode: 400,
                    message: 'A payment is already in progress for this subscription',
                    payment: {
                        id: pendingPayment.id,
                        reference: pendingPayment.reference,
                        status: pendingPayment.status,
                        amount: pendingPayment.getFormattedAmount()
                    }
                };
            }

            const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);

            // Create payment record
            const payment = await Payment.create({
                userId,
                subscriptionId,
                amount: subscription.plan.price,
                phoneNumber: formattedPhone,
                paymentType: 'subscription',
                description: `Payment for ${subscription.plan.name} subscription`,
                reference: `SUB-${subscription.subscriptionNumber}-${Date.now()}`,
                metadata: {
                    planId: subscription.plan.id,
                    planName: subscription.plan.name,
                    subscriptionNumber: subscription.subscriptionNumber
                }
            }, { transaction });

            // Initiate STK Push (External API call should ideally be outside transaction to avoid holding lock too long, 
            // but we need to update the payment record with checkout ID. 
            // Compromise: Keep it here but be aware of timeout risks, or update after commit if architectural complexity allows.)
            // better pattern: Create Payment -> Commit -> Call API -> Update Payment
            // For now, we'll keep it simple as per original logic flow, but acknowledge the external call.

            let stkPushResponse;
            try {
                stkPushResponse = await mpesaService.initiateSTKPush({
                    phoneNumber: payment.phoneNumber,
                    amount: payment.amount,
                    accountReference: payment.reference,
                    transactionDesc: payment.description
                });
            } catch (stkError) {
                // If STK push fails, we should rollback the payment creation
                throw { statusCode: 500, message: stkError.message || 'Failed to initiate M-Pesa STK Push' };
            }

            // Update payment with STK Push details
            await payment.update({
                checkoutRequestId: stkPushResponse.CheckoutRequestID,
                merchantRequestId: stkPushResponse.MerchantRequestID,
                status: PaymentStatus.PENDING
            }, { transaction });

            await transaction.commit();

            return {
                success: true,
                message: 'Payment initiated successfully. Please check your phone for M-Pesa prompt.',
                payment: {
                    id: payment.id,
                    reference: payment.reference,
                    amount: payment.getFormattedAmount(),
                    status: payment.status,
                    checkoutRequestId: payment.checkoutRequestId,
                    phoneNumber: payment.phoneNumber,
                    subscription: {
                        id: subscription.id,
                        number: subscription.subscriptionNumber,
                        plan: subscription.plan.name
                    }
                }
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Create a cash payment (Admin)
     */
    async createCashPayment(userId, amount, reference, description, subscriptionId, adminUserId) {
        if (!userId || !amount || !reference) {
            throw { statusCode: 400, message: 'User ID, amount, and reference are required' };
        }

        const transaction = await sequelize.transaction();

        try {
            const user = await User.findByPk(userId, { transaction });
            if (!user) {
                throw { statusCode: 404, message: 'User not found' };
            }

            let subscription = null;
            let paymentType = 'top_up';

            if (subscriptionId) {
                subscription = await Subscription.findOne({
                    where: {
                        id: subscriptionId,
                        userId: userId
                        // Removing status: check to allow paying for inactive subscriptions
                    },
                    include: [{ model: DataPlan, as: 'plan' }],
                    transaction
                });

                if (!subscription) {
                    throw { statusCode: 404, message: 'Subscription not found for this user' };
                }

                if (subscription.plan && parseFloat(amount) !== parseFloat(subscription.plan.price)) {
                    throw {
                        statusCode: 400,
                        message: `Payment amount (${amount}) does not match subscription plan price (${subscription.plan.price})`
                    };
                }

                paymentType = 'subscription';
            }

            const payment = await Payment.create({
                userId,
                subscriptionId: subscription?.id || null,
                amount,
                currency: 'KES',
                phoneNumber: user.phoneNumber || null,
                status: PaymentStatus.COMPLETED,
                paymentMethod: 'cash',
                paymentType,
                reference,
                description: description || (subscription ? `Cash payment for ${subscription.plan.name} subscription` : `Cash payment`),
                retryCount: 0,
                maxRetries: 3,
                initiatedAt: new Date(),
                completedAt: new Date(),
                metadata: {
                    processedBy: adminUserId,
                    paymentMethod: 'cash',
                    ...(subscription && {
                        subscriptionDetails: {
                            planId: subscription.planId,
                            planName: subscription.plan?.name,
                            subscriptionNumber: subscription.subscriptionNumber
                        }
                    })
                }
            }, { transaction });

            // Create invoice if subscription payment
            if (subscription) {
                const now = new Date();
                const billingPeriodStart = now;
                const billingPeriodEnd = new Date(now);
                billingPeriodEnd.setMonth(now.getMonth() + 1);
                const dueDate = new Date(now);
                dueDate.setDate(now.getDate() + 7);

                const invoice = await Invoice.create({
                    invoiceNumber: `INV-${Date.now()}`,
                    userId,
                    subscriptionId: subscription.id,
                    amount: payment.amount,
                    totalAmount: payment.amount,
                    reference: payment.reference,
                    description: payment.description,
                    status: InvoiceStatus.PAID,
                    issuedAt: now,
                    paidAt: now,
                    dueDate: billingPeriodEnd,
                    billingPeriodStart,
                    billingPeriodEnd,
                    paymentId: payment.id
                }, { transaction });

                if (subscription.plan) {
                    await InvoiceItem.create({
                        invoiceId: invoice.id,
                        name: subscription.plan.name,
                        amount: subscription.plan.price,
                        quantity: 1
                    }, { transaction });
                }

                // Activate subscription
                await subscription.activateSubscription({ transaction });
            }

            await transaction.commit();
            return payment;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Retry a failed payment
     */
    async retryPayment(paymentId, userId, newPhoneNumber) {
        const transaction = await sequelize.transaction();

        try {
            const payment = await Payment.findOne({
                where: { id: paymentId, userId },
                transaction
            });

            if (!payment) {
                throw { statusCode: 404, message: 'Payment not found' };
            }

            if (!payment.canRetry()) {
                throw { statusCode: 400, message: 'Payment cannot be retried' };
            }

            if (newPhoneNumber) {
                payment.phoneNumber = mpesaService.formatPhoneNumber(newPhoneNumber);
            }

            // External call outside primary update but before final commit/update
            const stkPushResponse = await mpesaService.initiateSTKPush({
                phoneNumber: payment.phoneNumber,
                amount: payment.amount,
                accountReference: payment.reference,
                transactionDesc: payment.description
            });

            await payment.update({
                checkoutRequestId: stkPushResponse.CheckoutRequestID,
                merchantRequestId: stkPushResponse.MerchantRequestID,
                status: PaymentStatus.PENDING,
                errorMessage: null,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            }, { transaction });

            await payment.incrementRetry({ transaction });

            await transaction.commit();

            return {
                success: true,
                message: 'Payment retry initiated successfully.',
                payment
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Process M-Pesa Callback
     */
    async processCallback(callbackBody) {
        // Note: Callbacks are tricky with transactions because we don't control the entry point as easily, 
        // but we should wrap the DB updates in one.

        const transaction = await sequelize.transaction();

        try {
            const callbackResult = mpesaService.processCallback(callbackBody);

            if (!callbackResult.checkoutRequestId) {
                throw new Error('Invalid callback: Missing checkout request ID');
            }

            const payment = await Payment.findByCheckoutRequestId(callbackResult.checkoutRequestId); // Helper needs to support transaction if we pass it, but findOne is safe.

            // We need to re-fetch with transaction lock if we are going to update
            const lockedPayment = await Payment.findOne({
                where: { checkoutRequestId: callbackResult.checkoutRequestId },
                transaction
            });

            if (!lockedPayment) {
                await transaction.rollback();
                console.error('❌ Payment not found for checkout request ID:', callbackResult.checkoutRequestId);
                return;
            }

            if (callbackResult.success) {
                await lockedPayment.markAsCompleted({
                    mpesaReceiptNumber: callbackResult.transactionDetails.mpesaReceiptNumber,
                    transactionDate: callbackResult.transactionDetails.transactionDate,
                    ...callbackResult.transactionDetails
                }, { transaction }); // Ensure markAsCompleted supports transaction options or use manual update

                // Manual update to ensure transaction support since model method might not have it
                await lockedPayment.update({
                    status: PaymentStatus.COMPLETED,
                    completedAt: new Date(),
                    mpesaReceiptNumber: callbackResult.transactionDetails.mpesaReceiptNumber,
                    transactionDate: callbackResult.transactionDetails.transactionDate,
                    callbackData: callbackResult.transactionDetails
                }, { transaction });


                if (lockedPayment.subscriptionId) {
                    const subscription = await Subscription.findByPk(lockedPayment.subscriptionId, {
                        include: [{ model: DataPlan, as: 'plan' }],
                        transaction 
                    });
                    if (subscription) {
                        // Re-implement activateSubscription logic here to ensure transaction usage or pass transaction
                        // Assuming activateSubscription updates status and dates
                        const now = new Date();
                        const nextMonth = new Date(now);
                        nextMonth.setMonth(now.getMonth() + 1);

                        // Create invoice for successful M-Pesa payment
                        const invoice = await Invoice.create({
                            invoiceNumber: `INV-${Date.now()}`,
                            userId: lockedPayment.userId,
                            subscriptionId: subscription.id,
                            amount: lockedPayment.amount,
                            totalAmount: lockedPayment.amount,
                            reference: lockedPayment.reference,
                            description: lockedPayment.description || `Payment for ${subscription.plan ? subscription.plan.name : 'Subscription'}`,
                            status: InvoiceStatus.PAID,
                            issuedAt: now,
                            paidAt: now,
                            dueDate: nextMonth,
                            billingPeriodStart: now,
                            billingPeriodEnd: nextMonth,
                            paymentId: lockedPayment.id
                        }, { transaction });

                        if (subscription.plan) {
                            await InvoiceItem.create({
                                invoiceId: invoice.id,
                                name: subscription.plan.name,
                                amount: subscription.plan.price,
                                quantity: 1
                            }, { transaction });
                        }

                        await subscription.update({
                            status: SubscriptionStatus.ACTIVE,
                            lastBillingDate: now,
                            nextBillingDate: nextMonth
                        }, { transaction });

                        console.log('✅ Subscription activated and invoice generated:', subscription.subscriptionNumber);
                    }
                }
            } else {
                const errorMessage = mpesaService.getStatusDescription(callbackResult.resultCode);

                await lockedPayment.update({
                    status: PaymentStatus.FAILED,
                    errorMessage: errorMessage,
                    callbackData: callbackResult
                }, { transaction });
            }

            await transaction.commit();
            return callbackResult;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new PaymentService();
