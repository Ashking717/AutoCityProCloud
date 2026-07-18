import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import ActivityLog from '@/lib/models/ActivityLog';
import Product from '@/lib/models/ProductEnhanced';
import {
  getInternalBarcodeFromSku,
  sanitizeBarcodeValue,
} from '@/lib/utils/barcode';

async function getUniqueBarcode(
  outletId: mongoose.Types.ObjectId | string,
  productId: string,
  preferredValue: string
) {
  const base = sanitizeBarcodeValue(preferredValue);

  if (!base) {
    throw new Error('Product SKU is required to generate a barcode');
  }

  let candidate = base;
  let suffix = 2;

  while (
    await Product.exists({
      outletId,
      barcode: candidate,
      _id: { $ne: productId },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user.outletId) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }

    const product = await Product.findOne({
      _id: params.id,
      outletId: user.outletId,
      isActive: true,
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const force = Boolean(body?.force);
    const existingBarcode = sanitizeBarcodeValue(product.barcode);

    if (existingBarcode && !force) {
      return NextResponse.json({
        barcode: existingBarcode,
        product,
        message: 'Product already has a barcode',
      });
    }

    const preferredBarcode = sanitizeBarcodeValue(body?.barcode) || getInternalBarcodeFromSku(product.sku);
    const barcode = await getUniqueBarcode(user.outletId, params.id, preferredBarcode);

    product.barcode = barcode;
    await product.save();

    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'products',
      description: `Generated barcode for ${product.name} (${product.sku}): ${barcode}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      barcode,
      product,
      message: 'Barcode generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating product barcode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate barcode' },
      { status: 500 }
    );
  }
}
