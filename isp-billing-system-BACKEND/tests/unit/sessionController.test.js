const { getActiveSessions, disconnectSessions } = require('../../src/controllers/sessionController');
const { RadAcct, Subscription, User, NetworkDevice, DataPlan } = require('../../src/models');
const { addProvisioningJob } = require('../../src/services/queue/queueManager');

jest.mock('../../src/services/queue/queueManager', () => ({
  addProvisioningJob: jest.fn().mockResolvedValue({ id: 'job-123' })
}));

describe('Active Sessions & Disconnect Controller (sessionController)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveSessions', () => {
    it('returns empty list and zero counts when no active sessions or subscriptions exist', async () => {
      jest.spyOn(RadAcct, 'findAll').mockResolvedValue([]);
      jest.spyOn(NetworkDevice, 'findAll').mockResolvedValue([]);
      jest.spyOn(Subscription, 'findAll').mockResolvedValue([]);

      const req = { query: { tab: 'all', page: 1, limit: 10 } };
      const res = {
        json: jest.fn()
      };

      await getActiveSessions(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sessions: [],
          counts: { all: 0, hotspot: 0, pppoe: 0, withoutExpiry: 0 },
          pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 }
        }
      });
    });

    it('aggregates PPPoE, Hotspot, and address_list connections into consolidated session list and counts', async () => {
      const mockRadAcct = [
        {
          radacctid: 101,
          username: 'pppoe-user@isp.net',
          framedipaddress: '10.0.0.50',
          callingstationid: 'AA:BB:CC:11:22:33',
          nasipaddress: '192.168.1.1',
          acctstarttime: new Date('2026-07-22T08:00:00Z'),
          acctstoptime: null
        },
        {
          radacctid: 102,
          username: 'voucher-XYZ890',
          framedipaddress: '10.5.0.12',
          callingstationid: '', // Blank MAC address test
          nasipaddress: '192.168.1.1',
          acctstarttime: new Date('2026-07-22T08:30:00Z'),
          acctstoptime: null
        }
      ];

      const mockDevices = [
        { id: 'dev-1', name: 'Main Core Router', ipAddress: '192.168.1.1' }
      ];

      const mockSubscriptions = [
        {
          id: 'sub-pppoe-1',
          userId: 'usr-1',
          connectionType: 'pppoe',
          networkIdentifier: 'pppoe-user@isp.net',
          subscriptionNumber: 'SUB-PPPOE-01',
          endDate: new Date('2026-08-22T00:00:00Z'),
          User: { email: 'pppoe-user@isp.net', firstName: 'John', lastName: 'Doe' },
          plan: { name: 'Fiber 20Mbps' },
          NetworkDevice: { id: 'dev-1', name: 'Main Core Router', ipAddress: '192.168.1.1' }
        },
        {
          id: 'sub-hotspot-1',
          userId: 'usr-2',
          connectionType: 'hotspot',
          networkIdentifier: 'voucher-XYZ890',
          subscriptionNumber: 'SUB-HOTSPOT-01',
          endDate: new Date('2026-07-23T00:00:00Z'),
          User: { email: 'hotspot-user@isp.net' },
          plan: { name: 'Hotspot 24H' },
          NetworkDevice: { id: 'dev-1', name: 'Main Core Router', ipAddress: '192.168.1.1' }
        },
        {
          id: 'sub-addr-1',
          userId: 'usr-3',
          connectionType: 'address_list',
          networkIdentifier: 'static-addr-user',
          subscriptionNumber: 'SUB-ADDR-01',
          ipAddress: '192.168.88.100',
          endDate: null, // Unlimited / Without Expiry test
          User: { email: 'static@isp.net', firstName: 'Static', lastName: 'User' },
          plan: { name: 'Static Unlimited' },
          NetworkDevice: { id: 'dev-1', name: 'Main Core Router', ipAddress: '192.168.1.1' }
        }
      ];

      jest.spyOn(RadAcct, 'findAll').mockResolvedValue(mockRadAcct);
      jest.spyOn(NetworkDevice, 'findAll').mockResolvedValue(mockDevices);
      jest.spyOn(Subscription, 'findAll').mockResolvedValue(mockSubscriptions);

      const req = { query: { tab: 'all', page: 1, limit: 10 } };
      const res = { json: jest.fn() };

      await getActiveSessions(req, res, jest.fn());

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0].data;

      // Verify overall counts
      expect(responseData.counts).toEqual({
        all: 3,
        pppoe: 1,
        hotspot: 1,
        withoutExpiry: 1
      });

      // Verify sessions array length
      expect(responseData.sessions).toHaveLength(3);

      // Verify MAC address fallback for blank callingstationid
      const hotspotSession = responseData.sessions.find(s => s.connectionType === 'hotspot');
      expect(hotspotSession.macAddress).toBe(' — ');

      // Verify address_list customer hybrid mapping
      const addrSession = responseData.sessions.find(s => s.connectionType === 'address_list');
      expect(addrSession).toBeDefined();
      expect(addrSession.isWithoutExpiry).toBe(true);
      expect(addrSession.ipAddress).toBe('192.168.88.100');

      // Verify router name join
      expect(responseData.sessions[0].routerName).toBe('Main Core Router');
    });

    it('filters sessions accurately by tab filter ("pppoe")', async () => {
      const mockRadAcct = [
        { radacctid: 1, username: 'user1@pppoe', acctstoptime: null },
        { radacctid: 2, username: 'voucher-1', acctstoptime: null }
      ];
      const mockSubscriptions = [
        { id: 's1', connectionType: 'pppoe', networkIdentifier: 'user1@pppoe' },
        { id: 's2', connectionType: 'hotspot', networkIdentifier: 'voucher-1' }
      ];

      jest.spyOn(RadAcct, 'findAll').mockResolvedValue(mockRadAcct);
      jest.spyOn(NetworkDevice, 'findAll').mockResolvedValue([]);
      jest.spyOn(Subscription, 'findAll').mockResolvedValue(mockSubscriptions);

      const req = { query: { tab: 'pppoe', page: 1, limit: 10 } };
      const res = { json: jest.fn() };

      await getActiveSessions(req, res, jest.fn());

      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData.sessions).toHaveLength(1);
      expect(responseData.sessions[0].connectionType).toBe('pppoe');
    });
  });

  describe('disconnectSessions', () => {
    it('returns 400 when no subscriptionIds are provided', async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await disconnectSessions(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No subscription identifiers provided for disconnect'
      });
    });

    it('queues BullMQ provisioning disable jobs via addProvisioningJob for provided subscriptionIds', async () => {
      const mockSubs = [
        { id: 'sub-1', userId: 'user-1' },
        { id: 'sub-2', userId: 'user-2' }
      ];
      jest.spyOn(Subscription, 'findAll').mockResolvedValue(mockSubs);

      const req = {
        body: { subscriptionIds: ['sub-1', 'sub-2'] },
        user: { id: 'admin-99' }
      };
      const res = { json: jest.fn() };

      await disconnectSessions(req, res, jest.fn());

      expect(addProvisioningJob).toHaveBeenCalledTimes(2);
      expect(addProvisioningJob).toHaveBeenCalledWith(
        'disable',
        expect.objectContaining({
          customerId: 'user-1',
          subscriptionId: 'sub-1',
          triggeredBy: 'admin_manual_disconnect:admin-99'
        }),
        expect.stringMatching(/^disconnect-sub-sub-1-\d+$/)
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Enqueued 2 session termination job(s) in provisioning queue',
        data: expect.objectContaining({
          queuedCount: 2
        })
      });
    });
  });
});
