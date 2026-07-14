/**
 * Integration Tests: Voucher Redemption & RADIUS Accounting Cap Flow
 *
 * Verifies the full integration flow:
 *   1. Voucher batch generation
 *   2. Voucher redemption (creates subscription + RADIUS credentials)
 *   3. Data usage accumulation (simulated via radacct entries)
 *   4. Data cap breach sweep (enqueues disable job + suspends user)
 */

// Force mock mode
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const voucherService = require('../../src/services/voucherService');
const { runAccountingSweep } = require('../../src/jobs/accountingWatcher');
const { addProvisioningJob } = require('../../src/services/queue/queueManager');

const { Voucher, DataPlan, Subscription, User, RadCheck, RadReply, RadUserGroup, RadAcct, sequelize } = require('../../src/models');

// Mock BullMQ queue manager
jest.mock('../../src/services/queue/queueManager', () => ({
  addProvisioningJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
}));

describe('Integration — Voucher Flow & RADIUS Cap Enforcement', () => {
  let mockPlan;
  let mockVoucher;
  let mockCustomer;
  let mockSub;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlan = {
      id: 'plan-cap-1',
      name: '1GB Hotspot Voucher Plan',
      price: 50,
      dataLimit: 1024, // 1 GB (1024 MB)
      validityPeriod: 1, // 1 day
      isActive: true,
      toMikrotikRateLimit: () => '10240k/10240k',
    };

    mockVoucher = {
      id: 'voucher-uuid',
      code: 'VCHR-1234',
      planId: 'plan-cap-1',
      price: 50,
      status: 'unused',
      plan: mockPlan,
      update: jest.fn().mockImplementation(function (updates) {
        Object.assign(this, updates);
        return Promise.resolve(this);
      }),
    };

    mockCustomer = {
      id: 'cust-uuid',
      firstName: 'Alvin',
      lastName: 'Chipmunk',
      phoneNumber: '0711223344',
    };

    mockSub = {
      id: 'sub-voucher-uuid',
      userId: 'cust-uuid',
      planId: 'plan-cap-1',
      plan: mockPlan,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day validity
      dataUsed: 0,
      dataRemaining: 1024,
      connectionType: 'hotspot',
      networkDeviceId: 'router-uuid',
      networkIdentifier: 'voucher-VCHR-1234',
      getDecryptedRadiusPassword: () => 'voucher-radius-password',
      update: jest.fn().mockResolvedValue(true),
    };

    DataPlan.findByPk = jest.fn().mockResolvedValue(mockPlan);
    Voucher.findOne = jest.fn().mockResolvedValue(mockVoucher);
    User.findByPk = jest.fn().mockResolvedValue(mockCustomer);
    Subscription.create = jest.fn().mockResolvedValue(mockSub);
    Subscription.findAll = jest.fn().mockResolvedValue([mockSub]);
    Voucher.bulkCreate = jest.fn().mockImplementation(records => Promise.resolve(records));
    Voucher.generateUniqueCodes = jest.fn().mockResolvedValue(['VCHR-1234']);

    RadCheck.destroy = jest.fn().mockResolvedValue(1);
    RadCheck.create = jest.fn().mockResolvedValue({});
    RadReply.destroy = jest.fn().mockResolvedValue(1);
    RadReply.bulkCreate = jest.fn().mockResolvedValue([]);
    RadUserGroup.destroy = jest.fn().mockResolvedValue(1);
    RadUserGroup.create = jest.fn().mockResolvedValue({});
    RadAcct.findOne = jest.fn();

    // Mock transaction
    const mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
      LOCK: { UPDATE: 'UPDATE' },
    };
    sequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);
  });

  test('full redemption to sync integration', async () => {
    // 1. Redeem voucher
    const redemption = await voucherService.redeemVoucher('VCHR-1234', 'cust-uuid', {
      networkDeviceId: 'router-uuid',
    });

    expect(redemption.voucher.status).toBe('active');
    expect(redemption.subscription.connectionType).toBe('hotspot');
    expect(redemption.radiusUsername).toBe('voucher-VCHR-1234');

    // Verify subscription was created with right connections
    expect(Subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: 'hotspot',
        networkIdentifier: 'voucher-VCHR-1234',
        networkDeviceId: 'router-uuid',
      }),
      expect.any(Object)
    );
  });

  test('accountingWatcher: active session under cap is not disabled', async () => {
    // Mock RadAcct session under limit (e.g. 500 MB used out of 1024 MB limit)
    // 500 MB = 524,288,000 bytes
    RadAcct.findOne.mockResolvedValue({
      downloadBytes: 300 * 1024 * 1024,
      uploadBytes: 200 * 1024 * 1024,
    });

    const result = await runAccountingSweep();

    // Check we processed the user but did not trigger a cutoff
    expect(result.processed).toBe(1);
    expect(result.cutoffs).toBe(0);

    // Assert that no disable job was queued
    expect(addProvisioningJob).not.toHaveBeenCalled();
    expect(mockSub.update).not.toHaveBeenCalled();
  });

  test('accountingWatcher: active session breaching cap is disabled immediately', async () => {
    // Mock RadAcct session exceeding limit (e.g. 1100 MB used out of 1024 MB limit)
    RadAcct.findOne.mockResolvedValue({
      downloadBytes: 800 * 1024 * 1024,
      uploadBytes: 300 * 1024 * 1024,
    });

    const result = await runAccountingSweep();

    // Check we processed the user and triggered a cutoff
    expect(result.processed).toBe(1);
    expect(result.cutoffs).toBe(1);

    // Assert that a disable job was enqueued in BullMQ
    expect(addProvisioningJob).toHaveBeenCalledWith(
      'disable',
      expect.objectContaining({
        customerId: 'cust-uuid',
        subscriptionId: 'sub-voucher-uuid',
        triggeredBy: 'cron:data-cap',
      }),
      expect.stringContaining('data-cap-sub-voucher-uuid')
    );

    // Verify subscription database values are updated
    expect(mockSub.update).toHaveBeenCalledWith(
      expect.objectContaining({
        dataRemaining: 0,
        status: 'suspended',
        suspensionReason: 'Auto-suspended: Data cap limit reached',
      })
    );
  });
});
