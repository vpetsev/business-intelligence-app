const { z } = require('zod');
const { HttpError } = require('./errors');
const normalizeUsername = username => username.trim().toLowerCase();
const username = z.string().transform(normalizeUsername).pipe(z.string().min(3).max(100).regex(/^[a-z0-9@._+\-]+$/, 'Use letters, numbers, @, ., _, + or -'));
const registration = z.object({ username, password: z.string().refine(value => [...value].length >= 12, 'Password must contain at least 12 characters').refine(value => /\S/.test(value), 'Password cannot be only whitespace').refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes') }).strict();
// Existing accounts may have shorter passwords or usernames; do not lock them out during this upgrade.
const login = z.object({ username: z.string().trim().min(1).max(255).transform(normalizeUsername), password: z.string().min(1).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password too long') }).strict();
const decimal = z.union([z.number(), z.string().trim().regex(/^-?\d+(?:\.\d{1,4})?$/, 'Use a decimal number with at most four decimal places')]).transform(Number).pipe(z.number().finite().min(-999999999999).max(999999999999).refine(value => Number(value.toFixed(4)) === value, 'Use at most four decimal places'));
const savedRow = z.object({ company: z.string().trim().min(1).max(120).refine(value => !/[\x00-\x1f\x7f]/.test(value), 'Control characters are not allowed'), Revenue: decimal, Expenses: decimal, costAndExpenses: decimal.optional(), grossProfit: decimal.optional() }).strict().refine(row => row.grossProfit !== undefined || Math.abs(row.Revenue - row.Expenses) <= 999999999999, 'Derived gross profit exceeds the supported range; provide a valid grossProfit');
const rows = z.array(savedRow).min(1).max(1000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value); return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value; }, 'Invalid calendar date');
const whole = z.union([z.number(), z.string().regex(/^-?\d+$/)]).transform(Number).pipe(z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER));
const companyRows = z.array(z.object({ symbol: z.string().regex(/^[A-Z][A-Z0-9.\-]{0,9}$/), date: isoDate, revenue: whole, costAndExpenses: whole, grossProfit: whole, costOfRevenue: whole.optional() }).strict()).min(1).max(1000);
function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = new HttpError(400, 'Invalid request data.', 'VALIDATION_ERROR');
    error.details = result.error.issues.slice(0, 10).map(issue => ({ field: issue.path.join('.'), message: issue.message }));
    throw error;
  }
  return result.data;
}
function positiveId(value) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new HttpError(400, 'Invalid record id.');
  return Number(value);
}
module.exports = { parse, registration, login, rows, companyRows, positiveId, normalizeUsername };
