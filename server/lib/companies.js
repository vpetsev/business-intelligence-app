const models = require('../models');
const { HttpError } = require('./errors');
const companies = [
  { company: 'apple', symbol: 'AAPL', name: 'Apple' },
  { company: 'facebook', symbol: 'FB', name: 'Facebook' },
  { company: 'tesla', symbol: 'TSLA', name: 'Tesla' },
];
function companyRouter(symbol) {
  const router = require('express').Router();
  const read = async (req, res) => {
    const year = req.params.year;
    if (year !== undefined && (!/^\d{4}$/.test(year) || +year < 1900 || +year > 2100)) throw new HttpError(400, 'Year must be an integer from 1900 through 2100.');
    const where = { symbol, ...(year ? { date: { [models.Sequelize.Op.gte]: year + '-01-01', [models.Sequelize.Op.lt]: String(+year + 1) + '-01-01' } } : {}) };
    res.json(await models.Company.findAll({ where, order: [['date', 'ASC'], ['id', 'ASC']], limit: 5000 }));
  };
  router.get('/', read);
  router.get('/:year', read);
  return router;
}
module.exports = { companies, companyRouter };
