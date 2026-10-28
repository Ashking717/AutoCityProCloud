/** Read-only investigation. Requires MONGODB_URI and, for multi-outlet databases, AUDIT_OUTLET_ID. */
import { loadEnvConfig } from '@next/env';
import { MongoClient, ObjectId } from 'mongodb';

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.MONGODB_URI) throw new Error('Configure MONGODB_URI locally before running this read-only audit');
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const outlets = await db.collection('outlets').find({}, { projection: { _id: 1, name: 1, code: 1 } }).toArray();
    const outletId = process.env.AUDIT_OUTLET_ID ? new ObjectId(process.env.AUDIT_OUTLET_ID) : outlets.length === 1 ? outlets[0]._id : null;
    if (!outletId) { console.log(JSON.stringify({ message: 'Set AUDIT_OUTLET_ID to the intended tenant', outlets }, null, 2)); return; }
    if (!outlets.some(outlet => String(outlet._id) === String(outletId))) throw new Error('Selected outlet not found');
    const purchases = await db.collection('purchases').find({ outletId }).toArray();
    const groups = new Map<string, any[]>();
    for (const purchase of purchases) {
      if (purchase.status === 'CANCELLED') continue;
      const items = (purchase.items || []).map((item: any) => `${item.productId}:${item.quantity}:${item.unitPrice}:${item.taxRate || 0}`).sort().join('|');
      const day = new Date(purchase.purchaseDate || purchase.createdAt).toISOString().slice(0, 10);
      const key = `${purchase.supplierId}:${day}:${purchase.grandTotal}:${items}`;
      const group = groups.get(key) || []; group.push(purchase); groups.set(key, group);
    }
    const suspectedDuplicates = [...groups.values()].filter(group => group.length > 1).map(group => group.map(purchase => ({ id: purchase._id, purchaseNumber: purchase.purchaseNumber, supplier: purchase.supplierName, supplierBillNumber: purchase.supplierBillNumber, date: purchase.purchaseDate, amount: purchase.grandTotal, paid: purchase.amountPaid, status: purchase.status, voucherId: purchase.voucherId })));
    const suppliers = await db.collection('suppliers').find({ outletId, name: { $regex: process.env.AUDIT_SUPPLIER_PATTERN || 'thae?r|thaier|ثائر', $options: 'i' } }).toArray();
    const ap = await db.collection('accounts').findOne({ outletId, subType: 'accounts_payable' });
    const supplierReports = [];
    for (const supplier of suppliers) {
      const bills = purchases.filter(purchase => String(purchase.supplierId) === String(supplier._id));
      const referenceIds = [supplier._id, ...bills.map(bill => bill._id)];
      const ledger = ap ? await db.collection('ledgerentries').find({ outletId, accountId: ap._id, referenceId: { $in: referenceIds } }).sort({ date: 1, createdAt: 1 }).toArray() : [];
      const openingVouchers = await db.collection('vouchers').find({ outletId, referenceId: supplier._id, referenceType: 'OPENING_BALANCE' }, { projection: { voucherNumber: 1, date: 1, entries: 1, status: 1, metadata: 1 } }).toArray();
      const ledgerBalance = Number(ledger.reduce((sum, entry) => sum + Number(entry.credit || 0) - Number(entry.debit || 0), 0).toFixed(2));
      supplierReports.push({ supplierId: supplier._id, name: supplier.name, cachedBalance: supplier.currentBalance, configuredOpening: supplier.openingBalance, ledgerBalance, cachedDifference: Number((Number(supplier.currentBalance || 0) - ledgerBalance).toFixed(2)), openingVouchers,
        bills: bills.map(bill => ({ id: bill._id, purchaseNumber: bill.purchaseNumber, supplierBillNumber: bill.supplierBillNumber, date: bill.purchaseDate, status: bill.status, amount: bill.grandTotal, returnedTotal: bill.returnedTotal || 0, paid: bill.amountPaid, due: bill.balanceDue, voucherId: bill.voucherId, isPostedToGL: bill.isPostedToGL, payments: bill.payments })),
        ledger: ledger.map(entry => ({ date: entry.date, voucherNumber: entry.voucherNumber, referenceType: entry.referenceType, referenceId: entry.referenceId, referenceNumber: entry.referenceNumber, debit: entry.debit, credit: entry.credit, narration: entry.narration })) });
    }
    console.log(JSON.stringify({ readOnly: true, outletId, suspectedDuplicates, supplierReports, note: 'Matching purchases are candidates only; compare supplier invoices before cancellation.' }, null, 2));
  } finally { await client.close(); }
}

main().catch(error => { console.error(error.message?.includes('mongodb') ? 'Database connection failed; check local configuration' : error.message); process.exitCode = 1; });
