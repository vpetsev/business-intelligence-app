"use strict";
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    "Company",
    {
      symbol: DataTypes.STRING,
      date: DataTypes.STRING,
      revenue: DataTypes.BIGINT,
      costAndExpenses: DataTypes.BIGINT,
      grossProfit: DataTypes.BIGINT,
      costOfRevenue: DataTypes.BIGINT,
    },
    {}
  );
  Company.associate = function (models) {
    // associations can be defined here
  };
  return Company;
};
