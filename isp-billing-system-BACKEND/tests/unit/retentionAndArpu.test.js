/**
 * Unit Tests: Retention Rate, ARPU Edge Cases, and SMS Balance Provider
 */

const dashboardController = require('../../src/controllers/dashboardController');
const { getSmsBalance } = require('../../src/services/sms/smsClient');
const { Subscription, DataPlan, Payment, RadAcct, sequelize } = require('../../src/models');

jest.mock('../../src/models', () => ({
  Subscription: {
    count: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    sum: jest.fn().mockResolvedValue(0),
  },
  DataPlan: {
    findAll: jest.fn().mockResolvedValue([]),
  },
  Payment: {
    sum: jest.fn().mockResolvedValue(0),
  },
  RadAcct: {
    count: jest.fn().mockResolvedValue(0),
  },
  User: {
    findAll: jest.fn().mockResolvedValue([]),
  },
  sequelize: {
    query: jest.fn().mockResolvedValue([[]]),
  },
}));

describe('Retention Rate & ARPU Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: {} };
    res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    next = jest.fn();

    // Default fast mocks for raw queries
    sequelize.query.mockResolvedValue([[]]);
  });

  describe('getRetentionTrend (Point-in-Time Methodology)', () => {
    test('calculates correct retention rate using point-in-time snapshot methodology', async () => {
      // Mock 18 Subscription.count calls (3 per month for 6 months)
      Subscription.count.mockImplementation((options) => {
        // Return 100 for activeStart, 110 for activeEnd, 20 for newSignups
        const where = options.where || {};
        if (where.created_at) return Promise.resolve(20); // newSignups
        if (where.startDate && where.startDate[Object.getOwnPropertySymbols(where.startDate)[0]] === undefined) {
          // Op.lte -> activeEnd
          return Promise.resolve(110);
        }
        return Promise.resolve(100); // activeStart
      });

      await dashboardController.getRetentionTrend(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(6);

      const latestMonth = response.data[5];
      expect(latestMonth.activeStart).toBe(100);
      expect(latestMonth.activeEnd).toBe(110);
      expect(latestMonth.newSignups).toBe(20);

      // Formula: (activeEnd - newSignups) / activeStart * 100
      // (110 - 20) / 100 * 100 = 90.0%
      expect(latestMonth.retentionRate).toBe(90.0);
      expect(latestMonth.churnRate).toBe(10.0);
    });

    test('handles 0 activeStart gracefully without divide-by-zero/NaN', async () => {
      Subscription.count.mockImplementation((options) => {
        const where = options.where || {};
        if (where.created_at) return Promise.resolve(5);
        return Promise.resolve(0); // activeStart = 0
      });

      await dashboardController.getRetentionTrend(req, res, next);

      const response = res.json.mock.calls[0][0];
      const latestMonth = response.data[5];
      expect(latestMonth.activeStart).toBe(0);
      expect(latestMonth.retentionRate).toBe(100.0);
      expect(Number.isNaN(latestMonth.retentionRate)).toBe(false);
    });
  });

  describe('Package Performance & ARPU Division-by-Zero Protection', () => {
    test('returns ARPU = 0 and avgDataUsageMB = 0 when activeSubscribers = 0', async () => {
      DataPlan.findAll.mockResolvedValue([
        { id: 'plan-1', name: 'Starter Plan', price: 1000 },
      ]);
      Subscription.count.mockResolvedValue(0); // 0 active subscribers
      Subscription.findAll.mockResolvedValue([]);
      Payment.sum.mockResolvedValue(0);
      Subscription.sum.mockResolvedValue(0);
      RadAcct.count.mockResolvedValue(0);

      await dashboardController.getCentipidParityData(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);

      const pkg = response.data.packagePerformance[0];
      expect(pkg.activeSubscribers).toBe(0);
      expect(pkg.arpu).toBe(0);
      expect(pkg.avgDataUsageMB).toBe(0);
      expect(Number.isNaN(pkg.arpu)).toBe(false);
    });

    test('calculates correct ARPU = monthlyRevenue / activeSubscribers when active > 0', async () => {
      DataPlan.findAll.mockResolvedValue([
        { id: 'plan-2', name: 'BAMBIKA', price: 1500 },
      ]);
      Subscription.count.mockResolvedValue(100); // 100 active subscribers
      Subscription.findAll.mockResolvedValue([{ id: 'sub-1' }]);
      Payment.sum.mockResolvedValue(150000); // Monthly revenue 150,000 KES
      Subscription.sum.mockResolvedValue(500 * 1024 * 1024 * 100); // 500 MB per sub

      await dashboardController.getCentipidParityData(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pkg = response.data.packagePerformance[0];
      expect(pkg.activeSubscribers).toBe(100);
      expect(pkg.monthlyRevenue).toBe(150000);
      expect(pkg.arpu).toBe(1500); // 150000 / 100 = 1500
    });
  });

  describe('SMS Balance Provider', () => {
    test('returns mock balance with provider="mock" when in mock mode', async () => {
      process.env.MOCK_MIKROTIK = 'true';
      const balance = await getSmsBalance();
      expect(balance.success).toBe(true);
      expect(balance.provider).toBe('mock');
      expect(balance.balance).toContain('KES');
    });
  });
});
