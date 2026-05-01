'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('users');

    if (!tableDescription.password_reset_token) {
      await queryInterface.addColumn('users', 'password_reset_token', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    if (!tableDescription.password_reset_expires) {
      await queryInterface.addColumn('users', 'password_reset_expires', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'password_reset_token');
    await queryInterface.removeColumn('users', 'password_reset_expires');
  }
};