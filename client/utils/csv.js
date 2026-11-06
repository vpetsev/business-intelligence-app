import Papa from 'papaparse';
const required = ['company', 'Revenue', 'Expenses'];
const optional = ['costAndExpenses', 'grossProfit'];
export const CSV_EXAMPLE = 'company,Revenue,Expenses,costAndExpenses,grossProfit\nExample Co,120000,75000,85000,45000\n';
export function parseFinancialCsv(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy', transformHeader: value => value.trim().replace(/^\uFEFF/, '') });
  if (parsed.errors.length) throw new Error(`CSV could not be read: ${parsed.errors[0].message}`);
  const headers = parsed.meta.fields || [];
  if (required.some(field => !headers.includes(field))) throw new Error(`CSV must include the headers: ${required.join(', ')}.`);
  if (headers.some(field => ![...required, ...optional].includes(field))) throw new Error(`Unknown or duplicate CSV column. Allowed columns: ${[...required, ...optional].join(', ')}.`);
  if (!parsed.data.length || parsed.data.length > 1000) throw new Error('Upload between 1 and 1,000 rows.');
  return parsed.data.map((row, index) => {
    const company = row.company?.trim();
    if (!company || company.length > 120 || [...company].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error(`Row ${index + 2}: company must contain 1–120 characters.`);
    const result = { company };
    for (const field of [...required.slice(1), ...optional]) {
      const value = row[field]?.trim();
      if (!value && optional.includes(field)) continue;
      if (!value || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new Error(`Row ${index + 2}: ${field} must be a finite number without currency symbols or thousands separators.`);
      const amount = Number(value);
      if (Math.abs(amount) > 999999999999 || Number(amount.toFixed(4)) !== amount) throw new Error(`Row ${index + 2}: ${field} must be between -999999999999 and 999999999999 with at most four decimal places.`);
      result[field] = amount;
    }
    return result;
  });
}
