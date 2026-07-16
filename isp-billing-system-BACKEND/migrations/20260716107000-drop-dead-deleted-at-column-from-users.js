'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    if (tableDescription.deletedAt) {
      await queryInterface.removeColumn('users', 'deletedAt');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    if (!tableDescription.deletedAt) {
      await queryInterface.addColumn('users', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  }
};
