const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phoneNumber: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      is: /^(\+254|0)[17]\d{8}$/ // Kenyan phone number format
    }
  },
  routerIp: {                         // camelCase in JS, snake_case in DB by underscored: true
    type: DataTypes.STRING(45),
    allowNull: true,
    validate: {
      isIP: { args: true, msg: 'routerIp must be a valid IPv4/IPv6 address' }
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  nationalId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: {
      len: [7, 20]
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  county: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  role: {
    type: DataTypes.ENUM('customer', 'admin', 'support'),
    defaultValue: 'customer'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_reset_token' // snake_case in DB
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_expires' // snake_case in DB 
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    }
  },
  paranoid: true, // Enables soft deletes
  timestamps: true, // Adds createdAt and updatedAt fields
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at', // Use snake_case for deletedAt
  underscored: true // Use snake_case for all fields
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

// Class methods
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByPhoneNumber = function(phoneNumber) {
  return this.findOne({ where: { phoneNumber } });
};
User.associate = (models) => {
  User.hasMany(models.Subscription, { foreignKey: 'userId', as: 'Subscriptions' });
  User.hasOne(models.Subscription, {
    foreignKey: 'userId',
    as: 'activeSubscription',
    scope: { status: 'active' }
  });
  User.hasMany(models.Payment, { foreignKey: 'userId', as: 'Payments' });
  User.hasMany(models.Invoice, { foreignKey: 'userId', as: 'Invoices' });
  User.hasMany(models.DataUsage, { foreignKey: 'userId', as: 'DataUsage' });
};

// Add these methods to your User model in User.js

// Generate password reset token
const crypto = require('crypto');

User.prototype.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  // Set expiration to 1 hour from now
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return resetToken;
};
// Password reset fields are now included in the model attributes above.


module.exports = User;

module.exports = User;
