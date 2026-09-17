import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/ProductEnhanced';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { attachLocationDataToProducts } from '@/lib/services/locationStockService';
import { hasPermission } from '@/lib/types/roles';
import { sanitizeBarcodeValue } from '@/lib/utils/barcode';
import { normalizeProductUnit } from '@/lib/utils/productUnit';

function getAuthUser(permission?: 'canManageInventory') {
  const token = cookies().get('auth-token')?.value;
  if (!token) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const user = verifyToken(token);
  if (permission && !hasPermission(user.role, permission)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
    return { response: NextResponse.json({ error: 'Outlet is required' }, { status: 400 }) };
  }
  return { user };
}

function invalidProductId(id: string) {
  return !mongoose.Types.ObjectId.isValid(id);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const auth = getAuthUser();
    if (auth.response) return auth.response;
    if (invalidProductId(params.id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    const product = await Product.findOne({
      _id: params.id,
      outletId: auth.user!.outletId,
    }).populate('category', 'name').lean();
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const [productWithLocations] = await attachLocationDataToProducts(
      [product],
      auth.user!.outletId
    );
    return NextResponse.json({ product: productWithLocations });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const auth = getAuthUser('canManageInventory');
    if (auth.response) return auth.response;
    const user = auth.user!;
    if (invalidProductId(params.id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    const product = await Product.findOne({ _id: params.id, outletId: user.outletId });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (Number(product.currentStock || 0) > 0) {
      return NextResponse.json(
        { error: 'Product still has stock; record an audited stock adjustment before deactivating it' },
        { status: 409 }
      );
    }
    if (!product.isActive) return NextResponse.json({ message: 'Product is already inactive', product });
    product.isActive = false;
    await product.save();
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'products',
      description: `Deactivated product: ${product.name} (${product.sku})`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    return NextResponse.json({ message: 'Product deactivated successfully', product });
  } catch (error: any) {
    console.error('Error deactivating product:', error);
    return NextResponse.json({ error: 'Failed to deactivate product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const auth = getAuthUser('canManageInventory');
    if (auth.response) return auth.response;
    const user = auth.user!;
    if (invalidProductId(params.id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    const body = await request.json();
    const product: any = await Product.findOne({ _id: params.id, outletId: user.outletId });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const requestedStock = body.stock?.currentStock ?? body.currentStock;
    if (requestedStock !== undefined && Number(requestedStock) !== Number(product.currentStock)) {
      return NextResponse.json(
        { error: 'Stock cannot be edited on the product form; use Stock Adjustment' },
        { status: 400 }
      );
    }
    if (
      body.replaceLocationSplits
      || body.moveSingleLocationStock
      || body.locationSplits
      || body.locationId
      || body.locationName
      || body.location
    ) {
      return NextResponse.json(
        { error: 'Location quantities must be changed through Stock Transfer or Stock Adjustment' },
        { status: 400 }
      );
    }
    // Legacy products may contain aliases such as "piece"/"pieces", or may
    // predate the unit field entirely. Compare canonical meanings rather than
    // the raw stored value so an unrelated metadata edit is not rejected.
    const existingUnit = normalizeProductUnit(product.unit);
    const requestedUnit = body.unit === undefined
      ? existingUnit
      : normalizeProductUnit(body.unit);
    if (requestedUnit !== existingUnit) {
      return NextResponse.json(
        { error: 'Product unit is immutable after creation; create a new product for a different unit' },
        { status: 400 }
      );
    }
    // Normalize only this edited product on write. This does not alter its
    // stock, valuation, movements, or historical sale/purchase line units.
    product.unit = existingUnit;

    const candidateCategory = body.categoryId
      || (typeof body.category === 'string' ? body.category : undefined);
    if (candidateCategory !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(candidateCategory)) {
        return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
      }
      const category = await Category.findOne({
        _id: candidateCategory,
        outletId: user.outletId,
        isActive: true,
      });
      if (!category) return NextResponse.json({ error: 'Active category not found in this outlet' }, { status: 400 });
      product.category = category._id;
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
      product.name = name;
    }
    if (body.description !== undefined) product.description = String(body.description);
    if (body.sku !== undefined) {
      const sku = String(body.sku).trim().toUpperCase();
      if (!sku) return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
      const duplicate = await Product.exists({ _id: { $ne: product._id }, outletId: user.outletId, sku });
      if (duplicate) return NextResponse.json({ error: 'Product with this SKU already exists' }, { status: 400 });
      product.sku = sku;
    }
    if (body.barcode !== undefined) {
      const barcode = sanitizeBarcodeValue(body.barcode);
      if (barcode && await Product.exists({ _id: { $ne: product._id }, outletId: user.outletId, barcode })) {
        return NextResponse.json({ error: 'Product with this barcode already exists' }, { status: 400 });
      }
      product.barcode = barcode;
    }
    if (body.partNumber !== undefined) product.partNumber = String(body.partNumber || '').trim().toUpperCase();

    const costInput = body.pricing?.costPrice ?? body.costPrice;
    if (costInput !== undefined) {
      const cost = Number(costInput);
      if (!Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: 'Invalid cost price' }, { status: 400 });
      if (Number(product.currentStock || 0) > 0 && cost !== Number(product.costPrice)) {
        return NextResponse.json(
          { error: 'Cost cannot be edited while stock exists; record a purchase or valuation adjustment' },
          { status: 400 }
        );
      }
      product.costPrice = cost;
    }
    const sellingInput = body.pricing?.sellingPrice ?? body.sellingPrice;
    if (sellingInput !== undefined) {
      const sellingPrice = Number(sellingInput);
      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) return NextResponse.json({ error: 'Invalid selling price' }, { status: 400 });
      product.sellingPrice = sellingPrice;
    }
    const taxInput = body.pricing?.taxRate ?? body.taxRate;
    if (taxInput !== undefined) {
      const taxRate = Number(taxInput);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        return NextResponse.json({ error: 'Tax rate must be between 0 and 100' }, { status: 400 });
      }
      product.taxRate = taxRate;
    }

    const minInput = body.stock?.minStock ?? body.minStock;
    const maxInput = body.stock?.maxStock ?? body.maxStock;
    if (minInput !== undefined) {
      const minStock = Number(minInput);
      if (!Number.isFinite(minStock) || minStock < 0) return NextResponse.json({ error: 'Invalid minimum stock' }, { status: 400 });
      product.minStock = minStock;
      product.reorderPoint = minStock;
    }
    if (maxInput !== undefined) {
      const maxStock = Number(maxInput);
      if (!Number.isFinite(maxStock) || maxStock < 0) return NextResponse.json({ error: 'Invalid maximum stock' }, { status: 400 });
      product.maxStock = maxStock;
    }
    if (Number(product.maxStock) < Number(product.minStock)) {
      return NextResponse.json({ error: 'Maximum stock cannot be below minimum stock' }, { status: 400 });
    }

    if (body.isVehicle === false) {
      product.isVehicle = false;
      product.carMake = '';
      product.carModel = '';
      product.variant = '';
      product.yearFrom = null;
      product.yearTo = null;
      product.color = '';
      product.vin = undefined;
    } else {
      if (body.isVehicle !== undefined) product.isVehicle = body.isVehicle === true;
      if (body.carMake !== undefined || body.make !== undefined) product.carMake = body.carMake || body.make || '';
      if (body.carModel !== undefined) product.carModel = String(body.carModel || '');
      if (body.variant !== undefined) product.variant = String(body.variant || '');
      if (body.color !== undefined) product.color = String(body.color || '');
      if (body.vin !== undefined) product.vin = String(body.vin || '').trim().toUpperCase() || undefined;
      if (body.yearFrom !== undefined) product.yearFrom = body.yearFrom ? Number(body.yearFrom) : null;
      if (body.yearTo !== undefined) product.yearTo = body.yearTo ? Number(body.yearTo) : null;
      if (product.isVehicle && !String(product.carMake || '').trim()) {
        return NextResponse.json({ error: 'Car make is required for vehicle products' }, { status: 400 });
      }
    }

    await product.save();
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'products',
      description: `Updated product metadata: ${product.name} (${product.sku})`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    const [productWithLocations] = await attachLocationDataToProducts(
      [product.toObject()],
      user.outletId
    );
    return NextResponse.json({ product: productWithLocations, message: 'Product updated successfully' });
  } catch (error: any) {
    console.error('Error updating product:', error);
    const status = /invalid|required|already exists|cannot|immutable|category|maximum/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status });
  }
}
