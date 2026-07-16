const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const { seedDataPlans } = require('../src/utils/seedData');
const { User } = require('../src/models');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Seed data plans
    await seedDataPlans();

    // 2. Create admin user
    const adminData = {
      firstName: 'Warren',
      lastName: 'Chris',
      email: 'warrenchris745@gmail.com',
      password: 'R@ycee_11',
      role: 'admin',
      phoneNumber: '+254700000000',
      isActive: true,
      isVerified: true
    };

    const existingUser = await User.findOne({ where: { email: adminData.email } });
    if (existingUser) {
      console.log('Admin user already exists. Updating role and password...');
      existingUser.role = 'admin';
      existingUser.password = adminData.password;
      await existingUser.save();
      console.log('Admin user updated successfully.');
    } else {
      console.log('Creating new admin user...');
      await User.create(adminData);
      console.log('Admin user created successfully.');
    }

    // 3. Try to execute historical seed SQL if available
    const sqlPath = path.join(__dirname, '..', '..', 'isp_seed.sql');
    if (fs.existsSync(sqlPath)) {
      console.log('📜 Found isp_seed.sql. Importing historical seeds...');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Split statements on semi-colon with newlines to ignore inline values
      const statements = sqlContent
        .split(/;\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Executing ${statements.length} SQL statements...`);
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const statement of statements) {
        try {
          await sequelize.query(statement);
        } catch (queryErr) {
          // ignore duplicate inserts or minor syntax warnings
        }
      }
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Historical seeds imported successfully.');
    } else {
      console.log('ℹ️ No isp_seed.sql file found.');
    }

    console.log('🌱 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seed();
