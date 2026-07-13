/**
 * Unit Tests: MikroTik Client Layer
 *
 * Tests circuit breaker state transitions, mock client behavior,
 * and password encryption/decryption.
 */

// Force mock mode for all tests
process.env.MOCK_MIKROTIK = 'true';
process.env.ROUTER_ENCRYPTION_KEY = 'a'.repeat(64); // 32-byte test key

const mikrotikClient = require('../../src/services/mikrotik/client');
const MockMikroTikClient = require('../../src/services/mikrotik/mockClient');
const NetworkDevice = require('../../src/models/NetworkDevice');

describe('MikroTik Client — Circuit Breaker', () => {
  beforeEach(() => {
    mikrotikClient.resetAll();
    MockMikroTikClient.resetState();
  });

  test('initial circuit state is "closed"', () => {
    const state = mikrotikClient.getCircuitState('device-1');
    expect(state).toBe('closed');
  });

  test('canAttempt returns true when circuit is closed', () => {
    expect(mikrotikClient.canAttempt('device-1')).toBe(true);
  });

  test('connection status is "disconnected" for unknown device', () => {
    expect(mikrotikClient.getConnectionStatus('unknown-device')).toBe('disconnected');
  });

  test('circuit states are independent per device', () => {
    expect(mikrotikClient.getCircuitState('device-a')).toBe('closed');
    expect(mikrotikClient.getCircuitState('device-b')).toBe('closed');
  });

  test('resetAll clears all state', () => {
    // Get some state created
    mikrotikClient.getCircuitState('device-1');
    mikrotikClient.getCircuitState('device-2');

    mikrotikClient.resetAll();

    // Should start fresh
    expect(mikrotikClient.getCircuitState('device-1')).toBe('closed');
  });
});

describe('MikroTik Client — Constants', () => {
  test('exports circuit state constants', () => {
    expect(mikrotikClient.CIRCUIT_CLOSED).toBe('closed');
    expect(mikrotikClient.CIRCUIT_OPEN).toBe('open');
    expect(mikrotikClient.CIRCUIT_HALF_OPEN).toBe('half_open');
  });
});

describe('MockMikroTikClient', () => {
  let mockClient;

  beforeEach(() => {
    MockMikroTikClient.resetState();
    mockClient = new MockMikroTikClient({
      id: 'test-device-1',
      name: 'Test Router',
      ipAddress: '192.168.1.1',
      apiPort: 8728,
    });
  });

  afterAll(() => {
    MockMikroTikClient.resetState();
  });

  // ── Address List ──────────────────────────────────────────────────

  test('can add entry to address list', async () => {
    const result = await mockClient.execute('/ip/firewall/address-list/add', {
      list: 'cutoff-list',
      address: '192.168.1.100',
    });
    expect(result['.id']).toBeTruthy();
    expect(result.list).toBe('cutoff-list');
  });

  test('can find entry in address list', async () => {
    await mockClient.execute('/ip/firewall/address-list/add', {
      list: 'cutoff-list',
      address: '192.168.1.100',
    });

    const results = await mockClient.execute('/ip/firewall/address-list/print', {
      list: 'cutoff-list',
      address: '192.168.1.100',
    });

    expect(results).toHaveLength(1);
    expect(results[0].address).toBe('192.168.1.100');
  });

  test('can remove entry from address list by key', async () => {
    await mockClient.execute('/ip/firewall/address-list/add', {
      list: 'cutoff-list',
      address: '192.168.1.100',
    });

    await mockClient.execute('/ip/firewall/address-list/remove', {
      list: 'cutoff-list',
      address: '192.168.1.100',
    });

    const results = await mockClient.execute('/ip/firewall/address-list/print', {
      list: 'cutoff-list',
      address: '192.168.1.100',
    });

    expect(results).toHaveLength(0);
  });

  test('print returns empty for non-existent entries', async () => {
    const results = await mockClient.execute('/ip/firewall/address-list/print', {
      list: 'cutoff-list',
      address: '10.0.0.99',
    });
    expect(results).toHaveLength(0);
  });

  // ── PPPoE Secrets ─────────────────────────────────────────────────

  test('can set and disable a PPPoE secret', async () => {
    // Create a secret
    await mockClient.execute('/ppp/secret/set', {
      name: '0712345678',
      disabled: 'no',
    });

    // Verify it exists
    let secrets = await mockClient.execute('/ppp/secret/print', { name: '0712345678' });
    expect(secrets).toHaveLength(1);
    expect(secrets[0].disabled).toBe('no');

    // Disable it
    await mockClient.execute('/ppp/secret/set', {
      name: '0712345678',
      disabled: 'yes',
    });

    secrets = await mockClient.execute('/ppp/secret/print', { name: '0712345678' });
    expect(secrets[0].disabled).toBe('yes');
  });

  // ── Hotspot IP Binding ────────────────────────────────────────────

  test('can add and remove hotspot IP binding', async () => {
    await mockClient.execute('/ip/hotspot/ip-binding/add', {
      address: '192.168.1.50',
      type: 'blocked',
    });

    let bindings = await mockClient.execute('/ip/hotspot/ip-binding/print', {
      address: '192.168.1.50',
    });
    expect(bindings).toHaveLength(1);
    expect(bindings[0].type).toBe('blocked');

    await mockClient.execute('/ip/hotspot/ip-binding/remove', {
      address: '192.168.1.50',
    });

    bindings = await mockClient.execute('/ip/hotspot/ip-binding/print', {
      address: '192.168.1.50',
    });
    expect(bindings).toHaveLength(0);
  });

  // ── System Identity ───────────────────────────────────────────────

  test('returns mock identity for system/identity/print', async () => {
    const result = await mockClient.execute('/system/identity/print', {});
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain('Mock-');
  });

  // ── State Management ──────────────────────────────────────────────

  test('state is shared across instances for same device type', () => {
    const client2 = new MockMikroTikClient({
      id: 'test-device-2',
      name: 'Router 2',
      ipAddress: '192.168.1.2',
    });

    // Both clients share the same static state
    expect(MockMikroTikClient.getState()).toBe(mockClient.state);
    expect(MockMikroTikClient.getState()).toBe(client2.state);
  });

  test('resetState clears all mock data', async () => {
    await mockClient.execute('/ip/firewall/address-list/add', {
      list: 'test',
      address: '1.2.3.4',
    });

    MockMikroTikClient.resetState();

    // Need to create a new client after reset (state reference changes)
    const freshClient = new MockMikroTikClient({
      id: 'fresh',
      name: 'Fresh',
      ipAddress: '1.1.1.1',
    });

    const results = await freshClient.execute('/ip/firewall/address-list/print', {
      list: 'test',
      address: '1.2.3.4',
    });
    expect(results).toHaveLength(0);
  });
});

describe('NetworkDevice — Password Encryption', () => {
  test('encrypts and decrypts passwords correctly', () => {
    const plaintext = 'MyR0uterP@ssw0rd!';
    const { encrypted, iv, tag } = NetworkDevice.encryptPassword(plaintext);

    // Encrypted should not equal plaintext
    expect(encrypted).not.toBe(plaintext);
    expect(iv).toBeTruthy();
    expect(tag).toBeTruthy();

    // Build a mock instance to test decryption
    const mockDevice = NetworkDevice.build({
      name: 'Test',
      ipAddress: '1.1.1.1',
      username: 'admin',
      passwordEncrypted: encrypted,
      encryptionIv: iv,
      encryptionTag: tag,
    });

    const decrypted = mockDevice.getDecryptedPassword();
    expect(decrypted).toBe(plaintext);
  });

  test('different IVs produce different ciphertexts', () => {
    const plaintext = 'SamePassword';
    const result1 = NetworkDevice.encryptPassword(plaintext);
    const result2 = NetworkDevice.encryptPassword(plaintext);

    // IVs are random, so ciphertexts should differ
    expect(result1.encrypted).not.toBe(result2.encrypted);
    expect(result1.iv).not.toBe(result2.iv);
  });

  test('toJSON strips encrypted password fields', () => {
    const device = NetworkDevice.build({
      name: 'Test Router',
      ipAddress: '10.0.0.1',
      username: 'admin',
      passwordEncrypted: 'encrypted_value',
      encryptionIv: 'iv_value',
      encryptionTag: 'tag_value',
    });

    const json = device.toJSON();
    expect(json.passwordEncrypted).toBeUndefined();
    expect(json.encryptionIv).toBeUndefined();
    expect(json.encryptionTag).toBeUndefined();
    expect(json.name).toBe('Test Router');
  });
});
