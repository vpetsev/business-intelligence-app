const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
assert(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to an EMPTY disposable PostgreSQL database. Tests never fall back to DATABASE_URL.');
const models = require('../models');
exports.models = models;
exports.prepare = async () => {
  await models.sequelize.authenticate();
  const tables = await models.sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", { type: models.Sequelize.QueryTypes.SELECT });
  assert.equal(tables.length, 0, 'Integration tests require an EMPTY database; existing data will not be deleted.');
  const { migrate } = require('../lib/migrate');
  assert((await migrate()).length > 0);
  assert.deepEqual(await migrate(), [], 'Migration runner must be idempotent');
};
exports.start = async app => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = async (route, { method = 'GET', body, token, cookie, csrf, headers = {}, raw } = {}) => {
    headers = { ...headers };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (cookie) headers.Cookie = cookie;
    if (csrf) headers['X-CSRF-Token'] = csrf;
    let data = raw;
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; data = JSON.stringify(body); }
    const response = await fetch(base + route, { method, body: data, headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch (_) {}
    return { status: response.status, headers: response.headers, cookie: (response.headers.get('set-cookie') || '').split(';')[0], text, json };
  };
  return { base, request, close: () => new Promise(resolve => server.close(resolve)) };
};
