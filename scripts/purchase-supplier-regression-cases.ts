// @ts-nocheck -- Integration fixtures include legacy documents.
import assert from 'node:assert/strict';
import Supplier from '@/lib/models/Supplier';
import Purchase from '@/lib/models/Purchase';
import Voucher from '@/lib/models/Voucher';
import LedgerEntry from '@/lib/models/LedgerEntry';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Product from '@/lib/models/ProductEnhanced';
import Account from '@/lib/models/Account';
import { supplierLedgerBalance } from '@/lib/services/supplierLedgerBalance';

export async function runPurchaseSupplierTests({ test, call, get, purchase, correct, assertOk, outlet, otherOutlet }) {
  let sequence = 0;
  const supplier = (extra = {}) => Supplier.create({ outletId: outlet._id, code: `CHANGE-${++sequence}`, name: `Supplier ${sequence}`, currentBalance: 0, isActive: true, ...extra });
  const balance = id => supplierLedgerBalance(outlet._id, id);
  const report = async id => { const r = await get(`/api/reports/supplier-ledger?supplierId=${id}&fromDate=2020-01-01&toDate=2099-12-31`); assertOk(r); return r.body; };
  const move = (p, s, extra = {}, key) => correct(p, { action: 'supplier', supplierId: String(s._id), ...extra }, key);
  const fixture = async (overrides = {}) => { const a = await supplier(), b = await supplier(); return { a, b, ...await purchase({ supplierId: String(a._id), ...overrides }) }; };
  await test('supplier change moves unpaid bill and keeps stock, valuation and original ledger immutable', async () => {
    const p = await fixture(); const product = await Product.findById(p.product._id).lean();
    const ledger = JSON.stringify(await LedgerEntry.find({ referenceId: p.purchase._id }).lean());
    const movements = await InventoryMovement.countDocuments();
    assertOk(await move(p.purchase, p.b));
    assert.equal(await balance(p.a._id), 0); assert.equal(await balance(p.b._id), 200);
    assert.equal(JSON.stringify(await LedgerEntry.find({ referenceId: p.purchase._id }).lean()), ledger);
    assert.equal(await InventoryMovement.countDocuments(), movements);
    const after = await Product.findById(p.product._id); assert.equal(after.currentStock, product.currentStock); assert.equal(after.costPrice, product.costPrice);
    const doc = await Purchase.findById(p.purchase._id); assert.equal(doc.supplierName, p.b.name); assert.equal(String(doc.corrections[0].before.supplierId), String(p.a._id));
    assert.equal((await Supplier.findById(p.b._id)).currentBalance, 200);
  });
  await test('supplier change preserves direct partial and full payments', async () => {
    for (const paid of [60, 200]) {
      const p = await fixture({ amountPaid: paid, paymentMethod: 'CASH' });
      assertOk(await move(p.purchase, p.b)); assert.equal(await balance(p.a._id), 0); assert.equal(await balance(p.b._id), 200 - paid);
      assert.equal((await Purchase.findById(p.purchase._id)).amountPaid, paid);
    }
  });
  await test('supplier payment allocation follows changed bill once and can move back', async () => {
    const p = await fixture();
    assert.equal((await call(`/api/suppliers/${p.a._id}/payments`, { amount: 60, paymentMethod: 'CASH' })).response.status, 201);
    const cash = await Account.findOne({ outletId: outlet._id, subType: 'cash' }).lean();
    const key = crypto.randomUUID(); assertOk(await move(p.purchase, p.b, {}, key)); assertOk(await move(p.purchase, p.b, {}, key));
    assert.equal(await balance(p.a._id), 0); assert.equal(await balance(p.b._id), 140);
    const r = await report(p.b._id); assert.equal(r.bills[0].balance, 140); assert.equal(r.unallocatedBalance, 0);
    assertOk(await move(p.purchase, p.a));
    assert.equal(await balance(p.b._id), 0); assert.equal(await balance(p.a._id), 140);
    assert.equal((await report(p.a._id)).bills[0].balance, 140);
    assert.equal((await Account.findById(cash._id)).currentBalance, cash.currentBalance);
    assert.equal(await Voucher.countDocuments({ referenceId: p.purchase._id, 'metadata.source': 'PURCHASE_SUPPLIER_REASSIGNMENT' }), 1);
    const transfer = await Voucher.findOne({ referenceId: p.purchase._id, 'metadata.source': 'PURCHASE_SUPPLIER_REASSIGNMENT' });
    assert.equal((await call('/api/vouchers', { action: 'cancel', voucherId: String(transfer._id) }, 'PATCH')).response.status, 400);
  });
  await test('changing one bill transfers only its share of a multi-bill supplier payment', async () => {
    const p = await fixture(); const second = await purchase({ supplierId: String(p.a._id) });
    assert.equal((await call(`/api/suppliers/${p.a._id}/payments`, { amount: 250, paymentMethod: 'CASH' })).response.status, 201);
    assertOk(await move(p.purchase, p.b));
    assert.equal(await balance(p.a._id), 150); assert.equal(await balance(p.b._id), 0);
    assert.equal((await Purchase.findById(second.purchase._id)).amountPaid, 50);
  });
  await test('supplier can change after partial return with supplier credit or cash refund', async () => {
    for (const refundMethod of ['CREDIT', 'CASH']) {
      const p = await fixture();
      assert.equal((await call(`/api/suppliers/${p.a._id}/payments`, { amount: 200, paymentMethod: 'CASH' })).response.status, 201);
      assertOk(await correct(p.purchase, { action: 'return', refundMethod, items: [{ index: 0, quantity: 2 }] }));
      assertOk(await move(p.purchase, p.b));
      assert.equal(await balance(p.a._id), 0); assert.equal(await balance(p.b._id), refundMethod === 'CREDIT' ? -40 : 0);
      assert.equal((await report(p.b._id)).bills[0].balance, refundMethod === 'CREDIT' ? -40 : 0);
    }
  });
  await test('cancelling reassigned purchase reverses allocation transfer and updates both suppliers', async () => {
    const p = await fixture();
    assert.equal((await call(`/api/suppliers/${p.a._id}/payments`, { amount: 60, paymentMethod: 'CASH' })).response.status, 201);
    assertOk(await move(p.purchase, p.b)); assertOk(await correct(p.purchase, { action: 'cancel' }));
    assert.equal(await balance(p.a._id), -60); assert.equal(await balance(p.b._id), 0);
    assert.equal((await Supplier.findById(p.a._id)).currentBalance, -60); assert.equal((await Supplier.findById(p.b._id)).currentBalance, 0);
  });
  await test('supplier change rejects foreign, inactive, missing and unchanged supplier', async () => {
    const p = await fixture();
    for (const s of [await supplier({ outletId: otherOutlet._id }), await supplier({ isActive: false }), { _id: 'invalid' }, p.a]) assert.equal((await move(p.purchase, s)).response.status, 400);
    assert.equal(String((await Purchase.findById(p.purchase._id)).supplierId), String(p.a._id));
  });
  await test('duplicate bill at target supplier rolls back, corrected bill number permits change', async () => {
    const p = await fixture({ supplierBillNumber: 'Same Bill' }); await purchase({ supplierId: String(p.b._id), supplierBillNumber: 'same bill' });
    assert.equal((await move(p.purchase, p.b)).response.status, 400);
    assert.equal(await balance(p.a._id), 200); assert.equal(await balance(p.b._id), 200);
    assertOk(await move(p.purchase, p.b, { supplierBillNumber: 'Corrected Bill' })); assert.equal(await balance(p.b._id), 400);
  });
  await test('supplier change rejects stale edits and cancelled purchases', async () => {
    const p = await fixture(); assert.equal((await move(p.purchase, p.b, { expectedUpdatedAt: '2000-01-01' })).response.status, 400);
    assertOk(await correct(p.purchase, { action: 'cancel' })); assert.equal((await move(p.purchase, p.b)).response.status, 400);
  });
  await test('simultaneous supplier changes reject the stale second edit', async () => {
    const p = await fixture(), c = await supplier();
    const outcomes = await Promise.all([move(p.purchase, p.b, { expectedUpdatedAt: p.purchase.updatedAt }), move(p.purchase, c, { expectedUpdatedAt: p.purchase.updatedAt })]);
    assert.deepEqual(outcomes.map(r => r.response.status).sort(), [200, 400]);
    assert.equal(await balance(p.a._id), 0); assert.equal(await balance(p.b._id) + await balance(c._id), 200);
  });
}
