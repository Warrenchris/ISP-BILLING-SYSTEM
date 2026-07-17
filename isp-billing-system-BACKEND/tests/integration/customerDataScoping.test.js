const request = require('supertest');
const { Sequelize } = require('sequelize');
const app = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');

jest.setTimeout(120000);

describe('Customer Data Scoping & Authorization Integration Tests', () => {
  let testSequelize;
  let models;
  let customerA, customerB;
  let tokenA, tokenB;
  let ticketB, paymentB, subscriptionB;

  beforeAll(async () => {
    // 1. Force load the test database models
    models = require('../../src/models');
    testSequelize = models.sequelize;

    // Clean tables before tests
    const { User, SupportTicket, Payment, Subscription, DataPlan, DataUsage } = models;
    await SupportTicket.destroy({ where: {}, truncate: { cascade: true } });
    await Payment.destroy({ where: {}, truncate: { cascade: true } });
    await Subscription.destroy({ where: {}, truncate: { cascade: true } });
    await DataUsage.destroy({ where: {}, truncate: { cascade: true } });
    await User.destroy({ where: {}, truncate: { cascade: true } });

    // 2. Create customer users
    customerA = await User.create({
      id: 'a0000000-0000-0000-0000-111111111111',
      firstName: 'Customer',
      lastName: 'A',
      email: 'customer.a@test.com',
      password: 'hashedpassword123',
      role: 'customer',
      isActive: true,
    });

    customerB = await User.create({
      id: 'b0000000-0000-0000-0000-222222222222',
      firstName: 'Customer',
      lastName: 'B',
      email: 'customer.b@test.com',
      password: 'hashedpassword123',
      role: 'customer',
      isActive: true,
    });

    // 3. Generate genuine tokens
    tokenA = generateToken({ id: customerA.id, role: customerA.role });
    tokenB = generateToken({ id: customerB.id, role: customerB.role });

    // 4. Create a dummy data plan
    const plan = await DataPlan.create({
      id: 'c0000000-0000-0000-0000-111111111111',
      name: 'Plan 10GB',
      speedLimit: '10M/10M',
      dataLimit: 1024 * 1024 * 1024 * 10, // 10 GB
      price: 1500,
      durationDays: 30,
      isActive: true,
    });

    // 5. Create Subscription B
    subscriptionB = await Subscription.create({
      id: 'd0000000-0000-0000-0000-111111111111',
      userId: customerB.id,
      planId: plan.id,
      subscriptionNumber: 'SUB-B-1',
      status: 'active',
      connectionType: 'pppoe',
      networkIdentifier: 'user_b_pppoe',
      endDate: new Date(Date.now() + 10 * 24 * 3600 * 1000), // 10 days in future
      gracePeriodHours: 1,
      dataRemaining: 50000,
    });

    // 6. Create Support Ticket B
    ticketB = await SupportTicket.create({
      id: 'e0000000-0000-0000-0000-111111111111',
      userId: customerB.id,
      subject: 'Slow internet connection customer B',
      message: 'Internet speed is very slow today.',
      category: 'technical',
      priority: 'medium',
      status: 'open',
    });

    // 7. Create Payment B
    paymentB = await Payment.create({
      id: 'f0000000-0000-0000-0000-111111111111',
      userId: customerB.id,
      subscriptionId: subscriptionB.id,
      amount: 1500.00,
      currency: 'KES',
      paymentMethod: 'mpesa',
      paymentType: 'subscription',
      status: 'completed',
      reference: 'PAY-B-REF',
      description: 'Payment for Subscription B',
      initiatedAt: new Date(),
    });

    // 8. Create Data Usage session B
    await DataUsage.create({
      id: 'a0000000-0000-0000-0000-333333333333',
      userId: customerB.id,
      subscriptionId: subscriptionB.id,
      sessionId: 'session-b-123',
      startTime: new Date(),
      bytesDownloaded: 500000,
      bytesUploaded: 100000,
      totalBytes: 600000,
      status: 'active',
    });
  });

  afterAll(async () => {
    // Cleanup records
    const { User, SupportTicket, Payment, Subscription, DataPlan, DataUsage } = models;
    await SupportTicket.destroy({ where: {} });
    await Payment.destroy({ where: {} });
    await Subscription.destroy({ where: {} });
    await DataUsage.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('Support Tickets Security Checks', () => {
    it('should NOT return Customer B tickets when Customer A lists tickets', async () => {
      const res = await request(app)
        .get('/api/support/tickets')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const tickets = res.body.data || res.body.data.tickets || [];
      const ticketIds = tickets.map(t => t.id);
      expect(ticketIds).not.toContain(ticketB.id);
    });

    it('should reject access (403/404) when Customer A requests Customer B ticket directly', async () => {
      const res = await request(app)
        .get(`/api/support/tickets/${ticketB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Payments Security Checks', () => {
    it('should NOT return Customer B payments when Customer A lists payments', async () => {
      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const payments = res.body.data || [];
      const paymentIds = payments.map(p => p.id);
      expect(paymentIds).not.toContain(paymentB.id);
    });

    it('should reject access (403/404) when Customer A requests Customer B payment directly', async () => {
      const res = await request(app)
        .get(`/api/payments/${paymentB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Data Usage Security Checks', () => {
    it('should NOT return Customer B data usage history when Customer A lists usage history', async () => {
      const res = await request(app)
        .get('/api/usage/history')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const history = res.body.data?.history || [];
      const userIdsInHistory = history.map(h => h.userId);
      expect(userIdsInHistory).not.toContain(customerB.id);
    });
  });
});
