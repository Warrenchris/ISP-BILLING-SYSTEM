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
const mockPaymentModel = {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
};

jest.mock('../../src/models', () => ({
    Payment: mockPaymentModel,
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

    describe('POST /api/payments/mpesa/callback/:token', () => {
        const testToken = 'super_secure_callback_token_123';

        beforeEach(() => {
            process.env.MPESA_CALLBACK_TOKEN = testToken;
            delete process.env.BYPASS_IP_CHECK;
        });

        it('should reject request with 403 if IP is not allowlisted', async () => {
            const res = await request(app)
                .post(`/api/payments/mpesa/callback/${testToken}`)
                .set('x-forwarded-for', '8.8.8.8') // Non-allowlisted IP
                .send({
                    Body: {
                        stkCallback: {
                            CheckoutRequestID: 'ws_CO_1234',
                            MerchantRequestID: '123456',
                            ResultCode: 0
                        }
                    }
                });

            expect(res.status).toBe(403);
            expect(res.body.ResultCode).toBe(1);
            expect(res.body.ResultDesc).toMatch(/IP not allowlisted/i);
        });

        it('should reject request with 403 if token is invalid', async () => {
            const res = await request(app)
                .post('/api/payments/mpesa/callback/wrong_token')
                .set('x-forwarded-for', '196.201.214.200') // Allowlisted IP
                .send({
                    Body: {
                        stkCallback: {
                            CheckoutRequestID: 'ws_CO_1234',
                            MerchantRequestID: '123456',
                            ResultCode: 0
                        }
                    }
                });

            expect(res.status).toBe(403);
            expect(res.body.ResultCode).toBe(1);
            expect(res.body.ResultDesc).toMatch(/Invalid token/i);
        });

        it('should proceed to structure check if IP and token are valid', async () => {
            // Mock findOne to return a pending payment
            mockPaymentModel.findOne.mockResolvedValue({
                id: 'pay-123',
                status: 'pending',
            });

            mockPaymentService.processCallback.mockResolvedValue({
                success: true,
                message: 'Callback processed successfully'
            });

            const res = await request(app)
                .post(`/api/payments/mpesa/callback/${testToken}`)
                .set('x-forwarded-for', '196.201.214.200') // Allowlisted IP
                .send({
                    Body: {
                        stkCallback: {
                            CheckoutRequestID: 'ws_CO_1234',
                            MerchantRequestID: '123456',
                            ResultCode: 0
                        }
                    }
                });

            // Since it passed the security guards, it reached the logic (which is mocked or returns success)
            expect(res.status).toBe(200);
            expect(mockPaymentModel.findOne).toHaveBeenCalled();
        });
    });
});
