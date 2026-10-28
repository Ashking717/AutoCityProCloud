/** FIND MOTHER cost notation; matches the Stock page's whole-number format. */
export function convertToStockCode(value: number): string {
  if (!Number.isFinite(value)) return '';
  const digits = 'RFINDMOTHE';
  return Math.floor(value).toString().replace(/\d/g, digit => digits[Number(digit)]);
}
