const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const password = 'E2e-valid-password-42!';
const username = () => `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
async function registerAndLogin(page) {
  const user = username();
  await page.goto('/register');
  await page.getByLabel('Username', { exact: true }).fill(user);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Username', { exact: true }).fill(user);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/my-data/);
  await expect(page.getByRole('heading', { name: 'My data', exact: true })).toBeVisible();
  return user;
}

test('registration, session persistence and logout use an HttpOnly cookie', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await registerAndLogin(page);
  const cookie = (await context.cookies()).find(value => value.name === 'bi_session');
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('bi_session');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/eyJ|token/i);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My data', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await context.cookies()).find(value => value.name === 'bi_session')).toBeUndefined();
  await page.goto('/my-data');
  await expect(page.getByRole('link', { name: /log in|sign in/i }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('invalid login reports a useful error and keeps the form usable', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('not_a_registered_account');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(/incorrect|invalid/i);
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/\/login/);
});

test('CSV import, persistence, export and deletion round trip through the real API', async ({ page }) => {
  await registerAndLogin(page);
  const company = `BrowserCo_${Date.now()}`;
  await page.getByLabel('Upload CSV', { exact: true }).setInputFiles({
    name: 'financials.csv', mimeType: 'text/csv',
    buffer: Buffer.from(`company,Revenue,Expenses\n${company},900000000000.0003,0.0001\n`),
  });
  await page.getByRole('button', { name: 'Import data', exact: true }).click();
  await expect(page.getByRole('cell', { name: company, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: company, exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '900,000,000,000.0003', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '900,000,000,000.0002', exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download CSV', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  const exported = Buffer.concat(chunks).toString();
  expect(exported).toContain(company);
  expect(exported).toContain('900000000000.0003');
  expect(exported).toContain('900000000000.0002');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: `Delete ${company}`, exact: true }).click();
  await expect(page.getByRole('cell', { name: company, exact: true })).toHaveCount(0);
});

test('each company renders sample charts and year navigation stays coherent', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const company of ['Apple', 'Facebook', 'Tesla']) {
    await page.goto('/explore');
    await page.getByRole('link', { name: `View ${company} charts`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/charts/${company.toLowerCase()}$`));
    await expect(page.getByLabel('Year', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Year', { exact: true }).locator('option[value="2019"]')).toHaveCount(1);
    await page.getByLabel('Year', { exact: true }).selectOption('2019');
    await expect(page).toHaveURL(new RegExp(`/charts/${company.toLowerCase()}/2019$`));
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('table')).toContainText('2019');
  }
  expect(errors).toEqual([]);
});

test('chart service failure is presented as an error instead of a crash', async ({ page }) => {
  await page.route('**/api/backend/apple**', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Chart service unavailable.' }),
  }));
  await page.goto('/charts/apple');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
});

test('core pages have no WCAG A/AA violations and work at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/login', '/register', '/explore']) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await registerAndLogin(page);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});
