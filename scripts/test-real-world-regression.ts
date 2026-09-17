// @ts-nocheck -- Mongoose's cached-model union erases document types in test-only queries.
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import Account, { AccountSubType } from '@/lib/models/Account';
import Category from '@/lib/models/Category';
import Customer from '@/lib/models/Customer';
import InventoryMovement from '@/lib/models/InventoryMovement';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Outlet from '@/lib/models/Outlet';
import Product from '@/lib/models/ProductEnhanced';
import ProductLocationStock from '@/lib/models/ProductLocationStock';
import Sale, { PaymentMethod } from '@/lib/models/Sale';
import StockLocation from '@/lib/models/StockLocation';
import User from '@/lib/models/User';
import Voucher, { ReferenceType, VoucherType } from '@/lib/models/Voucher';
import { seedSystemAccounts } from '@/lib/accounting/seedSystemAccounts';
import {
  adjustProductLocationStock,
  ensureProductHasLocationStock,
  getOrCreateStockLocation,
  restoreProductStockAtHistoricalCost,
  transferProductBetweenLocations,
} from '@/lib/services/locationStockService';
import {
  createPostedVoucher,
  reversePostedVoucher,
} from '@/lib/services/voucherPostingService';

const uri = process.env.MONGODB_URI || '';
const apiBase = process.env.TEST_API_BASE || 'http://127.0.0.1:3019';

if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):27029\/autocity_regression/.test(uri)) {
  throw new Error(
    'Safety stop: MONGODB_URI must target the disposable local autocity_regression database on port 27029'
  );
}

type TestResult = { name: string; ok: boolean; detail?: string };
const results: TestResult[] = [];
let sequence = 0;

async function test(name: string, run: () => Promise<void>) {
  try {
    await run();
    results.push({ name, ok: true });
    console.log(`PASS ${String(results.length).padStart(2, '0')} ${name}`);
  } catch (error: any) {
    results.push({ name, ok: false, detail: error?.stack || error?.message || String(error) });
    console.error(`FAIL ${String(results.length).padStart(2, '0')} ${name}: ${error?.message || error}`);
  }
}

async function expectReject(run: () => Promise<unknown>, pattern: RegExp) {
  await assert.rejects(run, pattern);
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  let body: any;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function id() {
  sequence += 1;
  return String(sequence).padStart(4, '0');
}

async function main() {
  await mongoose.connect(uri, { bufferCommands: false });
  await mongoose.connection.db!.dropDatabase();

  const outlet = await Outlet.create({
    name: 'Regression Garage',
    code: 'REG01',
    address: { street: 'Test St', city: 'Doha', state: 'Doha', country: 'Qatar', postalCode: '00000' },
    contact: { phone: '00000000', email: 'regression@example.test', manager: 'Tester' },
    taxInfo: { taxId: 'TEST' },
    settings: { currency: 'QAR', timezone: 'Asia/Qatar', fiscalYearStart: new Date('2026-01-01') },
  });
  const otherOutlet = await Outlet.create({
    name: 'Other Garage',
    code: 'REG02',
    address: { street: 'Other St', city: 'Doha', state: 'Doha', country: 'Qatar', postalCode: '00000' },
    contact: { phone: '11111111', email: 'other@example.test', manager: 'Other' },
    taxInfo: { taxId: 'OTHER' },
  });
  const category = await Category.create({ outletId: outlet._id, name: 'Parts', code: 'PARTS' });
  const customer = await Customer.create({
    outletId: outlet._id,
    name: 'Walk-in Customer',
    code: 'CUST-001',
    creditLimit: 100000,
    currentBalance: 0,
    isActive: true,
  });
  const inactiveCustomer = await Customer.create({
    outletId: outlet._id,
    name: 'Inactive Customer',
    code: 'CUST-002',
    isActive: false,
  });
  const limitedCustomer = await Customer.create({
    outletId: outlet._id,
    name: 'Limited Customer',
    code: 'CUST-003',
    creditLimit: 50,
    currentBalance: 40,
    isActive: true,
  });
  const user = await User.create({
    email: 'cashier@example.test',
    username: 'regression-cashier',
    password: 'Regression123!',
    firstName: 'Regression',
    lastName: 'Admin',
    role: 'ADMIN',
    outletId: outlet._id,
    isActive: true,
  });

  await seedSystemAccounts(outlet._id);
  await seedSystemAccounts(otherOutlet._id);
  await Promise.all([
    Account.syncIndexes(),
    Customer.syncIndexes(),
    InventoryMovement.syncIndexes(),
    LedgerEntry.syncIndexes(),
    Product.syncIndexes(),
    ProductLocationStock.syncIndexes(),
    Sale.syncIndexes(),
    StockLocation.syncIndexes(),
    Voucher.syncIndexes(),
  ]);

  async function makeProduct(overrides: Record<string, unknown> = {}) {
    const suffix = id();
    return Product.create({
      name: `Brake Pad ${suffix}`,
      category: category._id,
      sku: `SKU-${suffix}`,
      costPrice: 40,
      sellingPrice: 100,
      taxRate: 5,
      currentStock: 10,
      minStock: 0,
      maxStock: 1000,
      reorderPoint: 0,
      unit: 'pcs',
      outletId: outlet._id,
      location: 'Legacy Shelf',
      isActive: true,
      ...overrides,
    });
  }

  let cookie = '';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const login = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: user.username, password: 'Regression123!' }),
      });
      if (login.response.ok) {
        cookie = login.response.headers.get('set-cookie')?.split(';')[0] || '';
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(cookie, `Could not log in to test server at ${apiBase}`);

  async function postSale(
    product: any,
    overrides: Record<string, any> = {},
    key = `sale-test-${id()}`,
    itemOverrides: Record<string, any> = {}
  ) {
    const body = {
      customerId: String(customer._id),
      items: [{
        productId: String(product._id),
        name: 'Client supplied name',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 100,
        discount: 0,
        discountType: 'fixed',
        ...itemOverrides,
      }],
      payments: [{ method: PaymentMethod.CASH, amount: 105 }],
      amountPaid: 105,
      overallDiscountAmount: 0,
      ...overrides,
    };
    return request('/api/sales', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'idempotency-key': key,
      },
      body: JSON.stringify(body),
    });
  }

  // Route validation and tenant-boundary scenarios.
  await test('unauthenticated sale is rejected', async () => {
    const result = await request('/api/sales', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(result.response.status, 401);
  });
  await test('sale requires idempotency key', async () => {
    const product = await makeProduct();
    const result = await request('/api/sales', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ customerId: customer._id, items: [{ productId: product._id }] }),
    });
    assert.equal(result.response.status, 400);
  });
  await test('sale requires customer', async () => {
    const product = await makeProduct();
    const result = await postSale(product, { customerId: null });
    assert.equal(result.response.status, 400);
  });
  await test('sale requires at least one item', async () => {
    const product = await makeProduct();
    const result = await postSale(product, { items: [] });
    assert.equal(result.response.status, 400);
  });
  await test('unknown customer is rejected', async () => {
    const product = await makeProduct();
    const result = await postSale(product, { customerId: new mongoose.Types.ObjectId() });
    assert.equal(result.response.status, 400);
  });
  await test('inactive customer is rejected', async () => {
    const product = await makeProduct();
    const result = await postSale(product, { customerId: inactiveCustomer._id });
    assert.equal(result.response.status, 400);
  });
  await test('unknown product is rejected', async () => {
    const product = { _id: new mongoose.Types.ObjectId() };
    const result = await postSale(product);
    assert.equal(result.response.status, 400);
  });
  await test('inactive product is rejected', async () => {
    const product = await makeProduct({ isActive: false });
    const result = await postSale(product);
    assert.equal(result.response.status, 400);
  });
  await test('product from another outlet is rejected', async () => {
    const product = await makeProduct({ outletId: otherOutlet._id });
    const result = await postSale(product);
    assert.equal(result.response.status, 400);
  });
  await test('zero quantity is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, {}, undefined, { quantity: 0 })).response.status, 400);
  });
  await test('negative quantity is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, {}, undefined, { quantity: -1 })).response.status, 400);
  });
  await test('negative submitted price is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, {}, undefined, { unitPrice: -1 })).response.status, 400);
  });
  await test('unit mismatch is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, {}, undefined, { unit: 'box' })).response.status, 400);
  });
  await test('duplicate product lines are rejected', async () => {
    const product = await makeProduct();
    const line = { productId: product._id, quantity: 1, unit: 'pcs', unitPrice: 100 };
    assert.equal((await postSale(product, { items: [line, line] })).response.status, 400);
  });
  await test('insufficient global stock is rejected', async () => {
    const product = await makeProduct({ currentStock: 1 });
    assert.equal((await postSale(product, {}, undefined, { quantity: 2 })).response.status, 400);
  });
  await test('insufficient selected-location stock is rejected', async () => {
    const product = await makeProduct({ currentStock: 3 });
    const empty = await getOrCreateStockLocation({ outletId: outlet._id, name: `Empty ${id()}`, createdBy: user._id });
    assert.equal((await postSale(product, {}, undefined, { locationId: empty._id })).response.status, 400);
  });
  await test('fixed discount above line value is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, {}, undefined, { discountType: 'fixed', discountAmount: 101 })).response.status, 400);
  });
  await test('percentage discount above 100 percent is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, {}, undefined, { discountType: 'percentage', discount: 101 })).response.status, 400);
  });
  await test('overall discount above subtotal is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, { overallDiscountAmount: 101 })).response.status, 400);
  });
  await test('unknown payment method is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, { payments: [{ method: 'CRYPTO', amount: 105 }] })).response.status, 400);
  });
  await test('credit cannot be submitted as a tender line', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, { payments: [{ method: 'CREDIT', amount: 105 }] })).response.status, 400);
  });
  await test('payment detail mismatch is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, { amountPaid: 104 })).response.status, 400);
  });
  await test('sale overpayment is rejected', async () => {
    const product = await makeProduct();
    assert.equal((await postSale(product, { payments: [{ method: 'CASH', amount: 106 }], amountPaid: 106 })).response.status, 400);
  });
  await test('customer credit limit is atomic and rolls back stock setup', async () => {
    const product = await makeProduct({ currentStock: 2, sellingPrice: 20, taxRate: 0 });
    const before = await ProductLocationStock.countDocuments({ productId: product._id });
    const result = await postSale(product, {
      customerId: limitedCustomer._id,
      payments: [],
      amountPaid: 0,
    }, undefined, { unitPrice: 20 });
    assert.equal(result.response.status, 400);
    assert.equal(await ProductLocationStock.countDocuments({ productId: product._id }), before);
    assert.equal((await Product.findById(product._id).lean())!.currentStock, 2);
  });

  await makeProduct({ sku: '13914', currentStock: 0 });
  const autoProductPayload = (name: string, sku: string, key: string) => ({
    idempotencyKey: key,
    name,
    categoryId: category._id,
    sku,
    autoGenerateSku: true,
    unit: 'pcs',
    costPrice: 25,
    sellingPrice: 80,
    taxRate: 0,
    currentStock: 0,
    minStock: 0,
    maxStock: 1000,
  });

  await test('next SKU preview follows the highest stored numeric SKU', async () => {
    const response = await request('/api/products/next-sku', { headers: { cookie } });
    assert.equal(response.response.status, 200, response.body?.error);
    assert.equal(response.body.nextSKU, '13915');
  });

  await test('stale auto-generated SKU is advanced instead of rejected', async () => {
    const key = `auto-sku-stale-${id()}`;
    const response = await request('/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify(autoProductPayload('Auto SKU stale test', '13914', key)),
    });
    assert.equal(response.response.status, 201, response.body?.error);
    assert.equal(response.body.product.sku, '13915');
  });

  await test('simultaneous auto-generated SKU requests receive different values', async () => {
    const firstKey = `auto-sku-concurrent-a-${id()}`;
    const secondKey = `auto-sku-concurrent-b-${id()}`;
    const [first, second] = await Promise.all([
      request('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie, 'idempotency-key': firstKey },
        body: JSON.stringify(autoProductPayload('Concurrent Auto SKU A', '13915', firstKey)),
      }),
      request('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie, 'idempotency-key': secondKey },
        body: JSON.stringify(autoProductPayload('Concurrent Auto SKU B', '13915', secondKey)),
      }),
    ]);
    assert.equal(first.response.status, 201, first.body?.error);
    assert.equal(second.response.status, 201, second.body?.error);
    assert.notEqual(first.body.product.sku, second.body.product.sku);
    assert.deepEqual(
      [first.body.product.sku, second.body.product.sku].sort(),
      ['13916', '13917']
    );
  });

  await test('manual duplicate non-numeric SKU remains protected', async () => {
    await makeProduct({ sku: 'MANUAL-DUPLICATE', currentStock: 0 });
    const key = `manual-sku-duplicate-${id()}`;
    const payload = autoProductPayload('Manual duplicate test', 'MANUAL-DUPLICATE', key);
    payload.autoGenerateSku = false;
    const response = await request('/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify(payload),
    });
    assert.equal(response.response.status, 400);
    assert.match(response.body.error, /already exists/i);
  });

  await test('legacy unit alias does not block product metadata edit', async () => {
    const suffix = id();
    const legacyId = new mongoose.Types.ObjectId();
    await Product.collection.insertOne({
      _id: legacyId,
      name: `Legacy Alias ${suffix}`,
      category: category._id,
      sku: `LEGACY-ALIAS-${suffix}`,
      costPrice: 25,
      sellingPrice: 60,
      taxRate: 0,
      currentStock: 7,
      minStock: 1,
      maxStock: 20,
      reorderPoint: 1,
      unit: 'pieces',
      outletId: outlet._id,
      location: 'Legacy Shelf',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await ensureProductHasLocationStock(
      (await Product.findById(legacyId))!,
      outlet._id,
      user._id
    );
    const response = await request(`/api/products/${legacyId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        name: `Legacy Alias Updated ${suffix}`,
        unit: 'pieces',
        costPrice: 25,
        sellingPrice: 65,
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    const updated = await Product.findById(legacyId).lean();
    assert.equal(updated!.name, `Legacy Alias Updated ${suffix}`);
    assert.equal(updated!.unit, 'pcs');
    assert.equal(updated!.currentStock, 7);
    assert.equal((await ProductLocationStock.findOne({ productId: legacyId }).lean())!.quantity, 7);
  });

  await test('missing legacy unit defaults safely during product edit', async () => {
    const suffix = id();
    const legacyId = new mongoose.Types.ObjectId();
    await Product.collection.insertOne({
      _id: legacyId,
      name: `Legacy No Unit ${suffix}`,
      category: category._id,
      sku: `LEGACY-NOUNIT-${suffix}`,
      costPrice: 10,
      sellingPrice: 30,
      taxRate: 0,
      currentStock: 4,
      minStock: 0,
      maxStock: 20,
      reorderPoint: 0,
      outletId: outlet._id,
      location: 'Legacy Shelf',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const response = await request(`/api/products/${legacyId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        name: `Legacy No Unit Updated ${suffix}`,
        unit: 'pcs',
        costPrice: 10,
        sellingPrice: 35,
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    const updated = await Product.findById(legacyId).lean();
    assert.equal(updated!.unit, 'pcs');
    assert.equal(updated!.currentStock, 4);
  });

  const legacyTransferId = new mongoose.Types.ObjectId();
  const legacyTransferSuffix = id();
  await Product.collection.insertOne({
    _id: legacyTransferId,
    name: `Legacy Transfer ${legacyTransferSuffix}`,
    category: category._id,
    sku: `LEGACY-TRANSFER-${legacyTransferSuffix}`,
    costPrice: 15,
    sellingPrice: 40,
    taxRate: 0,
    currentStock: 12,
    minStock: 0,
    maxStock: 50,
    reorderPoint: 0,
    unit: 'pieces',
    outletId: outlet._id,
    location: 'Old Rack',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await test('transfer preparation materializes legacy location stock', async () => {
    assert.equal(await ProductLocationStock.countDocuments({ productId: legacyTransferId }), 0);
    const response = await request('/api/stock-locations/materialize-legacy', {
      method: 'POST',
      headers: { cookie },
    });
    assert.equal(response.response.status, 200, response.body?.error);
    const stock = await ProductLocationStock.findOne({ productId: legacyTransferId }).lean();
    assert(stock);
    assert.equal(stock.quantity, 12);
    assert.equal(stock.locationName, 'Old Rack');
    assert.equal((await Product.findById(legacyTransferId).lean())!.currentStock, 12);
  });

  await test('legacy location materialization is idempotent', async () => {
    const response = await request('/api/stock-locations/materialize-legacy', {
      method: 'POST',
      headers: { cookie },
    });
    assert.equal(response.response.status, 200, response.body?.error);
    assert.equal(await ProductLocationStock.countDocuments({ productId: legacyTransferId }), 1);
    assert.equal((await ProductLocationStock.findOne({ productId: legacyTransferId }).lean())!.quantity, 12);
  });

  await test('legacy product transfers between persisted locations without changing total stock', async () => {
    const source = await ProductLocationStock.findOne({ productId: legacyTransferId });
    const target = await getOrCreateStockLocation({
      outletId: outlet._id,
      name: `Transfer Target ${legacyTransferSuffix}`,
      createdBy: user._id,
    });
    const key = `legacy-transfer-${id()}`;
    const response = await request('/api/stock-locations/transfer', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'idempotency-key': key,
      },
      body: JSON.stringify({
        idempotencyKey: key,
        productId: legacyTransferId,
        fromLocationId: source!.locationId,
        toLocationId: target._id,
        quantity: 4,
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    const stocks = await ProductLocationStock.find({ productId: legacyTransferId }).lean();
    assert.equal(stocks.reduce((sum, stock) => sum + stock.quantity, 0), 12);
    assert.equal(stocks.find((stock) => String(stock.locationId) === String(source!.locationId))!.quantity, 8);
    assert.equal(stocks.find((stock) => String(stock.locationId) === String(target._id))!.quantity, 4);
    assert.equal((await Product.findById(legacyTransferId).lean())!.currentStock, 12);
    assert.equal(await InventoryMovement.countDocuments({ productId: legacyTransferId, movementType: 'TRANSFER' }), 2);
  });

  const allocationProduct = await makeProduct({ currentStock: 10, location: 'Edit Product Source' });
  await ensureProductHasLocationStock(allocationProduct, outlet._id, user._id);
  const allocationSource = await ProductLocationStock.findOne({ productId: allocationProduct._id });
  const allocationTarget = await getOrCreateStockLocation({
    outletId: outlet._id,
    name: `Edit Product Target ${id()}`,
    createdBy: user._id,
  });

  await test('product edit location allocation rejects a total stock change', async () => {
    const key = `allocation-total-${id()}`;
    const response = await request('/api/stock-locations/rebalance', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify({
        productId: allocationProduct._id,
        idempotencyKey: key,
        allocations: [
          { locationId: allocationSource!.locationId, quantity: 8 },
          { locationId: allocationTarget._id, quantity: 1 },
        ],
      }),
    });
    assert.equal(response.response.status, 400);
    assert.match(response.body.error, /must equal current stock/i);
    assert.equal((await ProductLocationStock.findById(allocationSource!._id).lean())!.quantity, 10);
  });

  await test('product edit location allocation rejects duplicate locations', async () => {
    const key = `allocation-duplicate-${id()}`;
    const response = await request('/api/stock-locations/rebalance', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify({
        productId: allocationProduct._id,
        idempotencyKey: key,
        allocations: [
          { locationId: allocationSource!.locationId, quantity: 5 },
          { locationId: allocationSource!.locationId, quantity: 5 },
        ],
      }),
    });
    assert.equal(response.response.status, 400);
    assert.match(response.body.error, /only once/i);
  });

  const allocationKey = `allocation-success-${id()}`;
  await test('product edit redistributes locations with audited transfers and unchanged total stock', async () => {
    const response = await request('/api/stock-locations/rebalance', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': allocationKey },
      body: JSON.stringify({
        productId: allocationProduct._id,
        idempotencyKey: allocationKey,
        allocations: [
          { locationId: allocationSource!.locationId, quantity: 4 },
          { locationId: allocationTarget._id, quantity: 6 },
        ],
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    const stocks = await ProductLocationStock.find({ productId: allocationProduct._id }).lean();
    assert.equal(stocks.reduce((sum, stock) => sum + stock.quantity, 0), 10);
    assert.equal(stocks.find((stock) => String(stock.locationId) === String(allocationSource!.locationId))!.quantity, 4);
    assert.equal(stocks.find((stock) => String(stock.locationId) === String(allocationTarget._id))!.quantity, 6);
    assert.equal((await Product.findById(allocationProduct._id).lean())!.currentStock, 10);
    assert.equal(await InventoryMovement.countDocuments({
      productId: allocationProduct._id,
      operationKey: { $regex: `^rebalance:${allocationKey}:` },
    }), 2);
  });

  await test('product edit location allocation retry is idempotent', async () => {
    const response = await request('/api/stock-locations/rebalance', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': allocationKey },
      body: JSON.stringify({
        productId: allocationProduct._id,
        idempotencyKey: allocationKey,
        allocations: [
          { locationId: allocationSource!.locationId, quantity: 4 },
          { locationId: allocationTarget._id, quantity: 6 },
        ],
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    assert.equal(response.body.idempotent, true);
    assert.equal(await InventoryMovement.countDocuments({
      productId: allocationProduct._id,
      operationKey: { $regex: `^rebalance:${allocationKey}:` },
    }), 2);
  });

  // A complete sale of a legacy product and its persisted effects.
  const legacyProduct = await makeProduct({ currentStock: 10, costPrice: 40, sellingPrice: 100, taxRate: 5 });
  const legacyKey = `legacy-complete-${id()}`;
  const legacyResponse = await postSale(legacyProduct, {}, legacyKey);
  const legacySale = await Sale.findOne({ operationKey: legacyKey });
  await test('legacy product sale succeeds', async () => assert.equal(legacyResponse.response.status, 201));
  await test('legacy stock is materialized at its old quantity before decrement', async () => {
    const stocks = await ProductLocationStock.find({ productId: legacyProduct._id }).lean();
    assert.equal(stocks.length, 1);
    assert.equal(stocks[0].quantity, 9);
  });
  await test('legacy sale decrements global stock once', async () => {
    assert.equal((await Product.findById(legacyProduct._id).lean())!.currentStock, 9);
  });
  await test('legacy sale records signed inventory movement', async () => {
    const movement = await InventoryMovement.findOne({ referenceId: legacySale!._id }).lean();
    assert.equal(movement!.quantity, -1);
    assert.equal(movement!.unitCost, 40);
    assert.equal(movement!.totalValue, -40);
    assert.equal(movement!.balanceAfter, 9);
  });
  await test('sale stores receipt voucher link', async () => assert(legacySale!.voucherId));
  await test('sale stores COGS voucher link', async () => assert(legacySale!.cogsVoucherId));
  await test('sale receipt voucher is balanced', async () => {
    const voucher = await Voucher.findById(legacySale!.voucherId).lean();
    assert.equal(voucher!.totalDebit, voucher!.totalCredit);
    assert.equal(voucher!.totalDebit, 105);
  });
  await test('sale COGS voucher is balanced', async () => {
    const voucher = await Voucher.findById(legacySale!.cogsVoucherId).lean();
    assert.equal(voucher!.totalDebit, 40);
    assert.equal(voucher!.totalCredit, 40);
  });
  await test('each sale voucher line has one ledger entry', async () => {
    for (const voucherId of [legacySale!.voucherId, legacySale!.cogsVoucherId]) {
      const voucher = await Voucher.findById(voucherId).lean();
      assert.equal(await LedgerEntry.countDocuments({ voucherId }), voucher!.entries.length);
    }
  });
  await test('inventory movement links to posted accounting', async () => {
    const movement = await InventoryMovement.findOne({ referenceId: legacySale!._id }).lean();
    assert.equal(String(movement!.voucherId), String(legacySale!.cogsVoucherId));
    assert.equal(movement!.ledgerEntriesCreated, true);
  });

  const correctionCustomer = await Customer.create({
    outletId: outlet._id,
    name: 'Sale Correction Customer',
    code: `CORRECTION-${id()}`,
    creditLimit: 10000,
    currentBalance: 0,
    isActive: true,
  });
  const correctionProduct = await makeProduct({ currentStock: 10, costPrice: 40, sellingPrice: 100, taxRate: 5 });
  const correctionSaleKey = `sale-correction-base-${id()}`;
  const correctionCreation = await postSale(correctionProduct, {
    customerId: correctionCustomer._id,
  }, correctionSaleKey);
  const originalCorrectionSale = await Sale.findOne({ operationKey: correctionSaleKey }).lean();
  const originalReceiptVoucherId = originalCorrectionSale!.voucherId;
  const originalCogsVoucherId = originalCorrectionSale!.cogsVoucherId;
  const increaseCorrectionKey = `sale-correction-increase-${id()}`;
  let increaseCorrectionResponse: any;

  await test('flexible sale correction accepts quantity price discount and split payment changes', async () => {
    assert.equal(correctionCreation.response.status, 201, correctionCreation.body?.error);
    increaseCorrectionResponse = await request(`/api/sales/${originalCorrectionSale!._id}/edit`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': increaseCorrectionKey },
      body: JSON.stringify({
        idempotencyKey: increaseCorrectionKey,
        correctionReason: 'Correct quantity, price and tender allocation',
        items: [{
          lineIndex: 0,
          productId: correctionProduct._id,
          sku: correctionProduct.sku,
          quantity: 3,
          unitPrice: 120,
          discount: 10,
          taxRate: 5,
        }],
        payments: [
          { method: 'CASH', amount: 200 },
          { method: 'CARD', amount: 100 },
        ],
        amountPaid: 300,
      }),
    });
    assert.equal(increaseCorrectionResponse.response.status, 200, increaseCorrectionResponse.body?.error);
    const sale = await Sale.findById(originalCorrectionSale!._id).lean();
    assert.equal(sale!.items[0].quantity, 3);
    assert.equal(sale!.items[0].unitPrice, 120);
    assert.equal(sale!.items[0].discount, 10);
    assert.equal(sale!.grandTotal, 367.5);
    assert.equal(sale!.amountPaid, 300);
    assert.equal(sale!.balanceDue, 67.5);
    assert.equal(sale!.payments.length, 2);
  });

  await test('sale correction applies only the additional stock quantity', async () => {
    const product = await Product.findById(correctionProduct._id).lean();
    const locations = await ProductLocationStock.find({ productId: correctionProduct._id }).lean();
    const correctionMovement = await InventoryMovement.findOne({
      operationKey: `sale-correction:${increaseCorrectionKey}:line:0`,
    }).lean();
    assert.equal(product!.currentStock, 7);
    assert.equal(locations.reduce((sum, stock) => sum + stock.quantity, 0), 7);
    assert.equal(correctionMovement!.quantity, -2);
    assert.equal(correctionMovement!.totalValue, -80);
  });

  await test('sale correction updates customer receivable by the balance difference', async () => {
    assert.equal((await Customer.findById(correctionCustomer._id).lean())!.currentBalance, 67.5);
  });

  await test('sale correction reverses old vouchers and posts balanced replacements', async () => {
    assert.equal((await Voucher.findById(originalReceiptVoucherId).lean())!.status, 'cancelled');
    assert.equal((await Voucher.findById(originalCogsVoucherId).lean())!.status, 'cancelled');
    const sale = await Sale.findById(originalCorrectionSale!._id).lean();
    assert.notEqual(String(sale!.voucherId), String(originalReceiptVoucherId));
    assert.notEqual(String(sale!.cogsVoucherId), String(originalCogsVoucherId));
    for (const voucherId of [sale!.voucherId, sale!.cogsVoucherId]) {
      const voucher = await Voucher.findById(voucherId).lean();
      assert.equal(voucher!.totalDebit, voucher!.totalCredit);
      assert.equal(await LedgerEntry.countDocuments({ voucherId }), voucher!.entries.length);
    }
  });

  await test('sale correction retry is idempotent', async () => {
    const beforeVoucherCount = await Voucher.countDocuments({ outletId: outlet._id });
    const beforeMovementCount = await InventoryMovement.countDocuments({ productId: correctionProduct._id });
    const response = await request(`/api/sales/${originalCorrectionSale!._id}/edit`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': increaseCorrectionKey },
      body: JSON.stringify({
        idempotencyKey: increaseCorrectionKey,
        correctionReason: 'Correct quantity, price and tender allocation',
        items: [{ lineIndex: 0, productId: correctionProduct._id, sku: correctionProduct.sku, quantity: 3, unitPrice: 120, discount: 10, taxRate: 5 }],
        payments: [{ method: 'CASH', amount: 200 }, { method: 'CARD', amount: 100 }],
        amountPaid: 300,
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    assert.equal(await Voucher.countDocuments({ outletId: outlet._id }), beforeVoucherCount);
    assert.equal(await InventoryMovement.countDocuments({ productId: correctionProduct._id }), beforeMovementCount);
    assert.equal((await Product.findById(correctionProduct._id).lean())!.currentStock, 7);
  });

  await test('sale correction can reduce quantity and restore stock and receivable', async () => {
    const key = `sale-correction-decrease-${id()}`;
    const response = await request(`/api/sales/${originalCorrectionSale!._id}/edit`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify({
        idempotencyKey: key,
        correctionReason: 'Reduce corrected quantity to one',
        items: [{ lineIndex: 0, productId: correctionProduct._id, sku: correctionProduct.sku, quantity: 1, unitPrice: 100, discount: 0, taxRate: 5 }],
        payments: [{ method: 'CASH', amount: 105 }],
        amountPaid: 105,
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    assert.equal((await Product.findById(correctionProduct._id).lean())!.currentStock, 9);
    assert.equal((await Customer.findById(correctionCustomer._id).lean())!.currentBalance, 0);
    const movement = await InventoryMovement.findOne({ operationKey: `sale-correction:${key}:line:0` }).lean();
    assert.equal(movement!.quantity, 2);
    assert.equal(movement!.movementType, 'RETURN');
  });

  await test('failed sale correction rolls back stock accounting and customer balance', async () => {
    const saleBefore = await Sale.findById(originalCorrectionSale!._id).lean();
    const productBefore = await Product.findById(correctionProduct._id).lean();
    const customerBefore = await Customer.findById(correctionCustomer._id).lean();
    const voucherCountBefore = await Voucher.countDocuments({ outletId: outlet._id });
    const key = `sale-correction-fail-${id()}`;
    const response = await request(`/api/sales/${originalCorrectionSale!._id}/edit`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify({
        idempotencyKey: key,
        correctionReason: 'Impossible quantity test',
        items: [{ lineIndex: 0, productId: correctionProduct._id, sku: correctionProduct.sku, quantity: 9999, unitPrice: 100, discount: 0, taxRate: 5 }],
        payments: [],
        amountPaid: 0,
      }),
    });
    assert.equal(response.response.status, 400);
    assert.match(response.body.error, /insufficient/i);
    assert.equal((await Product.findById(correctionProduct._id).lean())!.currentStock, productBefore!.currentStock);
    assert.equal((await Customer.findById(correctionCustomer._id).lean())!.currentBalance, customerBefore!.currentBalance);
    assert.equal(String((await Sale.findById(originalCorrectionSale!._id).lean())!.voucherId), String(saleBefore!.voucherId));
    assert.equal(await Voucher.countDocuments({ outletId: outlet._id }), voucherCountBefore);
  });

  await test('sale correction can remove one line and restore only that product stock', async () => {
    const retainedProduct = await makeProduct({ currentStock: 10, sellingPrice: 100, taxRate: 5 });
    const removedProduct = await makeProduct({ currentStock: 10, sellingPrice: 100, taxRate: 5 });
    const creationKey = `sale-correction-remove-base-${id()}`;
    const creation = await request('/api/sales', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': creationKey },
      body: JSON.stringify({
        idempotencyKey: creationKey,
        customerId: correctionCustomer._id,
        items: [
          { productId: retainedProduct._id, name: retainedProduct.name, sku: retainedProduct.sku, quantity: 1, unit: 'pcs', unitPrice: 100, discount: 0, discountType: 'fixed' },
          { productId: removedProduct._id, name: removedProduct.name, sku: removedProduct.sku, quantity: 1, unit: 'pcs', unitPrice: 100, discount: 0, discountType: 'fixed' },
        ],
        payments: [{ method: 'CASH', amount: 210 }],
        amountPaid: 210,
        overallDiscountAmount: 0,
      }),
    });
    assert.equal(creation.response.status, 201, creation.body?.error);
    const key = `sale-correction-remove-${id()}`;
    const response = await request(`/api/sales/${creation.body.sale._id}/edit`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify({
        idempotencyKey: key,
        correctionReason: 'Remove accidentally added second line',
        items: [{ lineIndex: 0, productId: retainedProduct._id, sku: retainedProduct.sku, quantity: 1, unitPrice: 100, discount: 0, taxRate: 5 }],
        payments: [{ method: 'CASH', amount: 105 }],
        amountPaid: 105,
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    const corrected = await Sale.findById(creation.body.sale._id).lean();
    assert.equal(corrected!.items.length, 1);
    assert.equal(String(corrected!.items[0].productId), String(retainedProduct._id));
    assert.equal((await Product.findById(retainedProduct._id).lean())!.currentStock, 9);
    assert.equal((await Product.findById(removedProduct._id).lean())!.currentStock, 10);
    assert.equal((await InventoryMovement.findOne({ operationKey: `sale-correction:${key}:line:1` }).lean())!.quantity, 1);
  });

  await test('labor-only sale correction changes price without requiring inventory or COGS', async () => {
    const creationKey = `sale-correction-labor-base-${id()}`;
    const creation = await request('/api/sales', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': creationKey },
      body: JSON.stringify({
        idempotencyKey: creationKey,
        customerId: correctionCustomer._id,
        items: [{ name: 'Labor correction test', sku: 'LABOR', isLabor: true, quantity: 1, unit: 'job', unitPrice: 100, discount: 0, discountType: 'fixed', taxRate: 5 }],
        payments: [{ method: 'CASH', amount: 105 }],
        amountPaid: 105,
        overallDiscountAmount: 0,
      }),
    });
    assert.equal(creation.response.status, 201, creation.body?.error);
    const key = `sale-correction-labor-${id()}`;
    const response = await request(`/api/sales/${creation.body.sale._id}/edit`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, 'idempotency-key': key },
      body: JSON.stringify({
        idempotencyKey: key,
        correctionReason: 'Correct labor charge',
        items: [{ lineIndex: 0, sku: 'LABOR', quantity: 1, unitPrice: 80, discount: 0, taxRate: 5 }],
        payments: [{ method: 'CARD', amount: 84 }],
        amountPaid: 84,
      }),
    });
    assert.equal(response.response.status, 200, response.body?.error);
    const corrected = await Sale.findById(creation.body.sale._id).lean();
    assert.equal(corrected!.grandTotal, 84);
    assert.equal(corrected!.paymentMethod, 'CARD');
    assert.equal(corrected!.cogsVoucherId, undefined);
    assert.equal(await InventoryMovement.countDocuments({ referenceId: corrected!._id }), 0);
  });

  await test('exact-stock sale reaches zero without negative stock', async () => {
    const product = await makeProduct({ currentStock: 1 });
    const result = await postSale(product);
    assert.equal(result.response.status, 201);
    assert.equal((await Product.findById(product._id).lean())!.currentStock, 0);
  });
  await test('credit sale posts Accounts Receivable', async () => {
    const product = await makeProduct({ taxRate: 0 });
    const key = `credit-${id()}`;
    const result = await postSale(product, { payments: [], amountPaid: 0 }, key);
    assert.equal(result.response.status, 201);
    const sale = await Sale.findOne({ operationKey: key }).lean();
    const ar = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.ACCOUNTS_RECEIVABLE }).lean();
    const line = await LedgerEntry.findOne({ voucherId: sale!.voucherId, accountId: ar!._id }).lean();
    assert.equal(line!.debit, 100);
  });
  await test('cash sale debits Cash', async () => {
    const product = await makeProduct({ taxRate: 0 });
    const key = `cash-${id()}`;
    await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, key);
    const sale = await Sale.findOne({ operationKey: key }).lean();
    const account = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.CASH }).lean();
    assert.equal((await LedgerEntry.findOne({ voucherId: sale!.voucherId, accountId: account!._id }).lean())!.debit, 100);
  });
  for (const method of [PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE]) {
    await test(`${method.toLowerCase()} sale debits Bank`, async () => {
      const product = await makeProduct({ taxRate: 0 });
      const key = `${method}-${id()}`;
      const result = await postSale(product, { payments: [{ method, amount: 100 }], amountPaid: 100 }, key);
      assert.equal(result.response.status, 201);
      const sale = await Sale.findOne({ operationKey: key }).lean();
      const bank = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.BANK }).lean();
      assert.equal((await LedgerEntry.findOne({ voucherId: sale!.voucherId, accountId: bank!._id }).lean())!.debit, 100);
    });
  }
  await test('split tender posts Cash and Bank separately', async () => {
    const product = await makeProduct({ taxRate: 0 });
    const key = `split-${id()}`;
    const result = await postSale(product, {
      payments: [{ method: 'CASH', amount: 40 }, { method: 'CARD', amount: 60 }], amountPaid: 100,
    }, key);
    assert.equal(result.response.status, 201);
    const sale = await Sale.findOne({ operationKey: key }).lean();
    const lines = await LedgerEntry.find({ voucherId: sale!.voucherId, debit: { $gt: 0 } }).lean();
    assert.deepEqual(lines.map((line) => line.debit).sort((a, b) => a - b), [40, 60]);
  });
  await test('product VAT rate comes from product master', async () => {
    const product = await makeProduct({ taxRate: 7 });
    const key = `vat-master-${id()}`;
    const result = await postSale(product, { payments: [{ method: 'CASH', amount: 107 }], amountPaid: 107 }, key, { taxRate: 0 });
    assert.equal(result.response.status, 201);
    assert.equal((await Sale.findOne({ operationKey: key }).lean())!.totalVAT, 7);
  });
  await test('product selling price comes from product master', async () => {
    const product = await makeProduct({ sellingPrice: 120, taxRate: 0 });
    const key = `price-master-${id()}`;
    const result = await postSale(product, { payments: [{ method: 'CASH', amount: 120 }], amountPaid: 120 }, key, { unitPrice: 1 });
    assert.equal(result.response.status, 201);
    assert.equal((await Sale.findOne({ operationKey: key }).lean())!.items[0].unitPrice, 120);
  });
  await test('product cost comes from product master', async () => {
    const product = await makeProduct({ costPrice: 37, taxRate: 0 });
    const key = `cost-master-${id()}`;
    await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, key, { costPrice: 1 });
    assert.equal((await Sale.findOne({ operationKey: key }).lean())!.items[0].costPrice, 37);
  });
  await test('fixed item discount posts the net revenue', async () => {
    const product = await makeProduct({ taxRate: 0 });
    const key = `fixed-discount-${id()}`;
    const result = await postSale(product, { payments: [{ method: 'CASH', amount: 90 }], amountPaid: 90 }, key, { discountAmount: 10 });
    assert.equal(result.response.status, 201);
    assert.equal((await Sale.findOne({ operationKey: key }).lean())!.grandTotal, 90);
  });
  await test('percentage item discount posts the net revenue', async () => {
    const product = await makeProduct({ taxRate: 0 });
    const key = `percent-discount-${id()}`;
    const result = await postSale(product, { payments: [{ method: 'CASH', amount: 85 }], amountPaid: 85 }, key, { discountType: 'percentage', discount: 15 });
    assert.equal(result.response.status, 201);
    assert.equal((await Sale.findOne({ operationKey: key }).lean())!.grandTotal, 85);
  });
  await test('overall discount is applied before VAT', async () => {
    const product = await makeProduct({ taxRate: 10 });
    const key = `overall-discount-${id()}`;
    const result = await postSale(product, { overallDiscountAmount: 20, payments: [{ method: 'CASH', amount: 88 }], amountPaid: 88 }, key);
    assert.equal(result.response.status, 201);
    const sale = await Sale.findOne({ operationKey: key }).lean();
    assert.equal(sale!.subtotal, 80);
    assert.equal(sale!.totalVAT, 8);
  });
  await test('labor-only sale posts Service Revenue and no stock movement', async () => {
    const key = `labor-${id()}`;
    const result = await postSale({ _id: new mongoose.Types.ObjectId() }, {
      items: [{ isLabor: true, name: 'Installation', quantity: 2, unit: 'hour', unitPrice: 50, taxRate: 0 }],
      payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100,
    }, key);
    assert.equal(result.response.status, 201);
    const sale = await Sale.findOne({ operationKey: key }).lean();
    assert.equal(await InventoryMovement.countDocuments({ referenceId: sale!._id }), 0);
    const service = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.SERVICE_REVENUE }).lean();
    assert.equal((await LedgerEntry.findOne({ voucherId: sale!.voucherId, accountId: service!._id }).lean())!.credit, 100);
  });
  await test('mixed sale splits product and service revenue', async () => {
    const product = await makeProduct({ taxRate: 0 });
    const key = `mixed-${id()}`;
    const result = await postSale(product, {
      items: [
        { productId: product._id, quantity: 1, unit: 'pcs', unitPrice: 100 },
        { isLabor: true, name: 'Fitment', quantity: 1, unit: 'job', unitPrice: 30, taxRate: 0 },
      ],
      payments: [{ method: 'CASH', amount: 130 }], amountPaid: 130,
    }, key);
    assert.equal(result.response.status, 201);
    const sale = await Sale.findOne({ operationKey: key }).lean();
    const revenueLines = await LedgerEntry.find({ voucherId: sale!.voucherId, credit: { $gt: 0 } }).lean();
    assert.deepEqual(revenueLines.map((line) => line.credit).sort((a, b) => a - b), [30, 100]);
  });
  await test('repeating idempotency key returns same sale', async () => {
    const product = await makeProduct({ taxRate: 0 });
    const key = `repeat-${id()}`;
    const first = await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, key);
    const second = await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, key);
    assert.equal(first.response.status, 201);
    assert.equal(second.response.status, 200);
    assert.equal(String(first.body.sale._id), String(second.body.sale._id));
  });
  await test('idempotent sale decrements stock only once', async () => {
    const product = await makeProduct({ currentStock: 2, taxRate: 0 });
    const key = `repeat-stock-${id()}`;
    await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, key);
    await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, key);
    assert.equal((await Product.findById(product._id).lean())!.currentStock, 1);
    assert.equal(await InventoryMovement.countDocuments({ productId: product._id }), 1);
  });
  await test('same product with a new operation key creates a new sale', async () => {
    const product = await makeProduct({ currentStock: 2, taxRate: 0 });
    await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 });
    await postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 });
    assert.equal((await Product.findById(product._id).lean())!.currentStock, 0);
    assert.equal(await InventoryMovement.countDocuments({ productId: product._id }), 2);
  });
  await test('two concurrent last-unit sales cannot oversell', async () => {
    const product = await makeProduct({ currentStock: 1, taxRate: 0 });
    const [a, b] = await Promise.all([
      postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, `race-a-${id()}`),
      postSale(product, { payments: [{ method: 'CASH', amount: 100 }], amountPaid: 100 }, `race-b-${id()}`),
    ]);
    assert.equal([a.response.status, b.response.status].filter((status) => status === 201).length, 1);
    assert.equal((await Product.findById(product._id).lean())!.currentStock, 0);
    assert.equal(await InventoryMovement.countDocuments({ productId: product._id }), 1);
  });

  // Voucher, immutability, transfer and valuation scenarios against real Mongo transactions.
  const cash = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.CASH });
  const equity = await Account.findOne({ outletId: outlet._id, subType: AccountSubType.OWNER_EQUITY });
  await test('unbalanced voucher is rejected without partial write', async () => {
    const key = `unbalanced-${id()}`;
    await expectReject(() => createPostedVoucher({
      voucherType: VoucherType.JOURNAL, date: new Date(), narration: 'Unbalanced',
      entries: [{ accountId: cash!._id, debit: 10 }, { accountId: equity!._id, credit: 9 }],
      postingKey: key, outletId: outlet._id, createdBy: user._id,
    }), /balanced/i);
    assert.equal(await Voucher.countDocuments({ postingKey: key }), 0);
  });
  await test('voucher rejects account from another outlet', async () => {
    const otherCash = await Account.findOne({ outletId: otherOutlet._id, subType: AccountSubType.CASH });
    await expectReject(() => createPostedVoucher({
      voucherType: VoucherType.JOURNAL, date: new Date(), narration: 'Cross tenant',
      entries: [{ accountId: cash!._id, debit: 10 }, { accountId: otherCash!._id, credit: 10 }],
      postingKey: `cross-${id()}`, outletId: outlet._id, createdBy: user._id,
    }), /current outlet/i);
  });
  await test('voucher rejects inactive account', async () => {
    const inactive = await Account.create({ code: `INACTIVE-${id()}`, name: 'Inactive', type: 'asset', isActive: false, outletId: outlet._id });
    await expectReject(() => createPostedVoucher({
      voucherType: VoucherType.JOURNAL, date: new Date(), narration: 'Inactive',
      entries: [{ accountId: inactive._id, debit: 10 }, { accountId: equity!._id, credit: 10 }],
      postingKey: `inactive-${id()}`, outletId: outlet._id, createdBy: user._id,
    }), /active/i);
  });
  let manualVoucherId: mongoose.Types.ObjectId;
  await test('voucher posting key is idempotent', async () => {
    const key = `manual-idempotent-${id()}`;
    const input = {
      voucherType: VoucherType.JOURNAL, date: new Date(), narration: 'Capital',
      entries: [{ accountId: cash!._id, debit: 25 }, { accountId: equity!._id, credit: 25 }],
      referenceType: ReferenceType.MANUAL, postingKey: key, outletId: outlet._id, createdBy: user._id,
    };
    const first = await createPostedVoucher(input);
    const second = await createPostedVoucher(input);
    manualVoucherId = first.voucher._id as mongoose.Types.ObjectId;
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(await Voucher.countDocuments({ postingKey: key }), 1);
  });
  await test('posted voucher reversal creates equal opposite ledger entries', async () => {
    const original = await LedgerEntry.find({ voucherId: manualVoucherId }).lean();
    const reversal = await reversePostedVoucher(manualVoucherId, outlet._id, user._id, 'Regression reversal');
    const opposite = await LedgerEntry.find({ voucherId: reversal.voucher._id }).lean();
    assert.equal(opposite.reduce((sum, line) => sum + line.debit, 0), original.reduce((sum, line) => sum + line.credit, 0));
    assert.equal(opposite.reduce((sum, line) => sum + line.credit, 0), original.reduce((sum, line) => sum + line.debit, 0));
  });
  await test('ledger entries cannot be updated', async () => {
    const line = await LedgerEntry.findOne();
    await expectReject(() => LedgerEntry.updateOne({ _id: line!._id }, { $set: { debit: 999 } }), /IMMUTABLE/i);
  });
  await test('ledger entries cannot be deleted', async () => {
    const line = await LedgerEntry.findOne();
    await expectReject(() => LedgerEntry.deleteOne({ _id: line!._id }), /CANNOT BE DELETED/i);
  });
  await test('zero-quantity inventory movement is rejected', async () => {
    const product = await makeProduct();
    await expectReject(() => InventoryMovement.create({
      productId: product._id, productName: product.name, sku: product.sku,
      movementType: 'ADJUSTMENT', quantity: 0, unit: 'pcs', unitCost: 1, totalValue: 0,
      referenceType: 'ADJUSTMENT', referenceId: new mongoose.Types.ObjectId(), referenceNumber: 'ZERO',
      ledgerEntriesCreated: false, balanceAfter: 10, date: new Date(), outletId: outlet._id, createdBy: user._id,
    }), /non-zero/i);
  });
  await test('inventory movement signed value must match quantity times cost', async () => {
    const product = await makeProduct();
    await expectReject(() => InventoryMovement.create({
      productId: product._id, productName: product.name, sku: product.sku,
      movementType: 'ADJUSTMENT', quantity: -2, unit: 'pcs', unitCost: 10, totalValue: 20,
      referenceType: 'ADJUSTMENT', referenceId: new mongoose.Types.ObjectId(), referenceNumber: 'BAD-VALUE',
      ledgerEntriesCreated: false, balanceAfter: 8, date: new Date(), outletId: outlet._id, createdBy: user._id,
    }), /signed quantity/i);
  });
  await test('location transfer moves stock without changing global stock', async () => {
    const product = await makeProduct({ currentStock: 10 });
    await ensureProductHasLocationStock(product, outlet._id, user._id);
    const source = await ProductLocationStock.findOne({ productId: product._id });
    const target = await getOrCreateStockLocation({ outletId: outlet._id, name: `Branch ${id()}`, createdBy: user._id });
    await transferProductBetweenLocations({ outletId: outlet._id, product, fromLocationId: source!.locationId, toLocationId: target._id, quantity: 3, userId: user._id });
    const stocks = await ProductLocationStock.find({ productId: product._id }).lean();
    assert.equal(stocks.reduce((sum, stock) => sum + stock.quantity, 0), 10);
    assert.equal(stocks.find((stock) => String(stock.locationId) === String(target._id))!.quantity, 3);
    assert.equal((await Product.findById(product._id).lean())!.currentStock, 10);
  });
  await test('same-location transfer is rejected', async () => {
    const product = await makeProduct();
    await ensureProductHasLocationStock(product, outlet._id, user._id);
    const source = await ProductLocationStock.findOne({ productId: product._id });
    await expectReject(() => transferProductBetweenLocations({
      outletId: outlet._id, product, fromLocationId: source!.locationId,
      toLocationId: source!.locationId, quantity: 1, userId: user._id,
    }), /different/i);
  });
  await test('insufficient transfer leaves both locations unchanged', async () => {
    const product = await makeProduct({ currentStock: 2 });
    await ensureProductHasLocationStock(product, outlet._id, user._id);
    const source = await ProductLocationStock.findOne({ productId: product._id });
    const target = await getOrCreateStockLocation({ outletId: outlet._id, name: `Target ${id()}`, createdBy: user._id });
    await expectReject(() => transferProductBetweenLocations({
      outletId: outlet._id, product, fromLocationId: source!.locationId,
      toLocationId: target._id, quantity: 3, userId: user._id,
    }), /Insufficient/i);
    assert.equal((await ProductLocationStock.findById(source!._id).lean())!.quantity, 2);
    assert.equal(await ProductLocationStock.countDocuments({ productId: product._id, locationId: target._id }), 0);
  });
  await test('historical-cost return restores weighted average cost', async () => {
    const product = await makeProduct({ currentStock: 10, costPrice: 20 });
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await restoreProductStockAtHistoricalCost({ outletId: outlet._id, productId: product._id, quantity: 2, unitCost: 50, session });
        await adjustProductLocationStock({ outletId: outlet._id, product, quantityDelta: 2, userId: user._id, session });
      });
    } finally {
      await session.endSession();
    }
    const updated = await Product.findById(product._id).lean();
    assert.equal(updated!.currentStock, 12);
    assert.equal(updated!.costPrice, 25);
    assert.equal((await ProductLocationStock.findOne({ productId: product._id }).lean())!.quantity, 12);
  });
  await test('every posted voucher remains balanced', async () => {
    const unbalanced = await Voucher.countDocuments({ status: 'posted', $expr: { $gt: [{ $abs: { $subtract: ['$totalDebit', '$totalCredit'] } }, 0.01] } });
    assert.equal(unbalanced, 0);
  });
  await test('whole test ledger has equal total debits and credits', async () => {
    const [totals] = await LedgerEntry.aggregate([{ $group: { _id: null, debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } }]);
    assert(Math.abs(totals.debit - totals.credit) <= 0.01);
  });
  await test('all posted vouchers have complete ledger line counts', async () => {
    const vouchers = await Voucher.find({ status: 'posted' }).lean();
    for (const voucher of vouchers) {
      assert.equal(await LedgerEntry.countDocuments({ voucherId: voucher._id }), voucher.entries.length, voucher.voucherNumber);
    }
  });

  const failed = results.filter((result) => !result.ok);
  console.log(`\nRESULT ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.error('\nFAILED SCENARIOS');
    for (const failure of failed) console.error(`- ${failure.name}\n${failure.detail}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
