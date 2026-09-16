import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';
import { postInventoryAdjustmentToLedger } from '@/lib/services/accountingService';
import {
  adjustProductLocationStock,
  attachLocationDataToProducts,
  findProductIdsByLocationSearch,
  findProductsByStockLocation,
} from '@/lib/services/locationStockService';
import mongoose from 'mongoose';
import InventoryMovement from '@/lib/models/InventoryMovement';
import type { SortOrder } from 'mongoose';
import {
  generateInternalBarcodeCandidate,
  sanitizeBarcodeValue,
} from '@/lib/utils/barcode';
import { normalizeProductUnit } from '@/lib/utils/productUnit';
import Category from '@/lib/models/Category';
import { hasPermission } from '@/lib/types/roles';
import { postInventoryAdjustmentAccounting } from '@/lib/services/transactionalAccountingService';


// ============================================================================
// GET /api/products - Fetch products with pagination, search, and filters
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    
    // Ensure outletId is properly typed as ObjectId
    const outletIdObj = typeof user.outletId === 'string' 
      ? new mongoose.Types.ObjectId(user.outletId)
      : user.outletId;
    
    const { searchParams } = new URL(request.url);
    
    const query: any = {
      outletId: outletIdObj,
      isActive: true
    };
    
    // ─────────────────────────────────────────────────────────────
    // SEARCH FUNCTIONALITY - Server-side search for performance
    // ─────────────────────────────────────────────────────────────
    const searchTerm = searchParams.get('search');
    if (searchTerm) {
      const productIdsByLocation = await findProductIdsByLocationSearch(
        outletIdObj,
        searchTerm
      );
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { sku: { $regex: searchTerm, $options: 'i' } },
        { barcode: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } },
        { carMake: { $regex: searchTerm, $options: 'i' } },
        { carModel: { $regex: searchTerm, $options: 'i' } },
        { variant: { $regex: searchTerm, $options: 'i' } },
        { color: { $regex: searchTerm, $options: 'i' } },
        { partNumber: { $regex: searchTerm, $options: 'i' } },
      ];
      if (productIdsByLocation.length > 0) {
        query.$or.push({ _id: { $in: productIdsByLocation } });
      }
    }
    
    // ─────────────────────────────────────────────────────────────
    // FILTERS
    // ─────────────────────────────────────────────────────────────
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      query.category = new mongoose.Types.ObjectId(categoryId);
    }
    
    const isVehicle = searchParams.get('isVehicle');
    if (isVehicle !== null && isVehicle !== 'all') {
      query.isVehicle = isVehicle === 'true';
    }
    
    const carMake = searchParams.get('carMake');
    if (carMake) {
      query.carMake = carMake;
    }
    
    const carModel = searchParams.get('carModel');
    if (carModel) {
      query.carModel = carModel;
    }
    
    const color = searchParams.get('color');
    if (color) {
      query.color = color;
    }
    
    const variant = searchParams.get('variant');
    if (variant) {
      query.variant = variant;
    }

    const unit = searchParams.get('unit');
    if (unit) {
      const normalizedUnit = normalizeProductUnit(unit);
      query.unit =
        normalizedUnit === 'pcs'
          ? { $in: ['pcs', 'pc', 'piece', 'pieces'] }
          : normalizedUnit === 'set'
          ? { $in: ['set', 'sets'] }
          : normalizedUnit;
    }

    const stockStatus = searchParams.get('stockStatus');
    if (stockStatus === 'out') {
      query.currentStock = { $lte: 0 };
    } else if (stockStatus === 'critical') {
      query.currentStock = { $gt: 0 };
      query.$expr = { $lte: ['$currentStock', '$minStock'] };
    } else if (stockStatus === 'low') {
      query.currentStock = { $gt: 0 };
      query.$expr = { $lte: ['$currentStock', '$reorderPoint'] };
    }

    const locationId = searchParams.get('locationId');
    if (locationId) {
      const locationFilter = await findProductsByStockLocation(
        outletIdObj,
        locationId
      );
      const escapedLocationName = locationFilter.locationName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { _id: { $in: locationFilter.productIds } },
            ...(locationFilter.locationName
              ? [{
                  location: {
                    $regex: `^${escapedLocationName}$`,
                    $options: 'i',
                  },
                }]
              : []),
          ],
        },
      ];
    }
    
    const year = searchParams.get('year');
    if (year) {
      const yearNum = parseInt(year);
      query.$and = [
        ...(query.$and || []),
        { $or: [{ yearFrom: { $lte: yearNum } }, { yearFrom: null }] },
        { $or: [{ yearTo: { $gte: yearNum } }, { yearTo: null }] }
      ];
    }
    
    // ─────────────────────────────────────────────────────────────
    // PAGINATION - UPDATED FOR SEARCH MODE
    // ─────────────────────────────────────────────────────────────
    const isExport = searchParams.get('export') === 'true';
    const isSearchMode = searchParams.get('searchMode') === 'true'; // NEW FLAG
    
    const page = (isExport || isSearchMode) ? 1 : parseInt(searchParams.get('page') || '1');
    
    // For search mode or export, allow higher limits
    let limit: number;
    if (isExport) {
      limit = 10000; // Export all
    } else if (isSearchMode) {
      // NO LIMIT for search mode - load ALL products
      const requestedLimit = parseInt(searchParams.get('limit') || '10000');
      limit = requestedLimit; // Allow up to 10000 for search
    } else {
      // Normal pagination has a 100 product limit
      limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    }
    
    const skip = (isExport || isSearchMode) ? 0 : (page - 1) * limit;
    
    // ─────────────────────────────────────────────────────────────
    // SORTING
    // ─────────────────────────────────────────────────────────────
    const sortBy = searchParams.get('sortBy') || 'sku';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
    const sort: Record<string, SortOrder> = isExport
      ? { carMake: 'asc', carModel: 'asc', name: 'asc' }
      : { [sortBy]: sortOrder as SortOrder };
    
    // ─────────────────────────────────────────────────────────────
    // CALCULATE GLOBAL STATS (for ALL products matching filters)
    // ─────────────────────────────────────────────────────────────
    const statsAggregation = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $multiply: ['$currentStock', '$costPrice']
            }
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ['$currentStock', '$reorderPoint'] },
                    { $gt: ['$currentStock', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [
                { $lte: ['$currentStock', 0] },
                1,
                0
              ]
            }
          },
          criticalCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$currentStock', 0] },
                    { $lte: ['$currentStock', '$minStock'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = statsAggregation.length > 0 ? statsAggregation[0] : {
      totalValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      criticalCount: 0
    };
    
    // ─────────────────────────────────────────────────────────────
    // EXECUTE QUERY - Use lean() for performance
    // ─────────────────────────────────────────────────────────────
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .select('-__v') // Exclude version key for smaller payload
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const productsWithLocations = await attachLocationDataToProducts(
      products,
      outletIdObj
    );
    
    return NextResponse.json({
      products: productsWithLocations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
      stats: {
        totalValue: stats.totalValue || 0,
        lowStockCount: stats.lowStockCount || 0,
        outOfStockCount: stats.outOfStockCount || 0,
        criticalCount: stats.criticalCount || 0,
      }
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST /api/products - Create a new product (CONCURRENCY SAFE SKU)
// ============================================================================
async function legacyPOST(request: NextRequest) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const userId = new mongoose.Types.ObjectId(user.userId);

    const outletIdObj =
      typeof user.outletId === 'string'
        ? new mongoose.Types.ObjectId(user.outletId)
        : user.outletId;

    const body = await request.json();

    const {
      name,
      description,
      location,
      locationId,
      locationName,
      openingLocations,
      categoryId,
      sku,
      barcode,
      partNumber,
      isVehicle,
      carMake,
      carModel,
      variant,
      yearFrom,
      yearTo,
      color,
      vin,
      unit,
      costPrice,
      sellingPrice,
      taxRate,
      currentStock,
      minStock,
      maxStock,
    } = body;

    if (!name || !categoryId || !sku || costPrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, sku, costPrice, sellingPrice' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // ✅ CONCURRENCY-SAFE SKU RESOLUTION
    // ─────────────────────────────────────────────
    let finalSKU = sku;
    let skuNumber = /^\d+$/.test(sku) ? parseInt(sku, 10) : null;

    while (true) {
      const exists = await Product.exists({
        sku: finalSKU,
        outletId: outletIdObj,
      });

      if (!exists) break;

      if (skuNumber === null) {
        return NextResponse.json(
          { error: 'SKU already exists and is not numeric' },
          { status: 400 }
        );
      }

      skuNumber += 1;
      finalSKU = skuNumber.toString();
    }

    console.log(`✅ Final resolved SKU: ${finalSKU}`);

    const inputBarcode = sanitizeBarcodeValue(barcode);

    if (inputBarcode) {
      const barcodeExists = await Product.exists({
        barcode: inputBarcode,
        outletId: outletIdObj,
      });

      if (barcodeExists) {
        return NextResponse.json(
          { error: 'Product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    let finalBarcode = inputBarcode || generateInternalBarcodeCandidate();

    if (!inputBarcode) {
      while (
        finalBarcode === sanitizeBarcodeValue(finalSKU) ||
        (await Product.exists({ barcode: finalBarcode, outletId: outletIdObj }))
      ) {
        finalBarcode = generateInternalBarcodeCandidate();
      }
    }

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────
    if (isVehicle && !carMake) {
      return NextResponse.json(
        { error: 'Car make is required for vehicle products' },
        { status: 400 }
      );
    }

    const categoryIdObj =
      typeof categoryId === 'string'
        ? new mongoose.Types.ObjectId(categoryId)
        : categoryId;

    const cost = Number(costPrice);

    const rawOpeningLocations = Array.isArray(openingLocations)
      ? openingLocations
      : [];
    const locationAccumulator = new Map<
      string,
      { locationId?: any; locationName?: string; quantity: number }
    >();

    for (const entry of rawOpeningLocations) {
      const quantity = Number(entry?.quantity) || 0;
      if (quantity <= 0) continue;

      const key = entry.locationId
        ? `id:${entry.locationId}`
        : `name:${String(entry.locationName || entry.location || locationName || location || '').trim().toLowerCase()}`;

      const existing = locationAccumulator.get(key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        locationAccumulator.set(key, {
          locationId: entry.locationId,
          locationName: entry.locationName || entry.location,
          quantity,
        });
      }
    }

    const openingStockEntries = Array.from(locationAccumulator.values());

    if (openingStockEntries.length === 0 && Number(currentStock) > 0) {
      openingStockEntries.push({
        locationId,
        locationName: locationName || location,
        quantity: Number(currentStock) || 0,
      });
    }

    if (
      openingStockEntries.length === 0 &&
      (locationId || locationName || location)
    ) {
      openingStockEntries.push({
        locationId,
        locationName: locationName || location,
        quantity: 0,
      });
    }

    const stockQty = openingStockEntries.reduce(
      (sum, entry) => sum + (Number(entry.quantity) || 0),
      0
    );

    // ─────────────────────────────────────────────
    // CREATE PRODUCT
    // ─────────────────────────────────────────────
    const product = await Product.create({
      name,
      description,
      location: locationName || location || '',
      category: categoryIdObj,
      sku: finalSKU,
      barcode: finalBarcode,
      partNumber,
      isVehicle: isVehicle || false,
      carMake: isVehicle ? carMake : undefined,
      carModel: isVehicle ? carModel : undefined,
      variant: isVehicle ? variant : undefined,
      yearFrom: isVehicle && yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: isVehicle && yearTo ? parseInt(yearTo) : undefined,
      color: isVehicle ? color : undefined,
      vin: isVehicle ? vin : undefined,
      costPrice: cost,
      sellingPrice: Number(sellingPrice),
      taxRate: Number(taxRate) || 0,
      currentStock: stockQty,
      minStock: Number(minStock) || 0,
      maxStock: Number(maxStock) || 1000,
      reorderPoint: Number(minStock) || 0,
      unit: normalizeProductUnit(unit),
      outletId: outletIdObj,
      isActive: true,
    });

    const openingLocationResults = [];
    for (const entry of openingStockEntries) {
      openingLocationResults.push({
        quantity: Number(entry.quantity) || 0,
        result: await adjustProductLocationStock({
          product,
          outletId: outletIdObj,
          locationId: entry.locationId,
          locationName: entry.locationName || locationName || location,
          quantityDelta: Number(entry.quantity) || 0,
          userId,
        }),
      });
    }

    // ─────────────────── INVENTORY OPENING MOVEMENT ─────────────────
    if (stockQty > 0 && cost > 0) {
      let runningBalance = 0;
      await InventoryMovement.create(openingLocationResults.map(({ quantity, result }) => {
        runningBalance += quantity;
        return {
          productId: product._id,
          productName: name,
          sku: finalSKU,
          movementType: 'ADJUSTMENT',
          quantity,
          unitCost: cost,
          totalValue: quantity * cost,
          referenceType: 'ADJUSTMENT',
          referenceId: product._id,
          referenceNumber: `OPEN-${finalSKU}`,
          locationId: result.location._id,
          locationName: result.location.name,
          locationBalanceAfter: result.newQuantity,
          outletId: outletIdObj,
          balanceAfter: runningBalance,
          date: new Date(),
          notes: 'Opening stock on product creation',
          createdBy: userId,
          ledgerEntriesCreated: true,
        };
      }));
    }

    // ═══════════════════════════════════════════════════════════
    // ACCOUNTING: Post initial inventory value to ledger
    // ═══════════════════════════════════════════════════════════
    let voucherId = null;

    if (stockQty > 0 && cost > 0) {
      try {
        const inventoryValue = stockQty * cost;

        const inventoryAdjustment = {
          _id: product._id,
          productId: product._id,
          productName: name,
          sku: finalSKU,
          adjustmentType: 'OPENING_STOCK',
          quantity: stockQty,
          costPrice: cost,
          totalValue: inventoryValue,
          date: new Date(),
          reason: `Opening stock for new product: ${name}`,
          outletId: outletIdObj,
        };

        const result = await postInventoryAdjustmentToLedger(
          inventoryAdjustment,
          userId
        );

        voucherId = result.voucherId;
      } catch (ledgerError: any) {
        console.error('⚠️ Failed to post inventory to ledger:', ledgerError.message);
      }
    }

    // ─────────────────── ACTIVITY LOG ─────────────────
    const yearRangeStr =
      yearFrom && yearTo
        ? `, ${yearFrom}-${yearTo}`
        : yearFrom
        ? `, ${yearFrom}+`
        : yearTo
        ? `, Up to ${yearTo}`
        : '';

    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'products',
      description: `Created product: ${name} (${finalSKU})${
        isVehicle
          ? ` [Vehicle: ${carMake}${carModel ? ` ${carModel}` : ''}${variant ? ` ${variant}` : ''}${color ? `, ${color}` : ''}${yearRangeStr}]`
          : ''
      }${
        stockQty > 0
          ? ` with opening stock: ${stockQty} ${unit || 'pcs'} @ QAR ${cost.toFixed(
              2
            )} = QAR ${(stockQty * cost).toFixed(2)}`
          : ''
      }`,
      outletId: outletIdObj,
      timestamp: new Date(),
    });

    const [productWithLocation] = await attachLocationDataToProducts(
      [product.toObject()],
      outletIdObj
    );

    return NextResponse.json(
      {
        product: productWithLocation,
        voucherId,
        inventoryPosted: stockQty > 0 && cost > 0,
        message: 'Product created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageInventory')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const body = await request.json();
    const operationKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim();
    if (!operationKey || !body.name || !body.categoryId || !body.sku) {
      return NextResponse.json({ error: 'idempotencyKey, name, category, and SKU are required' }, { status: 400 });
    }
    const cost = Number(body.costPrice);
    const sellingPrice = Number(body.sellingPrice);
    const taxRate = Number(body.taxRate || 0);
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
      return NextResponse.json({ error: 'Cost and selling price must be non-negative numbers' }, { status: 400 });
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      return NextResponse.json({ error: 'Tax rate must be between 0 and 100' }, { status: 400 });
    }
    if (!Array.isArray(body.openingLocations) && Number(body.currentStock || 0) < 0) {
      return NextResponse.json({ error: 'Opening stock cannot be negative' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    const existing = await Product.findOne({ outletId, operationKey });
    if (existing) return NextResponse.json({ product: existing, idempotent: true });

    session = await mongoose.startSession();
    let createdProduct: any;
    let voucherId: mongoose.Types.ObjectId | undefined;
    await session.withTransaction(async () => {
      const duplicate = await Product.findOne({ outletId, operationKey }).session(session!);
      if (duplicate) {
        createdProduct = duplicate;
        return;
      }
      const category = await Category.findOne({ _id: body.categoryId, outletId, isActive: true }).session(session!);
      if (!category) throw new Error('Active category not found in this outlet');
      if (body.isVehicle && !body.carMake) throw new Error('Car make is required for vehicle products');

      const sku = String(body.sku).trim().toUpperCase();
      const barcode = sanitizeBarcodeValue(body.barcode) || generateInternalBarcodeCandidate();
      if (await Product.exists({ outletId, $or: [{ sku }, { barcode }] }).session(session!)) {
        throw new Error('SKU or barcode already exists in this outlet');
      }

      const accumulator = new Map<string, { locationId?: string; locationName?: string; quantity: number }>();
      const requestedLocations = Array.isArray(body.openingLocations) ? body.openingLocations : [];
      for (const entry of requestedLocations) {
        const quantity = Number(entry.quantity || 0);
        if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Opening quantities cannot be negative');
        if (quantity === 0) continue;
        const key = entry.locationId
          ? `id:${entry.locationId}`
          : `name:${String(entry.locationName || entry.location || 'Main Store').trim().toLowerCase()}`;
        const prior = accumulator.get(key);
        if (prior) prior.quantity += quantity;
        else accumulator.set(key, {
          locationId: entry.locationId,
          locationName: entry.locationName || entry.location,
          quantity,
        });
      }
      if (!accumulator.size && Number(body.currentStock || 0) > 0) {
        accumulator.set('fallback', {
          locationId: body.locationId,
          locationName: body.locationName || body.location,
          quantity: Number(body.currentStock),
        });
      }
      const stockQty = [...accumulator.values()].reduce((sum, entry) => sum + entry.quantity, 0);
      const now = new Date();
      const [product] = await Product.create([{
        operationKey,
        name: body.name,
        description: body.description,
        location: body.locationName || body.location || '',
        category: category._id,
        sku,
        barcode,
        partNumber: body.partNumber,
        isVehicle: body.isVehicle === true,
        carMake: body.isVehicle ? body.carMake : undefined,
        carModel: body.isVehicle ? body.carModel : undefined,
        variant: body.isVehicle ? body.variant : undefined,
        yearFrom: body.isVehicle && body.yearFrom ? Number(body.yearFrom) : undefined,
        yearTo: body.isVehicle && body.yearTo ? Number(body.yearTo) : undefined,
        color: body.isVehicle ? body.color : undefined,
        vin: body.isVehicle ? body.vin : undefined,
        costPrice: cost,
        sellingPrice,
        taxRate,
        currentStock: stockQty,
        minStock: Number(body.minStock || 0),
        maxStock: Number(body.maxStock || 1000),
        reorderPoint: Number(body.minStock || 0),
        unit: normalizeProductUnit(body.unit),
        outletId,
        isActive: true,
      }], { session });

      const referenceId = product._id as mongoose.Types.ObjectId;
      const referenceNumber = `OPEN-${sku}`;
      const accounting = stockQty > 0
        ? await postInventoryAdjustmentAccounting({
          referenceId,
          referenceNumber,
          productName: product.name,
          sku,
          quantity: stockQty,
          unitCost: cost,
          date: now,
          reason: 'Opening stock on product creation',
          outletId,
          postingKey: `product:${product._id}:opening-stock`,
          isOpening: true,
        }, userId, session!)
        : { voucherId: undefined };
      voucherId = accounting.voucherId;

      let runningBalance = 0;
      for (const [index, entry] of [...accumulator.values()].entries()) {
        const location = await adjustProductLocationStock({
          product,
          outletId,
          locationId: entry.locationId,
          locationName: entry.locationName,
          quantityDelta: entry.quantity,
          userId,
          session,
        });
        runningBalance += entry.quantity;
        await InventoryMovement.create([{
          productId: product._id,
          productName: product.name,
          sku,
          movementType: 'ADJUSTMENT',
          quantity: entry.quantity,
          unit: product.unit,
          unitCost: cost,
          totalValue: entry.quantity * cost,
          referenceType: 'ADJUSTMENT',
          referenceId,
          referenceNumber,
          locationId: location.location._id,
          locationName: location.location.name,
          locationBalanceAfter: location.newQuantity,
          outletId,
          balanceAfter: runningBalance,
          date: now,
          notes: 'Opening stock on product creation',
          createdBy: userId,
          voucherId,
          ledgerEntriesCreated: Boolean(voucherId),
          operationKey: `product:${product._id}:opening:${index}`,
        }], { session });
      }

      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'create',
        module: 'products',
        description: `Created product ${product.name} (${sku}) with opening stock ${stockQty} ${product.unit}`,
        outletId,
        timestamp: now,
      }], { session });
      createdProduct = product;
    });

    const [productWithLocations] = await attachLocationDataToProducts([createdProduct.toObject()], outletId);
    return NextResponse.json({
      product: productWithLocations,
      voucherId,
      inventoryPosted: Boolean(voucherId),
      message: 'Product created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    const status = /required|not found|negative|exists|car make|price|quantit/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
