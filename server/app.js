require('dotenv').config();
const express = require('express');
const app = express();
const models = require('./models');
const auth = require('./middlewares/authMiddleware');
const asyncHandler = require('./middlewares/asyncHandler');
const tokens = require('./config/token');
const bcrypt = require('bcryptjs');
tokens.assertConfigured();

app.use(require('cors')());
app.use(express.json());
for (const [url, file] of [
  ['/api/line', 'line'], ['/api/pie', 'pie'], ['/api/h-bar', 'h-bar'],
  ['/api/bar', 'bar'], ['/api/finance', 'finance'], ['/facebook', 'facebook'],
  ['/apple', 'apple'], ['/tesla', 'tesla'], ['/userData', 'userData'], ['/charts', 'charts'],
]) app.use(url, require('./routes/' + file));

const validCredentials = (username, password) =>
  typeof username === 'string' && username.trim().length > 0 &&
  typeof password === 'string' && password.length > 0;

app.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!validCredentials(username, password)) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  if (await models.User.findOne({ where: { username } })) {
    return res.status(409).json({ success: false, message: 'Username has already been used.' });
  }
  await models.User.create({ username, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ success: true, message: 'Your username and password are registered!' });
}));

async function login(username, password, res) {
  if (!validCredentials(username, password)) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  const user = await models.User.findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
  }
  res.json({ success: true, message: 'You are now logged in!', token: tokens.sign(user), userId: user.id });
}
app.post('/api/login', asyncHandler((req, res) => login(req.body.username, req.body.password, res)));
app.post('/api/guest-login', asyncHandler((req, res) => {
  const username = process.env.REACT_APP_USERNAME;
  const password = process.env.REACT_APP_PASSWORD;
  if (!validCredentials(username, password)) {
    return res.status(503).json({ success: false, message: 'Guest login is not configured.' });
  }
  return login(username, password, res);
}));

function validRows(rows) {
  return Array.isArray(rows) && rows.length > 0 &&
    rows.every(row => row !== null && typeof row === 'object' && !Array.isArray(row));
}
app.post('/chart-data', auth, asyncHandler(async (req, res) => {
  if (!validRows(req.body)) return res.status(400).json({ message: 'Expected a nonempty array of chart rows.' });
  const rows = req.body.map(row => ({
    symbol: row.symbol, date: row.date, revenue: row.revenue,
    costAndExpenses: row.costAndExpenses, grossProfit: row.grossProfit,
  }));
  await models.Company.bulkCreate(rows);
  res.status(201).json({ message: 'Success', count: rows.length });
}));
app.post('/api/data', auth, asyncHandler(async (req, res) => {
  if (!validRows(req.body)) return res.status(400).json({ message: 'Expected a nonempty array of CSV rows.' });
  const rows = req.body.map(row => ({
    revenue: row.Revenue, expenses: row.Expenses, cost_expenses: row.costAndExpenses,
    gross_profit: row.grossProfit, company: row.company, userId: req.user.id,
  }));
  await models.SavedData.bulkCreate(rows);
  res.status(201).json({ message: 'Data saved.', count: rows.length });
}));
app.post('/api/test', (req, res) => res.json());
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ success: false, message: status === 400 ? 'Invalid JSON.' : 'Unable to complete the request.' });
});
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log('Server running on port ' + port));
}
module.exports = app;
