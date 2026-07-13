const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

/**
 * Get the encryption key from environment.
 * Must be a 32-byte hex string (64 hex characters).
 */
function getEncryptionKey() {
  const key = process.env.ROUTER_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ROUTER_ENCRYPTION_KEY is not set. Generate one with: ' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(key, 'hex');
}

const NetworkDevice = sequelize.define('NetworkDevice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  apiPort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 8728,
    validate: {
      min: 1,
      max: 65535,
    },
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  passwordEncrypted: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  encryptionIv: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  encryptionTag: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  siteId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  routerOsVersion: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '7',
  },
  cutoffAddressList: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'cutoff-list',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'network_devices',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/**
 * Encrypt a plaintext password for storage.
 * Returns { encrypted, iv, tag } — all as hex strings.
 */
NetworkDevice.encryptPassword = function (plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
};

/**
 * Decrypt the stored password back to plaintext.
 */
NetworkDevice.prototype.getDecryptedPassword = function () {
  const key = getEncryptionKey();
  const iv = Buffer.from(this.encryptionIv, 'hex');
  const tag = Buffer.from(this.encryptionTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(this.passwordEncrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Hook: encrypt password before creating a device.
 * Expects `_plaintextPassword` to be set on the instance (not persisted).
 */
NetworkDevice.addHook('beforeCreate', (device) => {
  if (device._plaintextPassword) {
    const { encrypted, iv, tag } = NetworkDevice.encryptPassword(device._plaintextPassword);
    device.passwordEncrypted = encrypted;
    device.encryptionIv = iv;
    device.encryptionTag = tag;
    delete device._plaintextPassword;
  }
});

NetworkDevice.addHook('beforeUpdate', (device) => {
  if (device._plaintextPassword) {
    const { encrypted, iv, tag } = NetworkDevice.encryptPassword(device._plaintextPassword);
    device.passwordEncrypted = encrypted;
    device.encryptionIv = iv;
    device.encryptionTag = tag;
    delete device._plaintextPassword;
  }
});

/**
 * Override toJSON to never expose encrypted password fields.
 */
NetworkDevice.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.passwordEncrypted;
  delete values.encryptionIv;
  delete values.encryptionTag;
  return values;
};

module.exports = NetworkDevice;
