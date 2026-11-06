'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('Companies');
    if (!columns.costOfRevenue) {
      await queryInterface.addColumn('Companies', 'costOfRevenue', { type: Sequelize.BIGINT });
    }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Companies', 'costOfRevenue');
  },
};
