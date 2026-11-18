// @ts-nocheck -- Test fixtures exercise legacy documents as well as typed models.
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Purchase from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import Customer from '@/lib/models/Customer';
import Product from '@/lib/models/ProductEnhanced';
import ProductLocationStock from '@/lib/models/ProductLocationStock';
import StockLocation from '@/lib/models/StockLocation';
import Account, { AccountSubType } from '@/lib/models/Account';
import Voucher from '@/lib/models/Voucher';
import LedgerEntry from '@/lib/models/LedgerEntry';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { supplierLedgerBalance } from '@/lib/services/supplierLedgerBalance';
import { matchesProductSearch } from '@/lib/utils/productSearch';
import { runComplaintsOneTests } from './complaints-one-regression-cases';
import { runPurchaseSupplierTests } from './purchase-supplier-regression-cases';

export async function runComplaintTests({ test, request, cookie, outlet, otherOutlet, user, makeProduct, postSale }: any) {
  await Purchase.syncIndexes();
  await Supplier.syncIndexes();
  await Customer.syncIndexes();
  const call = (path: string, body: any, method = 'POST', key = crypto.randomUUID()) => request(path, { method, headers: { cookie, 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) });
  const get = (path: string) => request(path, { headers: { cookie } });
  const supplier = await Supplier.create({ outletId: outlet._id, code: 'COMPLAINTS', name: 'Complaint Supplier', isActive: true, currentBalance: 0 });
  const shelf = await StockLocation.create({ outletId: outlet._id, name: 'Receiving shelf', code: 'RECEIVE', isActive: true });
  const otherShelf = await StockLocation.create({ outletId: otherOutlet._id, name: 'Other tenant shelf', code: 'RECEIVE', isActive: true });
  const purchase = async (overrides: any = {}, productOverrides: any = {}) => {
    const product = await makeProduct({ currentStock: 0, taxRate: 0, carMake: 'Toyota', carModel: 'Land Cruiser', variant: 'VX', yearFrom: 2008, yearTo: 2015, ...productOverrides });
    const response = await call('/api/purchases', { supplierId: String(supplier._id), items: [{ productId: String(product._id), quantity: 10, unitPrice: 20, taxRate: 0, locationId: String(shelf._id) }], paymentMethod: 'CREDIT', amountPaid: 0, ...overrides });
    assert.equal(response.response.status, 201, JSON.stringify(response.body));
    return { product, purchase: response.body.purchase };
  };
  const correct = (p: any, body: any, key?: string) => call(`/api/purchases/${p._id}`, { reason: 'Regression correction', ...body }, 'PATCH', key);
  const balance = () => supplierLedgerBalance(outlet._id, supplier._id);
  const stock = async (id: any) => (await Product.findById(id).lean()).currentStock;
  const assertOk = (result: any) => assert.equal(result.response.status, 200, JSON.stringify(result.body));
  await runPurchaseSupplierTests({ test, call, get, purchase, correct, assertOk, outlet, otherOutlet });

  await test('name search matches words across name, model and variant', async () => {
    const p = await makeProduct({ name: 'Mirror [Left]', carMake: 'Toyota', carModel: 'Land Cruiser', variant: 'VX', yearFrom: 2008, yearTo: 2015 });
    const r = await get('/api/products?search=VX%20Toyota%20Mirror'); assertOk(r);
    assert(r.body.products.some((row: any) => row._id === String(p._id)));
    assert(matchesProductSearch(p, ' VX   TOYOTA mirror '));
  });
  await test('product search treats regex characters literally', async () => {
    const p = await makeProduct({ name: 'Mirror [Left]' });
    const r = await get('/api/products?search=%5BLeft%5D'); assertOk(r);
    assert(r.body.products.some((row: any) => row._id === String(p._id)));
  });
  await test('product search finds an intermediate compatibility year', async () => {
    const p = await makeProduct({ name: 'Compatibility lens', yearFrom: 2008, yearTo: 2015 });
    const r = await get('/api/products?search=Compatibility%202010'); assertOk(r);
    assert(r.body.products.some((row: any) => row._id === String(p._id)));
    assert(matchesProductSearch(p, 'Compatibility 2010'));
  });
  await test('receiving into a location with no previous product balance works', async () => {
    const p = await purchase();
    assert.equal(await stock(p.product._id), 10);
    assert.equal((await ProductLocationStock.findOne({ productId: p.product._id, locationId: shelf._id })).quantity, 10);
    assert.equal(p.purchase.items[0].vehicle, 'Toyota Land Cruiser VX 2008 2015');
  });
  await test('legacy product receives to its saved location when none is provided', async () => {
    const p = await makeProduct({ currentStock: 4, location: 'Legacy Correct Shelf' });
    const r = await call('/api/purchases', { supplierId: String(supplier._id), items: [{ productId: String(p._id), quantity: 2, unitPrice: 10 }], paymentMethod: 'CREDIT' });
    assert.equal(r.response.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.purchase.items[0].locationName, 'Legacy Correct Shelf');
    assert.equal(await stock(p._id), 6);
  });
  await test('missing receiving location does not silently use Main Store', async () => {
    const p = await makeProduct({ currentStock: 0, location: '' });
    const r = await call('/api/purchases', { supplierId: String(supplier._id), items: [{ productId: String(p._id), quantity: 1, unitPrice: 20 }] });
    assert.equal(r.response.status, 400); assert.equal(await stock(p._id), 0);
  });
  await test('purchase cannot receive stock into another tenant location', async () => {
    const p = await makeProduct({ currentStock: 0 });
    const r = await call('/api/purchases', { supplierId: String(supplier._id), items: [{ productId: String(p._id), quantity: 1, unitPrice: 20, locationId: String(otherShelf._id) }] });
    assert.equal(r.response.status, 400); assert.equal(await stock(p._id), 0);
  });
  await test('supplier bill and narration persist and duplicate bill is rejected', async () => {
    const p = await purchase({ supplierBillNumber: ' INV-234 ', notes: 'Supplier delivery' });
    assert.equal(p.purchase.supplierBillNumber, 'INV-234');
    assert.match((await Voucher.findById(p.purchase.voucherId)).narration, /INV-234.*Supplier delivery/);
    const r = await call('/api/purchases', { supplierId: String(supplier._id), supplierBillNumber: 'inv-234', items: [{ productId: String(p.product._id), quantity: 1, unitPrice: 20 }] });
    assert.equal(r.response.status, 400); assert.equal(await stock(p.product._id), 10);
  });
  await test('same purchase request does not duplicate stock or voucher', async () => {
    const key = crypto.randomUUID();
    const p = await purchase({ idempotencyKey: 'unused' });
    const body = { supplierId: String(supplier._id), items: [{ productId: String(p.product._id), quantity: 1, unitPrice: 20, locationId: String(shelf._id) }] };
    const a = await call('/api/purchases', body, 'POST', key); const b = await call('/api/purchases', body, 'POST', key);
    assert.equal(a.body.purchase._id, b.body.purchase._id); assert.equal(await stock(p.product._id), 11);
  });
  await test('price correction updates stock valuation and supplier payable together', async () => {
    const p = await purchase(); const before = await balance();
    const r = await correct(p.purchase, { action: 'edit', items: [{ index: 0, unitPrice: 25 }] }); assertOk(r);
    assert.equal(r.body.purchase.grandTotal, 250); assert.equal(await stock(p.product._id), 10);
    assert.equal((await Product.findById(p.product._id)).costPrice, 25); assert.equal(await balance(), before + 50);
  });
  await test('price correction moves consumed portion to COGS', async () => {
    const p = await purchase();
    const sold = await postSale(p.product, { payments: [{ method: 'CASH', amount: 500 }], amountPaid: 500 }, undefined, { quantity: 5 });
    assert.equal(sold.response.status, 201, JSON.stringify(sold.body));
    const r = await correct(p.purchase, { action: 'edit', items: [{ index: 0, unitPrice: 30 }] }); assertOk(r);
    const cogs = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.COGS });
    assert.equal((await LedgerEntry.findOne({ voucherId: r.body.correction.voucherId, accountId: cogs._id })).debit, 50);
    assert.equal((await Product.findById(p.product._id)).costPrice, 30);
  });
  await test('purchase edit retains supplier bill number and narration', async () => {
    const p = await purchase();
    const r = await correct(p.purchase, { action: 'edit', supplierBillNumber: 'EDIT-BILL-123', notes: 'Corrected supplier reference', items: [{ index: 0, unitPrice: 20 }] }); assertOk(r);
    assert.equal(r.body.purchase.supplierBillNumber, 'EDIT-BILL-123'); assert.equal(r.body.purchase.notes, 'Corrected supplier reference');
    assert.equal(r.body.purchase.grandTotal, 200);
  });
  await test('stale purchase editor cannot overwrite a newer correction', async () => {
    const p = await purchase();
    assertOk(await correct(p.purchase, { action: 'edit', items: [{ index: 0, unitPrice: 21 }] }));
    const r = await correct(p.purchase, { action: 'edit', expectedUpdatedAt: p.purchase.updatedAt, items: [{ index: 0, unitPrice: 22 }] });
    assert.equal(r.response.status, 400); assert.match(r.body.error, /changed since/);
    assert.equal((await Purchase.findById(p.purchase._id)).grandTotal, 210);
  });
  await test('invalid price-correction settlement rolls back inventory and ledger', async () => {
    const p = await purchase({ paymentMethod: 'CASH', amountPaid: 200 }); const before = await Voucher.countDocuments();
    const r = await correct(p.purchase, { action: 'edit', refundMethod: 'INVALID', items: [{ index: 0, unitPrice: 10 }] });
    assert.equal(r.response.status, 400); assert.equal((await Product.findById(p.product._id)).costPrice, 20); assert.equal(await Voucher.countDocuments(), before);
  });
  await test('price correction below paid amount records supplier credit', async () => {
    const p = await purchase({ paymentMethod: 'CASH', amountPaid: 200 }); const before = await balance();
    const r = await correct(p.purchase, { action: 'edit', refundMethod: 'CREDIT', items: [{ index: 0, unitPrice: 10 }] }); assertOk(r);
    assert.equal(r.body.purchase.amountPaid, 100); assert.equal(r.body.correction.refund, 100); assert.equal(await balance(), before - 100);
    assert.equal((await Product.findById(p.product._id)).costPrice, 10);
  });
  await test('partial purchase return reduces stock, payable and bill balance', async () => {
    const p = await purchase(); const before = await balance();
    const r = await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 3 }] }); assertOk(r);
    assert.equal(await stock(p.product._id), 7); assert.equal(r.body.purchase.balanceDue, 140); assert.equal(r.body.purchase.returnedTotal, 60); assert.equal(await balance(), before - 60);
  });
  await test('paid return received in cash debits cash and preserves payable', async () => {
    const p = await purchase({ paymentMethod: 'CASH', amountPaid: 200 }); const before = await balance();
    const r = await correct(p.purchase, { action: 'return', refundMethod: 'CASH', items: [{ index: 0, quantity: 2 }] }); assertOk(r);
    const cash = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.CASH });
    assert.equal((await LedgerEntry.findOne({ voucherId: r.body.correction.voucherId, accountId: cash._id })).debit, 40);
    assert.equal(r.body.purchase.amountPaid, 160); assert.equal(await balance(), before);
  });
  await test('paid return retained as supplier credit reduces supplier balance', async () => {
    const p = await purchase({ paymentMethod: 'CASH', amountPaid: 200 }); const before = await balance();
    const r = await correct(p.purchase, { action: 'return', refundMethod: 'CREDIT', items: [{ index: 0, quantity: 2 }] }); assertOk(r);
    assert.equal(await balance(), before - 40); assert.equal(r.body.purchase.balanceDue, 0);
  });
  await test('return first reduces unpaid balance then refunds paid portion', async () => {
    const p = await purchase({ paymentMethod: 'CASH', amountPaid: 100 });
    const r = await correct(p.purchase, { action: 'return', refundMethod: 'BANK_TRANSFER', items: [{ index: 0, quantity: 8 }] }); assertOk(r);
    assert.equal(r.body.correction.refund, 60); assert.equal(r.body.purchase.amountPaid, 40); assert.equal(r.body.purchase.balanceDue, 0);
  });
  await test('return cannot exceed previously unreturned quantity', async () => {
    const p = await purchase(); assertOk(await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 7 }] }));
    const r = await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 4 }] }); assert.equal(r.response.status, 400); assert.equal(await stock(p.product._id), 3);
  });
  await test('return from empty source location rolls back the whole correction', async () => {
    const p = await purchase(); const empty = await StockLocation.create({ outletId: outlet._id, name: 'Empty return shelf', code: 'EMPTY-RETURN' }); const before = await balance();
    const r = await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 2, locationId: String(empty._id) }] }); assert.equal(r.response.status, 400); assert.equal(await stock(p.product._id), 10); assert.equal(await balance(), before);
  });
  await test('repeat return request has no additional stock or ledger effect', async () => {
    const p = await purchase(); const key = crypto.randomUUID(); const body = { action: 'return', items: [{ index: 0, quantity: 2 }] };
    assertOk(await correct(p.purchase, body, key)); assertOk(await correct(p.purchase, body, key)); assert.equal(await stock(p.product._id), 8);
    assert.equal(await InventoryMovement.countDocuments({ referenceId: p.purchase._id, movementType: 'RETURN' }), 1);
  });
  await test('fractional partial returns exactly exhaust original net and tax', async () => {
    const product = await makeProduct({ currentStock: 0 });
    const created = await call('/api/purchases', { supplierId: String(supplier._id), items: [{ productId: String(product._id), quantity: 0.3, unitPrice: 0.17, taxRate: 15, locationId: String(shelf._id) }] });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    const p = created.body.purchase;
    for (const quantity of [0.1, 0.1, 0.1]) assertOk(await correct(p, { action: 'return', items: [{ index: 0, quantity }] }));
    const final = await Purchase.findById(p._id);
    assert.equal(final.returnedTotal, final.grandTotal); assert.equal(final.balanceDue, 0); assert.equal(await stock(product._id), 0);
  });
  await test('concurrent returns cannot exceed the purchased quantity', async () => {
    const p = await purchase(); const body = { action: 'return', items: [{ index: 0, quantity: 6 }] };
    const results = await Promise.all([correct(p.purchase, body), correct(p.purchase, body)]);
    assert.deepEqual(results.map(r => r.response.status).sort(), [200, 400]); assert.equal(await stock(p.product._id), 4);
  });
  await test('cancel duplicate purchase reverses stock and original voucher', async () => {
    const p = await purchase({ supplierBillNumber: 'CANCEL-TEST' }); const before = await balance();
    const r = await correct(p.purchase, { action: 'cancel' }); assertOk(r);
    assert.equal(await stock(p.product._id), 0); assert.equal(r.body.purchase.status, 'CANCELLED'); assert.equal(await balance(), before - 200);
    assert.equal((await Voucher.findById(p.purchase.voucherId)).status, 'cancelled');
  });
  await test('cancel paid purchase reverses original cash settlement', async () => {
    const p = await purchase({ paymentMethod: 'CASH', amountPaid: 200 }); const r = await correct(p.purchase, { action: 'cancel' }); assertOk(r);
    const cash = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.CASH });
    const lines = await LedgerEntry.find({ referenceId: p.purchase._id, accountId: cash._id }).lean();
    assert.equal(lines.reduce((sum, line) => sum + line.debit - line.credit, 0), 0);
  });
  await test('cancel corrected purchase reverses correction vouchers as well', async () => {
    const p = await purchase(); assertOk(await correct(p.purchase, { action: 'edit', items: [{ index: 0, unitPrice: 30 }] }));
    assertOk(await correct(p.purchase, { action: 'cancel' }));
    const ap = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.ACCOUNTS_PAYABLE });
    const lines = await LedgerEntry.find({ referenceId: p.purchase._id, accountId: ap._id }); assert.equal(lines.reduce((sum, line) => sum + line.credit - line.debit, 0), 0);
  });
  await test('cancellation rejects consumed stock without changing posted purchase', async () => {
    const p = await purchase(); await postSale(p.product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 });
    const r = await correct(p.purchase, { action: 'cancel' }); assert.equal(r.response.status, 400); assert.equal((await Voucher.findById(p.purchase.voucherId)).status, 'posted');
  });
  await test('cross-tenant purchase correction is rejected', async () => {
    const foreign = new mongoose.Types.ObjectId();
    const r = await correct({ _id: foreign }, { action: 'cancel' }); assert.equal(r.response.status, 400);
  });
  await test('legacy purchase without GL posting is left intact and flagged for reconciliation', async () => {
    const p = await purchase(); await Purchase.updateOne({ _id: p.purchase._id }, { $set: { isPostedToGL: false } });
    const r = await correct(p.purchase, { action: 'cancel' }); assert.equal(r.response.status, 400); assert.match(r.body.error, /reconciliation/); assert.equal(await stock(p.product._id), 10);
    await Purchase.updateOne({ _id: p.purchase._id }, { $set: { isPostedToGL: true } });
  });
  await test('supplier opening can be corrected to zero despite a stale cached balance', async () => {
    const created = await call('/api/suppliers', { code: 'OPENING-FIX', name: 'Opening test', openingBalance: 100, openingBalanceDate: '2026-01-01' });
    assert.equal(created.response.status, 201, JSON.stringify(created.body)); const s = created.body.supplier;
    await Supplier.updateOne({ _id: s._id }, { $set: { currentBalance: 0 } });
    const r = await call(`/api/suppliers/${s._id}`, { openingBalance: 0 }, 'PUT'); assertOk(r);
    assert.equal(r.body.supplier.name, 'Opening test'); assert.equal(r.body.supplier.currentBalance, 0);
    assert.equal(await supplierLedgerBalance(outlet._id, new mongoose.Types.ObjectId(s._id)), 0);
  });
  await test('reversed legacy supplier opening is shown as zero and not reversed twice', async () => {
    const created = await call('/api/suppliers', { code: 'LEGACY-OPENING', name: 'Legacy opening', openingBalance: 80 });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    const s = created.body.supplier;
    assertOk(await call('/api/vouchers', { action: 'cancel', voucherId: created.body.openingVoucher._id, reason: 'Opening is incorrect' }, 'PATCH'));
    await Supplier.updateOne({ _id: s._id }, { $unset: { openingBalanceDate: 1 } });
    const fetched = await get(`/api/suppliers/${s._id}`); assertOk(fetched); assert.equal(fetched.body.supplier.openingBalance, 0);
    assertOk(await call(`/api/suppliers/${s._id}`, { openingBalance: 0 }, 'PUT'));
    assert.equal(await supplierLedgerBalance(outlet._id, new mongoose.Types.ObjectId(s._id)), 0);
  });
  const ap = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.ACCOUNTS_PAYABLE });
  const expense = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.COGS });
  const journal = { voucherType: 'journal', status: 'posted', date: new Date().toISOString(), narration: 'Supplier journal test', supplierId: String(supplier._id), entries: [{ accountId: String(expense._id), debit: 25 }, { accountId: String(ap._id), credit: 25 }] };
  await test('supplier journal posts to supplier ledger and cached balance exactly once', async () => {
    const before = await balance(); const cached = (await Supplier.findById(supplier._id)).currentBalance; const key = crypto.randomUUID();
    const r = await call('/api/vouchers', journal, 'POST', key); assert.equal(r.response.status, 201, JSON.stringify(r.body));
    await call('/api/vouchers', journal, 'POST', key);
    assert.equal(await balance(), before + 25); assert.equal((await Supplier.findById(supplier._id)).currentBalance, cached + 25);
    assertOk(await call('/api/vouchers', { action: 'cancel', voucherId: r.body.voucher._id, reason: 'Undo journal' }, 'PATCH'));
    assert.equal(await balance(), before); assert.equal((await Supplier.findById(supplier._id)).currentBalance, cached);
  });
  await test('draft supplier journal updates balance only when posted', async () => {
    const before = await balance(); const r = await call('/api/vouchers', { ...journal, status: 'draft' }); assert.equal(r.response.status, 201);
    assert.equal(await balance(), before); assertOk(await call('/api/vouchers', { action: 'post', voucherId: r.body.voucher._id }, 'PATCH')); assert.equal(await balance(), before + 25);
  });
  await test('supplier journal requires a payable entry and an own-tenant supplier', async () => {
    const r = await call('/api/vouchers', { ...journal, entries: [{ accountId: String(expense._id), debit: 25 }, { accountId: String(expense._id), credit: 25 }] }); assert.equal(r.response.status, 400);
    const foreign = await Supplier.create({ outletId: otherOutlet._id, code: 'OTHER', name: 'Other supplier' });
    assert.equal((await call('/api/vouchers', { ...journal, supplierId: String(foreign._id) })).response.status, 400);
  });
  await test('supplier payments after a return respect the reduced bill amount', async () => {
    const p = await purchase(); assertOk(await correct(p.purchase, { action: 'return', items: [{ index: 0, quantity: 2 }] }));
    const r = await call(`/api/purchases/${p.purchase._id}/payments`, { amount: 160, paymentMethod: 'CASH' }); assert.equal(r.response.status, 201, JSON.stringify(r.body));
    assert.equal((await Purchase.findById(p.purchase._id)).balanceDue, 0);
  });
  await test('bill ledger includes supplier payment allocations without counting them twice', async () => {
    const s = await Supplier.create({ outletId: outlet._id, code: 'ALLOCATION', name: 'Allocation supplier', currentBalance: 0 });
    const p = await purchase({ supplierId: String(s._id), supplierBillNumber: 'BILL-ALLOC' });
    const paid = await call(`/api/suppliers/${s._id}/payments`, { amount: 60, paymentMethod: 'CASH' }); assert.equal(paid.response.status, 201, JSON.stringify(paid.body));
    const r = await get(`/api/reports/supplier-ledger?supplierId=${s._id}&fromDate=2020-01-01&toDate=2099-12-31`); assertOk(r);
    assert.equal(r.body.bills[0].balance, 140); assert.equal(r.body.unallocatedBalance, 0); assert.equal(r.body.summary.closingBalance, 140);
  });
  await test('new supplier credit sale reduces payable and leaves linked customer receivable unchanged', async () => {
    const product = await makeProduct({ taxRate: 0 }); const before = await balance();
    const r = await postSale(product, { customerId: undefined, supplierId: String(supplier._id), payments: [], amountPaid: 0 }); assert.equal(r.response.status, 201, JSON.stringify(r.body));
    const c = await Customer.findOne({ outletId: outlet._id, supplierId: supplier._id }); assert(c); assert.equal(c.currentBalance, 0); assert.equal(await balance(), before - 100);
    const again = await postSale(product, { customerId: undefined, supplierId: String(supplier._id), payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }); assert.equal(again.response.status, 201);
    assert.equal(await balance(), before - 100);
    assert.equal(await Customer.countDocuments({ outletId: outlet._id, supplierId: supplier._id }), 1);
  });
  await runComplaintsOneTests({ test, call, get, purchase, correct, assertOk, outlet, otherOutlet, makeProduct, postSale });

}
