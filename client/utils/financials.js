export const COMPANY_NAMES = { apple: 'Apple', facebook: 'Facebook', tesla: 'Tesla' };
export function numeric(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function financialRows(data, year) {
  if (!Array.isArray(data)) return [];
  return data.filter(row => row && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && (!year || row.date.slice(0, 4) === String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function availableYears(data) {
  return [...new Set(financialRows(data).map(row => row.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
}
export function formatAmount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return 'Not available';
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
  if (!match) return 'Not available';
  const whole = match[2].replace(/^0+/, '') || '0';
  const fraction = (match[3] || '').replace(/0+$/, '');
  const sign = match[1] === '-' && (whole !== '0' || fraction) ? '-' : '';
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}
export function chartData(rows, labelKey = 'date', saved = false) {
  // Canvas coordinates use Numbers; the accompanying table retains exact strings.
  const metrics = saved
    ? [['Revenue', 'revenue', '#4338ca'], ['Expenses', 'expenses', '#c14700'], ['Gross profit', 'gross_profit', '#137348']]
    : [['Revenue', 'revenue', '#4338ca'], ['Cost of revenue', 'costOfRevenue', '#c14700'], ['Gross profit', 'grossProfit', '#137348']];
  return { labels: rows.map(row => String(row[labelKey])), datasets: metrics.map(([label, key, color]) => ({ label, data: rows.map(row => numeric(row[key])), borderColor: color, backgroundColor: color, tension: .1, spanGaps: false })) };
}
