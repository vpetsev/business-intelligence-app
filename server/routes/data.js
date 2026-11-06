const router = require('express').Router();
const models = require('../models');
const auth = require('../middlewares/authMiddleware');
const { parse, rows, positiveId, companyRows } = require('../lib/validation');
const { HttpError } = require('../lib/errors');
const MAX_SAVED_ROWS = 10000;
const { difference } = require('../lib/decimal');
function pagination(query) {
  const { limit = '50', offset = '0' } = query;
  if (typeof limit !== 'string' || typeof offset !== 'string' || !/^\d+$/.test(limit) || !/^\d+$/.test(offset) || +limit < 1 || +limit > 200 || !Number.isSafeInteger(+offset)) throw new HttpError(400, 'limit must be 1–200 and offset a nonnegative integer.');
  return { limit: +limit, offset: +offset };
}
router.get('/api/data', auth, async (req, res) => {
  const page = pagination(req.query);
  const result = await models.SavedData.findAndCountAll({ where: { userId: req.user.id }, order: [['id', 'ASC']], ...page });
  res.json({ rows: result.rows, total: result.count, ...page });
});
function csvCell(value) {
  let text = String(value ?? '');
  // Prevent spreadsheet formula execution, including whitespace-prefixed formula cells.
  if (/^[\s]*[=+\-@]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
router.get('/api/data/export', auth, async (req, res) => {
  const count = await models.SavedData.count({ where: { userId: req.user.id } });
  if (count > MAX_SAVED_ROWS) throw new HttpError(409, 'This legacy dataset exceeds the export limit; contact the operator for a database export.');
  const data = await models.SavedData.findAll({ where: { userId: req.user.id }, order: [['id', 'ASC']], limit: MAX_SAVED_ROWS });
  const header = ['company', 'Revenue', 'Expenses', 'costAndExpenses', 'grossProfit'];
  const lines = data.map(row => [row.company, row.revenue, row.expenses, row.cost_expenses, row.gross_profit].map(csvCell).join(','));
  res.type('text/csv').set('Content-Disposition', 'attachment; filename="saved-data.csv"').send([header.join(','), ...lines].join('\r\n') + '\r\n');
});
router.post('/api/data', auth, auth.writable, async (req, res) => {
  const input = parse(rows, req.body);
  const data = input.map(row => ({ company: row.company, revenue: row.Revenue, expenses: row.Expenses, cost_expenses: row.costAndExpenses ?? row.Expenses, gross_profit: row.grossProfit ?? difference(row.Revenue, row.Expenses), userId: req.user.id }));
  await models.sequelize.transaction(async transaction => {
    // Serialize per-owner imports so concurrent requests cannot bypass the quota.
    await models.User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
    const count = await models.SavedData.count({ where: { userId: req.user.id }, transaction });
    if (count + data.length > MAX_SAVED_ROWS) throw new HttpError(409, 'Saved-data limit is 10,000 rows. Delete old rows before importing more.', 'ROW_LIMIT');
    await models.SavedData.bulkCreate(data, { transaction, validate: true });
  });
  res.status(201).json({ success: true, message: 'Data saved.', count: data.length });
});
router.delete('/api/data/:id', auth, auth.writable, async (req, res) => {
  const id = positiveId(req.params.id);
  const count = await models.SavedData.destroy({ where: { id, userId: req.user.id } });
  if (!count) throw new HttpError(404, 'Saved row not found.', 'NOT_FOUND');
  res.status(204).end();
});
router.post('/chart-data', auth, auth.writable, async (req, res) => {
  if (!req.app.locals.runtime.admins.includes(req.user.username)) throw new HttpError(403, 'Company imports require an explicitly configured administrator.', 'FORBIDDEN');
  const input = parse(companyRows, req.body);
  const keys = input.map(row => row.symbol + ':' + row.date);
  if (new Set(keys).size !== keys.length) throw new HttpError(409, 'Duplicate symbol/date pairs in the import.', 'DUPLICATE_COMPANY_ROW');
  await models.sequelize.transaction(async transaction => {
    // Imported historical duplicates are preserved. Serialize checks without requiring destructive cleanup.
    await models.sequelize.query('SELECT pg_advisory_xact_lock(1249542134)', { transaction });
    const existing = await models.Company.count({ where: { [models.Sequelize.Op.or]: input.map(({ symbol, date }) => ({ symbol, date })) }, transaction });
    if (existing) throw new HttpError(409, 'A company row already exists for one of these symbol/date pairs.', 'DUPLICATE_COMPANY_ROW');
    await models.Company.bulkCreate(input.map(row => ({ ...row, source: 'import' })), { transaction, validate: true });
  });
  res.status(201).json({ success: true, count: input.length });
});
module.exports = router;
