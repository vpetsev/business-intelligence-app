export const COMPANY_NAMES = { apple: 'Apple', facebook: 'Facebook', tesla: 'Tesla' };
export function numeric(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function financialRows(data, year) {
  if (!Array.isArray(data)) return [];
  return data.filter(row => row && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && (!year || row.date.slice(0, 4) === String(year)))
    .map(row => ({ ...row, revenue: numeric(row.revenue), costOfRevenue: numeric(row.costOfRevenue), costAndExpenses: numeric(row.costAndExpenses), grossProfit: numeric(row.grossProfit) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function availableYears(data) {
  return [...new Set(financialRows(data).map(row => row.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
}
export const formatAmount = value => value === null || value === undefined ? 'Not available' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value);
export function chartData(rows, labelKey = 'date', saved = false) {
  const metrics = saved
    ? [['Revenue', 'revenue', '#4338ca'], ['Expenses', 'expenses', '#c14700'], ['Gross profit', 'gross_profit', '#137348']]
    : [['Revenue', 'revenue', '#4338ca'], ['Cost of revenue', 'costOfRevenue', '#c14700'], ['Gross profit', 'grossProfit', '#137348']];
  return { labels: rows.map(row => String(row[labelKey])), datasets: metrics.map(([label, key, color]) => ({ label, data: rows.map(row => numeric(row[key])), borderColor: color, backgroundColor: color, tension: .1, spanGaps: false })) };
}
