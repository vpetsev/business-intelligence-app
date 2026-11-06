const { seed } = require('../lib/seed');
const models = require('../models');
seed().then(result => console.log(JSON.stringify({ event: 'seeded', ...result }))).catch(error => {
  console.error(error.name === 'Error' ? error.message : 'Seed failed. Apply migrations and check configuration first.'); process.exitCode = 1;
}).finally(() => models.sequelize.close());
