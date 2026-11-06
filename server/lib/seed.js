const models = require('../models');
const bcrypt = require('bcryptjs');
const { parse, registration } = require('./validation');
async function seed() {
  if (process.env.NODE_ENV === 'production' && (process.env.DEMO_USERNAME || process.env.DEMO_PASSWORD)) throw new Error('Demo account creation is disabled in production.');
  let demo;
  if (process.env.DEMO_USERNAME || process.env.DEMO_PASSWORD) demo = parse(registration, { username: process.env.DEMO_USERNAME, password: process.env.DEMO_PASSWORD });
  return models.sequelize.transaction(async transaction => {
    await models.sequelize.query('SELECT pg_advisory_xact_lock(1249542134)', { transaction });
    let inserted = 0;
    for (const [index, symbol] of ['AAPL', 'FB', 'TSLA'].entries()) {
      for (const year of [2017, 2018, 2019]) {
        for (const [quarter, date] of ['03-31', '06-30', '09-30', '12-31'].entries()) {
          const fullDate = `${year}-${date}`;
          if (await models.Company.findOne({ where: { symbol, date: fullDate }, transaction })) continue;
          // Synthetic figures for demonstrating the UI. These are not reported company financials.
          const revenue = (index + 1) * 1000000 + (year - 2016) * 100000 + quarter * 25000;
          await models.Company.create({ symbol, date: fullDate, revenue, costAndExpenses: revenue * 0.6, grossProfit: revenue * 0.4, costOfRevenue: revenue * 0.5, source: 'demo' }, { transaction });
          inserted++;
        }
      }
    }
    if (demo) {
      const existing = await models.User.findOne({ where: { username: demo.username }, transaction });
      if (!existing) await models.User.create({ username: demo.username, password: await bcrypt.hash(demo.password, 12) }, { transaction });
      // Never overwrite a real user's password when re-running a demo seed.
    }
    return { companyRowsInserted: inserted, demoAccountRequested: Boolean(demo) };
  });
}
module.exports = { seed };
