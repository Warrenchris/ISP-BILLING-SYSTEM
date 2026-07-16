/**
 * Unit Tests: Voucher worker processor and failed job event handling
 */

process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const voucherService = require('../../src/services/voucherService');
const { Payment } = require('../../src/models');
const { addSmsJob } = require('../../src/services/queue/queueManager');

// Mock voucherService
jest.mock('../../src/services/voucherService', () => ({
  purchaseVoucherRemote: jest.fn(),
}));

// Mock queueManager
jest.mock('../../src/services/queue/queueManager', () => ({
  getRedisConnection: jest.fn().mockReturnValue({}),
  addSmsJob: jest.fn().mockResolvedValue(true),
}));

// Mock Models
jest.mock('../../src/models', () => ({
  Payment: {
    findByPk: jest.fn(),
  },
}));

// Mock BullMQ Worker
let mockFailedHandler = null;
jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation((queueName, processor, opts) => {
      return {
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'failed') {
            mockFailedHandler = handler;
          }
        }),
        close: jest.fn().mockResolvedValue(true),
      };
    }),
  };
});

describe('Voucher Worker Unit Tests', () => {
  let mockPayment;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPayment = {
      id: 'pay-vchr-123',
      phoneNumber: '+254711000000',
      userId: 'user-123',
      callbackData: { planId: 'plan-123' },
      update: jest.fn().mockResolvedValue(true),
    };
    Payment.findByPk.mockResolvedValue(mockPayment);
  });

  test('processJob generates voucher and updates payment successfully', async () => {
    const voucherWorkerFile = require('../../src/services/queue/voucherWorker');

    voucherService.purchaseVoucherRemote.mockResolvedValue({
      id: 'vchr-123',
      code: 'VCHR-9999',
    });

    const job = {
      data: {
        paymentId: 'pay-vchr-123',
        phone: '+254711000000',
        planId: 'plan-123',
        userId: 'user-123',
      },
    };

    const result = await voucherWorkerFile.processJob(job);

    expect(result.voucherCode).toBe('VCHR-9999');
    expect(voucherService.purchaseVoucherRemote).toHaveBeenCalledWith(
      '+254711000000',
      'plan-123',
      'user-123'
    );
    expect(mockPayment.update).toHaveBeenCalledWith({
      callbackData: {
        planId: 'plan-123',
        voucherCode: 'VCHR-9999',
      },
    });
  });

  test('processJob throws if payment not found', async () => {
    Payment.findByPk.mockResolvedValue(null);

    const voucherWorkerFile = require('../../src/services/queue/voucherWorker');

    const job = {
      data: { paymentId: 'invalid-id' },
    };

    await expect(voucherWorkerFile.processJob(job)).rejects.toThrow(/Payment invalid-id not found/);
  });

  test('failed event handler flags payment and sends admin alert on exhaustion', async () => {
    const voucherWorkerFile = require('../../src/services/queue/voucherWorker');
    voucherWorkerFile.startWorker();

    const job = {
      data: {
        paymentId: 'pay-vchr-123',
        phone: '+254711000000',
        planId: 'plan-123',
      },
      id: 'job-123',
    };

    const error = new Error('Voucher service connection timeout');

    // Trigger the failed listener
    await mockFailedHandler(job, error);

    // Verify payment is flagged
    expect(mockPayment.update).toHaveBeenCalledWith({
      callbackData: {
        planId: 'plan-123',
        voucherGenerationFailed: true,
      },
    });

    // Verify admin alert SMS is queued
    expect(addSmsJob).toHaveBeenCalledWith(
      expect.any(String),
      'admin_alert',
      expect.objectContaining({
        message: expect.stringContaining('voucher generation for plan plan-123 failed permanently'),
      }),
      'admin',
      'admin-alert-voucher-failed-pay-vchr-123'
    );
  });
});
