import Papa from 'papaparse';
const required = ['company', 'Revenue', 'Expenses'];
const optional = ['costAndExpenses', 'grossProfit'];
export const CSV_EXAMPLE = 'company,Revenue,Expenses,costAndExpenses,grossProfit\nExample Co,120000,75000,85000,45000\n';

// CSV amounts cross the JSON/API boundary as decimal strings. Converting to a
// binary floating-point Number here can change a valid fourth decimal place.
function exactAmount(value, row, field) {
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(value || '');
  if (!match) throw new Error(`Row ${row}: ${field} must be a finite number without currency symbols or thousands separators.`);
  const fraction = match[3] ?? match[4] ?? '';
  let digits = `${match[2] || ''}${fraction}`.replace(/^0+/, '');
  if (!digits) return '0';
  const exponent = Number(match[5] || 0);
  const significant = digits.replace(/0+$/, '');
  const scale = fraction.length - exponent - (digits.length - significant.length);
  digits = significant;
  const invalid = () => new Error(`Row ${row}: ${field} must be between -999999999999 and 999999999999 with at most four decimal places.`);
  // Bound the exponent and digit count before allocating a BigInt or power.
  if (!Number.isSafeInteger(exponent) || scale > 4 || digits.length - scale > 12) throw invalid();
  const units = BigInt(digits) * (10n ** BigInt(4 - scale));
  if (units > 9999999999990000n) throw invalid();
  const decimal = (units % 10000n).toString().padStart(4, '0').replace(/0+$/, '');
  return `${match[1] === '-' ? '-' : ''}${units / 10000n}${decimal ? `.${decimal}` : ''}`;
}

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
      result[field] = exactAmount(value, index + 2, field);
    }
    return result;
  });
}
