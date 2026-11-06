'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const invalid = files.filter(file =>
  /(^|\/)(node_modules|\.next|coverage|playwright-report|test-results|backups)(\/|$)/.test(file) ||
  /(^|\/)\.DS_Store$/.test(file) ||
  /(^|\/)\.env(?:\..+)?$/.test(file) && !file.endsWith('/.env.example') && file !== '.env.example'
);
const missingLocks = ['package-lock.json', 'client/package-lock.json', 'server/package-lock.json']
  .filter(file => !fs.existsSync(path.join(root, file)));
if (invalid.length || missingLocks.length) {
  if (invalid.length) console.error('Remove generated files/local configuration from version control:\n' + invalid.join('\n'));
  if (missingLocks.length) console.error('Commit independent npm lockfiles:\n' + missingLocks.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Repository hygiene and lockfile checks passed.');
}
