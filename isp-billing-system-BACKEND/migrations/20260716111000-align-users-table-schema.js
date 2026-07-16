'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('users');

    // 1. If id is an INTEGER (from the stale create-user migration), alter to CHAR(36) UUID
    if (tableDesc.id && (tableDesc.id.type.includes('INT') || tableDesc.id.type.includes('INTEGER'))) {
      // Disable foreign key checks temporarily to allow changing column type
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      
      await queryInterface.changeColumn('users', 'id', {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
      });

      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // 2. If full_name exists, split it into first_name and last_name
    if (tableDesc.full_name) {
      if (!tableDesc.first_name) {
        await queryInterface.addColumn('users', 'first_name', {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: '',
        });
      }
      if (!tableDesc.last_name) {
        await queryInterface.addColumn('users', 'last_name', {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: '',
        });
      }
      await queryInterface.removeColumn('users', 'full_name');
    }

    // 3. If password_hash exists, rename to password
    if (tableDesc.password_hash) {
      await queryInterface.renameColumn('users', 'password_hash', 'password');
    }

    // 4. Ensure role column is modified to ENUM('customer', 'admin', 'support')
    if (tableDesc.role) {
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM('customer', 'admin', 'support'),
        allowNull: true,
        defaultValue: 'customer',
      });
    }

    // 5. Add all other missing columns if they don't exist
    const missingColumns = {
      router_ip: { type: Sequelize.STRING(45), allowNull: true },
      national_id: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING(50), allowNull: true },
      county: { type: Sequelize.STRING(50), allowNull: true },
      postal_code: { type: Sequelize.STRING(10), allowNull: true },
      is_verified: { type: Sequelize.TINYINT(1), allowNull: true, defaultValue: 0 },
      last_login: { type: Sequelize.DATE, allowNull: true },
      password_reset_token: { type: Sequelize.STRING(255), allowNull: true },
      password_reset_expires: { type: Sequelize.DATE, allowNull: true },
    };

    for (const [colName, colConfig] of Object.entries(missingColumns)) {
      const freshDesc = await queryInterface.describeTable('users');
      if (!freshDesc[colName]) {
        await queryInterface.addColumn('users', colName, colConfig);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Downgrade isn't strictly needed for this alignment script
  }
};
