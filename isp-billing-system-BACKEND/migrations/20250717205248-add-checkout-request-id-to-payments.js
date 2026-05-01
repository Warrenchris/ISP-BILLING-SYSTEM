module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('payments');

    if (!tableDescription.checkoutRequestId) {
      await queryInterface.addColumn('payments', 'checkoutRequestId', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    const existingIndexes = await queryInterface.showIndex('payments');
    const hasCheckoutRequestIdIndex = existingIndexes.some(
      (index) => index.name === 'payments_checkout_request_id'
    );
    if (!hasCheckoutRequestIdIndex) {
      await queryInterface.addIndex('payments', ['checkoutRequestId'], {
        unique: true,
        name: 'payments_checkout_request_id'
      });
    }
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('payments', 'payments_checkout_request_id');
    await queryInterface.removeColumn('payments', 'checkoutRequestId');
  }
};