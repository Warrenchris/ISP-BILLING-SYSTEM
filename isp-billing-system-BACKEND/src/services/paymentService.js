const { Payment, Subscription, DataPlan, User, Invoice, InvoiceItem, sequelize } = require('../models');
const { PaymentStatus, SubscriptionStatus, InvoiceStatus } = require('../config/constants');
const MpesaService = require('./mpesaService');
const mpesaService = new MpesaService();
const logger = require('../config/logger');
const { addProvisioningJob } = require('./queue/queueManager');

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

            // Commit transaction BEFORE external STK push to release database locks
            await transaction.commit();

            let stkPushResponse;
            try {
                stkPushResponse = await mpesaService.initiateSTKPush({
                    phoneNumber: payment.phoneNumber,
                    amount: payment.amount,
                    accountReference: payment.reference,
                    transactionDesc: payment.description
                });
            } catch (stkError) {
                // STK push failed post-commit: update payment row to failed state
                await payment.update({
                    status: PaymentStatus.FAILED,
                    errorMessage: stkError.message || 'Failed to initiate M-Pesa STK Push',
                    callbackData: {
                        ...(payment.callbackData || {}),
                        stk_failed: true
                    }
                });
                throw { statusCode: 500, message: stkError.message || 'Failed to initiate M-Pesa STK Push' };
            }

            // Update payment with STK Push details post-commit
            await payment.update({
                checkoutRequestId: stkPushResponse.CheckoutRequestID,
                merchantRequestId: stkPushResponse.MerchantRequestID,
                status: PaymentStatus.PENDING
            });

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
     * Initiate a direct M-Pesa payment (creates Payment record before STK dispatch)
     */
    async initiateDirectPayment({ userId, phoneNumber, amount, accountReference, description, subscriptionId }) {
        if (!phoneNumber || !amount || Number(amount) <= 0) {
            throw { statusCode: 400, message: 'Phone number and a valid amount are required' };
        }

        const transaction = await sequelize.transaction();

        try {
            const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
            const ref = accountReference || `ISP-${Date.now()}`;
            const desc = description || 'ISP Service Payment';

            // Create payment record before STK dispatch
            const payment = await Payment.create({
                userId: userId || null,
                subscriptionId: subscriptionId || null,
                amount: Number(amount),
                phoneNumber: formattedPhone,
                paymentType: subscriptionId ? 'subscription' : 'top_up',
                description: desc,
                reference: ref,
                status: PaymentStatus.PENDING,
                metadata: {
                    source: 'direct_stk_initiate',
                    accountReference: ref
                }
            }, { transaction });

            await transaction.commit();

            let stkPushResponse;
            try {
                stkPushResponse = await mpesaService.initiateSTKPush({
                    phoneNumber: payment.phoneNumber,
                    amount: payment.amount,
                    accountReference: payment.reference,
                    transactionDesc: payment.description
                });
            } catch (stkError) {
                await payment.update({
                    status: PaymentStatus.FAILED,
                    errorMessage: stkError.message || 'Failed to initiate M-Pesa STK Push',
                    callbackData: { stk_failed: true }
                });
                throw { statusCode: 500, message: stkError.message || 'Failed to initiate M-Pesa STK Push' };
            }

            payment.checkoutRequestId = stkPushResponse.CheckoutRequestID;
            payment.merchantRequestId = stkPushResponse.MerchantRequestID;
            payment.status = PaymentStatus.PENDING;

            await payment.update({
                checkoutRequestId: stkPushResponse.CheckoutRequestID,
                merchantRequestId: stkPushResponse.MerchantRequestID,
                status: PaymentStatus.PENDING
            });

            return {
                success: true,
                message: 'Payment initiated successfully. Please check your phone for M-Pesa prompt.',
                data: stkPushResponse,
                payment: {
                    id: payment.id,
                    reference: payment.reference,
                    amount: payment.getFormattedAmount(),
                    status: payment.status,
                    checkoutRequestId: stkPushResponse.CheckoutRequestID,
                    phoneNumber: payment.phoneNumber
                }
            };
        } catch (error) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
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
                await payment.save({ transaction });
            }

            // Commit transaction BEFORE external STK push to release database locks
            await transaction.commit();

            let stkPushResponse;
            try {
                stkPushResponse = await mpesaService.initiateSTKPush({
                    phoneNumber: payment.phoneNumber,
                    amount: payment.amount,
                    accountReference: payment.reference,
                    transactionDesc: payment.description
                });
            } catch (stkError) {
                // Post-commit failure: update status and increment retry
                await payment.update({
                    status: PaymentStatus.FAILED,
                    errorMessage: stkError.message || 'Failed to initiate M-Pesa STK Push'
                });
                await payment.incrementRetry();
                throw { statusCode: 500, message: stkError.message || 'Failed to initiate M-Pesa STK Push' };
            }

            await payment.update({
                checkoutRequestId: stkPushResponse.CheckoutRequestID,
                merchantRequestId: stkPushResponse.MerchantRequestID,
                status: PaymentStatus.PENDING,
                errorMessage: null,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            });

            await payment.incrementRetry();

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

            // Idempotency Safeguard: If payment is already completed or failed, ignore callback.
            if (lockedPayment.status === PaymentStatus.COMPLETED || lockedPayment.status === PaymentStatus.FAILED) {
                await transaction.rollback();
                logger.info('Callback ignored: Payment already processed', {
                    checkoutRequestId: callbackResult.checkoutRequestId,
                    status: lockedPayment.status
                });
                return callbackResult;
            }

            if (callbackResult.success) {
                // NOTE: transactionDetails (receipt number, amount, phone) only comes from
                // the async webhook's CallbackMetadata. When this function is invoked from a
                // status *query* response (see finalizePaymentFromStatusQuery below), there is
                // no CallbackMetadata, so transactionDetails will be undefined. Guard against
                // that instead of assuming it's always present.
                const details = callbackResult.transactionDetails || {};

                // Manual update (transaction-safe) — single source of truth for completion.
                await lockedPayment.update({
                    status: PaymentStatus.COMPLETED,
                    completedAt: new Date(),
                    mpesaReceiptNumber: details.mpesaReceiptNumber || lockedPayment.mpesaReceiptNumber || null,
                    transactionDate: details.transactionDate || lockedPayment.transactionDate || new Date(),
                    callbackData: {
                        ...(lockedPayment.callbackData || {}),
                        ...details
                    }
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
                            nextBillingDate: nextMonth,
                            reminderSentAt: null, // Clear dunning warning state for new cycle
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

            // ── Phase 1: Queue provisioning job AFTER transaction commit ──────
            // This is deliberately outside the transaction. If the queue is down,
            // the payment still succeeds. The reconciliation sweep catches gaps.
            if (callbackResult.success) {
                if (lockedPayment.subscriptionId) {
                    try {
                        const sub = await Subscription.findByPk(lockedPayment.subscriptionId, {
                            include: [{ model: DataPlan, as: 'plan' }, { model: User, as: 'User' }]
                        });

                        // Trigger outbound payment receipt SMS
                        if (sub && sub.User) {
                            const smsSender = require('./sms/smsSender');
                            await smsSender.sendPaymentReceipt(sub.User, sub, lockedPayment);
                        }

                        if (sub && sub.connectionType && sub.networkDeviceId && sub.networkIdentifier) {
                            const jobId = `enable-${sub.id}-${lockedPayment.mpesaReceiptNumber}`;
                            await addProvisioningJob('enable', {
                                customerId: sub.userId,
                                subscriptionId: sub.id,
                                triggeredBy: `mpesa:${lockedPayment.mpesaReceiptNumber}`,
                            }, jobId);
                            logger.info('Provisioning job queued after M-Pesa payment', {
                                jobId,
                                subscriptionId: sub.id,
                                mpesaReceipt: lockedPayment.mpesaReceiptNumber,
                            });
                        }
                    } catch (queueError) {
                        // Log but NEVER fail the payment — reconciliation sweep is the safety net
                        logger.error('Failed to queue post-payment tasks', {
                            subscriptionId: lockedPayment.subscriptionId,
                            mpesaReceipt: lockedPayment.mpesaReceiptNumber,
                            error: queueError.message,
                        });
                    }
                } else if (lockedPayment.callbackData && lockedPayment.callbackData.planId) {
                    // Enqueue voucher generation as a BullMQ job (decoupled post-commit)
                    try {
                        const { addVoucherJob } = require('./queue/queueManager');
                        const planId = lockedPayment.callbackData.planId;
                        const phone = lockedPayment.phoneNumber;
                        const userId = lockedPayment.userId;
                        const jobId = `voucher-gen-${lockedPayment.id}`;

                        await addVoucherJob(lockedPayment.id, phone, planId, userId, jobId);

                        logger.info(`Voucher generation enqueued successfully via M-Pesa callback: ${phone} (jobId: ${jobId}, plan: ${planId})`);
                    } catch (queueError) {
                        logger.error('Failed to enqueue remote purchased voucher generation after callback commit', {
                            paymentId: lockedPayment.id,
                            error: queueError.message,
                        });
                    }
                }
            }

            return callbackResult;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Reconcile a PENDING payment by actively querying M-Pesa for its current status.
     *
     * This is the fallback path used when a user checks payment status (GET
     * /payments/status/:paymentId) and the async webhook hasn't landed yet — e.g. it was
     * dropped, delayed, or blocked by a network/firewall issue between Safaricom and us.
     * Without this, a payment that actually succeeded on M-Pesa's side could stay PENDING
     * in our DB forever, and the customer's subscription would never activate even though
     * they paid.
     *
     * Reuses processCallback()'s transaction-safe, idempotent completion logic by shaping
     * the STK-push-query response into the same structure the webhook callback uses. The
     * query endpoint doesn't return CallbackMetadata (receipt number, amount, phone) — only
     * the webhook does — so those fields may stay null here and get backfilled later if the
     * webhook eventually arrives (processCallback's idempotency check makes that a safe no-op
     * once completed, and a real update if it lands before this reconciliation runs).
     *
     * @param {Object} payment - Payment instance (must have checkoutRequestId, status PENDING)
     * @returns {Promise<Object|null>} The reloaded payment, or null if nothing changed
     */
    async reconcilePendingPayment(payment) {
        if (!payment || payment.status !== PaymentStatus.PENDING || !payment.checkoutRequestId) {
            return null;
        }

        let statusResponse;
        try {
            statusResponse = await mpesaService.querySTKPushStatus(payment.checkoutRequestId);
        } catch (e) {
            // M-Pesa throws for "still being processed" / transient errors — that just means
            // the payment is genuinely still pending. Nothing to do; not an error condition.
            logger.info('STK status query did not resolve payment (likely still pending)', {
                paymentId: payment.id,
                checkoutRequestId: payment.checkoutRequestId,
                error: e.message
            });
            return null;
        }

        const resultCode = statusResponse && statusResponse.ResultCode !== undefined
            ? String(statusResponse.ResultCode)
            : null;

        if (resultCode === null) {
            // Ambiguous response — don't guess, leave payment as-is for the next check/webhook.
            return null;
        }

        if (resultCode === '0') {
            // Success — synthesize a callback-shaped payload and run it through the same
            // transaction-safe, idempotent completion path the webhook uses.
            const syntheticCallback = {
                Body: {
                    stkCallback: {
                        MerchantRequestID: statusResponse.MerchantRequestID,
                        CheckoutRequestID: payment.checkoutRequestId,
                        ResultCode: 0,
                        ResultDesc: statusResponse.ResultDesc || 'Reconciled via status query'
                        // Deliberately no CallbackMetadata — see docstring above.
                    }
                }
            };
            await this.processCallback(syntheticCallback);
        } else {
            // Definitive failure (e.g. 1032 cancelled by user, 1037 timeout, 1 insufficient
            // funds) — also route through processCallback so it's transaction-safe and
            // idempotent, same as a real failure webhook would be.
            const syntheticCallback = {
                Body: {
                    stkCallback: {
                        MerchantRequestID: statusResponse.MerchantRequestID,
                        CheckoutRequestID: payment.checkoutRequestId,
                        ResultCode: Number(resultCode),
                        ResultDesc: statusResponse.ResultDesc || 'Reconciled via status query'
                    }
                }
            };
            await this.processCallback(syntheticCallback);
        }

        await payment.reload();
        return payment;
    }

    /**
     * Initiate M-Pesa STK push for remote voucher purchase (Captive Portal)
     *
     * @param {string} phoneNumber - phone number to charge
     * @param {string} planId - DataPlan ID
     * @returns {Promise<Object>} Payment initiation result
     */
    async initiateVoucherPurchaseStk(phoneNumber, planId) {
        if (!phoneNumber || !planId) {
            throw { statusCode: 400, message: 'Phone number and plan ID are required' };
        }

        const plan = await DataPlan.findByPk(planId);
        if (!plan) {
            throw { statusCode: 404, message: 'Data plan not found' };
        }

        // Get or dynamically create a unique customer account keyed by phone number
        const user = await this.getOrCreatePhoneUser(phoneNumber);
        const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);

        const transaction = await sequelize.transaction();

        try {
            // Create pending payment record
            const payment = await Payment.create({
                userId: user.id,
                subscriptionId: null, // Null for voucher purchase
                amount: plan.price,
                phoneNumber: formattedPhone,
                paymentType: 'top_up', // Valid Enum value
                description: `Voucher Purchase: ${plan.name}`,
                reference: `VCHR-${Date.now()}`,
                callbackData: {
                    planId: plan.id,
                    planName: plan.name,
                }
            }, { transaction });

            // Commit transaction BEFORE external STK push to release database locks
            await transaction.commit();

            // Trigger the Safaricom M-Pesa STK Push
            let stkPushResponse;
            try {
                stkPushResponse = await mpesaService.initSelfSTKPush({
                    phoneNumber: payment.phoneNumber,
                    amount: payment.amount,
                    accountReference: payment.reference,
                    transactionDesc: payment.description
                });
            } catch (stkError) {
                // Try fallback format if initSelfSTKPush isn't available
                try {
                    stkPushResponse = await mpesaService.initiateSTKPush({
                        phoneNumber: payment.phoneNumber,
                        amount: payment.amount,
                        accountReference: payment.reference,
                        transactionDesc: payment.description
                    });
                } catch (stkErrorInner) {
                    // STK push failed post-commit: update payment row to failed state
                    await payment.update({
                        status: PaymentStatus.FAILED,
                        errorMessage: stkErrorInner.message || 'Failed to initiate M-Pesa STK Push',
                        callbackData: {
                            ...(payment.callbackData || {}),
                            stk_failed: true
                        }
                    });
                    throw { statusCode: 500, message: stkErrorInner.message || 'Failed to initiate M-Pesa STK Push' };
                }
            }

            // Update payment with STK Push details post-commit
            await payment.update({
                checkoutRequestId: stkPushResponse.CheckoutRequestID,
                merchantRequestId: stkPushResponse.MerchantRequestID,
                status: PaymentStatus.PENDING
            });

            return {
                success: true,
                message: 'Payment initiated successfully. Please check your phone for M-Pesa prompt.',
                payment: {
                    id: payment.id,
                    reference: payment.reference,
                    amount: payment.amount,
                    status: payment.status,
                    checkoutRequestId: payment.checkoutRequestId,
                    phoneNumber: payment.phoneNumber,
                    plan: {
                        id: plan.id,
                        name: plan.name,
                        price: plan.price
                    }
                }
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get or dynamically create a unique user record matching phone number.
     * Ensures we don't pollute analytics with a single global guest user.
     */
    async getOrCreatePhoneUser(phoneNumber) {
        const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
        let user = await User.findOne({ where: { phoneNumber: formattedPhone } });
        
        if (!user) {
            const crypto = require('crypto');
            const bcrypt = require('bcryptjs');
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            user = await User.create({
                firstName: 'Hotspot',
                lastName: 'Guest',
                email: `guest-${formattedPhone.replace('+', '')}@isp.com`,
                phoneNumber: formattedPhone,
                password: hashedPassword,
                role: 'customer',
            });
            logger.info(`Dynamically created phone-keyed guest user record for "${formattedPhone}"`);
        }
        return user;
    }
}

module.exports = new PaymentService();
