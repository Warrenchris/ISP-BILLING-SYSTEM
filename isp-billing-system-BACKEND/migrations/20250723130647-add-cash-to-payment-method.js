'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE payments 
      MODIFY COLUMN payment_method 
      ENUM('mpesa', 'card', 'bank', 'cash') 
      NOT NULL DEFAULT 'mpesa'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove 'cash' option (you must ensure no row uses it before reverting)
    await queryInterface.sequelize.query(`
      ALTER TABLE payments 
      MODIFY COLUMN payment_method 
      ENUM('mpesa', 'card', 'bank') 
      NOT NULL DEFAULT 'mpesa'
    `);
  }
};
