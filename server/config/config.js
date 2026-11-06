require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const ssl = process.env.DB_SSL === 'true' ? {
  require: true, rejectUnauthorized: true,
  ...(process.env.DB_SSL_CA_FILE ? { ca: fs.readFileSync(process.env.DB_SSL_CA_FILE, 'utf8') } : {}),
} : undefined;
const poolMax = Number(process.env.DB_POOL_MAX || 5);
if (!Number.isInteger(poolMax) || poolMax < 1 || poolMax > 50) throw new Error('DB_POOL_MAX must be an integer from 1 to 50');
const local = {
  dialect: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME || 'bi_app',
  username: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || null,
  logging: false, pool: { max: poolMax, min: 0, acquire: 10000, idle: 10000 },
  dialectOptions: { ssl: ssl || false, statement_timeout: 10000, query_timeout: 12000 },
};
module.exports = {
  development: process.env.DATABASE_URL ? { ...local, use_env_variable: 'DATABASE_URL' } : local,
  test: { ...local, use_env_variable: 'TEST_DATABASE_URL', pool: { max: poolMax, min: 0, idle: 1000 } },
  production: { ...local, use_env_variable: 'DATABASE_URL' },
};
