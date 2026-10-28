import mongoose from 'mongoose';
import Account, { AccountSubType } from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Purchase from '@/lib/models/Purchase';
import Voucher from '@/lib/models/Voucher';

export async function supplierOpeningLedgerBalance(outletId: mongoose.Types.ObjectId, supplierId: mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
  return (await supplierOpeningLedgerStates(outletId, session, supplierId)).get(String(supplierId)) || { amount: 0, date: undefined };
}

export async function supplierOpeningLedgerStates(outletId: mongoose.Types.ObjectId, session?: mongoose.ClientSession, supplierId?: mongoose.Types.ObjectId) {
  const payable: any = await Account.findOne({ outletId, subType: AccountSubType.ACCOUNTS_PAYABLE }).session(session || null).lean();
  const states = new Map<string, { amount: number; date: any }>();
  if (!payable) return states;
  const originals: any[] = await Voucher.find({ outletId, ...(supplierId ? { referenceId: supplierId } : {}), 'metadata.source': { $in: ['SUPPLIER_OPENING_BALANCE', 'SUPPLIER_OPENING_BALANCE_CORRECTION'] }, referenceType: 'OPENING_BALANCE', status: { $ne: 'draft' } }).sort({ date: 1, createdAt: 1 }).session(session || null).lean();
  const reversals: any[] = await Voucher.find({ outletId, 'metadata.originalVoucherId': { $in: originals.flatMap(voucher => [voucher._id, String(voucher._id)]) } }).select('_id').session(session || null).lean();
  for (const voucher of originals) if (!states.has(String(voucher.referenceId))) states.set(String(voucher.referenceId), { amount: 0, date: voucher.date });
  const lines = await LedgerEntry.find({ outletId, accountId: payable._id, voucherId: { $in: [...originals, ...reversals].map(voucher => voucher._id) } }).select('debit credit referenceId').session(session || null).lean();
  for (const line of lines) {
    const state = states.get(String(line.referenceId));
    if (state) state.amount = Number((state.amount + line.credit - line.debit).toFixed(2));
  }
  return states;
}

export async function supplierLedgerBalance(outletId: mongoose.Types.ObjectId, supplierId: mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
  const account: any = await Account.findOne({ outletId, subType: AccountSubType.ACCOUNTS_PAYABLE }).session(session || null).lean();
  if (!account) throw new Error('Accounts Payable system account is missing');
  const purchases = await Purchase.find({ outletId, supplierId }).select('_id').session(session || null).lean();
  const entries = await LedgerEntry.find({ outletId, accountId: account._id, referenceId: { $in: [supplierId, ...purchases.map(p => p._id)] } }).select('debit credit').session(session || null).lean();
  return Number(entries.reduce((sum, entry) => sum + Number(entry.credit) - Number(entry.debit), 0).toFixed(2));
}
