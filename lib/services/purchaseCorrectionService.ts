import mongoose from 'mongoose';
import Account, { AccountSubType } from '@/lib/models/Account';
import Purchase from '@/lib/models/Purchase';
import Product from '@/lib/models/ProductEnhanced';
import Supplier from '@/lib/models/Supplier';
import Voucher from '@/lib/models/Voucher';
import InventoryMovement from '@/lib/models/InventoryMovement';
import ActivityLog from '@/lib/models/ActivityLog';
import { supplierLedgerBalance } from '@/lib/services/supplierLedgerBalance';
import { adjustProductLocationStock, ensureProductHasLocationStock } from '@/lib/services/locationStockService';
import { createPostedVoucher, reversePostedVoucher } from '@/lib/services/voucherPostingService';
import { changePurchaseSupplier } from '@/lib/services/purchaseSupplierCorrection';

const round = (value: number) => Number(value.toFixed(2));

// A correction is committed together with its stock, supplier and GL effects.
export async function correctPurchase(id: string, outletId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, body: any, key: string) {
  const session = await mongoose.startSession();
  let result: any;
  try {
    await session.withTransaction(async () => {
      const purchase = await Purchase.findOne({ _id: id, outletId }).session(session);
      if (!purchase) throw new Error('Purchase not found');
      const previous = purchase.corrections?.find(row => row.key === key);
      if (previous) { result = { purchase, correction: previous, idempotent: true }; return; }
      if (body.expectedUpdatedAt && new Date(body.expectedUpdatedAt).getTime() !== new Date(purchase.updatedAt).getTime()) throw new Error('Purchase changed since it was opened; refresh and try again');
      if (purchase.status === 'CANCELLED') throw new Error('Cancelled purchases cannot be changed');
      const original = await Voucher.findOne({ _id: purchase.voucherId, outletId, status: { $in: ['posted', 'approved'] } }).session(session);
      if (!original || !purchase.isPostedToGL) throw new Error('This legacy purchase needs accounting reconciliation before correction');
      const action = body.action;
      if (!['edit', 'return', 'cancel', 'supplier'].includes(action)) throw new Error('Invalid purchase action');
      if (!String(body.reason || '').trim()) throw new Error('A correction reason is required');
      if (action === 'supplier') {
        result = await changePurchaseSupplier(purchase, outletId, userId, body, key, session);
        return;
      }
      if (action === 'cancel' && Number(purchase.returnedTotal || 0) > 0) throw new Error('A purchase with returns cannot be cancelled; return the remaining items');
      if (action === 'edit' && Number(purchase.returnedTotal || 0) > 0) throw new Error('Amounts cannot be edited after a purchase return');
      const accounts: any[] = await Account.find({ outletId, isActive: true, isSystem: true }).session(session).lean();
      const account = (type: AccountSubType) => {
        const found = accounts.find(row => row.subType === type);
        if (!found) throw new Error(`Required system account missing: ${type}`);
        return found._id;
      };
      const entries: any[] = [];
      const affectedSupplierIds = new Set<string>();
      const add = (type: AccountSubType, debit: number) => {
        const amount = round(debit);
        if (amount) entries.push({ accountId: account(type), debit: amount > 0 ? amount : 0, credit: amount < 0 ? -amount : 0 });
      };
      const before = { subtotal: purchase.subtotal, totalTax: purchase.totalTax, grandTotal: purchase.grandTotal, amountPaid: purchase.amountPaid, balanceDue: purchase.balanceDue, supplierBillNumber: purchase.supplierBillNumber, notes: purchase.notes, items: purchase.items.map((item: any) => item.toObject ? item.toObject() : { ...item }) };
      let payableDelta = 0;
      let correctionTotal = 0;
      let refund = 0;
      const method = String(body.refundMethod || 'CREDIT').toUpperCase();
      const refundAccounts: Record<string, AccountSubType> = { CASH: AccountSubType.CASH, PETTY_CASH: AccountSubType.PETTY_CASH, BANK_TRANSFER: AccountSubType.BANK, CARD: AccountSubType.BANK, CREDIT: AccountSubType.ACCOUNTS_PAYABLE };
      if (!refundAccounts[method]) throw new Error('Invalid refund method');
      const movements: any[] = [];
      const changes: any[] = [];
      const date = new Date();
      const referenceNumber = `${purchase.purchaseNumber}-${action.toUpperCase()}-${(purchase.corrections?.length || 0) + 1}`;
      const inputs = action === 'cancel' ? purchase.items.map((item, index) => ({ index, quantity: item.quantity, locationId: item.locationId })) : body.items;
      if (!Array.isArray(inputs) || !inputs.length) throw new Error('At least one item is required');
      const seen = new Set<number>();
      for (const input of inputs) {
        const index = Number(input.index);
        if (!Number.isInteger(index) || !purchase.items[index] || seen.has(index)) throw new Error('Invalid or duplicate purchase item');
        seen.add(index);
        const item = purchase.items[index];
        const product: any = await Product.findOne({ _id: item.productId, outletId }).session(session);
        if (!product) throw new Error(`Product not found: ${item.name}`);
        const stock = Number(product.currentStock || 0);
        const cost = Number(product.costPrice || 0);
        if (action === 'edit') {
          const unitPrice = Number(input.unitPrice);
          const taxRate = Number(input.taxRate ?? item.taxRate);
          if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new Error('Invalid price or tax rate');
          const valueDelta = round(item.quantity * unitPrice) - round(item.quantity * item.unitPrice);
          const taxAmount = round(round(item.quantity * unitPrice) * taxRate / 100);
          const taxDelta = round(taxAmount - item.taxAmount);
          // Attribute the price variance proportionally to units still held, capped at the purchase quantity.
          const inventoryDelta = round(valueDelta * Math.min(Math.max(stock, 0), item.quantity) / item.quantity);
          const newValue = round(stock * cost + inventoryDelta);
          if (newValue < -0.01) throw new Error('Price correction would make inventory value negative; reconcile stock valuation first');
          if (stock > 0) product.costPrice = Number((Math.max(0, newValue) / stock).toFixed(4));
          await product.save({ session });
          add(AccountSubType.INVENTORY, inventoryDelta);
          add(AccountSubType.COGS, round(valueDelta - inventoryDelta));
          add(AccountSubType.VAT_RECEIVABLE, taxDelta);
          correctionTotal = round(correctionTotal + valueDelta + taxDelta);
          changes.push({ index, oldUnitPrice: item.unitPrice, unitPrice, oldTaxRate: item.taxRate, taxRate, inventoryDelta });
          item.unitPrice = unitPrice; item.taxRate = taxRate; item.taxAmount = taxAmount;
          item.total = round(item.quantity * unitPrice + taxAmount);
        } else {
          const requestedQuantity = Number(input.quantity);
          const remaining = Number((Number(item.quantity) - Number(item.returnedQuantity || 0)).toFixed(6));
          const quantity = Math.abs(requestedQuantity - remaining) < 1e-8 ? remaining : requestedQuantity;
          if (!Number.isFinite(quantity) || quantity <= 0 || quantity > remaining) throw new Error(`Return quantity exceeds remaining purchase quantity for ${item.name}`);
          if (stock + 1e-8 < quantity) throw new Error(`Insufficient stock for ${item.name}; only ${stock} available`);
          await ensureProductHasLocationStock(product, outletId, userId, session);
          const location = await adjustProductLocationStock({ product, outletId, locationId: input.locationId || item.locationId, locationName: item.locationName, quantityDelta: -quantity, userId, session });
          const previouslyReturned = Number(item.returnedQuantity || 0);
          const base = round(round((previouslyReturned + quantity) * item.unitPrice) - round(previouslyReturned * item.unitPrice));
          // Difference of cumulative tax avoids rounding drift across partial returns.
          const tax = round(round(item.taxAmount * (previouslyReturned + quantity) / item.quantity) - round(item.taxAmount * previouslyReturned / item.quantity));
          const stockValue = round(quantity * cost);
          correctionTotal = round(correctionTotal + base + tax);
          product.currentStock = Number((stock - quantity).toFixed(6));
          await product.save({ session });
          if (action === 'return') {
            add(AccountSubType.INVENTORY, -stockValue);
            add(AccountSubType.COGS, round(stockValue - base));
            add(AccountSubType.VAT_RECEIVABLE, -tax);
            item.returnedQuantity = Number((Number(item.returnedQuantity || 0) + quantity).toFixed(6));
          } else {
            // The original voucher reversal removes purchase cost; this entry reconciles it to current weighted stock cost.
            add(AccountSubType.INVENTORY, round(base - stockValue));
            add(AccountSubType.COGS, round(stockValue - base));
          }
          changes.push({ index, quantity, locationId: location.location._id, amount: round(base + tax) });
          movements.push({ productId: product._id, productName: item.name, sku: item.sku, movementType: 'RETURN', quantity: -quantity, unit: item.unit, unitCost: cost, totalValue: -stockValue, referenceType: 'PURCHASE', referenceId: purchase._id, referenceNumber, locationId: location.location._id, locationName: location.location.name, locationBalanceAfter: location.newQuantity, outletId, balanceAfter: product.currentStock, date, createdBy: userId, notes: body.reason, operationKey: `purchase:${id}:${key}:${index}` });
        }
      }
      let voucherId: any;
      if (action === 'edit') {
        if (body.supplierBillNumber !== undefined) {
          const number = String(body.supplierBillNumber).trim();
          const billKey = number ? number.toLowerCase().replace(/\s+/g, ' ') : undefined;
          if (billKey && await Purchase.exists({ outletId, supplierId: purchase.supplierId, supplierBillKey: billKey, _id: { $ne: purchase._id } }).session(session)) throw new Error('Duplicate supplier bill number');
          purchase.supplierBillNumber = number; purchase.supplierBillKey = billKey;
        }
        if (body.notes !== undefined) purchase.notes = String(body.notes).trim();
        purchase.subtotal = round(purchase.items.reduce((sum, item) => sum + round(item.quantity * item.unitPrice), 0));
        purchase.totalTax = round(purchase.items.reduce((sum, item) => sum + item.taxAmount, 0));
        purchase.grandTotal = round(purchase.subtotal + purchase.totalTax);
        refund = round(Math.max(0, purchase.amountPaid - purchase.grandTotal));
        purchase.amountPaid = round(purchase.amountPaid - refund);
        purchase.balanceDue = round(purchase.grandTotal - purchase.amountPaid);
        payableDelta = round(purchase.balanceDue - before.balanceDue - (method === 'CREDIT' ? refund : 0));
        add(AccountSubType.ACCOUNTS_PAYABLE, round(before.balanceDue - purchase.balanceDue));
        add(refundAccounts[method], refund);
      } else if (action === 'return') {
        const dueReduction = Math.min(purchase.balanceDue, correctionTotal);
        refund = round(correctionTotal - dueReduction);
        add(AccountSubType.ACCOUNTS_PAYABLE, dueReduction);
        add(refundAccounts[method], refund);
        payableDelta = -round(dueReduction + (method === 'CREDIT' ? refund : 0));
        purchase.returnedTotal = round(Number(purchase.returnedTotal || 0) + correctionTotal);
        purchase.amountPaid = round(purchase.amountPaid - refund);
        purchase.balanceDue = round(purchase.balanceDue - dueReduction);
      } else {
        const posted = await Voucher.find({ outletId, referenceId: purchase._id, status: { $in: ['posted', 'approved'] }, referenceType: { $ne: 'REVERSAL' } }).session(session);
        if (!posted.some(v => String(v._id) === String(original._id))) throw new Error('Original purchase posting not found');
        for (const voucher of posted) {
          for (const supplierId of voucher.metadata?.affectedSupplierIds || []) affectedSupplierIds.add(String(supplierId));
          payableDelta -= voucher.entries.filter(entry => String(entry.accountId) === String(account(AccountSubType.ACCOUNTS_PAYABLE))).reduce((sum, entry) => sum + entry.credit - entry.debit, 0);
          const reversal = await reversePostedVoucher(voucher._id as mongoose.Types.ObjectId, outletId, userId, body.reason, session);
          voucherId ||= reversal.reversal?._id;
        }
        purchase.status = 'CANCELLED';
        purchase.balanceDue = 0;
        purchase.supplierBillKey = undefined;
      }
      if (entries.length) {
        const posted = await createPostedVoucher({ voucherType: 'journal', date, narration: `${referenceNumber}: ${body.reason}`, entries, referenceType: 'PURCHASE', referenceId: purchase._id as mongoose.Types.ObjectId, referenceNumber, postingKey: `purchase:${id}:correction:${key}`, outletId, createdBy: userId, metadata: { action, supplierId: String(purchase.supplierId), refundMethod: body.refundMethod, changes } }, session);
        voucherId = posted.voucher._id;
      }
      for (const movement of movements) await InventoryMovement.create([{ ...movement, voucherId, ledgerEntriesCreated: Boolean(voucherId) }], { session });
      if (action !== 'cancel') purchase.status = purchase.balanceDue <= 0.01 ? 'PAID' : 'COMPLETED';
      const supplier = await Supplier.findOneAndUpdate({ _id: purchase.supplierId, outletId }, { $set: { currentBalance: await supplierLedgerBalance(outletId, purchase.supplierId, session) } }, { session, new: true });
      if (!supplier) throw new Error('Supplier not found');
      const correction = { key, action, reason: String(body.reason).trim(), date, userId, voucherId, referenceNumber, amount: correctionTotal, refund, refundMethod: method, payableDelta, before, changes };
      purchase.corrections ||= []; purchase.corrections.push(correction);
      await purchase.save({ session });
      for (const id of affectedSupplierIds) {
        const supplierId = new mongoose.Types.ObjectId(id);
        await Supplier.updateOne({ _id: supplierId, outletId }, { $set: { currentBalance: await supplierLedgerBalance(outletId, supplierId, session) } }, { session });
      }
      await ActivityLog.create([{ userId, username: String(userId), actionType: 'update', module: 'purchases', description: `${referenceNumber}: ${body.reason}`, outletId, timestamp: date }], { session });
      result = { purchase, correction };
    });
    return result;
  } finally { await session.endSession(); }
}
