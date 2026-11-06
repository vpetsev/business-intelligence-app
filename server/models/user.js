'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
  }, {});
  User.associate = function(models) {
    // associations can be defined here
    User.hasMany(models.SavedData, {foreignKey: "userId"})
  };
  return User;
};