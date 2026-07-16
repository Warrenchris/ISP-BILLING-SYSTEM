/**
 * Unit Tests: Admin Controller RADIUS Resync
 */

process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const adminController = require('../../src/controllers/adminController');
const { Subscription } = require('../../src/models');
const radiusSync = require('../../src/services/radius/syncUser');

// Mock Models
jest.mock('../../src/models', () => ({
  Subscription: {
    findAll: jest.fn(),
  },
  DataPlan: {},
}));

// Mock RADIUS sync User
jest.mock('../../src/services/radius/syncUser', () => ({
  syncToRadius: jest.fn().mockResolvedValue(true),
}));

// Mock Queue Manager
jest.mock('../../src/services/queue/queueManager', () => {
  const mockQueue = {
    getJobCounts: jest.fn().mockResolvedValue({
      active: 1,
      completed: 2,
      failed: 3,
      delayed: 4,
      waiting: 5,
    }),
  };
  return {
    getRedisConnection: jest.fn(),
    getProvisioningQueue: jest.fn(() => mockQueue),
    getExpiryQueue: jest.fn(() => mockQueue),
    getReconciliationQueue: jest.fn(() => mockQueue),
    getSmsQueue: jest.fn(() => mockQueue),
    getVoucherQueue: jest.fn(() => mockQueue),
  };
});

describe('Admin Controller — resyncAllBandwidth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('resyncs all active subscriptions successfully', async () => {
    const mockSubs = [
      {
        id: 'sub-1',
        networkIdentifier: 'customer_1_pppoe',
        status: 'active',
      },
      {
        id: 'sub-2',
        networkIdentifier: 'customer_2_pppoe',
        status: 'active',
      },
      {
        id: 'sub-3',
        networkIdentifier: null, // Should be skipped safely
        status: 'active',
      }
    ];

    Subscription.findAll.mockResolvedValue(mockSubs);

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await adminController.resyncAllBandwidth(req, res, next);

    expect(Subscription.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'active' },
        include: expect.any(Array),
      })
    );

    // Verify syncToRadius called for sub-1 and sub-2, but not sub-3
    expect(radiusSync.syncToRadius).toHaveBeenCalledTimes(2);
    expect(radiusSync.syncToRadius).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub-1' }),
      { radiusUsername: 'customer_1_pppoe' }
    );
    expect(radiusSync.syncToRadius).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub-2' }),
      { radiusUsername: 'customer_2_pppoe' }
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Successfully resynced 2 active subscriptions in RADIUS',
      data: {
        resyncedCount: 2,
        totalActive: 3,
      }
    });
  });

  test('handles errors and passes to next middleware', async () => {
    const error = new Error('Database connection failed');
    Subscription.findAll.mockRejectedValue(error);

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await adminController.resyncAllBandwidth(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('Admin Controller — getQueueStats', () => {
  test('returns job counts for all BullMQ queues successfully', async () => {
    const req = {};
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await adminController.getQueueStats(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        queues: expect.objectContaining({
          provisioning: expect.objectContaining({ active: 1, completed: 2, failed: 3 }),
          sms: expect.objectContaining({ active: 1, completed: 2, failed: 3 }),
          voucherGeneration: expect.objectContaining({ active: 1, completed: 2, failed: 3 }),
        })
      })
    );
  });
});
