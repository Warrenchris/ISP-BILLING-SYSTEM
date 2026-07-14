/**
 * Integration Tests: Remote Voucher Purchase & IDOR Protections
 *
 * Verifies:
 *   1. Remote purchase initiates STK push and creates pending payment record.
 *   2. Guest user accounts are dynamically created/located based on phone number.
 *   3. IDOR protection blocks voucher status checks if phone number mismatches.
 *   4. Payment callback processes remote purchases and registers the voucher code in the payment.
 */

// Force mock mode
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const paymentService = require('../../src/services/paymentService');
const voucherController = require('../../src/controllers/voucherController');
const { Payment, Subscription, DataPlan, User, Voucher, sequelize } = require('../../src/models');

// Mock mpesaService STK Push trigger
jest.mock('../../src/services/mpesaService', () => {
  return jest.fn().mockImplementation(() => ({
    formatPhoneNumber: (phone) => {
      // Local Kenyan format normalization
      if (phone.startsWith('0')) return `+254${phone.slice(1)}`;
      if (phone.startsWith('+')) return phone;
      return `+${phone}`;
    },
    initSelfSTKPush: jest.fn().mockResolvedValue({
      CheckoutRequestID: 'checkout-vchr-123',
      MerchantRequestID: 'merchant-vchr-123',
      ResponseCode: '0',
    }),
    processCallback: jest.fn().mockReturnValue({
      checkoutRequestId: 'checkout-vchr-123',
      success: true,
      resultCode: 0,
      transactionDetails: {
        mpesaReceiptNumber: 'VCHR_RECEIPT_1',
        transactionDate: new Date().toISOString(),
      }
    }),
  }));
});

// Mock smsSender facade methods
jest.mock('../../src/services/sms/smsSender', () => ({
  sendVoucherCode: jest.fn().mockResolvedValue(true),
}));

describe('Integration — Remote Voucher M-Pesa Purchases & IDOR Guard', () => {
  let mockPlan;
  let mockUser;
  let mockPayment;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlan = {
      id: 'plan-vchr-uuid',
      name: 'Hotspot 1 Day Unlimited',
      price: 50.00,
    };

    mockUser = {
      id: 'dynamic-user-uuid',
      firstName: 'Hotspot',
      lastName: 'Guest',
      phoneNumber: '+254711000000',
    };

    mockPayment = {
      id: 'pay-vchr-123',
      userId: 'dynamic-user-uuid',
      amount: 50.00,
      phoneNumber: '+254711000000',
      status: 'pending',
      callbackData: { planId: 'plan-vchr-uuid' },
      markAsCompleted: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockImplementation(function (updates) {
        Object.assign(this, updates);
        return Promise.resolve(this);
      }),
    };

    // Override models query hooks
    DataPlan.findByPk = jest.fn().mockResolvedValue(mockPlan);
    User.findOne = jest.fn();
    User.create = jest.fn().mockResolvedValue(mockUser);
    Payment.create = jest.fn().mockResolvedValue(mockPayment);
    Payment.findOne = jest.fn().mockResolvedValue(mockPayment);
    Payment.findByPk = jest.fn().mockResolvedValue(mockPayment);
    Payment.findByCheckoutRequestId = jest.fn().mockResolvedValue(mockPayment);
    
    Voucher.generateUniqueCodes = jest.fn().mockResolvedValue(['VCHR-9999']);
    Voucher.create = jest.fn().mockResolvedValue({
      id: 'voucher-uuid-999',
      code: 'VCHR-9999',
    });

    // Mock transaction
    const mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    };
    sequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);
  });

  test('initiateVoucherPurchaseStk dynamically creates user account if not exists', async () => {
    // Simulate user not found by phone
    User.findOne.mockResolvedValue(null);

    const result = await paymentService.initiateVoucherPurchaseStk('0711000000', 'plan-vchr-uuid');

    expect(result.success).toBe(true);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumber: '+254711000000',
        role: 'customer',
      })
    );
    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'dynamic-user-uuid',
        amount: 50.00,
        paymentType: 'top_up',
      }),
      expect.any(Object)
    );
  });

  test('initiateVoucherPurchaseStk reuses user account if phone already registered', async () => {
    // Simulate user already exists
    User.findOne.mockResolvedValue(mockUser);

    const result = await paymentService.initiateVoucherPurchaseStk('0711000000', 'plan-vchr-uuid');

    expect(result.success).toBe(true);
    expect(User.create).not.toHaveBeenCalled(); // Reused!
  });

  test('queryVoucherPaymentStatus throws 403 Forbidden on mismatched phone query (IDOR check)', async () => {
    const req = {
      params: { paymentId: 'pay-vchr-123' },
      query: { phone: '0722222222' }, // Mismatched phone!
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await voucherController.queryVoucherPaymentStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Forbidden'),
      })
    );
  });

  test('queryVoucherPaymentStatus returns code when status is completed and phone matches', async () => {
    // Set payment status to completed and save code inside metadata
    mockPayment.status = 'completed';
    mockPayment.callbackData = { planId: 'plan-vchr-uuid', voucherCode: 'VCHR-9999' };

    const req = {
      params: { paymentId: 'pay-vchr-123' },
      query: { phone: '0711000000' }, // Matches +254711000000!
    };
    const res = {
      json: jest.fn(),
    };

    await voucherController.queryVoucherPaymentStatus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      status: 'completed',
      voucherCode: 'VCHR-9999',
    });
  });

  test('processCallback triggers voucherService.purchaseVoucherRemote and stores generated code in payment', async () => {
    const callbackBody = {
      Body: {
        stkCallback: {
          CheckoutRequestID: 'checkout-vchr-123',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'MpesaReceiptNumber', Value: 'VCHR_RECEIPT_1' },
            ],
          },
        },
      },
    };

    // Simulate voucher purchase payment (subscriptionId is null, planId in metadata)
    mockPayment.subscriptionId = null;

    const result = await paymentService.processCallback(callbackBody);

    expect(result.success).toBe(true);

    // Verify voucher is created
    expect(Voucher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VCHR-9999',
        planId: 'plan-vchr-uuid',
      })
    );

    // Verify generated voucher code is saved in payment metadata
    expect(mockPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackData: expect.objectContaining({
          voucherCode: 'VCHR-9999',
        }),
      })
    );
  });
});
