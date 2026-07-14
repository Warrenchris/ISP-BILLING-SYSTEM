/**
 * Integration Tests: Real-Time Bandwidth Telemetry & AI Alerts
 *
 * Verifies:
 *   1. Accounting sweep gates connection types between radacct and simple queues.
 *   2. RADIUS sums all sessions (active/closed) to prevent disconnect boundary loss.
 *   3. Simple queues match targets in bulk to avoid the N-calls trap.
 *   4. Counter resets are correctly handled (delta becomes current, starts fresh).
 *   5. Telemetry writes daily rollups into the data_usage table atomically.
 *   6. Node proxy parses anomaly spikes and dispatches deduplicated admin alert SMS.
 */

// Force mock mode
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const { runAccountingSweep } = require('../../src/jobs/accountingWatcher');
const aiController = require('../../src/ai/aiController');
const { Subscription, RadAcct, NetworkDevice, DataPlan, DataUsage, User, sequelize } = require('../../src/models');

// Mock MikroTik Client
jest.mock('../../src/services/mikrotik/client', () => ({
  execute: jest.fn().mockImplementation(async (device, cmd, args) => {
    if (cmd === '/queue/simple/print') {
      return [
        {
          name: 'queue-10.5.50.15',
          target: '10.5.50.15/32',
          bytes: '2097152/5242880', // 2 MB upload / 5 MB download
        },
      ];
    }
    return [];
  }),
}));

// Mock sms/queueManager helpers
jest.mock('../../src/services/queue/queueManager', () => ({
  addProvisioningJob: jest.fn().mockResolvedValue(true),
  addSmsJob: jest.fn().mockResolvedValue(true),
}));

// Mock AI Service helper
jest.mock('../../src/ai/aiController', () => {
  const original = jest.requireActual('../../src/ai/aiController');
  return {
    ...original,
    callAiService: jest.fn(),
  };
});

describe('Integration — Bandwidth Telemetry & Anomaly alerts', () => {
  let mockRadiusSub;
  let mockQueueSub;
  let mockDevice;
  let mockPlan;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlan = {
      id: 'plan-telemetry-1',
      name: 'Unlimited HighSpeed',
      dataLimit: 10000, // 10 GB
    };

    mockDevice = {
      id: 'device-telemetry-1',
      name: 'RouterCoreA',
      isActive: true,
    };

    mockRadiusSub = {
      id: 'sub-radius-123',
      userId: 'user-radius-123',
      connectionType: 'pppoe',
      networkIdentifier: 'radius_user_p',
      networkDeviceId: 'device-telemetry-1',
      lastDownloadBytesCounter: 104857600, // 100 MB
      lastUploadBytesCounter: 52428800,    // 50 MB
      dataUsed: 150,
      dataRemaining: 9850,
      plan: mockPlan,
      NetworkDevice: mockDevice,
      update: jest.fn().mockResolvedValue(true),
      increment: jest.fn().mockResolvedValue(true),
      decrement: jest.fn().mockResolvedValue(true),
    };

    mockQueueSub = {
      id: 'sub-queue-123',
      userId: 'user-queue-123',
      connectionType: 'address_list',
      networkIdentifier: '10.5.50.15', // Matches target simple queue!
      networkDeviceId: 'device-telemetry-1',
      lastDownloadBytesCounter: 0,
      lastUploadBytesCounter: 0,
      dataUsed: 0,
      dataRemaining: 10000,
      plan: mockPlan,
      NetworkDevice: mockDevice,
      update: jest.fn().mockResolvedValue(true),
      increment: jest.fn().mockResolvedValue(true),
      decrement: jest.fn().mockResolvedValue(true),
    };

    // Models hooks
    Subscription.findAll = jest.fn().mockResolvedValue([mockRadiusSub, mockQueueSub]);
    Subscription.findByPk = jest.fn().mockImplementation((id) => {
      if (id === 'sub-radius-123') return Promise.resolve(mockRadiusSub);
      if (id === 'sub-queue-123') return Promise.resolve(mockQueueSub);
      return Promise.resolve(null);
    });

    RadAcct.findOne = jest.fn().mockResolvedValue({
      downloadBytes: '115343360', // 110 MB (10 MB delta)
      uploadBytes: '54525952',    // 52 MB (2 MB delta)
    });

    DataUsage.findOrCreate = jest.fn().mockResolvedValue([
      {
        id: 'daily-sample-123',
        increment: jest.fn().mockResolvedValue(true),
      },
    ]);

    const mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    };
    sequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);
  });

  test('AccountingWatcher computes exact delta bytes for RADIUS active/closed sum', async () => {
    await runAccountingSweep();

    // Sum is queried globally across sessions
    expect(RadAcct.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.any(Array),
        where: { username: 'radius_user_p' },
      })
    );

    // Verifies atomic update of increment/decrement called on sub
    expect(mockRadiusSub.decrement).toHaveBeenCalledWith(
      { dataRemaining: 12 }, // 10MB dl + 2MB ul = 12 MB delta
      expect.any(Object)
    );
    expect(mockRadiusSub.increment).toHaveBeenCalledWith(
      { dataUsed: 12 },
      expect.any(Object)
    );

    // Verifies raw counters saved to sub for next run
    expect(mockRadiusSub.update).toHaveBeenCalledWith(
      expect.objectContaining({
        lastDownloadBytesCounter: 115343360,
        lastUploadBytesCounter: 54525952,
      }),
      expect.any(Object)
    );
  });

  test('AccountingWatcher matches MikroTik bulk queue target IP to sub networkIdentifier', async () => {
    await runAccountingSweep();

    // Verify sub-queue-123 matched target queue (bytes: 2097152/5242880)
    // Delta should be 5 MB DL + 2 MB UL = 7 MB delta (since previous counters were 0/0)
    expect(mockQueueSub.decrement).toHaveBeenCalledWith(
      { dataRemaining: 7 },
      expect.any(Object)
    );
    expect(mockQueueSub.increment).toHaveBeenCalledWith(
      { dataUsed: 7 },
      expect.any(Object)
    );
  });

  test('AccountingWatcher handles raw counter resets by starting fresh', async () => {
    // Current is less than last recorded counter (reboot reset)
    mockRadiusSub.lastDownloadBytesCounter = 200000000; // 200 MB
    RadAcct.findOne.mockResolvedValue({
      downloadBytes: '10485760', // 10 MB (Reset!)
      uploadBytes: '5242880',    // 5 MB
    });

    await runAccountingSweep();

    // Delta dlDelta should become 10 MB and ulDelta 5 MB (15 MB total)
    expect(mockRadiusSub.decrement).toHaveBeenCalledWith(
      { dataRemaining: 15 },
      expect.any(Object)
    );
  });

  test('AccountingWatcher groups usage samples exactly by daily-aggregated rows', async () => {
    await runAccountingSweep();

    const dateStr = new Date().toISOString().split('T')[0];
    expect(DataUsage.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: `daily-sub-radius-123-${dateStr}` },
      })
    );
  });

  test('getAnomalies dispatches admin warning SMS for critical usage spikes', async () => {
    // Mock response payload from Flask service with usage spike z_score > 3
    const mockFlaskPayload = {
      success: true,
      data: {
        anomalies: [
          {
            type: 'usage_spike',
            user_id: 'user-telemetry-99',
            customer_name: 'Bypass Buyer',
            current_usage_mb: 500000.0, // 500 GB
            z_score: 4.5,
            severity: 'critical',
          },
        ],
      },
    };

    // Override callAiService mock to return success payload
    const { callAiService } = require('../../src/ai/aiController');
    callAiService.mockResolvedValue({
      status: 200,
      data: mockFlaskPayload,
    });

    const mockAdmin = {
      id: 'admin-user-1',
      phoneNumber: '+254700111222',
      role: 'admin',
    };
    User.findOne = jest.fn().mockResolvedValue(mockAdmin);

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await aiController.getAnomalies(req, res);

    const { addSmsJob } = require('../../src/services/queue/queueManager');
    const dateStr = new Date().toISOString().split('T')[0];

    // SMS alert is enqueued directly to admin phone
    expect(addSmsJob).toHaveBeenCalledWith(
      '+254700111222',
      'admin_alert',
      expect.objectContaining({
        message: expect.stringContaining('Critical usage anomaly detected'),
      }),
      'admin',
      `admin-anomaly-user-telemetry-99-${dateStr}` // Deduplicated jobId
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockFlaskPayload);
  });
});
