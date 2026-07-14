/**
 * Unit Tests: RADIUS Sync Layer
 *
 * Verifies attribute mapping (rate-limits, timeouts, interim intervals)
 * from subscriptions/vouchers into radcheck/radreply/radusergroup tables.
 */

// Force mock mode
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const radiusSync = require('../../src/services/radius/syncUser');
const radiusHelper = require('../../src/services/radius/radiusHelper');
const RadCheck = require('../../src/models/radius/RadCheck');
const RadReply = require('../../src/models/radius/RadReply');
const RadUserGroup = require('../../src/models/radius/RadUserGroup');

// Mock Sequelize models
jest.mock('../../src/models/radius/RadCheck');
jest.mock('../../src/models/radius/RadReply');
jest.mock('../../src/models/radius/RadUserGroup');
jest.mock('../../src/models/radius/RadAcct');

describe('RADIUS Helper — Rate Limit Formatting', () => {
  test('formats symmetric rate limit from plan speed display string', () => {
    const plan = { speed: '10 Mbps' };
    const limit = radiusHelper.buildMikrotikRateLimit(plan);
    expect(limit).toBe('10240k/10240k');
  });

  test('formats rate limit from explicit speed columns', () => {
    const plan = {
      downloadSpeedKbps: 5120,
      uploadSpeedKbps: 2048,
      toMikrotikRateLimit: () => '5120k/2048k',
    };
    const limit = radiusHelper.buildMikrotikRateLimit(plan);
    expect(limit).toBe('5120k/2048k');
  });

  test('formats rate limit with burst parameters', () => {
    const plan = {
      downloadSpeedKbps: 10000,
      uploadSpeedKbps: 5000,
      burstDownloadKbps: 20000,
      burstUploadKbps: 10000,
      toMikrotikRateLimit() {
        return `${this.downloadSpeedKbps}k/${this.uploadSpeedKbps}k ${this.burstDownloadKbps}k/${this.burstUploadKbps}k ${this.downloadSpeedKbps}k/${this.uploadSpeedKbps}k 16/16 8`;
      },
    };
    const limit = radiusHelper.buildMikrotikRateLimit(plan);
    expect(limit).toBe('10000k/5000k 20000k/10000k 10000k/5000k 16/16 8');
  });

  test('returns null if no speed is set', () => {
    const plan = {};
    const limit = radiusHelper.buildMikrotikRateLimit(plan);
    expect(limit).toBeNull();
  });
});

describe('RADIUS Helper — Interim Interval Selection', () => {
  test('returns 60s for data-capped plans', () => {
    const sub = { plan: { dataLimit: 500 } };
    expect(radiusHelper.getAcctInterimInterval(sub)).toBe(60);
  });

  test('returns 60s if voucher has a data cap', () => {
    const sub = { plan: { dataLimit: 999999 } }; // Plan is unlimited
    const voucher = { dataLimitMb: 100 }; // Voucher has data cap
    expect(radiusHelper.getAcctInterimInterval(sub, voucher)).toBe(60);
  });

  test('returns 300s (5 min) for unlimited plans', () => {
    const sub = { plan: { dataLimit: 999999 } }; // Practically unlimited
    expect(radiusHelper.getAcctInterimInterval(sub)).toBe(300);
  });
});

describe('RADIUS Sync Layer', () => {
  let mockPlan;
  let mockSub;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlan = {
      id: 'plan-123',
      name: 'Premium Plan',
      downloadSpeedKbps: 10240,
      uploadSpeedKbps: 10240,
      dataLimit: 999999, // Unlimited
      sessionTimeoutSeconds: 3600,
      toMikrotikRateLimit: () => '10240k/10240k',
    };

    mockSub = {
      id: 'sub-456',
      userId: 'user-789',
      plan: mockPlan,
      networkIdentifier: 'pppoe-username',
      getDecryptedRadiusPassword: () => 'secure-pppoe-password',
    };

    RadCheck.destroy.mockResolvedValue(1);
    RadReply.destroy.mockResolvedValue(1);
    RadUserGroup.destroy.mockResolvedValue(1);
  });

  test('syncs attributes to radcheck, radreply, and radusergroup', async () => {
    await radiusSync.syncToRadius(mockSub, {
      radiusUsername: 'pppoe-username',
      password: 'secure-pppoe-password',
    });

    // Verify destroy (idempotency check)
    expect(RadCheck.destroy).toHaveBeenCalledWith({ where: { username: 'pppoe-username' } });
    expect(RadReply.destroy).toHaveBeenCalledWith({ where: { username: 'pppoe-username' } });
    expect(RadUserGroup.destroy).toHaveBeenCalledWith({ where: { username: 'pppoe-username' } });

    // Verify radcheck password insertion
    expect(RadCheck.create).toHaveBeenCalledWith({
      username: 'pppoe-username',
      attribute: 'Cleartext-Password',
      op: ':=',
      value: 'secure-pppoe-password',
    });

    // Verify radreply insertion
    expect(RadReply.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ attribute: 'Mikrotik-Rate-Limit', value: '10240k/10240k' }),
        expect.objectContaining({ attribute: 'Session-Timeout', value: '3600' }),
        expect.objectContaining({ attribute: 'Acct-Interim-Interval', value: '300' }),
      ])
    );

    // Verify group mapping
    expect(RadUserGroup.create).toHaveBeenCalledWith({
      username: 'pppoe-username',
      groupname: 'plan-plan-123',
      priority: 1,
    });
  });

  test('removes entries from all tables when removeFromRadius is called', async () => {
    await radiusSync.removeFromRadius('pppoe-username');

    expect(RadCheck.destroy).toHaveBeenCalledWith({ where: { username: 'pppoe-username' } });
    expect(RadReply.destroy).toHaveBeenCalledWith({ where: { username: 'pppoe-username' } });
    expect(RadUserGroup.destroy).toHaveBeenCalledWith({ where: { username: 'pppoe-username' } });
  });
});
