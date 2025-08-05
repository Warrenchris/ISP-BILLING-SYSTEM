module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('payments', 'checkoutRequestId', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    await queryInterface.addIndex('payments', ['checkoutRequestId'], {
      unique: true,
      name: 'payments_checkout_request_id'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('payments', 'payments_checkout_request_id');
    await queryInterface.removeColumn('payments', 'checkoutRequestId');
  }
};