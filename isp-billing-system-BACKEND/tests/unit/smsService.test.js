/**
 * Unit Tests: SMS Sender Service & Normalizer
 *
 * Verifies E.164 phone formatting, template interpolation,
 * and BullMQ queue message enqueues.
 */

// Force mock mode
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.DEFAULT_COUNTRY_CODE = '254';

const { formatPhoneNumber } = require('../../src/services/queue/smsWorker');
const smsSender = require('../../src/services/sms/smsSender');
const { addSmsJob } = require('../../src/services/queue/queueManager');
const { SmsTemplate } = require('../../src/models');

// Mock BullMQ addSmsJob helper
jest.mock('../../src/services/queue/queueManager', () => ({
  addSmsJob: jest.fn().mockResolvedValue({ id: 'job-sms-id' }),
}));

describe('SMS Helper — Phone Normalization (Kenya & Uganda)', () => {
  test('returns local Kenyan number normalized to +254', () => {
    expect(formatPhoneNumber('0712345678')).toBe('+254712345678');
    expect(formatPhoneNumber('0112345678')).toBe('+254112345678');
  });

  test('returns local Ugandan number normalized to +256 if config is set', () => {
    process.env.DEFAULT_COUNTRY_CODE = '256';
    expect(formatPhoneNumber('0787123456')).toBe('+256787123456');
    process.env.DEFAULT_COUNTRY_CODE = '254'; // Reset
  });

  test('leaves already internationalized numbers intact', () => {
    expect(formatPhoneNumber('+254712345678')).toBe('+254712345678');
    expect(formatPhoneNumber('+256787123456')).toBe('+256787123456');
  });
});

describe('SMS Model — Template Interpolation', () => {
  test('correctly interpolates single and multiple placeholders', () => {
    const template = SmsTemplate.build({
      key: 'test',
      template: 'Hi {{firstName}}, your invoice amount is {{amount}} KES.',
      variables: ['firstName', 'amount'],
    });

    const output = template.interpolate({ firstName: 'Grace', amount: '1500' });
    expect(output).toBe('Hi Grace, your invoice amount is 1500 KES.');
  });

  test('replaces missing/undefined variables with empty string instead of crashing', () => {
    const template = SmsTemplate.build({
      key: 'test',
      template: 'Hello {{firstName}} {{lastName}}!',
      variables: ['firstName', 'lastName'],
    });

    const output = template.interpolate({ firstName: 'Joy' }); // missing lastName
    expect(output).toBe('Hello Joy !');
  });
});

describe('SMS Sender Facade — BullMQ Queueing', () => {
  let mockUser;
  let mockSub;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      firstName: 'Alice',
      phoneNumber: '0711223344',
    };

    mockSub = {
      id: 'sub-uuid',
      subscriptionNumber: 'SUB-123',
      endDate: new Date('2026-07-15T12:00:00.000Z'),
      plan: { name: '10Mbps Unlimited', price: '2000.00' },
    };
  });

  test('sendPaymentReceipt enqueues job with receipt tag and payment dedup jobId', async () => {
    const mockPayment = { id: 'payment-123', amount: 2000.00 };

    await smsSender.sendPaymentReceipt(mockUser, mockSub, mockPayment);

    expect(addSmsJob).toHaveBeenCalledWith(
      '0711223344',
      'payment_receipt',
      expect.objectContaining({ firstName: 'Alice', amount: 2000.00, plan: '10Mbps Unlimited' }),
      'payment',
      'receipt-sms-payment-123'
    );
  });

  test('sendExpiryWarning enqueues warning job with dunning tag and warning dedup jobId', async () => {
    await smsSender.sendExpiryWarning(mockUser, mockSub, 24);

    expect(addSmsJob).toHaveBeenCalledWith(
      '0711223344',
      'expiry_warning',
      expect.objectContaining({ plan: '10Mbps Unlimited', hours: 24 }),
      'dunning',
      'warning-sms-sub-uuid-2026-07-15T12:00:00.000Z'
    );
  });

  test('sendDisconnectionNotice enqueues warning job with cutoff tag and cutoff dedup jobId', async () => {
    await smsSender.sendDisconnectionNotice(mockUser, mockSub);

    const todayStr = new Date().toISOString().split('T')[0];
    expect(addSmsJob).toHaveBeenCalledWith(
      '0711223344',
      'disconnection_notice',
      expect.objectContaining({ subscriptionNumber: 'SUB-123', amount: '2000.00' }),
      'cutoff',
      `cutoff-sms-sub-uuid-${todayStr}`
    );
  });
});
