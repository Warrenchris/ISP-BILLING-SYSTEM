const request = require('supertest');

// Setup Env Vars for M-Pesa Config Middleware
process.env.MPESA_CONSUMER_KEY = 'test_key';
process.env.MPESA_CONSUMER_SECRET = 'test_secret';
process.env.MPESA_CALLBACK_URL = 'http://test.com/callback';
process.env.MPESA_PASS_KEY = 'test_passkey';
process.env.MPESA_SHORTCODE = '174379';

// 1. Mock the PaymentService INSTANCE
const mockPaymentService = {
    initiateSubscriptionPayment: jest.fn(),
    processCallback: jest.fn(),
    retryPayment: jest.fn(),
    createCashPayment: jest.fn(),
};

jest.mock('../../src/services/paymentService', () => mockPaymentService);

// 2. Mock Auth Middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 'user-123', role: 'customer' };
        next();
    },
    authorize: () => (req, res, next) => next(),
    restrictTo: (...roles) => (req, res, next) => next(),
    protect: (req, res, next) => {
        req.user = { id: 'user-123', role: 'customer' };
        next();
    },
}));

// 3. Mock Models
jest.mock('../../src/models', () => ({
    Payment: {
        findAndCountAll: jest.fn(),
    },
    Subscription: {},
    DataPlan: {},
    User: {},
    sequelize: {},
}));

const app = require('../../src/app');

describe('Payment Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/payments/subscription', () => {
        it('should call PaymentService.initiateSubscriptionPayment on valid input', async () => {
            mockPaymentService.initiateSubscriptionPayment.mockResolvedValue({
                success: true,
                message: 'Payment initiated',
                payment: { id: 'pay-123', status: 'pending' }
            });

            const res = await request(app)
                .post('/api/payments/subscription')
                .send({
                    subscriptionId: '123e4567-e89b-12d3-a456-426614174000',
                    phoneNumber: '0712345678',
                    amount: 1000
                });

            expect(res.status).toBe(200);
            expect(mockPaymentService.initiateSubscriptionPayment).toHaveBeenCalledWith(
                'user-123',
                '123e4567-e89b-12d3-a456-426614174000',
                '254712345678'
            );
            expect(res.body.success).toBe(true);
        });

        it('should return 400 for invalid phone number', async () => {
            const res = await request(app)
                .post('/api/payments/subscription')
                .send({
                    subscriptionId: '123e4567-e89b-12d3-a456-426614174000',
                    phoneNumber: 'invalid-phone',
                    amount: 1000
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Invalid phone number/i);
            expect(mockPaymentService.initiateSubscriptionPayment).not.toHaveBeenCalled();
        });

        it('should return 400 for missing subscriptionId', async () => {
            const res = await request(app)
                .post('/api/payments/subscription')
                .send({
                    phoneNumber: '0712345678',
                    amount: 1000
                });

            expect(res.status).toBe(400);
            expect(mockPaymentService.initiateSubscriptionPayment).not.toHaveBeenCalled();
        });
    });
});
