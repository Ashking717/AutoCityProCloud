import mongoose from 'mongoose';

import { connectDB } from '../lib/db/mongodb';
import Closing from '../lib/models/Closing';
import Customer from '../lib/models/Customer';
import Expense from '../lib/models/Expense';
import InventoryMovement from '../lib/models/InventoryMovement';
import Job from '../lib/models/Job';
import LedgerEntry from '../lib/models/LedgerEntry';
import Product from '../lib/models/ProductEnhanced';
import Purchase from '../lib/models/Purchase';
import Sale from '../lib/models/Sale';
import Supplier from '../lib/models/Supplier';
import Voucher from '../lib/models/Voucher';

type Key = Record<string, 1 | -1>;

function sameKey(left: Record<string, unknown>, right: Key) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return leftEntries.length === rightEntries.length
    && leftEntries.every(([field, direction], index) => (
      field === rightEntries[index][0] && direction === rightEntries[index][1]
    ));
}

async function replaceLegacyUniqueIndex(
  model: any,
  legacyName: string,
  legacyKey: Key,
  replacementKey: Key
) {
  const collection = model.collection;
  const indexes = await collection.indexes();
  const legacy = indexes.find((index: any) => index.name === legacyName);

  if (legacy && (!legacy.unique || !sameKey(legacy.key, legacyKey))) {
    throw new Error(
      `Refusing to replace unexpected index ${collection.collectionName}.${legacyName}`
    );
  }

  const replacementName = Object.entries(replacementKey)
    .map(([field, direction]) => `${field}_${direction}`)
    .join('_');
  if (!indexes.some((index: any) => sameKey(index.key, replacementKey))) {
    await collection.createIndex(replacementKey, { unique: true, name: replacementName });
    console.log(`Created ${collection.collectionName}.${replacementName}`);
  }

  if (legacy) {
    await collection.dropIndex(legacyName);
    console.log(`Removed legacy global index ${collection.collectionName}.${legacyName}`);
  }
}

async function run() {
  await connectDB();

  // These legacy indexes were globally unique, which incorrectly prevented
  // different outlets from using the same business identifier.
  await replaceLegacyUniqueIndex(
    Expense,
    'expenseNumber_1',
    { expenseNumber: 1 },
    { outletId: 1, expenseNumber: 1 }
  );
  await replaceLegacyUniqueIndex(
    Supplier,
    'code_1',
    { code: 1 },
    { outletId: 1, code: 1 }
  );
  await replaceLegacyUniqueIndex(
    Voucher,
    'voucherNumber_1',
    { voucherNumber: 1 },
    { outletId: 1, voucherNumber: 1 }
  );

  // Create all newly declared posting, line, return, payment, and operation
  // indexes. Creation fails safely if legacy data contains a real duplicate.
  for (const model of [
    Closing,
    Customer,
    Expense,
    InventoryMovement,
    Job,
    LedgerEntry,
    Product,
    Purchase,
    Sale,
    Supplier,
    Voucher,
  ]) {
    await model.createIndexes();
  }

  console.log('Accounting integrity indexes are up to date.');
}

run()
  .catch((error) => {
    console.error('Accounting integrity migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
