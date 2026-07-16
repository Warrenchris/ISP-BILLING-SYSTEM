const { execSync } = require('child_process');
const { Sequelize } = require('sequelize');

describe('Real Database Integration Tests', () => {
  let testSequelize;
  let models;
  
  beforeAll(async () => {
    // 1. Create the test database if not exists using a root connection
    const rootSequelize = new Sequelize('mysql://root:rootpassword@127.0.0.1:3307/mysql', {
      logging: false,
    });
    await rootSequelize.query('CREATE DATABASE IF NOT EXISTS isp_billing_test_db;');
    await rootSequelize.close();

    // 2. Run actual migrations against the test database
    console.log('🔄 Running database migrations on test database...');
    execSync('npx sequelize-cli db:migrate', {
      env: {
        ...process.env,
        DB_HOST: '127.0.0.1',
        DB_PORT: '3307',
        DB_USER: 'root',
        DB_PASSWORD: 'rootpassword',
        DB_NAME: 'isp_billing_test_db',
        NODE_ENV: 'test',
      },
      stdio: 'inherit',
    });
    console.log('✅ Migrations complete.');

    // 3. Configure env variables for test database
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = '3307';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = 'rootpassword';
    process.env.DB_NAME = 'isp_billing_test_db';
    process.env.NODE_ENV = 'test';

    // 4. Force require the models using the test database
    delete require.cache[require.resolve('../../src/config/database')];
    delete require.cache[require.resolve('../../src/models')];
    
    models = require('../../src/models');
    testSequelize = models.sequelize;
  });

  afterAll(async () => {
    if (testSequelize) {
      await testSequelize.close();
    }
  });

  describe('Cron Job SQL Query Tests', () => {
    it('should successfully execute the raw SQL literal grace period check inside runExpirySweep query', async () => {
      const { Subscription, NetworkDevice } = models;
      const { Op } = require('sequelize');

      // Create dummy active device
      const device = await NetworkDevice.create({
        id: '10000000-0000-0000-0000-111111111111',
        name: 'Test Router',
        ip: '192.168.1.1',
        username: 'admin',
        password: 'password',
        isActive: true,
      });

      // Create expired and active subscriptions
      const now = new Date();
      const expiredSub = await Subscription.create({
        id: '20000000-0000-0000-0000-111111111111',
        userId: '30000000-0000-0000-0000-111111111111',
        planId: '40000000-0000-0000-0000-111111111111',
        subscriptionNumber: 'SUB-EXP-1',
        status: 'active',
        connectionType: 'pppoe',
        networkDeviceId: device.id,
        networkIdentifier: 'user1',
        endDate: new Date(now.getTime() - 2 * 3600 * 1000), // 2 hours ago
        gracePeriodHours: 1, // grace period is 1 hour, so expired
      });

      const activeSub = await Subscription.create({
        id: '20000000-0000-0000-0000-222222222222',
        userId: '30000000-0000-0000-0000-222222222222',
        planId: '40000000-0000-0000-0000-111111111111',
        subscriptionNumber: 'SUB-ACT-1',
        status: 'active',
        connectionType: 'pppoe',
        networkDeviceId: device.id,
        networkIdentifier: 'user2',
        endDate: new Date(now.getTime() + 10 * 3600 * 1000), // 10 hours in future, so not expired
        gracePeriodHours: 1,
      });

      // Query database using the exact literal SQL syntax
      const expiredList = await Subscription.findAll({
        where: {
          status: 'active',
          endDate: { [Op.ne]: null },
          connectionType: { [Op.ne]: null },
          networkDeviceId: { [Op.ne]: null },
          networkIdentifier: { [Op.ne]: null },
          [Op.and]: testSequelize.literal('DATE_ADD(end_date, INTERVAL grace_period_hours HOUR) < NOW()'),
        },
      });

      expect(expiredList.length).toBeGreaterThanOrEqual(1);
      const expiredIds = expiredList.map(s => s.id);
      expect(expiredIds).toContain(expiredSub.id);
      expect(expiredIds).not.toContain(activeSub.id);
    });
  });

  describe('Schema Consistency Check (Models vs Database)', () => {
    it('should match Sequelize model definitions with the actual MySQL database schema', async () => {
      const modelNames = Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize');

      for (const name of modelNames) {
        const model = models[name];
        const tableName = model.tableName;
        
        console.log(`Checking table mapping: "${tableName}" for model "${name}"...`);
        const tableDescription = await testSequelize.getQueryInterface().describeTable(tableName);

        // Compare each attribute in the model to the database columns
        const attributes = model.getAttributes();
        for (const [attrName, attrConfig] of Object.entries(attributes)) {
          const columnName = attrConfig.field || attrName;
          
          // Verify column exists in database
          expect(tableDescription).toHaveProperty(columnName);

          const dbCol = tableDescription[columnName];
          
          // Verify nullable match
          if (attrConfig.allowNull === false) {
            expect(dbCol.allowNull).toBe(false);
          }
        }
      }
    });
  });
});
