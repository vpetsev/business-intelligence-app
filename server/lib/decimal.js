// Four decimal places stored as scaled integers. Never route persisted amounts
// through binary floating point, even when a chart later uses Number to render.
const SCALE = 10000n;
const MAX_UNITS = 999999999999n * SCALE;
function units(decimal) {
  const negative = decimal.startsWith('-');
  const [whole, fraction = ''] = (negative ? decimal.slice(1) : decimal).split('.');
  const value = BigInt(whole) * SCALE + BigInt(fraction.padEnd(4, '0'));
  return negative ? -value : value;
}
function format(value) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const fraction = String(absolute % SCALE).padStart(4, '0').replace(/0+$/, '');
  return (negative ? '-' : '') + String(absolute / SCALE) + (fraction ? '.' + fraction : '');
}
function isDecimalText(value) { return typeof value === 'string' && value.length <= 64 && /^-?\d+(?:\.\d{1,4})?$/.test(value); }
function inRange(value) { return value >= -MAX_UNITS && value <= MAX_UNITS; }
function difference(left, right) { return format(units(left) - units(right)); }
// JSON.parse's source context preserves number literals before IEEE-754 rounding.
// Expand JSON exponent notation exactly; excessive exponents remain invalid input.
function expandJsonNumber(source) {
  if (source.length > 64) return source;
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(source);
  if (!match) return source;
  const [, sign, whole, fraction = '', exponent = '0'] = match;
  const shift = Number(exponent);
  if (!Number.isSafeInteger(shift) || Math.abs(shift) > 64) return source;
  const digits = whole + fraction;
  const point = whole.length + shift;
  let expanded;
  if (point <= 0) expanded = '0.' + '0'.repeat(-point) + digits;
  else if (point >= digits.length) expanded = digits + '0'.repeat(point - digits.length);
  else expanded = digits.slice(0, point) + '.' + digits.slice(point);
  if (expanded.includes('.')) expanded = expanded.replace(/0+$/, '').replace(/\.$/, '');
  return sign + expanded;
}
const moneyFields = new Set(['Revenue', 'Expenses', 'costAndExpenses', 'grossProfit']);
function financialJsonReviver(key, value, context) {
  return typeof value === 'number' && moneyFields.has(key) && context?.source ? expandJsonNumber(context.source) : value;
}
module.exports = { units, format, inRange, isDecimalText, difference, financialJsonReviver };
