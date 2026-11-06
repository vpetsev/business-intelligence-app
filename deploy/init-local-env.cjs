'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(process.argv[2] || '.env');
const content = [
  '# Local Docker Compose credentials. Do not commit or reuse in production.',
  'POSTGRES_DB=bi_app',
  'POSTGRES_USER=bi_app',
  `POSTGRES_PASSWORD=${crypto.randomBytes(32).toString('hex')}`,
  `JWT_PASSWORD=${crypto.randomBytes(48).toString('hex')}`,
  'WEB_PORT=3000',
  'API_PORT=3001',
  'DB_PORT=5432',
  'COOKIE_SECURE=false',
  'CORS_ORIGINS=http://localhost:3000',
  '',
].join('\n');

try {
  fs.writeFileSync(output, content, { flag: 'wx', mode: 0o600 });
  console.log(`Created ${output}. Existing configuration was not overwritten.`);
} catch (error) {
  console.error(error.code === 'EEXIST'
    ? `${output} already exists; keep or edit it explicitly.`
    : `Unable to create local configuration: ${error.code || 'write failed'}`);
  process.exitCode = 1;
}
