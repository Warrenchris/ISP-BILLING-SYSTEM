const { Subscription } = require('../../src/models');
const { SubscriptionStatus } = require('../../src/config/constants');

describe('Subscription Calculations and Validations', () => {
  describe('Status and Expiration Logic', () => {
    it('should correctly report status as ACTIVE when end date is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const sub = Subscription.build({
        status: SubscriptionStatus.ACTIVE,
        endDate: futureDate
      });

      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(sub.isActive()).toBe(true);
      expect(sub.isExpired()).toBe(false);
      expect(sub.getDaysRemaining()).toBeGreaterThan(0);
    });

    it('should dynamically report status as EXPIRED and report isActive as false when end date is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const sub = Subscription.build({
        status: SubscriptionStatus.ACTIVE,
        endDate: pastDate
      });

      // The dynamic getter makes s.status return 'expired' if the end date has passed
      expect(sub.status).toBe(SubscriptionStatus.EXPIRED);
      expect(sub.isActive()).toBe(false);
      expect(sub.isExpired()).toBe(true);
      expect(sub.getDaysRemaining()).toBe(0);
    });
  });

  describe('Data Usage Percentage Calculations', () => {
    it('should return 0% when 0 data is used', () => {
      const sub = Subscription.build({
        dataUsed: 0,
        dataRemaining: 100
      });
      // Attach mock plan
      sub.plan = { dataLimit: 100 };

      expect(sub.getDataUsagePercentage()).toBe(0);
    });

    it('should return 50% when half of the data limit is used', () => {
      const sub = Subscription.build({
        dataUsed: 50,
        dataRemaining: 50
      });
      sub.plan = { dataLimit: 100 };

      expect(sub.getDataUsagePercentage()).toBe(50);
    });

    it('should return 100% when all of the data limit is used', () => {
      const sub = Subscription.build({
        dataUsed: 100,
        dataRemaining: 0
      });
      sub.plan = { dataLimit: 100 };

      expect(sub.getDataUsagePercentage()).toBe(100);
    });

    it('should return 100% capped when usage exceeds data limit', () => {
      const sub = Subscription.build({
        dataUsed: 120,
        dataRemaining: 0
      });
      sub.plan = { dataLimit: 100 };

      expect(sub.getDataUsagePercentage()).toBe(100);
    });
  });
});
