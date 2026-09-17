import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Product from '@/lib/models/ProductEnhanced';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import {
  ensureProductHasLocationStock,
  transferProductBetweenLocations,
} from '@/lib/services/locationStockService';

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
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const body = await request.json();
    const clientKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim();
    const quantity = Number(body.quantity);
    if (
      !clientKey || clientKey.length > 160
      || !mongoose.Types.ObjectId.isValid(body.productId)
      || !mongoose.Types.ObjectId.isValid(body.fromLocationId)
      || !mongoose.Types.ObjectId.isValid(body.toLocationId)
      || !Number.isFinite(quantity) || quantity <= 0
    ) {
      return NextResponse.json({ error: 'idempotencyKey, product, locations, and a positive quantity are required' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    const operationPrefix = `transfer:${clientKey}`;
    const prior = await InventoryMovement.findOne({ outletId, operationKey: `${operationPrefix}:out` });
    if (prior) return NextResponse.json({ success: true, referenceNumber: prior.referenceNumber, idempotent: true });

    session = await mongoose.startSession();
    let response: any;
    await session.withTransaction(async () => {
      const duplicate = await InventoryMovement.findOne({
        outletId,
        operationKey: `${operationPrefix}:out`,
      }).session(session!);
      if (duplicate) {
        response = { success: true, referenceNumber: duplicate.referenceNumber, idempotent: true };
        return;
      }
      const product = await Product.findOne({ _id: body.productId, outletId, isActive: true }).session(session!);
      if (!product) throw new Error('Product not found');
      await ensureProductHasLocationStock(product, outletId, userId, session!);
      const transfer = await transferProductBetweenLocations({
        outletId,
        product,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        quantity,
        userId,
        session,
      });
      const referenceId = new mongoose.Types.ObjectId();
      const referenceNumber = `TRF-${referenceId.toHexString().slice(-10).toUpperCase()}`;
      const unitCost = Number(product.costPrice || 0);
      const productBalance = Number(product.currentStock || 0);
      const now = new Date();
      await InventoryMovement.create([
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          movementType: 'TRANSFER',
          quantity: -quantity,
          unit: product.unit,
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
          date: now,
          notes: body.notes || `Transfer to ${transfer.toLocation.name}`,
          outletId,
          createdBy: userId,
          ledgerEntriesCreated: false,
          operationKey: `${operationPrefix}:out`,
        },
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          movementType: 'TRANSFER',
          quantity,
          unit: product.unit,
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
          date: now,
          notes: body.notes || `Transfer from ${transfer.fromLocation.name}`,
          outletId,
          createdBy: userId,
          ledgerEntriesCreated: false,
          operationKey: `${operationPrefix}:in`,
        },
      ], { session, ordered: true });
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'create',
        module: 'inventory',
        description: `Transferred ${quantity} ${product.unit} of ${product.name} from ${transfer.fromLocation.name} to ${transfer.toLocation.name}`,
        outletId,
        timestamp: now,
      }], { session });
      response = {
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
      };
    });
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Transfer stock error:', error);
    const status = /required|not found|insufficient|different|greater/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
