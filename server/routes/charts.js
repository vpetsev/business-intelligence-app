const router = require('express').Router();
const models = require('../models');
const { companies } = require('../lib/companies');
router.get('/', async (req, res) => {
  const rows = await models.Company.findAll({ attributes: ['symbol', 'date'], group: ['symbol', 'date'], raw: true });
  res.json(companies.map(company => ({ ...company, years: [...new Set(rows.filter(row => row.symbol === company.symbol && /^\d{4}-\d{2}-\d{2}$/.test(row.date)).map(row => Number(row.date.slice(0, 4))))].sort((a, b) => a - b) })));
});
module.exports = router;
