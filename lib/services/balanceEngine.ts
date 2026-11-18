import Account from '@/lib/models/Account';
import mongoose from 'mongoose';
import Supplier from '@/lib/models/Supplier';

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
  if (['MANUAL_SUPPLIER_JOURNAL', 'SUPPLIER_SALE_OFFSET'].includes(voucher.metadata?.source)) {
    const payable = await Account.findOne({ outletId: voucher.outletId, subType: 'accounts_payable' }).session(session || null).lean() as any;
    if (!payable) throw new Error('Accounts Payable system account is missing');
    const delta = voucher.entries.filter((entry: any) => String(entry.accountId) === String(payable._id))
      .reduce((sum: number, entry: any) => sum + Number(entry.credit || 0) - Number(entry.debit || 0), 0);
    const supplier = await Supplier.updateOne({ _id: voucher.metadata?.source === 'SUPPLIER_SALE_OFFSET' ? voucher.metadata.supplierId : voucher.referenceId, outletId: voucher.outletId }, { $inc: { currentBalance: Number(delta.toFixed(2)) } }, { session });
    if (!supplier.matchedCount) throw new Error('Supplier not found in this outlet');
  }
}
