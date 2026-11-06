const { defineConfig, devices } = require('@playwright/test');

const clientPort = Number(process.env.E2E_CLIENT_PORT || 8320);
const apiPort = Number(process.env.E2E_API_PORT || 8321);
const baseURL = `http://127.0.0.1:${clientPort}`;
const databaseURL = process.env.E2E_DATABASE_URL;
if (!databaseURL) throw new Error('E2E_DATABASE_URL must identify a migrated, seeded, disposable PostgreSQL database.');
const secret = process.env.E2E_JWT_PASSWORD || 'local-e2e-only-session-secret-at-least-32-characters';

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm start --prefix server',
      url: `http://127.0.0.1:${apiPort}/health/ready`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(apiPort),
        DATABASE_URL: databaseURL, TEST_DATABASE_URL: databaseURL,
        JWT_PASSWORD: secret, CORS_ORIGINS: baseURL, COOKIE_SECURE: 'false',
        AUTH_RATE_LIMIT_MAX: '200', API_RATE_LIMIT_MAX: '2000',
      },
    },
    {
      command: `npm start --prefix client -- --hostname 127.0.0.1 --port ${clientPort}`,
      url: baseURL,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { BACKEND_URL: `http://127.0.0.1:${apiPort}`, NEXT_TELEMETRY_DISABLED: '1' },
    },
  ],
});
