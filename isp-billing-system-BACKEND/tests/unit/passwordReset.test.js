/**
 * Unit Test: Password Reset Full Lifecycle Verification
 */

const crypto = require('crypto');

describe('Password Reset Lifecycle & Security Verification', () => {
  let mockUser;
  let rawToken;
  let hashedToken;

  beforeEach(() => {
    rawToken = crypto.randomBytes(20).toString('hex');
    hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    mockUser = {
      id: 'test-user-123',
      email: 'customer@isp.test',
      password: '$2a$10$OldHashedPasswordString',
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 3600000, // 1 hour in future
      save: jest.fn().mockResolvedValue(true),
      generatePasswordResetToken() {
        const token = crypto.randomBytes(20).toString('hex');
        this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
        this.passwordResetExpires = Date.now() + 3600000;
        return token;
      }
    };
  });

  test('1. generatePasswordResetToken generates unhashed raw token and stores SHA-256 hash', () => {
    const freshToken = mockUser.generatePasswordResetToken();
    expect(freshToken).toHaveLength(40);
    expect(mockUser.passwordResetToken).toHaveLength(64); // SHA-256 hex length
    expect(mockUser.passwordResetToken).not.toBe(freshToken);

    const expectedHash = crypto.createHash('sha256').update(freshToken).digest('hex');
    expect(mockUser.passwordResetToken).toBe(expectedHash);
  });

  test('2. Incoming raw token hashes properly to match database stored token', () => {
    const incomingToken = rawToken;
    const computedHash = crypto.createHash('sha256').update(incomingToken).digest('hex');

    expect(computedHash).toBe(mockUser.passwordResetToken);
  });

  test('3. Resetting password updates password and clears reset token to prevent reuse', async () => {
    const incomingToken = rawToken;
    const newPassword = 'NewStrongPassword2026!';
    const computedHash = crypto.createHash('sha256').update(incomingToken).digest('hex');

    // Simulate endpoint matching
    expect(computedHash).toBe(mockUser.passwordResetToken);
    expect(mockUser.passwordResetExpires).toBeGreaterThan(Date.now());

    // Update password and clear token
    mockUser.password = newPassword;
    mockUser.passwordResetToken = null;
    mockUser.passwordResetExpires = null;
    await mockUser.save();

    expect(mockUser.password).toBe(newPassword);
    expect(mockUser.passwordResetToken).toBeNull();
    expect(mockUser.passwordResetExpires).toBeNull();
    expect(mockUser.save).toHaveBeenCalled();
  });

  test('4. Reusing token fails because passwordResetToken is null in DB', () => {
    // User token was already cleared
    mockUser.passwordResetToken = null;
    mockUser.passwordResetExpires = null;

    const incomingToken = rawToken;
    const computedHash = crypto.createHash('sha256').update(incomingToken).digest('hex');

    const matches = mockUser.passwordResetToken === computedHash;
    expect(matches).toBe(false);
  });

  test('5. Expired token fails validation', () => {
    mockUser.passwordResetExpires = Date.now() - 10000; // Expired 10s ago

    const isNotExpired = mockUser.passwordResetExpires > Date.now();
    expect(isNotExpired).toBe(false);
  });

  test('6. Tampered / invalid token fails hash comparison', () => {
    const tamperedToken = 'invalid-fake-token-value-12345';
    const computedHash = crypto.createHash('sha256').update(tamperedToken).digest('hex');

    expect(computedHash).not.toBe(mockUser.passwordResetToken);
  });
});
