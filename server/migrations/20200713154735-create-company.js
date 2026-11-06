"use strict";
module.exports = {
  up: (queryInterface, Sequelize, options = {}) => {
    return queryInterface.createTable("Companies", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      symbol: {
        type: Sequelize.STRING,
      },
      date: {
        type: Sequelize.STRING,
      },
      revenue: {
        type: Sequelize.BIGINT,
      },
      costAndExpenses: {
        type: Sequelize.BIGINT,
      },
      grossProfit: {
        type: Sequelize.BIGINT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, options);
  },
  down: (queryInterface, Sequelize, options = {}) => {
    return queryInterface.dropTable("Companies", options);
  },
};
