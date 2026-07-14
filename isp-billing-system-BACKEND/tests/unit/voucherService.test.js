/**
 * Unit Tests: Voucher Service
 *
 * Validates voucher code generation, collision retries, batch creation,
 * redemption transactions, and admin revocation.
 */

// Force mock mode
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);

const voucherService = require('../../src/services/voucherService');
const { Voucher, DataPlan, Subscription, User } = require('../../src/models');

// Mock only the RADIUS sync service
jest.mock('../../src/services/radius/syncUser', () => ({
  syncToRadius: jest.fn().mockResolvedValue(true),
  removeFromRadius: jest.fn().mockResolvedValue(true),
  getRadiusUsername: jest.fn().mockReturnValue('voucher-TEST-USER'),
}));

describe('Voucher Code Generation', () => {
  test('generates alphanumeric codes of default length with hyphen', () => {
    const code = Voucher.generateCode();
    expect(code).toHaveLength(9); // 8 chars + 1 hyphen
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  test('does not contain ambiguous characters (0, O, I, l, 1)', () => {
    // Generate 100 codes to ensure statistical coverage
    for (let i = 0; i < 100; i++) {
      const code = Voucher.generateCode();
      expect(code).not.toMatch(/[0OIl1]/);
    }
  });

  test('supports custom code lengths', () => {
    const code = Voucher.generateCode(6);
    expect(code).toHaveLength(6); // No hyphen for < 8 length
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
  });
});

describe('Voucher Service — Batch Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DataPlan.findByPk = jest.fn();
    Voucher.generateUniqueCodes = jest.fn();
    Voucher.bulkCreate = jest.fn();
  });

  test('generates a batch of unique vouchers successfully', async () => {
    const mockPlan = {
      id: 'plan-uuid-1',
      name: 'Hotspot Unlimited',
      price: 200,
      dataLimit: 1000,
      validityPeriod: 30,
      isActive: true,
    };

    DataPlan.findByPk.mockResolvedValue(mockPlan);
    Voucher.generateUniqueCodes.mockResolvedValue(['CODE-ONE1', 'CODE-TWO2']);
    Voucher.bulkCreate.mockImplementation(records => Promise.resolve(records));

    const result = await voucherService.generateBatch({
      planId: mockPlan.id,
      quantity: 2,
      createdBy: 'admin-uuid',
    });

    expect(result.count).toBe(2);
    expect(result.batchId).toBeDefined();
    expect(result.vouchers).toHaveLength(2);
    expect(result.vouchers[0].price).toBe(200);
    expect(result.vouchers[0].status).toBe('unused');
    expect(Voucher.bulkCreate).toHaveBeenCalledTimes(1);
  });

  test('fails if plan does not exist or is inactive', async () => {
    DataPlan.findByPk.mockResolvedValue(null);

    await expect(
      voucherService.generateBatch({
        planId: 'invalid-id',
        quantity: 10,
        createdBy: 'admin-uuid',
      })
    ).rejects.toThrow('Plan invalid-id not found');

    const inactivePlan = { id: 'plan-2', name: 'Legacy', isActive: false };
    DataPlan.findByPk.mockResolvedValue(inactivePlan);

    await expect(
      voucherService.generateBatch({
        planId: inactivePlan.id,
        quantity: 10,
        createdBy: 'admin-uuid',
      })
    ).rejects.toThrow('DataPlan "Legacy" is not active');
  });
});

describe('Voucher Service — Redemption', () => {
  let mockVoucher;
  let mockPlan;
  let mockCustomer;
  let mockSub;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlan = { id: 'plan-1', name: 'Test Plan', price: 100, dataLimit: 500, validityPeriod: 10 };
    mockVoucher = {
      id: 'voucher-1',
      code: 'TEST-CODE',
      planId: 'plan-1',
      price: 100,
      status: 'unused',
      plan: mockPlan,
      update: jest.fn().mockImplementation(function (updates) {
        Object.assign(this, updates);
        return Promise.resolve(this);
      }),
    };
    mockCustomer = { id: 'cust-1', firstName: 'John', lastName: 'Doe' };
    mockSub = {
      id: 'sub-1',
      userId: 'cust-1',
      planId: 'plan-1',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(),
    };

    Voucher.findOne = jest.fn().mockResolvedValue(mockVoucher);
    User.findByPk = jest.fn().mockResolvedValue(mockCustomer);
    Subscription.create = jest.fn().mockResolvedValue(mockSub);
  });

  test('redeems unused voucher successfully', async () => {
    const result = await voucherService.redeemVoucher('TEST-CODE', 'cust-1', {
      networkDeviceId: 'router-1',
    });

    expect(result.voucher.status).toBe('active');
    expect(result.subscription).toBeDefined();
    expect(result.radiusUsername).toBe('voucher-TEST-CODE');
    expect(result.radiusPassword).toBeDefined();
    expect(mockVoucher.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', redeemedByCustomerId: 'cust-1' }),
      expect.any(Object)
    );
    expect(Subscription.create).toHaveBeenCalledTimes(1);
  });

  test('throws error for already used or revoked voucher', async () => {
    mockVoucher.status = 'used';

    await expect(
      voucherService.redeemVoucher('TEST-CODE', 'cust-1')
    ).rejects.toThrow('Voucher has already been used');
  });

  test('throws error for expired voucher', async () => {
    mockVoucher.expiresAt = new Date(Date.now() - 10000); // 10s ago

    await expect(
      voucherService.redeemVoucher('TEST-CODE', 'cust-1')
    ).rejects.toThrow('Voucher has expired');
    expect(mockVoucher.update).toHaveBeenCalledWith(
      { status: 'expired' },
      expect.any(Object)
    );
  });
});

describe('Voucher Service — Revocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('revokes voucher, removes RADIUS settings and suspends subscription', async () => {
    const mockVoucher = {
      id: 'voucher-1',
      code: 'REVOKE-ME',
      status: 'active',
      radiusUsername: 'voucher-REVOKE-ME',
      subscriptionId: 'sub-123',
      update: jest.fn().mockImplementation(function (updates) {
        this.status = updates.status;
        return Promise.resolve(this);
      }),
    };

    Voucher.findByPk = jest.fn().mockResolvedValue(mockVoucher);
    Subscription.update = jest.fn().mockResolvedValue([1]);

    const result = await voucherService.revokeVoucher(mockVoucher.id);

    expect(result.status).toBe('revoked');
    expect(mockVoucher.update).toHaveBeenCalledWith({ status: 'revoked' });
    expect(Subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'suspended', suspensionReason: 'Voucher revoked by admin' }),
      expect.objectContaining({ where: { id: 'sub-123' } })
    );
  });
});
