'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (queryInterface.sequelize.getDialect() === 'mysql') {
      const radiusUser = process.env.RADIUS_DB_USER || 'radius_user';
      const radiusPassword = process.env.RADIUS_DB_PASSWORD || 'radiuspassword';
      const dbName = process.env.DB_NAME || 'isp_billing_db';

      // Create user if not exists
      await queryInterface.sequelize.query(`
        CREATE USER IF NOT EXISTS '${radiusUser}'@'%' IDENTIFIED BY '${radiusPassword}';
      `);

      // Grant privileges on RADIUS tables
      await queryInterface.sequelize.query(`
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbName}.radcheck TO '${radiusUser}'@'%';
      `);
      await queryInterface.sequelize.query(`
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbName}.radreply TO '${radiusUser}'@'%';
      `);
      await queryInterface.sequelize.query(`
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbName}.radusergroup TO '${radiusUser}'@'%';
      `);
      await queryInterface.sequelize.query(`
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbName}.radacct TO '${radiusUser}'@'%';
      `);
      await queryInterface.sequelize.query(`
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbName}.nas TO '${radiusUser}'@'%';
      `);

      await queryInterface.sequelize.query('FLUSH PRIVILEGES;');
    }
  },

  down: async (queryInterface, Sequelize) => {
    if (queryInterface.sequelize.getDialect() === 'mysql') {
      const radiusUser = process.env.RADIUS_DB_USER || 'radius_user';
      await queryInterface.sequelize.query(`
        DROP USER IF EXISTS '${radiusUser}'@'%';
      `);
    }
  }
};
