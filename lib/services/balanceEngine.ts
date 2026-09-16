import Account from '@/lib/models/Account';
import mongoose from 'mongoose';

export function calculateBalanceChange(
  accountType: string,
  debit: number,
  credit: number
) {
  const type = (accountType || '').toLowerCase();
  const isDebitNormal = type === 'asset' || type === 'expense';
  return isDebitNormal ? debit - credit : credit - debit;
}

export async function applyVoucherBalances(
  voucher: any,
  session?: mongoose.ClientSession
) {
  if (
    voucher.referenceType === 'OPENING_BALANCE'
    && voucher.metadata?.source === 'GENERAL_OPENING_BALANCE'
  ) return;

  for (const entry of voucher.entries) {
    const account = await Account.findOne({
      _id: entry.accountId,
      outletId: voucher.outletId,
      isActive: true,
    }).session(session || null).lean() as any;
    if (!account) throw new Error(`Active account not found in outlet: ${entry.accountId}`);

    const delta = calculateBalanceChange(
      account.type || account.accountType,
      entry.debit || 0,
      entry.credit || 0
    );

    if (delta !== 0) {
      await Account.findOneAndUpdate(
        { _id: entry.accountId, outletId: voucher.outletId },
        { $inc: { currentBalance: delta } },
        { session }
      );
    }
  }
}
