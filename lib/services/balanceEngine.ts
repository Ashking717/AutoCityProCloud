import Account from '@/lib/models/Account';

export function calculateBalanceChange(
  accountType: string,
  debit: number,
  credit: number
) {
  const type = (accountType || '').toLowerCase();
  const isDebitNormal = type === 'asset' || type === 'expense';
  return isDebitNormal ? debit - credit : credit - debit;
}

export async function applyVoucherBalances(voucher: any) {
  if (voucher.referenceType === 'OPENING_BALANCE') return;

  for (const entry of voucher.entries) {
    const account = await Account.findById(entry.accountId).lean() as any;
    if (!account) continue;

    const delta = calculateBalanceChange(
      account.type || account.accountType,
      entry.debit || 0,
      entry.credit || 0
    );

    if (delta !== 0) {
      await Account.findByIdAndUpdate(entry.accountId, {
        $inc: { currentBalance: delta },
      });
    }
  }
}
