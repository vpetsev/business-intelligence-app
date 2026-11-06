'use strict';
module.exports = {
  async up(queryInterface, Sequelize, options = {}) {
    const db = queryInterface.sequelize;
    const [bad] = await db.query(`SELECT COUNT(*) AS count FROM "Users" WHERE username IS NULL OR BTRIM(username) = '' OR password IS NULL`, options);
    const [duplicates] = await db.query(`SELECT LOWER(BTRIM(username)) FROM "Users" GROUP BY LOWER(BTRIM(username)) HAVING COUNT(*) > 1`, options);
    if (Number(bad[0].count) || duplicates.length) throw new Error('Username migration requires operator review: blank credentials or normalized username collisions exist. No accounts were merged or removed.');
    await db.query('UPDATE "Users" SET username = LOWER(BTRIM(username))', options);
    await queryInterface.changeColumn('Users', 'username', { type: Sequelize.STRING, allowNull: false }, options);
    await queryInterface.changeColumn('Users', 'password', { type: Sequelize.STRING, allowNull: false }, options);
    await queryInterface.addIndex('Users', ['username'], { ...options, unique: true, name: 'users_username_unique' });
    await db.query(`ALTER TABLE "Users" ADD CONSTRAINT users_username_normalized CHECK (username = LOWER(BTRIM(username)) AND LENGTH(username) > 0)`, options);
    await queryInterface.addIndex('SavedData', ['userId', 'id'], { ...options, name: 'saved_data_owner_id' });
    // Preserve historical NULL/dangling ownership. Enforce references on new writes without assigning anyone's data.
    await db.query('ALTER TABLE "SavedData" ADD CONSTRAINT saved_data_owner_fk FOREIGN KEY ("userId") REFERENCES "Users"(id) ON DELETE RESTRICT NOT VALID', options);
    await queryInterface.addColumn('Companies', 'source', { type: Sequelize.STRING, allowNull: false, defaultValue: 'historical' }, options);
    await queryInterface.addIndex('Companies', ['symbol', 'date'], { ...options, name: 'companies_symbol_date' });
    await queryInterface.createTable('AuthSessions', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false }, updatedAt: { type: Sequelize.DATE, allowNull: false },
    }, options);
    await queryInterface.addIndex('AuthSessions', ['expiresAt'], { ...options, name: 'auth_sessions_expiry' });
    await queryInterface.addIndex('AuthSessions', ['userId'], { ...options, name: 'auth_sessions_user' });
  },
  async down(queryInterface, Sequelize, options = {}) {
    await queryInterface.dropTable('AuthSessions', options);
    await queryInterface.removeIndex('Companies', 'companies_symbol_date', options);
    await queryInterface.removeColumn('Companies', 'source', options);
    await queryInterface.sequelize.query('ALTER TABLE "SavedData" DROP CONSTRAINT saved_data_owner_fk', options);
    await queryInterface.removeIndex('SavedData', 'saved_data_owner_id', options);
    await queryInterface.sequelize.query('ALTER TABLE "Users" DROP CONSTRAINT users_username_normalized', options);
    await queryInterface.removeIndex('Users', 'users_username_unique', options);
    // Deliberately never restore ambiguous case/whitespace in normalized usernames.
  },
};
