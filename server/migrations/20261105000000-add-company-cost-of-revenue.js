'use strict';
module.exports = {
  async up(queryInterface, Sequelize, options = {}) {
    const columns = await queryInterface.describeTable('Companies', options);
    if (!columns.costOfRevenue) {
      await queryInterface.addColumn('Companies', 'costOfRevenue', { type: Sequelize.BIGINT }, options);
    }
  },
  async down(queryInterface, Sequelize, options = {}) {
    await queryInterface.removeColumn('Companies', 'costOfRevenue', options);
  },
};
