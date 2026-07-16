'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('payments');
    
    // Remove the camelCase index if it exists
    const indexes = await queryInterface.showIndex('payments');
    const hasIndex = indexes.some(idx => idx.name === 'payments_checkout_request_id');
    if (hasIndex) {
      await queryInterface.removeIndex('payments', 'payments_checkout_request_id');
    }

    // Drop column
    if (tableDescription.checkoutRequestId) {
      await queryInterface.removeColumn('payments', 'checkoutRequestId');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('payments');
    if (!tableDescription.checkoutRequestId) {
      await queryInterface.addColumn('payments', 'checkoutRequestId', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });

      await queryInterface.addIndex('payments', ['checkoutRequestId'], {
        unique: true,
        name: 'payments_checkout_request_id',
      });
    }
  }
};
