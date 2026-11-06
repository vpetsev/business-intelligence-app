'use strict';
module.exports = {
  up: (queryInterface, Sequelize, options = {}) => {
    return queryInterface.createTable('SavedData', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      revenue: {
        type: Sequelize.STRING
      },
      expenses: {
        type: Sequelize.STRING
      },
      cost_expenses: {
        type: Sequelize.STRING
      },
      gross_profit: {
        type: Sequelize.STRING
      },
      company: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }, options);
  },
  down: (queryInterface, Sequelize, options = {}) => {
    return queryInterface.dropTable('SavedData', options);
  }
};