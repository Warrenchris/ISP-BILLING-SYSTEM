'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('subscriptions');
    if (tableDescription.dataRemaining) {
      await queryInterface.removeColumn('subscriptions', 'dataRemaining');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('subscriptions');
    if (!tableDescription.dataRemaining) {
      await queryInterface.addColumn('subscriptions', 'dataRemaining', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }
  }
};
