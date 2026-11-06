const fs = require('node:fs');
const path = require('node:path');
const models = require('../models');
const directory = path.join(__dirname, '../migrations');
const files = fs.readdirSync(directory).filter(file => /^\d+.*\.js$/.test(file)).sort();
async function migrate() {
  const qi = models.sequelize.getQueryInterface();
  return models.sequelize.transaction(async transaction => {
    const options = { transaction };
    await models.sequelize.query('SELECT pg_advisory_xact_lock(1249542133)', options);
    await models.sequelize.query('CREATE TABLE IF NOT EXISTS "SequelizeMeta" (name VARCHAR(255) PRIMARY KEY NOT NULL)', options);
    const applied = await models.sequelize.query('SELECT name FROM "SequelizeMeta"', { ...options, type: models.Sequelize.QueryTypes.SELECT });
    const names = new Set(applied.map(row => row.name));
    const completed = [];
    for (const file of files) {
      if (names.has(file)) continue;
      await require(path.join(directory, file)).up(qi, models.Sequelize, options);
      await models.sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (:name)', { ...options, replacements: { name: file } });
      completed.push(file);
    }
    return completed;
  });
}
module.exports = { migrate, latestMigration: files.at(-1) };
