import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import ActivityLog from '@/lib/models/ActivityLog';
import Product from '@/lib/models/ProductEnhanced';
import {
  generateInternalBarcodeCandidate,
  sanitizeBarcodeValue,
} from '@/lib/utils/barcode';

async function getUniqueBarcodeCandidate(
  outletId: mongoose.Types.ObjectId | string,
  productId: string,
  sku: string,
  preferredValue?: string
) {
  const sanitizedSku = sanitizeBarcodeValue(sku);
  const base = sanitizeBarcodeValue(preferredValue);

  if (base) {
    const exists = await Product.exists({
      outletId,
      barcode: base,
      _id: { $ne: productId },
    });

    if (exists) {
      throw new Error('Product with this barcode already exists');
    }

    if (base === sanitizedSku) {
      throw new Error('Barcode must be different from SKU');
    }

    return base;
  }

  let candidate = generateInternalBarcodeCandidate();

  while (
    candidate === sanitizedSku ||
    (await Product.exists({
      outletId,
      barcode: candidate,
      _id: { $ne: productId },
    }))
  ) {
    candidate = generateInternalBarcodeCandidate();
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
    const existingBarcodeMatchesSku = existingBarcode === sanitizeBarcodeValue(product.sku);

    if (existingBarcode && !existingBarcodeMatchesSku && !force) {
      return NextResponse.json({
        barcode: existingBarcode,
        product,
        message: 'Product already has a barcode',
      });
    }

    const barcode = await getUniqueBarcodeCandidate(
      user.outletId,
      params.id,
      product.sku,
      body?.barcode
    );

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
