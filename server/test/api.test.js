const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_PASSWORD = 'test-secret-at-least-thirty-two-characters-long';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.API_RATE_LIMIT_MAX = '10000';
process.env.ADMIN_USERNAMES = 'admin@example.test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
const { prepare, start, models } = require('./support');
const { seed } = require('../lib/seed');
const jwt = require('jsonwebtoken');
const tokens = require('../config/token');
const row = { company: 'Example company', Revenue: '123.5', Expenses: '12' };
const owner = { username: 'Owner@Example.Test', password: 'owner-strong-password' };
const other = { username: 'other@example.test', password: 'other-strong-password' };
let server, call, ownerSession, otherSession;
test('API contracts against an empty migrated PostgreSQL database', { timeout: 90000 }, async t => {
  try {
    await prepare();
    assert(!models.SavedData.rawAttributes.UserId);
    server = await start(require('../app'));
    call = server.request;
    await t.test('migrations, health, deterministic seed, and calendar-year company data', async () => {
      assert.equal((await call('/health/live')).status, 200);
      assert.equal((await call('/health/ready')).status, 200);
      assert.equal((await seed()).companyRowsInserted, 36);
      assert.equal((await seed()).companyRowsInserted, 0);
      assert.equal(await models.Company.count(), 36);
      const catalog = (await call('/charts')).json;
      assert.equal(catalog.length, 3);
      assert.deepEqual(catalog[0].years, [2017, 2018, 2019]);
      for (const name of ['apple', 'facebook', 'tesla']) {
        const rows = (await call('/' + name + '/2019')).json;
        assert.equal(rows.length, 4);
        assert(rows.every(row => row.date.startsWith('2019-') && row.source === 'demo'));
        assert.deepEqual(rows.map(row => row.date), [...rows.map(row => row.date)].sort());
        assert.equal((await call('/' + name)).json.length, 12);
        assert.deepEqual((await call('/' + name + '/2020')).json, []);
        assert.equal((await call('/' + name + '/nonsense')).status, 400);
      }
      assert.equal((await call('/missing-route')).status, 404);
    });
    await t.test('registration validation, normalization, and database-enforced race protection', async () => {
      for (const body of [{}, { ...owner, password: 'short' }, { ...owner, username: 'bad name' }, { ...owner, password: '😀'.repeat(25) }, { ...owner, role: 'admin' }]) assert.equal((await call('/register', { method: 'POST', body })).status, 400);
      const concurrent = await Promise.all([owner, { ...owner, username: '  owner@example.test ' }].map(body => call('/register', { method: 'POST', body })));
      assert.deepEqual(concurrent.map(res => res.status).sort(), [201, 409]);
      assert.equal(await models.User.count({ where: { username: 'owner@example.test' } }), 1);
      assert.equal((await call('/register', { method: 'POST', body: other })).status, 201);
      assert.equal((await call('/register', { method: 'POST', body: { username: 'admin@example.test', password: 'admin-strong-password' } })).status, 409);
      await models.User.create({ username: 'admin@example.test', password: await require('bcryptjs').hash('admin-strong-password', 12) });
      const stored = await models.User.findOne({ where: { username: 'owner@example.test' } });
      assert.notEqual(stored.password, owner.password);
      await assert.rejects(models.User.create({ username: 'owner@example.test', password: 'hash' }), models.Sequelize.UniqueConstraintError);
    });
    await t.test('cookie sessions, bearer compatibility, auth errors, and CSRF enforcement', async () => {
      assert.equal((await call('/api/session')).status, 401);
      for (const body of [{ username: 'missing', password: 'wrong' }, { ...owner, password: 'wrong' }]) assert.equal((await call('/api/login', { method: 'POST', body })).status, 401);
      assert.equal((await call('/api/login', { method: 'POST', body: {} })).status, 400);
      ownerSession = await call('/api/login', { method: 'POST', body: owner });
      otherSession = await call('/api/login', { method: 'POST', body: other });
      assert.equal(ownerSession.status, 200);
      assert.match(ownerSession.headers.get('set-cookie'), /HttpOnly/);
      assert.match(ownerSession.headers.get('set-cookie'), /SameSite=Lax/);
      assert.match(ownerSession.headers.get('set-cookie'), /Path=\//);
      const own = await call('/api/session', { cookie: ownerSession.cookie });
      assert.equal(own.json.user.username, 'owner@example.test');
      assert.equal(own.json.csrfToken, ownerSession.json.csrfToken);
      assert.equal(own.headers.get('cache-control'), 'no-store');
      assert.equal((await call('/api/data', { token: ownerSession.json.token })).status, 200);
      for (const token of ['invalid', jwt.sign({ id: own.json.user.id }, 'wrong-secret'), jwt.sign({ id: own.json.user.id }, process.env.JWT_PASSWORD, { expiresIn: -1, issuer: 'bi-api', audience: 'bi-client' })]) assert.equal((await call('/api/session', { token })).status, 401);
      assert.equal((await call('/api/data', { method: 'POST', cookie: ownerSession.cookie, body: [row] })).status, 403);
      assert.equal((await call('/api/data', { method: 'POST', cookie: ownerSession.cookie, csrf: 'a'.repeat(64), body: [row] })).status, 403);
      const body = [{ ...row, userId: otherSession.json.userId }];
      assert.equal((await call('/api/data', { method: 'POST', token: ownerSession.json.token, body })).status, 400);
    });
    await t.test('atomic CSV validation, ownership, pagination, export safety, and deletion', async () => {
      const token = ownerSession.json.token;
      for (const body of [[], {}, [{ company: 'Missing figures' }], [{ ...row, Revenue: 'NaN' }], [{ ...row, Revenue: 'Infinity' }], [{ ...row, Revenue: '1.23456' }], [{ ...row, company: '' }], [row, { ...row, Expenses: null }], Array(1001).fill(row)]) assert.equal((await call('/api/data', { method: 'POST', token, body })).status, 400);
      assert.equal(await models.SavedData.count(), 0);
      const uploaded = await call('/api/data', { method: 'POST', cookie: ownerSession.cookie, csrf: ownerSession.json.csrfToken, body: [row, { ...row, company: '=HYPERLINK("bad")' }] });
      assert.equal(uploaded.status, 201);
      assert.equal(uploaded.json.count, 2);
      await models.SavedData.create({ company: 'unowned historical row', userId: null });
      const own = (await call('/api/data?limit=1&offset=0', { token })).json;
      assert.equal(own.total, 2); assert.equal(own.rows.length, 1);
      assert.equal(own.rows[0].gross_profit, '111.5');
      assert.equal(own.rows[0].userId, ownerSession.json.userId);
      assert.equal((await call('/api/data', { token: otherSession.json.token })).json.total, 0);
      assert.equal((await call('/userData/user-data/' + ownerSession.json.userId, { token: otherSession.json.token })).status, 403);
      assert.equal((await call('/userData/user-data/' + ownerSession.json.userId, { token })).json.length, 2);
      assert.equal((await call('/api/data?limit=201', { token })).status, 400);
      const exported = await call('/api/data/export', { token });
      assert.equal(exported.status, 200);
      assert.match(exported.text, /"'=HYPERLINK/);
      assert(!exported.text.includes('unowned'));
      const id = own.rows[0].id;
      assert.equal((await call('/api/data/' + id, { method: 'DELETE', token: otherSession.json.token })).status, 404);
      assert.equal((await call('/api/data/' + id, { method: 'DELETE', token })).status, 204);
      assert.equal((await call('/api/data/' + id, { method: 'DELETE', token })).status, 404);
      assert.equal((await call('/api/data/no', { method: 'DELETE', token })).status, 400);
    });
    await t.test('admin imports validate and reject duplicate company rows atomically', async () => {
      const body = [{ symbol: 'AAPL', date: '2020-03-28', revenue: 1000, costAndExpenses: 500, grossProfit: 500 }];
      assert.equal((await call('/chart-data', { method: 'POST', token: ownerSession.json.token, body })).status, 403);
      const admin = await call('/api/login', { method: 'POST', body: { username: 'admin@example.test', password: 'admin-strong-password' } });
      const token = admin.json.token;
      assert.equal((await call('/chart-data', { method: 'POST', token, body: [{ ...body[0], date: '2020-02-31' }] })).status, 400);
      assert.equal((await call('/chart-data', { method: 'POST', token, body: [body[0], body[0]] })).status, 409);
      const concurrent = await Promise.all([1, 2].map(() => call('/chart-data', { method: 'POST', token, body })));
      assert.deepEqual(concurrent.map(res => res.status).sort(), [201, 409]);
      assert.equal((await call('/apple/2019')).json.length, 4);
      assert.equal((await call('/apple/2020')).json.length, 1);
    });
    await t.test('origins, security headers, body limits and JSON content types', async () => {
      assert.equal((await call('/charts', { headers: { Origin: 'https://attacker.example' } })).status, 403);
      const allowed = await call('/charts', { headers: { Origin: 'http://localhost:3000' } });
      assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
      assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(allowed.headers.get('x-powered-by'), null);
      assert.equal((await call('/api/login', { method: 'POST', raw: 'x=1', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 415);
      assert.equal((await call('/api/login', { method: 'POST', raw: '{bad', headers: { 'Content-Type': 'application/json' } })).status, 400);
      assert.equal((await call('/api/login', { method: 'POST', body: { password: 'x'.repeat(1024 * 1024 + 1) } })).status, 413);
      assert.equal((await call('/api/login', { method: 'POST', body: owner, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    });
    await t.test('guest sessions are opt-in and read-only', async () => {
      assert.equal((await call('/api/guest-login', { method: 'POST', body: {} })).status, 503);
      process.env.GUEST_USERNAME = other.username; process.env.GUEST_PASSWORD = other.password;
      const guest = await call('/api/guest-login', { method: 'POST', body: {} });
      assert.equal(guest.status, 200); assert.equal(guest.json.user.readOnly, true);
      assert.equal((await call('/api/data', { method: 'POST', token: guest.json.token, body: [row] })).status, 403);
      delete process.env.GUEST_USERNAME; delete process.env.GUEST_PASSWORD;
    });
    await t.test('logout revokes exactly the current session and deleted accounts cannot authenticate', async () => {
      const another = await call('/api/login', { method: 'POST', body: owner });
      assert.equal((await call('/api/logout', { method: 'POST', cookie: ownerSession.cookie, csrf: ownerSession.json.csrfToken })).status, 204);
      assert.equal((await call('/api/session', { token: ownerSession.json.token })).status, 401);
      assert.equal((await call('/api/session', { token: another.json.token })).status, 200);
      ownerSession = another;
      await models.User.destroy({ where: { id: otherSession.json.userId } });
      assert.equal((await call('/api/session', { token: otherSession.json.token })).status, 401);
    });
    await t.test('rate limits return 429 with retry metadata', async () => {
      process.env.AUTH_RATE_LIMIT_MAX = '2';
      const limited = await start(require('../app').createApp());
      try {
        for (let i = 0; i < 2; i++) assert.equal((await limited.request('/api/login', { method: 'POST', body: {} })).status, 400);
        const blocked = await limited.request('/api/login', { method: 'POST', body: {} });
        assert.equal(blocked.status, 429); assert(blocked.headers.get('retry-after'));
      } finally { await limited.close(); process.env.AUTH_RATE_LIMIT_MAX = '1000'; }
    });
    await t.test('real database errors complete requests and readiness fails independently of liveness', async () => {
      await models.sequelize.query('ALTER TABLE "Companies" RENAME TO "CompaniesUnavailable"');
      try {
        const failed = await call('/apple'); assert.equal(failed.status, 500);
        assert(!failed.text.includes('SELECT')); assert(failed.json.requestId);
        assert.equal((await call('/health/ready')).status, 503);
        assert.equal((await call('/health/live')).status, 200);
      } finally { await models.sequelize.query('ALTER TABLE "CompaniesUnavailable" RENAME TO "Companies"'); }
      await models.sequelize.query('ALTER TABLE "SavedData" RENAME TO "SavedDataUnavailable"');
      try { assert.equal((await call('/api/data', { method: 'POST', token: ownerSession.json.token, body: [row] })).status, 500); }
      finally { await models.sequelize.query('ALTER TABLE "SavedDataUnavailable" RENAME TO "SavedData"'); }
      assert.equal((await call('/health/ready')).status, 200);
    });
    await t.test('upgrade migration rejects ambiguous usernames without data loss and preserves orphan ownership', async () => {
      const migration = require('../migrations/20261106000000-harden-users-and-sessions');
      const sentinel = new Error('rollback-fixture');
      await assert.rejects(models.sequelize.transaction(async transaction => {
        const options = { transaction }, qi = models.sequelize.getQueryInterface();
        await migration.down(qi, models.Sequelize, options);
        await models.sequelize.query(`INSERT INTO "Users" (username,password,"createdAt","updatedAt") VALUES (' COLLISION ', 'hash', NOW(), NOW()), ('collision', 'hash', NOW(), NOW())`, options);
        await assert.rejects(migration.up(qi, models.Sequelize, options), /operator review/);
        const [rows] = await models.sequelize.query(`SELECT username FROM "Users" WHERE username IN (' COLLISION ', 'collision')`, options);
        assert.equal(rows.length, 2);
        await models.sequelize.query(`DELETE FROM "Users" WHERE username = 'collision'`, options);
        await models.sequelize.query(`INSERT INTO "SavedData" (company,"userId","createdAt","updatedAt") VALUES ('legacy orphan', 99999999, NOW(), NOW())`, options);
        await migration.up(qi, models.Sequelize, options);
        const [orphans] = await models.sequelize.query(`SELECT "userId" FROM "SavedData" WHERE company = 'legacy orphan'`, options);
        assert.equal(orphans[0].userId, 99999999);
        throw sentinel;
      }), error => error === sentinel);
      assert.equal((await call('/health/ready')).status, 200);
    });
  } finally {
    if (server) await server.close();
    await models.sequelize.close();
  }
});
