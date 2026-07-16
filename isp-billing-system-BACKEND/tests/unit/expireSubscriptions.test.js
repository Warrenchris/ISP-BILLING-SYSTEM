const { runExpirySweep } = require('../../src/jobs/expireSubscriptions');
const { Subscription, NetworkDevice } = require('../../src/models');
const { addProvisioningJob } = require('../../src/services/queue/queueManager');

// Mock models and queue manager
jest.mock('../../src/models', () => ({
  Subscription: {
    findAll: jest.fn(),
  },
  NetworkDevice: {},
  sequelize: {
    literal: jest.fn(val => val),
  },
}));

jest.mock('../../src/services/queue/queueManager', () => ({
  addProvisioningJob: jest.fn(),
}));

describe('expireSubscriptions - runExpirySweep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should find expired subscriptions and update lastProvisioningAttempt when enqueued', async () => {
    const mockUpdate = jest.fn();
    const mockSubscription = {
      id: 'sub-1',
      userId: 'user-1',
      endDate: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      gracePeriodHours: 1,
      update: mockUpdate,
    };

    Subscription.findAll.mockResolvedValue([mockSubscription]);
    addProvisioningJob.mockResolvedValue({ id: 'job-1' });

    const result = await runExpirySweep();

    // Verify correct query limit and ordering
    expect(Subscription.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1000,
        order: [['endDate', 'ASC']],
      })
    );

    // Verify it enqueued job to BullMQ
    expect(addProvisioningJob).toHaveBeenCalledWith(
      'disable',
      expect.objectContaining({
        customerId: 'user-1',
        subscriptionId: 'sub-1',
        triggeredBy: 'cron:expiry',
      }),
      expect.stringContaining('disable-sub-1')
    );

    // Verify lastProvisioningAttempt is updated on subscription record
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        lastProvisioningAttempt: expect.any(Date),
      })
    );

    expect(result).toEqual({
      processed: 1,
      enqueued: 1,
      skipped: 0,
    });
  });
});
