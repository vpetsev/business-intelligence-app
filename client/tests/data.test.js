import { describe, expect, it } from 'vitest';
import { parseFinancialCsv } from '../utils/csv';
import { availableYears, chartData, financialRows, formatAmount, numeric } from '../utils/financials';
describe('CSV import validation', () => {
  it('parses quoted company names and optional numbers without confusing zero and missing values', () => {
    expect(parseFinancialCsv('company,Revenue,Expenses,grossProfit\n"Example, Inc.",0,-2,\n')).toEqual([{ company: 'Example, Inc.', Revenue: '0', Expenses: '-2' }]);
  });
  it.each([
    ['company,Expenses\nA,1', /headers/],
    ['company,Revenue,Expenses,Revenue\nA,1,2,3', /duplicate|Unknown/],
    ['company,Revenue,Expenses\nA,Infinity,2', /finite number/],
    ['company,Revenue,Expenses\nA,1000000000000,2', /four decimal places/],
    ['company,Revenue,Expenses\nA,0.12345,2', /four decimal places/],
    ['company,Revenue,Expenses\nA,900000000000.00001,2', /four decimal places/],
    ['company,Revenue,Expenses\nA,999999999999.0001,2', /four decimal places/],
    ['company,Revenue,Expenses\nA,1e999999999999999999,2', /four decimal places/],
    ['company,Revenue,Expenses\nA,,2', /finite number/],
    ['company,Revenue,Expenses\n,1,2', /company/],
    ['company,Revenue,Expenses\nA,1,2,3', /could not be read/],
    ['company,Revenue,Expenses\n', /between 1/],
  ])('rejects malformed or ambiguous input: %s', (csv, error) => expect(() => parseFinancialCsv(csv)).toThrow(error));
  it('keeps all supported decimal digits through JSON serialization, including exponent inputs', () => {
    const rows = parseFinancialCsv('company,Revenue,Expenses,costAndExpenses,grossProfit\nExact,900000000000.0003,0.0001,9.000000000000003e11,-900000000000.0003\n');
    expect(JSON.parse(JSON.stringify(rows))).toEqual([{
      company: 'Exact', Revenue: '900000000000.0003', Expenses: '0.0001',
      costAndExpenses: '900000000000.0003', grossProfit: '-900000000000.0003',
    }]);
  });
  it('canonicalizes signs and insignificant zeros without rounding', () => {
    expect(parseFinancialCsv('company,Revenue,Expenses,grossProfit\nA,+001.2300,-0.0000,.00010\n')).toEqual([
      { company: 'A', Revenue: '1.23', Expenses: '0', grossProfit: '0.0001' },
    ]);
  });
  it('rejects oversized batches before any request can be sent', () => {
    expect(() => parseFinancialCsv('company,Revenue,Expenses\n' + 'A,1,2\n'.repeat(1001))).toThrow('1,000');
  });
});
describe('financial statements', () => {
  const data = [{ date: '2020-03-31', revenue: 9 }, { date: '2019-12-31', revenue: '100', grossProfit: null }, { date: '2019-03-31', revenue: 0, costOfRevenue: '12' }, null, { date: 'bad' }];
  it('filters by calendar year and sorts independently of API order', () => {
    expect(financialRows(data, '2019').map(row => row.date)).toEqual(['2019-03-31', '2019-12-31']);
    expect(availableYears(data)).toEqual(['2020', '2019']);
  });
  it('maps the right metric and preserves zero, missing values, and decimal strings', () => {
    const mapped = chartData(financialRows(data, '2019'));
    expect(mapped.datasets[0].data).toEqual([0, 100]);
    expect(mapped.datasets[1].label).toBe('Cost of revenue');
    expect(mapped.datasets[1].data).toEqual([12, null]);
    expect(mapped.datasets[2].data).toEqual([null, null]);
    expect(numeric('Infinity')).toBe(null);
    expect(numeric('   ')).toBe(null);
    expect(formatAmount(123.4567)).toBe('123.4567');
    expect(formatAmount('900000000000.0003')).toBe('900,000,000,000.0003');
    expect(formatAmount('-900000000000.0003')).toBe('-900,000,000,000.0003');
    expect(formatAmount('0.0001')).toBe('0.0001');
    expect(formatAmount('-0.0000')).toBe('0');
    expect(formatAmount('Infinity')).toBe('Not available');
    expect(financialRows([{ date: '2019-12-31', revenue: '900000000000.0003' }])[0].revenue).toBe('900000000000.0003');
    expect(chartData([]).labels).toEqual([]);
  });
});
