const { Payment, Subscription, DataPlan, User } = require('../models');
const MpesaService = require('../services/mpesaService');

const mpesaService = new MpesaService();

const initiateSubscriptionPayment = async (req, res) => {
  try {
    const { subscriptionId, phoneNumber } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!subscriptionId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID and phone number are required'
      });
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      where: { id: subscriptionId, userId },
      include: [
        { model: DataPlan, as: 'plan' },
        { model: User, as: 'user' }
      ]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if subscription is already active and paid
    if (subscription.status === 'active' && subscription.nextBillingDate > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already active and paid'
      });
    }

    // Check for pending payments
    const pendingPayment = await Payment.findOne({
      where: {
        subscriptionId,
        status: ['pending', 'processing']
      }
    });

    if (pendingPayment && !pendingPayment.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'A payment is already in progress for this subscription',
        payment: {
          id: pendingPayment.id,
          reference: pendingPayment.reference,
          status: pendingPayment.status,
          amount: pendingPayment.getFormattedAmount()
        }
      });
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      subscriptionId,
      amount: subscription.plan.price,
      phoneNumber: mpesaService.formatPhoneNumber(phoneNumber),
      paymentType: 'subscription',
      description: `Payment for ${subscription.plan.name} subscription`,
      reference: `SUB-${subscription.subscriptionNumber}`,
      metadata: {
        planId: subscription.plan.id,
        planName: subscription.plan.name,
        subscriptionNumber: subscription.subscriptionNumber
      }
    });

    // Initiate STK Push
    const stkPushResponse = await mpesaService.initiateSTKPush({
      phoneNumber: payment.phoneNumber,
      amount: payment.amount,
      accountReference: payment.reference,
      transactionDesc: payment.description
    });

    // Update payment with STK Push details
    await payment.update({
      checkoutRequestId: stkPushResponse.CheckoutRequestID,
      merchantRequestId: stkPushResponse.MerchantRequestID,
      status: 'pending'
    });

    res.json({
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
    });

  } catch (error) {
    console.error('Error initiating subscription payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate payment'
    });
  }
};

/**
 * Handle M-Pesa callback
 */
const handleMpesaCallback = async (req, res) => {
  try {
    console.log('📞 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));

    // Always respond to M-Pesa with success to acknowledge receipt
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    // Process callback asynchronously
    const callbackResult = mpesaService.processCallback(req.body);
    
    if (!callbackResult.checkoutRequestId) {
      console.error('❌ Invalid callback: Missing checkout request ID');
      return;
    }

    // Find payment by checkout request ID
    const payment = await Payment.findByCheckoutRequestId(callbackResult.checkoutRequestId);
    
    if (!payment) {
      console.error('❌ Payment not found for checkout request ID:', callbackResult.checkoutRequestId);
      return;
    }

    console.log('💳 Processing payment:', payment.reference);

    if (callbackResult.success) {
      // Payment successful
      await payment.markAsCompleted({
        mpesaReceiptNumber: callbackResult.transactionDetails.mpesaReceiptNumber,
        transactionDate: callbackResult.transactionDetails.transactionDate,
        ...callbackResult.transactionDetails
      });

      console.log('✅ Payment completed successfully:', payment.reference);

      // Update subscription if this was a subscription payment
      if (payment.subscriptionId) {
        const subscription = await Subscription.findByPk(payment.subscriptionId);
        if (subscription) {
          await subscription.activateSubscription();
          console.log('✅ Subscription activated:', subscription.subscriptionNumber);
        }
      }

    } else {
      // Payment failed
      const errorMessage = mpesaService.getStatusDescription(callbackResult.resultCode);
      await payment.markAsFailed(errorMessage, callbackResult);
      
      console.log('❌ Payment failed:', payment.reference, '-', errorMessage);
    }

  } catch (error) {
    console.error('❌ Error processing M-Pesa callback:', error);
  }
};

/**
 * Query payment status
 */
const queryPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id: paymentId, userId },
      include: [
        { 
          model: Subscription, 
          as: 'subscription',
          include: [{ model: DataPlan, as: 'plan' }]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // If payment is pending and has checkout request ID, query M-Pesa
    if (payment.status === 'pending' && payment.checkoutRequestId) {
      try {
        const statusResponse = await mpesaService.querySTKPushStatus(payment.checkoutRequestId);
        
        // Update payment status based on M-Pesa response
        if (statusResponse.ResultCode === '0') {
          // Payment completed
          if (statusResponse.CallbackMetadata?.Item) {
            const metadata = {};
            statusResponse.CallbackMetadata.Item.forEach(item => {
              metadata[item.Name] = item.Value;
            });

            await payment.markAsCompleted({
              mpesaReceiptNumber: metadata.MpesaReceiptNumber,
              transactionDate: new Date(metadata.TransactionDate),
              amount: metadata.Amount,
              phoneNumber: metadata.PhoneNumber
            });

            // Activate subscription if applicable
            if (payment.subscriptionId) {
              const subscription = await Subscription.findByPk(payment.subscriptionId);
              if (subscription) {
                await subscription.activateSubscription();
              }
            }
          }
        } else if (statusResponse.ResultCode !== '1037') {
          // Payment failed (not pending)
          const errorMessage = mpesaService.getStatusDescription(parseInt(statusResponse.ResultCode));
          await payment.markAsFailed(errorMessage, statusResponse);
        }
      } catch (queryError) {
        console.error('Error querying payment status:', queryError);
      }
    }

    // Refresh payment data
    await payment.reload();

    res.json({
      success: true,
      payment: {
        id: payment.id,
        reference: payment.reference,
        amount: payment.getFormattedAmount(),
        status: payment.status,
        paymentType: payment.paymentType,
        description: payment.description,
        phoneNumber: payment.phoneNumber,
        mpesaReceiptNumber: payment.mpesaReceiptNumber,
        transactionDate: payment.transactionDate,
        initiatedAt: payment.initiatedAt,
        completedAt: payment.completedAt,
        errorMessage: payment.errorMessage,
        canRetry: payment.canRetry(),
        isExpired: payment.isExpired(),
        duration: payment.getDurationSinceInitiated(),
        statusColor: payment.getStatusColor(),
        subscription: payment.subscription ? {
          id: payment.subscription.id,
          number: payment.subscription.subscriptionNumber,
          status: payment.subscription.status,
          plan: payment.subscription.plan ? {
            name: payment.subscription.plan.name,
            price: payment.subscription.plan.getFormattedPrice()
          } : null
        } : null
      }
    });

  } catch (error) {
    console.error('Error querying payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query payment status'
    });
  }
};

/**
 * Get user payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    console.log('🔍 getPaymentHistory params:', {
      query: req.query,
      userId: req.userId,
      user: req.user?.toJSON?.() || req.user
    });


    const userId = req.userId || req.user?.id;
    const { page = 1, limit = 10, status, paymentType } = req.query;

    const whereClause = { userId };
    if (status) whereClause.status = status;
    if (paymentType) whereClause.paymentType = paymentType;

    const offset = (page - 1) * limit;

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [{ model: DataPlan, as: 'plan' }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      reference: payment.reference,
      amount: typeof payment.getFormattedAmount === 'function' ? payment.getFormattedAmount() : payment.amount,
      status: payment.status,
      paymentType: payment.paymentType,
      description: payment.description,
      phoneNumber: payment.phoneNumber,
      mpesaReceiptNumber: payment.mpesaReceiptNumber,
      transactionDate: payment.transactionDate,
      initiatedAt: payment.initiatedAt,
      completedAt: payment.completedAt,
      duration: typeof payment.getDurationSinceInitiated === 'function' ? payment.getDurationSinceInitiated() : null,
      statusColor: typeof payment.getStatusColor === 'function' ? payment.getStatusColor() : null,
      subscription: payment.subscription ? {
        id: payment.subscription.id,
        number: payment.subscription.subscriptionNumber,
        plan: payment.subscription.plan ? {
          name: payment.subscription.plan.name
        } : null
      } : null
    }));

    res.json({
      success: true,
      data: formattedPayments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment history'
    });
  }
};


/**
 * Retry failed payment
 */
const retryPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id: paymentId, userId },
      include: [
        { 
          model: Subscription, 
          as: 'subscription',
          include: [{ model: DataPlan, as: 'plan' }]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!payment.canRetry()) {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be retried'
      });
    }

    // Update phone number if provided
    if (phoneNumber) {
      payment.phoneNumber = mpesaService.formatPhoneNumber(phoneNumber);
    }

    // Initiate new STK Push
    const stkPushResponse = await mpesaService.initiateSTKPush({
      phoneNumber: payment.phoneNumber,
      amount: payment.amount,
      accountReference: payment.reference,
      transactionDesc: payment.description
    });

    // Update payment with new STK Push details
    await payment.update({
      checkoutRequestId: stkPushResponse.CheckoutRequestID,
      merchantRequestId: stkPushResponse.MerchantRequestID,
      status: 'pending',
      errorMessage: null,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    await payment.incrementRetry();

    res.json({
      success: true,
      message: 'Payment retry initiated successfully. Please check your phone for M-Pesa prompt.',
      payment: {
        id: payment.id,
        reference: payment.reference,
        amount: payment.getFormattedAmount(),
        status: payment.status,
        retryCount: payment.retryCount,
        phoneNumber: payment.phoneNumber
      }
    });

  } catch (error) {
    console.error('Error retrying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry payment'
    });
  }
};

/**
 * Get payment statistics
 */
const getPaymentStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await Payment.getPaymentStats(userId);
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment statistics'
    });
  }
};




/**
 * Create a cash payment (Admin only)
 */
const createCashPayment = async (req, res) => {
  try {
    const { userId, amount, reference, description, subscriptionId } = req.body;
    const processedBy = req.user ? req.user.id : null; // Admin user ID

    // Import Invoice and InvoiceItem models here to ensure they are always available
    const { Invoice, InvoiceItem } = require("../models");

    // Validate required fields
    if (!userId || !amount || !reference) {
      return res.status(400).json({
        success: false,
        message: 'User ID, amount, and reference are required'
      });
    }

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let subscription = null;
    let paymentType = 'top_up'; // Default payment type

    // If subscriptionId is provided, validate it
    if (subscriptionId) {
      subscription = await Subscription.findOne({
        where: { 
          id: subscriptionId,
          userId: userId,
          status: 'active'
        },
        include: [{ 
          model: DataPlan,
          as: 'plan'
        }]
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Active subscription not found for this user'
        });
      }

      // Validate amount matches subscription plan price
      if (subscription.DataPlan && parseFloat(amount) !== parseFloat(subscription.DataPlan.price)) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (${amount}) does not match subscription plan price (${subscription.DataPlan.price})`
        });
      }

      paymentType = 'subscription';
    }

    // Create payment record with all required fields
    const payment = await Payment.create({
      userId,
      subscriptionId: subscription?.id || null,
      amount,
      currency: 'KES',
      phoneNumber: user.phoneNumber || null, // Use user's phone number, can be null for cash payments
      status: 'completed',
      paymentMethod: 'cash',
      paymentType,
      reference,
      description: description || 
        (subscription 
          ? `Cash payment for ${subscription.DataPlan.name} subscription`
          : `Cash payment from ${user.firstName} ${user.lastName}`),
      retryCount: 0,
      maxRetries: 3,
      initiatedAt: new Date(),
      completedAt: new Date(),
      metadata: {
        processedBy,
        paymentMethod: 'cash',
        ...(subscription && {
          subscriptionDetails: {
            planId: subscription.planId,
            planName: subscription.DataPlan?.name,
            subscriptionNumber: subscription.subscriptionNumber
          }
        })
      }
    });

        // Create invoice if this is a subscription payment
        if (subscription) {
          const now = new Date();
          const billingPeriodStart = now;
          const billingPeriodEnd = new Date(now);
          billingPeriodEnd.setMonth(now.getMonth() + 1); // adjust as per plan duration
          const dueDate = new Date(now);
          dueDate.setDate(now.getDate() + 7); // due in 7 days
          
          const invoice = await Invoice.create({
              invoiceNumber: `INV-${Date.now()}`,
              userId,
              subscriptionId: subscription.id,
              amount: payment.amount,
              totalAmount: payment.amount,
              reference: payment.reference,
              description: payment.description,
              status: 'paid',
              issuedAt: now,
              paidAt: now,
              dueDate: billingPeriodEnd,
              billingPeriodStart,
              billingPeriodEnd,
              paymentId: payment.id
          });
    
          // Optionally create invoice items if needed
          if (subscription.DataPlan) {
            await InvoiceItem.create({
              invoiceId: invoice.id,
              name: subscription.DataPlan.name,
              amount: subscription.DataPlan.price,
              quantity: 1
            });
          }
        }
    
        res.json({
          success: true,
          message: 'Cash payment recorded successfully',
          payment
        });
    
      } catch (error) {
        console.error('Error creating cash payment:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to create cash payment'
        });
      }
    };


/**
 * Confirm a pending payment (Admin only)
 */
const confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const processedBy = req.user.id; // Admin user ID

    const payment = await Payment.findByPk(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already completed'
      });
    }

    // Mark payment as completed
    await payment.markAsCompleted({
      processedBy,
      mpesaReceiptNumber: payment.mpesaReceiptNumber || `MANUAL-${Date.now()}`,
      transactionDate: new Date(),
    });

    // Activate subscription if linked and not already active
    if (payment.subscriptionId) {
      const subscription = await Subscription.findByPk(payment.subscriptionId);
      if (subscription && subscription.status !== 'active') {
        await subscription.activateSubscription();
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm payment'
    });
  }
};

/**
 * Get all payments (Admin only)
 */
/**
 * Get all payments (Admin only)
 */
const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, paymentMethod } = req.query;
    const offset = (page - 1) * limit;

    if (paymentMethod && !['mpesa', 'cash', 'bank', 'card'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method filter'
      });
    }

    const whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;
    if (paymentMethod) whereClause.paymentMethod = paymentMethod;

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: Subscription,
          as: 'subscription',
          include: [{ model: DataPlan, as: 'plan' }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      transactionId: payment.reference,
      amount: typeof payment.getFormattedAmount === 'function' ? payment.getFormattedAmount() : payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      createdAt: payment.createdAt,
      description: payment.description,
      customerInfo: payment.User ? {
        name: `${payment.User.firstName} ${payment.User.lastName}`,
        email: payment.User.email,
        phone: payment.User.phoneNumber
      } : null,
      processedBy: payment.processedBy,
      subscription: payment.subscription ? {
        id: payment.subscription.id,
        number: payment.subscription.subscriptionNumber,
        plan: payment.subscription.plan ? payment.subscription.plan.name : null
      } : null
    }));

    res.json({
      success: true,
      data: formattedPayments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error getting all payments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve all payments'
    });
  }
};

const initiateMpesaPayment = async (req, res) => {
  try {
    const { phoneNumber, amount, description } = req.body;
    
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least KES 1'
      });
    }

    // Format phone number
    const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);
    
    // Create payment reference
    const reference = `MPESA-${Date.now()}`;
    
    // Initiate STK Push
    const stkResponse = await mpesaService.initiateSTKPush({
      phoneNumber: formattedPhone,
      amount: numAmount,
      accountReference: reference,
      transactionDesc: description || 'ISP Service Payment'
    });

    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      amount: numAmount,
      phoneNumber: formattedPhone,
      paymentMethod: 'mpesa',
      status: 'pending',
      reference,
      description,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID
    });

    res.json({
      success: true,
      message: 'M-Pesa payment initiated successfully',
      payment
    });

  } catch (error) {
    console.error('M-Pesa payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate M-Pesa payment'
    });
  }
};

module.exports = {
  initiateSubscriptionPayment,
  handleMpesaCallback,
  queryPaymentStatus,
  getPaymentHistory,
  retryPayment,
  getPaymentStats,
  createCashPayment,
  confirmPayment,
  getAllPayments
};
