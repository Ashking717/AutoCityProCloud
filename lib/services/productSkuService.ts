import mongoose from 'mongoose';

import Product from '@/lib/models/ProductEnhanced';
import Sequence from '@/lib/models/Sequence';

const FIRST_NUMERIC_SKU = 10001;

function sequenceId(outletId: mongoose.Types.ObjectId | string) {
  return `product-sku:${String(outletId)}`;
}

async function highestNumericProductSku(
  outletId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
) {
  const products: any[] = await Product.find({
    outletId,
    sku: { $regex: /^\d+$/ },
  })
    .select('sku')
    .session(session || null)
    .lean();

  return products.reduce((maximum, product) => {
    const value = Number(product.sku);
    return Number.isSafeInteger(value) ? Math.max(maximum, value) : maximum;
  }, FIRST_NUMERIC_SKU - 1);
}

export async function previewNextProductSku(
  outletId: mongoose.Types.ObjectId
) {
  const [highestProductSku, sequence]: [number, any] = await Promise.all([
    highestNumericProductSku(outletId),
    Sequence.findById(sequenceId(outletId)).lean(),
  ]);
  return String(Math.max(
    FIRST_NUMERIC_SKU,
    highestProductSku + 1,
    Number(sequence?.value || 0) + 1
  ));
}

export async function reserveNextProductSku(
  outletId: mongoose.Types.ObjectId,
  requestedSku: string,
  session: mongoose.ClientSession
) {
  const requestedNumber = Number(requestedSku);
  if (!/^\d+$/.test(requestedSku) || !Number.isSafeInteger(requestedNumber)) {
    throw new Error('Auto-generated SKU must be numeric');
  }

  const highestProductSku = await highestNumericProductSku(outletId, session);
  const minimumPreviousValue = Math.max(
    FIRST_NUMERIC_SKU - 1,
    highestProductSku,
    requestedNumber - 1
  );
  const id = sequenceId(outletId);

  await Sequence.updateOne(
    { _id: id },
    { $max: { value: minimumPreviousValue } },
    { upsert: true, session }
  );
  const sequence: any = await Sequence.findOneAndUpdate(
    { _id: id },
    { $inc: { value: 1 } },
    { new: true, session }
  );
  return String(sequence.value);
}
