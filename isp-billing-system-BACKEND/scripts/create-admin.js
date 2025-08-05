// scripts/create-admin.js
// ---------------------------------------------
// Utility script to add a new ADMIN user quickly
// Usage (from project root):
//    node scripts/create-admin.js
// ---------------------------------------------

const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models'); // adjust path if models are elsewhere

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const EMAIL = 'warrenchris745@gmail.com';
    const PLAIN_PASSWORD = 'R@ycee_11';

    // Abort if user already exists ----------------------------------------
    const existing = await User.findOne({ where: { email: EMAIL } });
    if (existing) {
      console.warn(`⚠️  User with email ${EMAIL} already exists. Aborting.`);
      process.exit(0);
    }

    // Hash password -------------------------------------------------------
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, saltRounds);

    // Create the user -----------------------------------------------------
    const admin = await User.create({
      id: uuid(),
      firstName: 'Warren',
      lastName: 'Chris',
      email: EMAIL,
      phoneNumber: '+254700000111', // dummy phone – edit if required
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isVerified: true,
    });

    console.log('✅ Admin user created successfully:\n', admin.toJSON());
  } catch (err) {
    console.error('❌ Error creating admin user:', err);
  } finally {
    await sequelize.close();
  }
})();
