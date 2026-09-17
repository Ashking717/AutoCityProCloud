import mongoose from 'mongoose';
import Product from '@/lib/models/ProductEnhanced';
import ProductLocationStock from '@/lib/models/ProductLocationStock';
import StockLocation from '@/lib/models/StockLocation';

type ObjectIdLike = mongoose.Types.ObjectId | string | undefined | null;

interface ProductLike {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  sku: string;
  currentStock?: number;
  location?: string;
}

interface LocationInput {
  outletId: ObjectIdLike;
  locationId?: ObjectIdLike;
  name?: string;
  createdBy?: ObjectIdLike;
  session?: mongoose.ClientSession;
}

interface AdjustLocationStockInput {
  outletId: ObjectIdLike;
  product: ProductLike;
  locationId?: ObjectIdLike;
  locationName?: string;
  quantityDelta: number;
  userId?: ObjectIdLike;
  session?: mongoose.ClientSession;
}

interface SaleLocationInput {
  outletId: ObjectIdLike;
  product: ProductLike;
  quantity: number;
  locationId?: ObjectIdLike;
  locationName?: string;
  userId?: ObjectIdLike;
  session?: mongoose.ClientSession;
}

interface TransferInput {
  outletId: ObjectIdLike;
  product: ProductLike;
  fromLocationId: ObjectIdLike;
  toLocationId: ObjectIdLike;
  quantity: number;
  userId: ObjectIdLike;
  session?: mongoose.ClientSession;
}

interface MoveSingleLocationInput {
  outletId: ObjectIdLike;
  product: ProductLike;
  toLocationId?: ObjectIdLike;
  toLocationName?: string;
  userId?: ObjectIdLike;
  session?: mongoose.ClientSession;
}

interface ReplaceLocationSplitInput {
  outletId: ObjectIdLike;
  product: ProductLike;
  splits: Array<{
    locationId?: ObjectIdLike;
    locationName?: string;
    quantity: number;
  }>;
  userId?: ObjectIdLike;
  session?: mongoose.ClientSession;
}

const DEFAULT_LOCATION_NAME = 'Main Store';

function toObjectId(value: ObjectIdLike): mongoose.Types.ObjectId {
  if (!value) throw new Error('Missing ObjectId value');
  return value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(value);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeLocationCode(name: string) {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'LOC'
  );
}

export async function restoreProductStockAtHistoricalCost(input: {
  outletId: ObjectIdLike;
  productId: ObjectIdLike;
  quantity: number;
  unitCost: number;
  session: mongoose.ClientSession;
}) {
  const quantity = Number(input.quantity);
  const unitCost = Number(input.unitCost);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error('Restored stock quantity and historical unit cost must be valid');
  }
  const product: any = await Product.findOne({
    _id: toObjectId(input.productId),
    outletId: toObjectId(input.outletId),
  }).session(input.session);
  if (!product) throw new Error('Product not found in this outlet');

  // Legacy products may predate per-location stock. Materialize the existing
  // global balance before adding the returned quantity so it is not lost.
  await ensureProductHasLocationStock(product, input.outletId, undefined, input.session);

  const oldStock = Number(product.currentStock || 0);
  const oldCost = Number(product.costPrice || 0);
  const newStock = oldStock + quantity;
  product.currentStock = newStock;
  product.costPrice = newStock > 0
    ? Number(((oldStock * oldCost + quantity * unitCost) / newStock).toFixed(4))
    : oldCost;
  await product.save({ session: input.session });
  return product;
}

async function nextAvailableCode(
  outletId: mongoose.Types.ObjectId,
  name: string,
  session?: mongoose.ClientSession
) {
  const baseCode = makeLocationCode(name);
  let code = baseCode;
  let suffix = 1;

  while (await StockLocation.exists({ outletId, code }).session(session || null)) {
    suffix += 1;
    code = `${baseCode.slice(0, 20)}-${suffix}`;
  }

  return code;
}

export async function getOrCreateStockLocation(input: LocationInput) {
  const outletId = toObjectId(input.outletId);

  if (input.locationId && mongoose.Types.ObjectId.isValid(String(input.locationId))) {
    const existing = await StockLocation.findOne({
      _id: toObjectId(input.locationId),
      outletId,
      isActive: true,
    }).session(input.session || null);

    if (!existing) {
      throw new Error('Selected stock location was not found');
    }

    return existing;
  }

  const cleanName = (input.name || DEFAULT_LOCATION_NAME).trim() || DEFAULT_LOCATION_NAME;
  const existingByName = await StockLocation.findOne({
    outletId,
    name: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' },
    isActive: true,
  }).session(input.session || null);

  if (existingByName) return existingByName;

  const [created] = await StockLocation.create([{
    name: cleanName,
    code: await nextAvailableCode(outletId, cleanName, input.session),
    outletId,
    createdBy: input.createdBy ? toObjectId(input.createdBy) : undefined,
    isActive: true,
  }], { session: input.session });
  return created;
}

export async function listStockLocations(outletIdInput: ObjectIdLike) {
  const outletId = toObjectId(outletIdInput);
  return StockLocation.find({ outletId, isActive: true })
    .sort({ name: 1 })
    .lean();
}

export async function getProductLocationStocks(
  outletIdInput: ObjectIdLike,
  productIdInput: ObjectIdLike
) {
  return ProductLocationStock.find({
    outletId: toObjectId(outletIdInput),
    productId: toObjectId(productIdInput),
  })
    .sort({ quantity: -1, locationName: 1 })
    .lean();
}

export async function ensureProductHasLocationStock(
  product: ProductLike,
  outletIdInput: ObjectIdLike,
  userId?: ObjectIdLike,
  session?: mongoose.ClientSession
) {
  const outletId = toObjectId(outletIdInput);
  const productId = toObjectId(product._id);
  const existingCount = await ProductLocationStock.countDocuments({
    outletId,
    productId,
  }).session(session || null);

  if (existingCount > 0 || !product.currentStock || product.currentStock <= 0) {
    return null;
  }

  const location = await getOrCreateStockLocation({
    outletId,
    name: product.location || DEFAULT_LOCATION_NAME,
    createdBy: userId,
    session,
  });

  const [created] = await ProductLocationStock.create([{
    productId,
    productName: product.name,
    sku: product.sku,
    locationId: location._id,
    locationName: location.name,
    quantity: product.currentStock,
    outletId,
    updatedBy: userId ? toObjectId(userId) : undefined,
  }], { session });
  return created;
}

export async function materializeLegacyLocationStocksForProducts(
  products: any[],
  outletIdInput: ObjectIdLike,
  userId?: ObjectIdLike
) {
  if (products.length === 0) return { migratedCount: 0 };

  const outletId = toObjectId(outletIdInput);
  const candidates = products.filter(
    (product) =>
      product?._id &&
      (Number(product.currentStock || 0) > 0 || String(product.location || '').trim())
  );

  if (candidates.length === 0) return { migratedCount: 0 };

  const productIds = candidates.map((product) => toObjectId(product._id));
  const existingStocks = await ProductLocationStock.find({
    outletId,
    productId: { $in: productIds },
  })
    .select('productId')
    .lean();

  const productsWithLocationStock = new Set(
    existingStocks.map((stock) => String(stock.productId))
  );
  const pending = candidates.filter(
    (product) => !productsWithLocationStock.has(String(product._id))
  );
  if (pending.length === 0) return { migratedCount: 0 };

  // Resolve each distinct legacy location once. This keeps the one-time
  // migration practical for tenants with thousands of products.
  const locationsByName = new Map<string, any>();
  for (const product of pending) {
    const locationName = String(product.location || DEFAULT_LOCATION_NAME).trim()
      || DEFAULT_LOCATION_NAME;
    const key = locationName.toLocaleLowerCase();
    if (locationsByName.has(key)) continue;
    const location = await getOrCreateStockLocation({
      outletId,
      name: locationName,
      createdBy: userId,
    });
    locationsByName.set(key, location);
  }

  const result = await ProductLocationStock.bulkWrite(
    pending.map((product) => {
      const productId = toObjectId(product._id);
      const quantity = Math.max(0, Number(product.currentStock || 0));
      const locationName = String(product.location || DEFAULT_LOCATION_NAME).trim()
        || DEFAULT_LOCATION_NAME;
      const location = locationsByName.get(locationName.toLocaleLowerCase());
      return {
        updateOne: {
          filter: { outletId, productId, locationId: location._id },
          update: {
            $set: {
              productName: product.name,
              sku: product.sku,
              locationName: location.name,
              updatedBy: userId ? toObjectId(userId) : undefined,
            },
            $setOnInsert: {
              outletId,
              productId,
              locationId: location._id,
              quantity,
            },
          },
          upsert: true,
        },
      };
    }),
    { ordered: false }
  );

  return { migratedCount: Number(result.upsertedCount || 0) };
}

export async function adjustProductLocationStock(input: AdjustLocationStockInput) {
  const outletId = toObjectId(input.outletId);
  const productId = toObjectId(input.product._id);
  const location = await getOrCreateStockLocation({
    outletId,
    locationId: input.locationId,
    name: input.locationName || input.product.location,
    createdBy: input.userId,
    session: input.session,
  });
  const quantityDelta = Number(input.quantityDelta);
  if (!Number.isFinite(quantityDelta)) throw new Error('Invalid stock quantity');

  const baseQuery: any = { outletId, productId, locationId: location._id };
  if (quantityDelta < 0) baseQuery.quantity = { $gte: Math.abs(quantityDelta) };

  const updatedStock = await ProductLocationStock.findOneAndUpdate(
    baseQuery,
    {
      $inc: { quantity: quantityDelta },
      $set: {
        productName: input.product.name,
        sku: input.product.sku,
        locationName: location.name,
        updatedBy: input.userId ? toObjectId(input.userId) : undefined,
      },
      ...(quantityDelta >= 0 ? {
        $setOnInsert: { outletId, productId, locationId: location._id },
      } : {}),
    },
    {
      upsert: quantityDelta >= 0,
      new: true,
      setDefaultsOnInsert: true,
      session: input.session,
    }
  );

  if (!updatedStock) {
    const current: any = await ProductLocationStock.findOne({
      outletId,
      productId,
      locationId: location._id,
    }).session(input.session || null).lean();
    throw new Error(
      `Insufficient stock for ${input.product.name} in ${location.name}. Available: ${current?.quantity || 0}`
    );
  }

  const previousQuantity = Number(updatedStock.quantity) - quantityDelta;

  return {
    location,
    stock: updatedStock,
    previousQuantity,
    newQuantity: Number(updatedStock.quantity),
  };
}

export async function applyProductLocationStockDelta(input: AdjustLocationStockInput) {
  if (input.quantityDelta >= 0 || input.locationId || input.locationName) {
    return [await adjustProductLocationStock(input)];
  }

  const outletId = toObjectId(input.outletId);
  const productId = toObjectId(input.product._id);
  await ensureProductHasLocationStock(input.product, outletId, input.userId, input.session);

  const stocks = await ProductLocationStock.find({
    outletId,
    productId,
    quantity: { $gt: 0 },
  }).sort({ quantity: -1, locationName: 1 }).session(input.session || null);

  const available = stocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
  if (available + 0.000001 < Math.abs(input.quantityDelta)) {
    throw new Error(`Insufficient location stock for ${input.product.name}. Available: ${available}`);
  }

  let remaining = Math.abs(input.quantityDelta);
  const results: Array<{
    location: any;
    stock: any;
    previousQuantity: number;
    newQuantity: number;
  }> = [];

  for (const stock of stocks) {
    if (remaining <= 0) break;

    const take = Math.min(stock.quantity, remaining);
    const previousQuantity = stock.quantity;
    stock.quantity = previousQuantity - take;
    stock.updatedBy = input.userId ? toObjectId(input.userId) : undefined;
    await stock.save({ session: input.session });

    const location = await StockLocation.findById(stock.locationId).session(input.session || null);
    results.push({
      location,
      stock,
      previousQuantity,
      newQuantity: stock.quantity,
    });

    remaining -= take;
  }

  if (remaining > 0.000001) {
    throw new Error(`Insufficient location stock for ${input.product.name}`);
  }

  return results;
}

export async function moveSingleLocationProductStock(input: MoveSingleLocationInput) {
  const outletId = toObjectId(input.outletId);
  const productId = toObjectId(input.product._id);
  const targetLocation = await getOrCreateStockLocation({
    outletId,
    locationId: input.toLocationId,
    name: input.toLocationName || input.product.location,
    createdBy: input.userId,
    session: input.session,
  });

  const stocks = await ProductLocationStock.find({ outletId, productId }).sort({
    quantity: -1,
    locationName: 1,
  });
  const positiveStocks = stocks.filter((stock) => Number(stock.quantity || 0) > 0);

  if (positiveStocks.length > 1) {
    throw new Error(
      'This product stock is split across multiple locations. Please use Stock Transfer to move quantities.'
    );
  }

  const existingTotal = stocks.reduce(
    (sum, stock) => sum + Number(stock.quantity || 0),
    0
  );
  const quantity = existingTotal > 0
    ? existingTotal
    : Number(input.product.currentStock || 0);
  const previousStock = positiveStocks[0] || stocks[0];
  const previousLocationName = previousStock?.locationName || input.product.location || '';

  const targetStock = await ProductLocationStock.findOneAndUpdate(
    { outletId, productId, locationId: targetLocation._id },
    {
      $set: {
        productName: input.product.name,
        sku: input.product.sku,
        locationName: targetLocation.name,
        quantity: Math.max(0, quantity),
        updatedBy: input.userId ? toObjectId(input.userId) : undefined,
      },
      $setOnInsert: {
        outletId,
        productId,
        locationId: targetLocation._id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await ProductLocationStock.deleteMany({
    outletId,
    productId,
    locationId: { $ne: targetLocation._id },
  });

  return {
    location: targetLocation,
    stock: targetStock,
    quantity,
    previousLocationName,
    moved: String(previousStock?.locationId || '') !== String(targetLocation._id),
  };
}

export async function replaceProductLocationStocks(input: ReplaceLocationSplitInput) {
  const outletId = toObjectId(input.outletId);
  const productId = toObjectId(input.product._id);
  const oldStocks = await ProductLocationStock.find({ outletId, productId }).lean();
  const previousTotal = oldStocks.reduce(
    (sum, stock) => sum + Number(stock.quantity || 0),
    0
  );
  const byLocation = new Map<
    string,
    {
      location: any;
      quantity: number;
    }
  >();

  for (const split of input.splits) {
    const quantity = Number(split.quantity) || 0;
    if (quantity < 0 || (!split.locationId && !split.locationName)) continue;

    const location = await getOrCreateStockLocation({
      outletId,
      locationId: split.locationId,
      name: split.locationName,
      createdBy: input.userId,
    });
    const key = String(location._id);
    const existing = byLocation.get(key);

    if (existing) {
      existing.quantity += quantity;
    } else {
      byLocation.set(key, { location, quantity });
    }
  }

  const keptLocationIds: mongoose.Types.ObjectId[] = [];
  const splits = [];

  for (const item of byLocation.values()) {
    keptLocationIds.push(item.location._id);

    const stock = await ProductLocationStock.findOneAndUpdate(
      { outletId, productId, locationId: item.location._id },
      {
        $set: {
          productName: input.product.name,
          sku: input.product.sku,
          locationName: item.location.name,
          quantity: item.quantity,
          updatedBy: input.userId ? toObjectId(input.userId) : undefined,
        },
        $setOnInsert: {
          outletId,
          productId,
          locationId: item.location._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    splits.push({
      locationId: String(item.location._id),
      locationName: item.location.name,
      quantity: stock.quantity,
    });
  }

  await ProductLocationStock.deleteMany({
    outletId,
    productId,
    ...(keptLocationIds.length > 0
      ? { locationId: { $nin: keptLocationIds } }
      : {}),
  });

  const totalQuantity = splits.reduce(
    (sum, split) => sum + Number(split.quantity || 0),
    0
  );
  const primaryLocationName = splits[0]?.locationName || '';

  return {
    previousTotal,
    totalQuantity,
    splits,
    primaryLocationName,
    changed: Math.abs(previousTotal - totalQuantity) > 0.000001,
  };
}

export async function resolveStockLocationForSale(input: SaleLocationInput) {
  const outletId = toObjectId(input.outletId);
  const productId = toObjectId(input.product._id);
  await ensureProductHasLocationStock(input.product, outletId, input.userId, input.session);

  if (input.locationId || input.locationName) {
    const location = await getOrCreateStockLocation({
      outletId,
      locationId: input.locationId,
      name: input.locationName,
      createdBy: input.userId,
      session: input.session,
    });
    const stock = await ProductLocationStock.findOne({
      outletId,
      productId,
      locationId: location._id,
    }).session(input.session || null);
    const available = stock?.quantity || 0;

    if (available < input.quantity) {
      throw new Error(
        `Insufficient stock for ${input.product.name} in ${location.name}. Available: ${available}`
      );
    }

    return { location, stock, available };
  }

  const stock = await ProductLocationStock.findOne({
    outletId,
    productId,
    quantity: { $gte: input.quantity },
  }).sort({ quantity: -1, locationName: 1 }).session(input.session || null);

  if (!stock) {
    const stocks = await ProductLocationStock.find({ outletId, productId })
      .sort({ quantity: -1, locationName: 1 })
      .session(input.session || null)
      .lean();
    const available = stocks.reduce((sum, item) => sum + (item.quantity || 0), 0);
    throw new Error(
      `Insufficient location stock for ${input.product.name}. Available: ${available}`
    );
  }

  const location = await StockLocation.findById(stock.locationId).session(input.session || null);
  return { location, stock, available: stock.quantity };
}

export async function attachLocationDataToProducts(
  products: any[],
  outletIdInput: ObjectIdLike
) {
  if (products.length === 0) return products;

  const outletId = toObjectId(outletIdInput);
  const productIds = products.map((product) => toObjectId(product._id));
  const stocks = await ProductLocationStock.find({
    outletId,
    productId: { $in: productIds },
  })
    .sort({ quantity: -1, locationName: 1 })
    .lean();

  const byProduct = new Map<string, any[]>();
  for (const stock of stocks) {
    const key = String(stock.productId);
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key)!.push({
      locationId: String(stock.locationId),
      locationName: stock.locationName,
      quantity: stock.quantity || 0,
    });
  }

  return products.map((product) => {
    const locations = byProduct.get(String(product._id)) || [];
    const fallbackLocation =
      locations.length === 0 && (product.currentStock || 0) > 0
        ? [
            {
              locationId: '',
              locationName: product.location || DEFAULT_LOCATION_NAME,
              quantity: product.currentStock || 0,
              isSynthetic: true,
            },
          ]
        : [];
    const visibleLocations = locations.length > 0 ? locations : fallbackLocation;
    const locationSummary = visibleLocations
      .filter((location) => (location.quantity || 0) > 0)
      .map((location) => `${location.locationName} (${location.quantity})`)
      .join(', ');

    return {
      ...product,
      locations: visibleLocations,
      location: locationSummary || visibleLocations[0]?.locationName || '',
    };
  });
}

export async function findProductIdsByLocationSearch(
  outletIdInput: ObjectIdLike,
  searchTerm: string
) {
  const outletId = toObjectId(outletIdInput);
  const matchingLocations = await StockLocation.find({
    outletId,
    isActive: true,
    name: { $regex: searchTerm, $options: 'i' },
  }).select('_id');

  if (matchingLocations.length === 0) return [];

  const stocks = await ProductLocationStock.find({
    outletId,
    locationId: { $in: matchingLocations.map((location) => location._id) },
  }).select('productId');

  return stocks.map((stock) => stock.productId);
}

export async function findProductsByStockLocation(
  outletIdInput: ObjectIdLike,
  locationIdInput: ObjectIdLike
) {
  const outletId = toObjectId(outletIdInput);
  if (
    !locationIdInput ||
    !mongoose.Types.ObjectId.isValid(String(locationIdInput))
  ) {
    return { productIds: [], locationName: "" };
  }

  const location: any = await StockLocation.findOne({
    _id: toObjectId(locationIdInput),
    outletId,
    isActive: true,
  })
    .select("_id name")
    .lean();

  if (!location) return { productIds: [], locationName: "" };

  const stocks = await ProductLocationStock.find({
    outletId,
    locationId: location._id,
  })
    .select("productId")
    .lean();

  return {
    productIds: stocks.map((stock) => stock.productId),
    locationName: location.name,
  };
}

export async function transferProductBetweenLocations(input: TransferInput) {
  const outletId = toObjectId(input.outletId);
  const fromLocationId = toObjectId(input.fromLocationId);
  const toLocationId = toObjectId(input.toLocationId);

  if (String(fromLocationId) === String(toLocationId)) {
    throw new Error('From and to locations must be different');
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Transfer quantity must be greater than zero');
  }

  const fromLocation = await StockLocation.findOne({
    _id: fromLocationId,
    outletId,
    isActive: true,
  }).session(input.session || null);
  const toLocation = await StockLocation.findOne({
    _id: toLocationId,
    outletId,
    isActive: true,
  }).session(input.session || null);

  if (!fromLocation || !toLocation) {
    throw new Error('Selected transfer location was not found');
  }

  const productId = toObjectId(input.product._id);
  const fromStock = await ProductLocationStock.findOneAndUpdate({
    outletId,
    productId,
    locationId: fromLocation._id,
    quantity: { $gte: input.quantity },
  }, {
    $inc: { quantity: -input.quantity },
    $set: { updatedBy: toObjectId(input.userId) },
  }, { new: true, session: input.session });

  if (!fromStock) {
    const availableStock: any = await ProductLocationStock.findOne({
      outletId,
      productId,
      locationId: fromLocation._id,
    }).session(input.session || null).lean();
    throw new Error(
      `Insufficient stock in ${fromLocation.name}. Available: ${availableStock?.quantity || 0}`
    );
  }

  const toStock = await ProductLocationStock.findOneAndUpdate(
    { outletId, productId, locationId: toLocation._id },
    {
      $inc: { quantity: input.quantity },
      $set: {
        productName: input.product.name,
        sku: input.product.sku,
        locationName: toLocation.name,
        updatedBy: toObjectId(input.userId),
      },
      $setOnInsert: {
        outletId,
        productId,
        locationId: toLocation._id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, session: input.session }
  );

  return {
    fromLocation,
    toLocation,
    fromStock,
    toStock,
    fromBalanceAfter: fromStock.quantity,
    toBalanceAfter: toStock.quantity,
  };
}

export { DEFAULT_LOCATION_NAME };
