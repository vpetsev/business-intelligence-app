const test = require('node:test');
const assert = require('node:assert/strict');
const { parse, rows } = require('../lib/validation');
const { difference, financialJsonReviver } = require('../lib/decimal');
const row = (Revenue, Expenses = '0') => ({ company: 'Exact amount', Revenue, Expenses });
test('large fractions and derived differences stay exact without numeric coercion', () => {
  assert.equal(parse(rows, [row('900000000000.0003')])[0].Revenue, '900000000000.0003');
  assert.equal(difference('900000000000.0003', '0.0001'), '900000000000.0002');
  assert.equal(difference('0.3', '0.1'), '0.2');
  assert.equal(difference('-900000000000.0003', '-0.0001'), '-900000000000.0002');
  assert.equal(parse(rows, [row('0001.2300', '-0.0000')])[0].Revenue, '1.23');
  assert.equal(parse(rows, [row('0001.2300', '-0.0000')])[0].Expenses, '0');
  assert.equal(parse(rows, [row(123.5, 1)])[0].Revenue, '123.5');
});
test('exact bounds and fractional precision are checked before conversion', () => {
  for (const value of ['999999999999.0001', '-999999999999.0001', '0.00001', '1e2', 'NaN', '1'.repeat(1000)]) assert.throws(() => parse(rows, [row(value)]), error => error.status === 400);
  assert.equal(parse(rows, [row('999999999999.0000')])[0].Revenue, '999999999999');
  assert.throws(() => parse(rows, [row('999999999999', '-0.0001')]));
});
test('raw JSON number digits and exponents survive JSON.parse source contexts', () => {
  const result = JSON.parse('[{"company":"Exact","Revenue":900000000000.0003,"Expenses":1e-4,"grossProfit":-9.000000000000003e11}]', financialJsonReviver);
  const parsed = parse(rows, result)[0];
  assert.equal(parsed.Revenue, '900000000000.0003');
  assert.equal(parsed.Expenses, '0.0001');
  assert.equal(parsed.grossProfit, '-900000000000.0003');
  assert.throws(() => parse(rows, JSON.parse('[{"company":"Too precise","Revenue":1e-5,"Expenses":0}]', financialJsonReviver)));
  assert.throws(() => parse(rows, JSON.parse('[{"company":"Overflow","Revenue":1e1000,"Expenses":0}]', financialJsonReviver)));
});
