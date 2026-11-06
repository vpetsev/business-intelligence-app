const test = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('../config/runtime');
const tokens = require('../config/token');
const { parse, registration, rows } = require('../lib/validation');
function environment(values, fn) {
  const original = { ...process.env };
  try {
    for (const key of ['CORS_ORIGINS', 'COOKIE_SECURE', 'TRUST_PROXY_HOPS', 'PORT', 'HOST', 'AUTH_RATE_LIMIT_MAX', 'API_RATE_LIMIT_MAX']) delete process.env[key];
    Object.assign(process.env, { NODE_ENV: 'production', JWT_PASSWORD: 'testing-secret-with-at-least-32-characters', ...values });
    fn();
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
}
test('production configuration fails closed and permits only explicit local insecure cookies', () => {
  environment({}, () => assert.throws(runtime, /CORS_ORIGINS/));
  environment({ CORS_ORIGINS: 'https://dashboard.example' }, () => { assert.deepEqual(runtime().origins, ['https://dashboard.example']); assert.equal(tokens.cookieOptions().secure, true); });
  environment({ CORS_ORIGINS: 'https://dashboard.example', COOKIE_SECURE: 'false' }, () => assert.throws(runtime, /loopback/));
  environment({ CORS_ORIGINS: 'http://dashboard.example', COOKIE_SECURE: 'false' }, () => assert.throws(runtime, /HTTPS/));
  environment({ CORS_ORIGINS: 'http://localhost:3000', COOKIE_SECURE: 'false' }, () => { runtime(); assert.equal(tokens.cookieOptions().secure, false); });
  for (const value of ['*', 'https://dashboard.example/path', 'https://dashboard.example/']) environment({ CORS_ORIGINS: value }, () => assert.throws(runtime));
  environment({ CORS_ORIGINS: 'https://dashboard.example', TRUST_PROXY_HOPS: '-1' }, () => assert.throws(runtime));
  environment({ CORS_ORIGINS: 'https://dashboard.example', JWT_PASSWORD: 'short' }, () => assert.throws(runtime));
});
test('financial and password boundary validation rejects unrepresentable exports and weak empty passwords', () => {
  for (const password of [' '.repeat(12), '😀'.repeat(6), '😀'.repeat(19)]) assert.throws(() => parse(registration, { username: 'boundary', password }));
  assert.equal(parse(registration, { username: ' Boundary ', password: 'long-enough-password' }).username, 'boundary');
  for (const body of [[{ company: 'Example', Revenue: 1.00001, Expenses: 0 }], [{ company: 'Example', Revenue: 999999999999, Expenses: -1 }]]) assert.throws(() => parse(rows, body));
  assert.equal(parse(rows, [{ company: 'Example', Revenue: -999999999999, Expenses: 0 }])[0].Revenue, '-999999999999');
});

test('database URLs cannot override strict TLS verification', async () => {
  const { databaseUrl } = require('../lib/databaseUrl');
  const base = 'postgresql://postgres:password@localhost:5432/bi_test';
  const config = { dialectOptions: { ssl: { ca: 'custom CA', rejectUnauthorized: true } } };
  for (const mode of ['require', 'verify-ca', 'verify-full']) {
    const connection = databaseUrl(base + '?sslmode=' + mode, config);
    assert.equal(new URL(connection.url).searchParams.has('sslmode'), false);
    assert.equal(connection.config.dialectOptions.ssl.rejectUnauthorized, true);
    assert.equal(connection.config.dialectOptions.ssl.ca, 'custom CA');
    const Sequelize = require('sequelize');
    const instance = new Sequelize(connection.url, { ...connection.config, logging: false });
    assert.equal(instance.options.dialectOptions.ssl.rejectUnauthorized, true);
    assert.equal(instance.options.dialectOptions.ssl.ca, 'custom CA');
    await instance.close();
  }
  for (const query of ['sslmode=no-verify', 'sslmode=prefer', 'sslmode=disable', 'ssl=false', 'sslrootcert=bad', 'uselibpqcompat=true']) assert.throws(() => databaseUrl(base + '?' + query, config));
  assert.equal(databaseUrl(base, { dialectOptions: { ssl: false } }).config.dialectOptions.ssl, false);
  assert.equal(new URL(databaseUrl(base + '?sslmode=disable', { dialectOptions: { ssl: false } }).url).search, '');
  assert.throws(() => databaseUrl('mysql://localhost/example', config), /PostgreSQL/);
});
