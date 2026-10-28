import mongoose from 'mongoose';
import Account, { AccountSubType } from '@/lib/models/Account';
import Purchase, { IPurchase } from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import Voucher from '@/lib/models/Voucher';
import ActivityLog from '@/lib/models/ActivityLog';
import { createPostedVoucher } from '@/lib/services/voucherPostingService';
import { supplierLedgerBalance } from '@/lib/services/supplierLedgerBalance';

// Purchase-linked postings follow the corrected supplier. Supplier-wide payments
// need an explicit AP reclassification for just the amount allocated to this bill.
export async function changePurchaseSupplier(purchase: IPurchase, outletId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, body: any, key: string, session: mongoose.ClientSession) {
  if (!mongoose.Types.ObjectId.isValid(body.supplierId || '')) throw new Error('Select a valid supplier');
  const target = await Supplier.findOne({ _id: body.supplierId, outletId, isActive: { $ne: false } }).session(session);
  if (!target) throw new Error('Active supplier not found in this outlet');
  if (String(target._id) === String(purchase.supplierId)) throw new Error('Select a different supplier');
  const billNumber = String(body.supplierBillNumber ?? purchase.supplierBillNumber ?? '').trim();
  const billKey = billNumber ? billNumber.toLowerCase().replace(/\s+/g, ' ') : undefined;
  if (billKey && await Purchase.exists({ outletId, supplierId: target._id, supplierBillKey: billKey, _id: { $ne: purchase._id } }).session(session)) throw new Error('Duplicate supplier bill number for the selected supplier');
  const oldSupplierId = purchase.supplierId;
  const date = new Date();
  const referenceNumber = `${purchase.purchaseNumber}-SUPPLIER-${(purchase.corrections?.length || 0) + 1}`;
  const before = { supplierId: oldSupplierId, supplierName: purchase.supplierName, supplierBillNumber: purchase.supplierBillNumber, amountPaid: purchase.amountPaid, balanceDue: purchase.balanceDue };
  const entries: any[] = [];
  const affected = new Set([String(oldSupplierId), String(target._id)]);
  const payable = await Account.findOne({ outletId, subType: AccountSubType.ACCOUNTS_PAYABLE, isActive: true }).session(session);
  if (!payable) throw new Error('Accounts Payable system account is missing');
  for (const payment of purchase.payments || []) {
    if (payment.supplierReassignedAt) continue;
    const voucher = await Voucher.findOne({ _id: payment.voucherId, outletId }).session(session);
    if (!voucher) throw new Error('Payment voucher missing; reconcile the purchase before changing supplier');
    if (String(voucher.referenceId) === String(purchase._id)) continue;
    if (!['posted', 'approved'].includes(voucher.status) || !['SUPPLIER_PAYMENT', 'PAYMENT'].includes(String(voucher.referenceType))) throw new Error('Payment needs reconciliation before changing supplier');
    const paymentSupplier = await Supplier.findOne({ _id: voucher.referenceId, outletId }).session(session);
    if (!paymentSupplier) throw new Error('Payment supplier not found in this outlet');
    if (payment.amount > 0) {
      entries.push({ accountId: payable._id, debit: payment.amount, referenceId: purchase._id });
      entries.push({ accountId: payable._id, credit: payment.amount, referenceId: paymentSupplier._id });
    }
    affected.add(String(paymentSupplier._id));
    payment.supplierReassignedAt = date;
  }
  let voucherId;
  if (entries.length) {
    const posted = await createPostedVoucher({ voucherType: 'journal', date, narration: `${referenceNumber}: ${purchase.supplierName} → ${target.name}. ${String(body.reason).trim()}`, entries,
      referenceType: 'PURCHASE', referenceId: purchase._id as mongoose.Types.ObjectId, referenceNumber, postingKey: `purchase:${purchase._id}:correction:${key}`, outletId, createdBy: userId,
      metadata: { source: 'PURCHASE_SUPPLIER_REASSIGNMENT', affectedSupplierIds: [...affected] } }, session);
    voucherId = posted.voucher._id;
  }
  purchase.supplierId = target._id as mongoose.Types.ObjectId;
  purchase.supplierName = target.name;
  purchase.supplierBillNumber = billNumber;
  purchase.supplierBillKey = billKey;
  const correction = { key, action: 'supplier', reason: String(body.reason).trim(), date, userId, voucherId, referenceNumber, amount: 0, before, supplierId: target._id, supplierName: target.name, changes: [] };
  purchase.corrections ||= [];
  purchase.corrections.push(correction);
  await purchase.save({ session });
  for (const id of affected) {
    const supplierId = new mongoose.Types.ObjectId(id);
    const update = await Supplier.updateOne({ _id: supplierId, outletId }, { $set: { currentBalance: await supplierLedgerBalance(outletId, supplierId, session) } }, { session });
    if (!update.matchedCount) throw new Error('Previous supplier not found in this outlet');
  }
  await ActivityLog.create([{ userId, username: String(userId), actionType: 'update', module: 'purchases', description: `${referenceNumber}: ${before.supplierName} → ${target.name}. ${String(body.reason).trim()}`, outletId, timestamp: date }], { session });
  return { purchase, correction };
}
