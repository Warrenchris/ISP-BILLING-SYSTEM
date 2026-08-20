const PaymentService = require('../../src/services/paymentService');
const { Payment, Subscription, User, Invoice } = require('../../src/models');
const { PaymentStatus, SubscriptionStatus } = require('../../src/config/constants');

// Mock Sequelize models and database
jest.mock('../../src/models', () => ({
    Payment: {
        create: jest.fn(),
        findByPk: jest.fn(),
        findOne: jest.fn(),
        findByCheckoutRequestId: jest.fn(),
    },
    Subscription: {
        findByPk: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
    },
    User: {
        findByPk: jest.fn(),
    },
    Invoice: {
        create: jest.fn(),
    },
    DataPlan: {},
    sequelize: {
        transaction: jest.fn(() => Promise.resolve({
            commit: jest.fn(),
            rollback: jest.fn(),
        })),
    },
}));

var mockInitiateSTKPush = jest.fn().mockResolvedValue({
    CheckoutRequestID: 'ws_CO_123456',
    MerchantRequestID: '123456',
    ResponseCode: '0',
    CustomerMessage: 'Success',
});

// Mock MpesaService
jest.mock('../../src/services/mpesaService', () => {
    return jest.fn().mockImplementation(() => ({
        formatPhoneNumber: jest.fn((phone) => phone),
        initiateSTKPush: (...args) => mockInitiateSTKPush(...args),
    }));
});

describe('PaymentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initiateSubscriptionPayment', () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const mockSubscription = {
            id: 'sub-123',
            userId: 'user-123',
            status: SubscriptionStatus.PENDING,
            amount: 1000,
            plan: {
                id: 'plan-1',
                name: 'Basic Plan',
                price: 1000
            },
            subscriptionNumber: 'SUB-001'
        };

        it('should create a pending payment record successfully', async () => {
            // Setup mocks
            const { Subscription, Payment } = require('../../src/models');

            Subscription.findOne.mockResolvedValue(mockSubscription);
            Payment.findOne.mockResolvedValue(null); // No pending payment
            Payment.create.mockResolvedValue({
                ...mockSubscription,
                id: 'payment-123',
                status: PaymentStatus.PENDING,
                amount: 1000,
                phoneNumber: '254700000000',
                reference: 'REF-123',
                update: jest.fn(),
                getFormattedAmount: jest.fn().mockReturnValue('1,000')
            });

            const result = await PaymentService.initiateSubscriptionPayment(
                'user-123',
                'sub-123',
                '0700000000'
            );

            expect(Subscription.findOne).toHaveBeenCalled();
            expect(Payment.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    subscriptionId: 'sub-123',
                    amount: 1000,
                    paymentType: 'subscription'
                }),
                expect.any(Object)
            );
            expect(result.success).toBe(true);
            expect(result.payment).toHaveProperty('id', 'payment-123');
        });

        it('should throw error if subscription not found', async () => {
            const { Subscription } = require('../../src/models');
            Subscription.findOne.mockResolvedValue(null);

            await expect(
                PaymentService.initiateSubscriptionPayment('user-123', 'sub-999', '0700000000')
            ).rejects.toEqual(expect.objectContaining({ message: 'Subscription not found' }));
        });

        it('should throw error if active subscription exists', async () => {
            const { Subscription } = require('../../src/models');
            const activeSub = {
                ...mockSubscription,
                status: 'active',
                nextBillingDate: new Date(Date.now() + 86400000)
            };
            Subscription.findOne.mockResolvedValue(activeSub);

            await expect(
                PaymentService.initiateSubscriptionPayment('user-123', 'sub-123', '0700000000')
            ).rejects.toEqual(expect.objectContaining({ message: 'Subscription is already active and paid' }));
        });

        it('should commit transaction and update payment to FAILED if STK Push fails post-commit', async () => {
            const { Subscription, Payment, sequelize } = require('../../src/models');

            mockInitiateSTKPush.mockRejectedValueOnce(new Error('Safaricom API Down'));

            const mockPaymentUpdate = jest.fn();
            const mockTransactionCommit = jest.fn();

            Subscription.findOne.mockResolvedValue(mockSubscription);
            Payment.findOne.mockResolvedValue(null);
            Payment.create.mockResolvedValue({
                ...mockSubscription,
                id: 'payment-123',
                status: PaymentStatus.PENDING,
                amount: 1000,
                phoneNumber: '254700000000',
                reference: 'REF-123',
                update: mockPaymentUpdate,
                getFormattedAmount: jest.fn().mockReturnValue('1,000')
            });

            sequelize.transaction.mockResolvedValueOnce({
                commit: mockTransactionCommit,
                rollback: jest.fn(),
            });

            await expect(
                PaymentService.initiateSubscriptionPayment('user-123', 'sub-123', '0700000000')
            ).rejects.toEqual(expect.objectContaining({ message: 'Safaricom API Down' }));

            expect(mockTransactionCommit).toHaveBeenCalled();
            expect(mockPaymentUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: PaymentStatus.FAILED,
                    errorMessage: 'Safaricom API Down',
                    callbackData: expect.objectContaining({ stk_failed: true })
                })
            );
        });
    });

    describe('initiateDirectPayment', () => {
        it('should create Payment record in DB before calling initiateSTKPush', async () => {
            const { Payment, sequelize } = require('../../src/models');

            const mockPaymentUpdate = jest.fn().mockResolvedValue(true);
            const mockTransactionCommit = jest.fn();

            Payment.create.mockResolvedValue({
                id: 'payment-direct-1',
                userId: 'user-123',
                amount: 500,
                phoneNumber: '254711222333',
                reference: 'ISP-TEST-1',
                description: 'Direct STK Payment',
                status: PaymentStatus.PENDING,
                getFormattedAmount: () => '500',
                update: mockPaymentUpdate
            });

            sequelize.transaction.mockResolvedValueOnce({
                commit: mockTransactionCommit,
                rollback: jest.fn(),
                finished: false
            });

            const result = await PaymentService.initiateDirectPayment({
                userId: 'user-123',
                phoneNumber: '0711222333',
                amount: 500,
                accountReference: 'ISP-TEST-1',
                description: 'Direct STK Payment'
            });

            expect(Payment.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    amount: 500,
                    reference: 'ISP-TEST-1'
                }),
                expect.any(Object)
            );
            expect(mockTransactionCommit).toHaveBeenCalled();
            expect(mockPaymentUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    checkoutRequestId: 'ws_CO_123456',
                    status: PaymentStatus.PENDING
                })
            );
            expect(result.success).toBe(true);
            expect(result.payment.checkoutRequestId).toBe('ws_CO_123456');
        });

        it('should reject invalid amount with 400 error', async () => {
            await expect(
                PaymentService.initiateDirectPayment({
                    userId: 'user-123',
                    phoneNumber: '0711222333',
                    amount: -100
                })
            ).rejects.toEqual(expect.objectContaining({ statusCode: 400 }));
        });
    });
});
