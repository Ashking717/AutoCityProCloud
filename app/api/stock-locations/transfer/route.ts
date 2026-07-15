import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';

import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';
import InventoryMovement from '@/lib/models/InventoryMovement';
import ActivityLog from '@/lib/models/ActivityLog';
import { transferProductBetweenLocations } from '@/lib/services/locationStockService';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user.outletId) {
      return NextResponse.json({ error: 'Invalid token: outletId missing' }, { status: 401 });
    }
    const userId = new mongoose.Types.ObjectId(user.userId);
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const body = await request.json();

    const productId = body.productId;
    const fromLocationId = body.fromLocationId;
    const toLocationId = body.toLocationId;
    const quantity = Number(body.quantity);
    const notes = String(body.notes || '').trim();

    if (!productId || !fromLocationId || !toLocationId || !quantity) {
      return NextResponse.json(
        { error: 'Product, from location, to location, and quantity are required' },
        { status: 400 }
      );
    }

    const product = await Product.findOne({
      _id: productId,
      outletId,
      isActive: true,
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const transfer = await transferProductBetweenLocations({
      outletId,
      product,
      fromLocationId,
      toLocationId,
      quantity,
      userId,
    });

    const referenceId = new mongoose.Types.ObjectId();
    const referenceNumber = `TRF-${Date.now()}`;
    const unitCost = Number(product.costPrice || 0);
    const productBalance = Number(product.currentStock || 0);

    await InventoryMovement.create([
      {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        movementType: 'TRANSFER',
        quantity: -quantity,
        unitCost,
        totalValue: -(quantity * unitCost),
        referenceType: 'TRANSFER',
        referenceId,
        referenceNumber,
        locationId: transfer.fromLocation._id,
        locationName: transfer.fromLocation.name,
        fromLocationId: transfer.fromLocation._id,
        fromLocationName: transfer.fromLocation.name,
        toLocationId: transfer.toLocation._id,
        toLocationName: transfer.toLocation.name,
        locationBalanceAfter: transfer.fromBalanceAfter,
        balanceAfter: productBalance - quantity,
        date: new Date(),
        notes: notes || `Transfer to ${transfer.toLocation.name}`,
        outletId,
        createdBy: userId,
        ledgerEntriesCreated: true,
      },
      {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        movementType: 'TRANSFER',
        quantity,
        unitCost,
        totalValue: quantity * unitCost,
        referenceType: 'TRANSFER',
        referenceId,
        referenceNumber,
        locationId: transfer.toLocation._id,
        locationName: transfer.toLocation.name,
        fromLocationId: transfer.fromLocation._id,
        fromLocationName: transfer.fromLocation.name,
        toLocationId: transfer.toLocation._id,
        toLocationName: transfer.toLocation.name,
        locationBalanceAfter: transfer.toBalanceAfter,
        balanceAfter: productBalance,
        date: new Date(),
        notes: notes || `Transfer from ${transfer.fromLocation.name}`,
        outletId,
        createdBy: userId,
        ledgerEntriesCreated: true,
      },
    ]);

    await ActivityLog.create({
      userId,
      username: user.email,
      actionType: 'create',
      module: 'inventory',
      description: `Transferred ${quantity} ${product.unit || 'pcs'} of ${product.name} from ${transfer.fromLocation.name} to ${transfer.toLocation.name}`,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      referenceNumber,
      transfer: {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        fromLocation: transfer.fromLocation,
        toLocation: transfer.toLocation,
        fromBalanceAfter: transfer.fromBalanceAfter,
        toBalanceAfter: transfer.toBalanceAfter,
      },
    });
  } catch (error: any) {
    console.error('Transfer stock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
