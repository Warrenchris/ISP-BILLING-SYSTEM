/**
 * Integration Tests: SMS Trigger Flows & Warning Schedulers
 *
 * Verifies integration points:
 *   1. M-Pesa payment callback triggers receipt SMS (non-duplicate).
 *   2. Renewal clears the warning flag.
 *   3. Hourly dunning sweep alerts users under threshold and skips duplicate alerts.
 */

// Force mock mode
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const paymentService = require('../../src/services/paymentService');
const { runDunningSweep } = require('../../src/jobs/sendSmsReminders');
const smsSender = require('../../src/services/sms/smsSender');

const { Payment, Subscription, DataPlan, User, sequelize } = require('../../src/models');

// Mock smsSender facade methods
jest.mock('../../src/services/sms/smsSender', () => ({
  sendPaymentReceipt: jest.fn().mockResolvedValue(true),
  sendExpiryWarning: jest.fn().mockResolvedValue(true),
  sendDisconnectionNotice: jest.fn().mockResolvedValue(true),
}));

// Mock BullMQ addProvisioningJob
jest.mock('../../src/services/queue/queueManager', () => ({
  addProvisioningJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
}));

describe('Integration — SMS Notification Triggers & Dunning Scheduler', () => {
  let mockUser;
  let mockPlan;
  let mockSub;
  let mockPayment;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'user-123',
      firstName: 'Alvin',
      phoneNumber: '0711223344',
    };

    mockPlan = {
      id: 'plan-123',
      name: '10 Mbps Fiber',
      price: 2000.00,
    };

    mockSub = {
      id: 'sub-123',
      userId: 'user-123',
      planId: 'plan-123',
      status: 'active',
      activatedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 29 days ago
      endDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expiress in 12 hours
      lastBillingDate: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      reminderSentAt: null,
      User: mockUser,
      plan: mockPlan,
      update: jest.fn().mockImplementation(function (updates) {
        Object.assign(this, updates);
        return Promise.resolve(this);
      }),
    };

    mockPayment = {
      id: 'payment-123',
      subscriptionId: 'sub-123',
      userId: 'user-123',
      amount: 2000.00,
      status: 'pending',
      reference: 'ACC-123',
      markAsCompleted: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockImplementation(function (updates) {
        Object.assign(this, updates);
        return Promise.resolve(this);
      }),
    };

    // Override Sequelize query methods
    Payment.findOne = jest.fn().mockResolvedValue(mockPayment);
    Payment.findByCheckoutRequestId = jest.fn().mockResolvedValue(mockPayment);
    User.findByPk = jest.fn().mockResolvedValue(mockUser);
    Subscription.findByPk = jest.fn().mockResolvedValue(mockSub);
    Subscription.findAll = jest.fn().mockResolvedValue([mockSub]);

    // Mock transaction
    const mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    };
    sequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);
  });

  test('Payment callback processCallback triggers payment receipt SMS and clears warning', async () => {
    const callbackBody = {
      Body: {
        stkCallback: {
          CheckoutRequestID: 'checkout-123',
          MerchantRequestID: 'merchant-123',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'MpesaReceiptNumber', Value: 'QWERTY1234' },
              { Name: 'TransactionDate', Value: 20260714181200 },
            ],
          },
        },
      },
    };

    const result = await paymentService.processCallback(callbackBody);

    expect(result.success).toBe(true);

    // Verify SMS receipt was triggered
    expect(smsSender.sendPaymentReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-123' }),
      expect.objectContaining({ id: 'sub-123' }),
      expect.objectContaining({ id: 'payment-123', status: 'completed' })
    );

    // Verify warning reset on subscription
    expect(mockSub.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        reminderSentAt: null, // Clears dunning state
      }),
      expect.any(Object)
    );
  });

  test('Payment callback handles duplicate execution gracefully (idempotency check)', async () => {
    // Simulate already processed completed payment
    mockPayment.status = 'completed';

    const callbackBody = {
      Body: {
        stkCallback: {
          CheckoutRequestID: 'checkout-123',
          ResultCode: 0,
        },
      },
    };

    await paymentService.processCallback(callbackBody);

    // Should NOT trigger sendPaymentReceipt a second time
    expect(smsSender.sendPaymentReceipt).not.toHaveBeenCalled();
    expect(mockSub.update).not.toHaveBeenCalled();
  });

  test('Dunning Sweep triggers warning SMS when under threshold and skips duplicate alerts', async () => {
    // 1. Run sweep when reminderSentAt is null
    let result = await runDunningSweep();

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(smsSender.sendExpiryWarning).toHaveBeenCalledWith(mockUser, mockSub, 12);
    expect(mockSub.update).toHaveBeenCalledWith({ reminderSentAt: expect.any(Date) });

    // 2. Run sweep again when reminderSentAt is now set to current cycle
    jest.clearAllMocks();
    mockSub.reminderSentAt = new Date(); // Sent today

    result = await runDunningSweep();

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0); // Skips!
    expect(smsSender.sendExpiryWarning).not.toHaveBeenCalled();
  });

  test('Dunning Sweep sends alert if reminderSentAt is from previous billing cycle', async () => {
    // Set reminderSentAt to 32 days ago (previous cycle)
    mockSub.reminderSentAt = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);

    const result = await runDunningSweep();

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1); // Sends!
    expect(smsSender.sendExpiryWarning).toHaveBeenCalled();
  });
});
