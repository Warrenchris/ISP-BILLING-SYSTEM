'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('subscriptions', ['status', 'end_date'], {
      name: 'idx_subscriptions_status_end_date',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('subscriptions', 'idx_subscriptions_status_end_date');
  }
};
