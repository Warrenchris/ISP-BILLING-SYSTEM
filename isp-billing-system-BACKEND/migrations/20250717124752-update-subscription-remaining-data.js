'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('subscriptions', 'remaining_data', 'dataRemaining');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('subscriptions', 'dataRemaining', 'remaining_data');
  }
};