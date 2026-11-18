export function signedSupplierOpening(amount: unknown, side: unknown = 'CR') {
  const value = Number(amount);
  const type = String(side).toUpperCase();
  if (!Number.isFinite(value) || value < 0 || !['DR', 'CR'].includes(type)) throw new Error('Invalid opening balance: use a non-negative amount and DR or CR');
  return Number((value * (type === 'DR' ? -1 : 1)).toFixed(2));
}
