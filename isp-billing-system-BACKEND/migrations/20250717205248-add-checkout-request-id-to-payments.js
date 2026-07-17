module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('payments');

    if (!tableDescription.checkout_request_id) {
      await queryInterface.addColumn('payments', 'checkout_request_id', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    const existingIndexes = await queryInterface.showIndex('payments');
    const hasCheckoutRequestIdIndex = existingIndexes.some(
      (index) => index.name === 'idx_payments_checkout_request_id'
    );
    if (!hasCheckoutRequestIdIndex) {
      await queryInterface.addIndex('payments', ['checkout_request_id'], {
        unique: true,
        name: 'idx_payments_checkout_request_id'
      });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('payments', 'idx_payments_checkout_request_id');
    await queryInterface.removeColumn('payments', 'checkout_request_id');
  }
};