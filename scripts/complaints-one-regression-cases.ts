// @ts-nocheck -- Fixtures include legacy documents with missing fields and numeric identifiers.
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Purchase from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import Customer from '@/lib/models/Customer';
import Sale from '@/lib/models/Sale';
import Product from '@/lib/models/ProductEnhanced';
import Account, { AccountSubType } from '@/lib/models/Account';
import Voucher from '@/lib/models/Voucher';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { supplierLedgerBalance } from '@/lib/services/supplierLedgerBalance';
import { matchesProductSearch } from '@/lib/utils/productSearch';

export async function runComplaintsOneTests({ test, call, get, purchase, correct, assertOk, outlet, otherOutlet, makeProduct, postSale }: any) {
  const created = (r: any) => assert.equal(r.response.status, 201, JSON.stringify(r.body));
  const ledger = (id: any) => supplierLedgerBalance(outlet._id, new mongoose.Types.ObjectId(id));
  const freshSupplier = () => Supplier.create({ outletId: outlet._id, code: crypto.randomUUID(), name: 'Complaints one supplier', currentBalance: 0, isActive: true });
  const bill = async () => { const s = await freshSupplier(); return { ...(await purchase({ supplierId: String(s._id) })), supplier: s }; };
  const pay = (p: any, body: any, key?: string) => call(`/api/purchases/${p._id}/payments`, body, 'POST', key);
  const net = async (ref: any, subType: string) => {
    const account = await Account.findOne({ outletId: outlet._id, subType });
    if (!account) return 0;
    const lines = await LedgerEntry.find({ outletId: outlet._id, accountId: account._id, referenceId: ref });
    return Number(lines.reduce((sum, row) => sum + row.debit - row.credit, 0).toFixed(2));
  };
  const discounted = async (body = { payments: [{ method: 'CASH', amount: 60 }, { method: 'BANK_TRANSFER', amount: 120 }], discount: 20 }) => {
    const p = await bill(); const r = await pay(p.purchase, body); created(r); return { ...p, payment: r.body.payment };
  };

  await test('supplier DR opening posts a debit and switches correctly to CR and zero', async () => {
    const r = await call('/api/suppliers', { name: 'DR opening', code: 'DR-OPEN', openingBalance: 200, openingBalanceType: 'DR' }); created(r);
    const id = r.body.supplier._id;
    assert.equal(await ledger(id), -200); assert.equal(r.body.supplier.currentBalance, -200);
    const changed = await call(`/api/suppliers/${id}`, { openingBalance: 80, openingBalanceType: 'CR' }, 'PUT'); assertOk(changed);
    assert.equal(await ledger(id), 80); assert.equal(changed.body.supplier.currentBalance, 80);
    assertOk(await call(`/api/suppliers/${id}`, { openingBalance: 0, openingBalanceType: 'DR' }, 'PUT')); assert.equal(await ledger(id), 0);
  });
  await test('supplier opening rejects a negative amount and unknown side', async () => {
    for (const body of [{ openingBalance: -10 }, { openingBalance: 10, openingBalanceType: 'INVALID' }]) {
      const r = await call('/api/suppliers', { name: 'Invalid opening', code: crypto.randomUUID(), ...body }); assert.equal(r.response.status, 400, JSON.stringify(r.body));
    }
  });
  await test('split payment records actual tenders and discount in balanced ledger entries', async () => {
    const p = await discounted(); const stored = await Purchase.findById(p.purchase._id);
    assert.equal(stored.amountPaid, 180); assert.equal(stored.settlementDiscountTotal, 20); assert.equal(stored.balanceDue, 0);
    assert.equal(stored.items[0].settlementDiscountRemaining, 20); assert.equal(await ledger(p.supplier._id), 0);
    assert.equal(await net(p.purchase._id, AccountSubType.CASH), -60); assert.equal(await net(p.purchase._id, AccountSubType.BANK), -120);
    assert.equal(await net(p.purchase._id, AccountSubType.PURCHASE_DISCOUNT), -20);
    const voucher = await Voucher.findById(p.payment.voucherId); assert.equal(voucher.totalDebit, 200); assert.equal(voucher.totalCredit, 200);
    assert.equal(voucher.metadata.cashAmount, 180); assert.equal(voucher.metadata.discount, 20);
  });
  await test('retry of split discounted payment does not duplicate any posting', async () => {
    const p = await bill(); const key = crypto.randomUUID(); const body = { payments: [{ method: 'CASH', amount: 180 }], discount: 20 };
    const a = await pay(p.purchase, body, key); created(a); const b = await pay(p.purchase, body, key); created(b);
    assert.equal(a.body.payment.voucherId, b.body.payment.voucherId); assert.equal((await Purchase.findById(p.purchase._id)).payments.length, 1);
    assert.equal(await ledger(p.supplier._id), 0);
  });
  await test('invalid discounted settlements roll back bill supplier and vouchers', async () => {
    const p = await bill(); const before = await Voucher.countDocuments();
    for (const body of [{ amount: 190, discount: 20 }, { amount: 10, discount: -1 }, { payments: [{ method: 'CASH', amount: -5 }], discount: 10 }, { payments: [null], discount: 10 }, { payments: [{ method: 'BITCOIN', amount: 10 }] }]) {
      assert.equal((await pay(p.purchase, body)).response.status, 400, JSON.stringify(body));
    }
    assert.equal(await Voucher.countDocuments(), before); assert.equal(await ledger(p.supplier._id), 200);
    assert.equal((await Purchase.findById(p.purchase._id)).amountPaid, 0);
  });
  await test('discount-only settlement posts no cash movement', async () => {
    const p = await discounted({ payments: [], discount: 200 });
    assert.equal((await Purchase.findById(p.purchase._id)).amountPaid, 0); assert.equal(await ledger(p.supplier._id), 0);
    assert.equal(await net(p.purchase._id, AccountSubType.CASH), 0);
  });
  await test('fully discounted returned goods cannot be cancelled or price-edited again', async () => {
    const p = await discounted({ payments: [], discount: 200 });
    assertOk(await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 10 }] }));
    assert.equal((await Purchase.findById(p.purchase._id)).returnedTotal, 0);
    for (const body of [{ action: 'cancel' }, { action: 'edit', items: [{ index: 0, unitPrice: 25 }] }]) assert.equal((await correct(p.purchase, body)).response.status, 400);
    assert.equal(await ledger(p.supplier._id), 0);
  });
  await test('successive fractional returns unwind the entire settlement discount without rounding drift', async () => {
    const p = await discounted({ amount: 166.67, discount: 33.33 });
    for (const quantity of [3.33, 3.33, 3.34]) assertOk(await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity }], refundMethod: 'CASH' }));
    const saved = await Purchase.findById(p.purchase._id);
    assert.equal(saved.returnedTotal, 166.67); assert.equal(saved.items[0].settlementDiscountRemaining, 0);
    assert.equal(saved.balanceDue, 0); assert.equal(saved.amountPaid, 0); assert.equal(await net(p.purchase._id, AccountSubType.PURCHASE_DISCOUNT), 0);
  });
  await test('full cash return refunds only the discounted amount actually paid', async () => {
    const p = await discounted(); const r = await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 10 }], refundMethod: 'CASH' }); assertOk(r);
    assert.equal(r.body.purchase.returnedTotal, 180); assert.equal(r.body.purchase.amountPaid, 0); assert.equal(r.body.purchase.balanceDue, 0);
    assert.equal(await net(p.purchase._id, AccountSubType.PURCHASE_DISCOUNT), 0); assert.equal(await ledger(p.supplier._id), 0);
  });
  await test('partial discounted return reduces unpaid bill by net returned value', async () => {
    const p = await discounted({ amount: 80, discount: 20 });
    const r = await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 5 }] }); assertOk(r);
    assert.equal(r.body.purchase.returnedTotal, 90); assert.equal(r.body.purchase.balanceDue, 10);
    assert.equal(r.body.purchase.items[0].settlementDiscountRemaining, 10); assert.equal(await ledger(p.supplier._id), 10);
  });
  await test('discount after an earlier return applies only to remaining goods', async () => {
    const p = await bill(); assertOk(await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 5 }] }));
    created(await pay(p.purchase, { amount: 90, discount: 10 }));
    const r = await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 5 }], refundMethod: 'CASH' }); assertOk(r);
    assert.equal(r.body.purchase.returnedTotal, 190); assert.equal(r.body.purchase.balanceDue, 0); assert.equal(await ledger(p.supplier._id), 0);
  });
  await test('cancelling discounted bill reverses tenders and discount exactly once', async () => {
    const p = await discounted(); assertOk(await correct(p.purchase, { action: 'cancel' }));
    for (const subType of [AccountSubType.CASH, AccountSubType.BANK, AccountSubType.PURCHASE_DISCOUNT, AccountSubType.ACCOUNTS_PAYABLE]) assert.equal(await net(p.purchase._id, subType), 0);
    assert.equal(await ledger(p.supplier._id), 0);
  });
  await test('price correction keeps discount and refunds only net overpayment', async () => {
    const p = await discounted(); const r = await correct(p.purchase, { action: 'edit', items: [{ index: 0, unitPrice: 15 }], refundMethod: 'CASH' }); assertOk(r);
    assert.equal(r.body.purchase.grandTotal, 150); assert.equal(r.body.purchase.amountPaid, 130); assert.equal(r.body.purchase.settlementDiscountTotal, 20);
    assert.equal(r.body.purchase.balanceDue, 0); assert.equal(await ledger(p.supplier._id), 0);
  });
  await test('price correction below existing settlement discount is rejected', async () => {
    const p = await discounted(); const r = await correct(p.purchase, { action: 'edit', items: [{ index: 0, unitPrice: 1 }] }); assert.equal(r.response.status, 400);
    assert.equal((await Purchase.findById(p.purchase._id)).grandTotal, 200);
  });
  await test('supplier reassignment preserves discounted bill settlement', async () => {
    const p = await discounted({ amount: 80, discount: 20 }); const target = await freshSupplier();
    const r = await correct(p.purchase, { action: 'supplier', supplierId: String(target._id) }); assertOk(r);
    assert.equal(await ledger(p.supplier._id), 0); assert.equal(await ledger(target._id), 100);
    assert.equal(r.body.purchase.balanceDue, 100);
  });
  await test('supplier-level payment allocates only the bill remainder after a discount', async () => {
    const p = await discounted({ amount: 80, discount: 20 });
    created(await call(`/api/suppliers/${p.supplier._id}/payments`, { amount: 100, paymentMethod: 'CASH' }));
    const saved = await Purchase.findById(p.purchase._id); assert.equal(saved.balanceDue, 0); assert.equal(saved.amountPaid, 180);
    assert.equal(await ledger(p.supplier._id), 0);
  });
  await test('multi-line taxed bill discounts and partial returns remain balanced to the cent', async () => {
    const supplier = await freshSupplier(); const products = await Promise.all([1, 2, 3].map(() => makeProduct({ currentStock: 0, taxRate: 5, location: 'Discount shelf' })));
    const r = await call('/api/purchases', { supplierId: String(supplier._id), items: products.map(product => ({ productId: String(product._id), quantity: 3, unitPrice: 10, taxRate: 5 })), paymentMethod: 'CREDIT' }); created(r);
    created(await pay(r.body.purchase, { amount: 84.5, discount: 10 }));
    const saved = await Purchase.findById(r.body.purchase._id); assert.equal(saved.settlementDiscountTotal, 10);
    assert.equal(Number(saved.items.reduce((sum, item) => sum + item.settlementDiscountRemaining, 0).toFixed(2)), 10);
    for (let index = 0; index < 3; index++) for (const quantity of [1, 2]) assertOk(await correct(r.body.purchase, { action: 'return', items: [{ index, quantity }], refundMethod: 'CASH' }));
    const returned = await Purchase.findById(r.body.purchase._id);
    assert.equal(returned.returnedTotal, 84.5); assert.equal(returned.amountPaid, 0); assert.equal(await ledger(supplier._id), 0);
    assert.equal(await net(r.body.purchase._id, AccountSubType.PURCHASE_DISCOUNT), 0); assert.equal(await net(r.body.purchase._id, AccountSubType.VAT_RECEIVABLE), 0);
  });
  await test('supplier report distinguishes paid amount from discounted purchase total', async () => {
    const p = await discounted(); const r = await get(`/api/reports/supplier-ledger?supplierId=${p.supplier._id}&fromDate=2020-01-01&toDate=2099-12-31`); assertOk(r);
    assert.equal(r.body.summary.closingBalance, 0); assert.equal(r.body.bills[0].balance, 0);
  });
  const supplierSale = async (paid = 0) => {
    const supplier = await freshSupplier(); const product = await makeProduct({ taxRate: 0, currentStock: 10 });
    const r = await postSale(product, { customerId: undefined, supplierId: String(supplier._id), payments: paid ? [{ method: 'CASH', amount: paid }] : [], amountPaid: paid }); created(r);
    return { supplier, product, sale: r.body.sale };
  };
  await test('part-paid supplier sale offsets only unpaid value and report shows supplier debit', async () => {
    const p = await supplierSale(30); assert.equal(await ledger(p.supplier._id), -70);
    assert.equal((await Supplier.findById(p.supplier._id)).currentBalance, -70);
    assert.equal(p.sale.supplierSettlementMode, 'PAYABLE_OFFSET');
    const r = await get(`/api/reports/supplier-ledger?supplierId=${p.supplier._id}&fromDate=2020-01-01&toDate=2099-12-31`); assertOk(r); assert.equal(r.body.summary.closingBalance, -70);
    assert.equal((await Customer.findById(p.sale.customerId)).currentBalance, 0);
  });
  await test('supplier sale cancellation restores supplier payable without touching customer balance', async () => {
    const p = await supplierSale(); assertOk(await call(`/api/sales/${p.sale._id}/cancel`, {}));
    assert.equal(await ledger(p.supplier._id), 0); assert.equal((await Supplier.findById(p.supplier._id)).currentBalance, 0);
    assert.equal((await Customer.findById(p.sale.customerId)).currentBalance, 0);
  });
  await test('supplier credit sale return restores payable and stock', async () => {
    const p = await supplierSale(); assertOk(await call('/api/sales/return', { saleId: p.sale._id, items: [{ productId: String(p.product._id), sku: p.product.sku, quantity: 1 }] }));
    assert.equal(await ledger(p.supplier._id), 0); assert.equal((await Product.findById(p.product._id)).currentStock, 10);
    assert.equal((await Customer.findById(p.sale.customerId)).currentBalance, 0);
  });
  await test('supplier sale edit reverses old payable offset and posts new amount', async () => {
    const p = await supplierSale();
    const r = await call(`/api/sales/${p.sale._id}/edit`, { correctionReason: 'Update supplier credit sale', items: [{ lineIndex: 0, productId: String(p.product._id), sku: p.product.sku, quantity: 1, unitPrice: 150, taxRate: 0 }], payments: [], amountPaid: 0 }, 'PUT'); assertOk(r);
    assert.equal(await ledger(p.supplier._id), -150); assert.equal((await Supplier.findById(p.supplier._id)).currentBalance, -150);
    assert.equal((await Customer.findById(p.sale.customerId)).currentBalance, 0);
  });
  await test('legacy supplier sale without settlement mode continues using customer receivable', async () => {
    const s = await freshSupplier(); const p = await makeProduct({ taxRate: 0 });
    const r = await postSale(p, { payments: [], amountPaid: 0 }); created(r);
    await Sale.collection.updateOne({ _id: new mongoose.Types.ObjectId(r.body.sale._id) }, { $set: { supplierId: s._id } });
    const before = (await Customer.findById(r.body.sale.customerId)).currentBalance;
    assertOk(await call(`/api/sales/${r.body.sale._id}/cancel`, {}));
    assert.equal((await Customer.findById(r.body.sale.customerId)).currentBalance, before - 100); assert.equal(await ledger(s._id), 0);
  });
  await test('search includes legacy missing active flag and numeric SKU with Arabic digits', async () => {
    const p = await makeProduct({ name: 'Legacy numeric identifier' });
    await Product.collection.updateOne({ _id: p._id }, { $unset: { isActive: '' }, $set: { sku: 987654321 } });
    const r = await get('/api/products?search=' + encodeURIComponent('٩٨٧٦٥٤٣٢١')); assertOk(r); assert(r.body.products.some(row => row._id === String(p._id)));
    assert(matchesProductSearch({ sku: 987654321 }, '٩٨٧٦٥٤٣٢١'));
  });
  await test('search ignores embedded part-number spaces and excludes inactive products', async () => {
    const p = await makeProduct({ partNumber: 'AB 123 456', isActive: true }); const inactive = await makeProduct({ partNumber: 'AB123456', isActive: false });
    const r = await get('/api/products?search=AB123456'); assertOk(r);
    assert(r.body.products.some(row => row._id === String(p._id))); assert(!r.body.products.some(row => row._id === String(inactive._id)));
    assert(matchesProductSearch(p, 'AB١٢٣٤٥٦'));
  });
  await test('legacy product with no active flag can be sold and received', async () => {
    const p = await makeProduct({ taxRate: 0 }); await Product.collection.updateOne({ _id: p._id }, { $unset: { isActive: '' } });
    created(await postSale(p, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }));
    const s = await freshSupplier(); created(await call('/api/purchases', { supplierId: String(s._id), items: [{ productId: String(p._id), quantity: 1, unitPrice: 20 }], paymentMethod: 'CREDIT' }));
  });
  await test('journal filtering and pagination return entry details beyond first page', async () => {
    const a = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.CASH }); const b = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.COGS });
    for (let i = 0; i < 23; i++) created(await call('/api/vouchers', { voucherType: 'journal', status: 'posted', date: new Date().toISOString(), narration: `Visible [journal] ${i}`, entries: [{ accountId: String(a._id), debit: 1 }, { accountId: String(b._id), credit: 1 }] }));
    const r = await get('/api/vouchers?voucherType=journal&search=%5Bjournal%5D&limit=20&page=2'); assertOk(r);
    assert.equal(r.body.pagination.total, 23); assert.equal(r.body.vouchers.length, 3);
    assert(r.body.vouchers.every(v => v.voucherType === 'journal' && v.entries.length === 2 && v.createdBy));
    const alias = await get('/api/vouchers?type=journal&search=%5Bjournal%5D'); assertOk(alias); assert.equal(alias.body.pagination.total, 23);
  });
}
