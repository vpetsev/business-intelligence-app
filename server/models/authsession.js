module.exports = (sequelize, DataTypes) => sequelize.define('AuthSession', {
  id: { type: DataTypes.UUID, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
});
