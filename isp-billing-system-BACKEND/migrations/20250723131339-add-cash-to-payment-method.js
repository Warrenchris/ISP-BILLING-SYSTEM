module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE payments 
      MODIFY COLUMN payment_method 
      ENUM('mpesa', 'card', 'bank', 'cash') NOT NULL DEFAULT 'mpesa'
    `);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE payments 
      MODIFY COLUMN payment_method 
      ENUM('mpesa', 'card', 'bank') NOT NULL DEFAULT 'mpesa'
    `);
  }
};
