const { migrate } = require('../lib/migrate');
const models = require('../models');
migrate().then(files => console.log(JSON.stringify({ event: 'migrated', files }))).catch(error => {
  console.error(error.name === 'Error' ? error.message : 'Migration failed. Review database configuration and schema; no migration changes were committed.');
  process.exitCode = 1;
}).finally(() => models.sequelize.close());
