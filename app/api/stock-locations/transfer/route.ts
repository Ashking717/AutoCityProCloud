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
    const isBatch = Array.isArray(body.items);
    const items = (isBatch ? body.items : [{ productId: body.productId, quantity: body.quantity }]).map(
      (item: any) => ({ productId: String(item?.productId || ''), quantity: Number(item?.quantity) })
    );
    if (
      !clientKey || clientKey.length > 160
      || !mongoose.Types.ObjectId.isValid(body.fromLocationId)
      || !mongoose.Types.ObjectId.isValid(body.toLocationId)
      || String(body.fromLocationId) === String(body.toLocationId)
      || items.length === 0 || items.length > 100
      || items.some((item: any) =>
        !mongoose.Types.ObjectId.isValid(item.productId)
        || !Number.isFinite(item.quantity)
        || item.quantity <= 0
      )
      || new Set(items.map((item: any) => item.productId)).size !== items.length
    ) {
      return NextResponse.json({
        error: 'idempotencyKey, different locations, and 1-100 unique products with positive quantities are required',
      }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    const operationPrefix = `transfer:${clientKey}`;
    const firstOperationKey = isBatch ? `${operationPrefix}:0:out` : `${operationPrefix}:out`;
    const prior = await InventoryMovement.findOne({ outletId, operationKey: firstOperationKey });
    if (prior) return NextResponse.json({ success: true, referenceNumber: prior.referenceNumber, idempotent: true });

    session = await mongoose.startSession();
    let response: any;
    await session.withTransaction(async () => {
      const duplicate = await InventoryMovement.findOne({
        outletId,
        operationKey: firstOperationKey,
      }).session(session!);
      if (duplicate) {
        response = { success: true, referenceNumber: duplicate.referenceNumber, idempotent: true };
        return;
      }
      const referenceId = new mongoose.Types.ObjectId();
      const referenceNumber = `TRF-${referenceId.toHexString().slice(-10).toUpperCase()}`;
      const now = new Date();
      const transfers: any[] = [];

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const product = await Product.findOne({ _id: item.productId, outletId, isActive: true }).session(session!);
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        await ensureProductHasLocationStock(product, outletId, userId, session!);
        const transfer = await transferProductBetweenLocations({
          outletId,
          product,
          fromLocationId: body.fromLocationId,
          toLocationId: body.toLocationId,
          quantity: item.quantity,
          userId,
          session,
        });
        const unitCost = Number(product.costPrice || 0);
        const productBalance = Number(product.currentStock || 0);
        const itemOperationPrefix = isBatch ? `${operationPrefix}:${index}` : operationPrefix;

        await InventoryMovement.create([
          {
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            movementType: 'TRANSFER',
            quantity: -item.quantity,
            unit: product.unit,
            unitCost,
            totalValue: -(item.quantity * unitCost),
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
            balanceAfter: productBalance - item.quantity,
            date: now,
            notes: body.notes || `Transfer to ${transfer.toLocation.name}`,
            outletId,
            createdBy: userId,
            ledgerEntriesCreated: false,
            operationKey: `${itemOperationPrefix}:out`,
          },
          {
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            movementType: 'TRANSFER',
            quantity: item.quantity,
            unit: product.unit,
            unitCost,
            totalValue: item.quantity * unitCost,
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
            operationKey: `${itemOperationPrefix}:in`,
          },
        ], { session, ordered: true });

        transfers.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          fromLocation: transfer.fromLocation,
          toLocation: transfer.toLocation,
          fromBalanceAfter: transfer.fromBalanceAfter,
          toBalanceAfter: transfer.toBalanceAfter,
        });
      }

      const firstTransfer = transfers[0];
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'create',
        module: 'inventory',
        description: transfers.length === 1
          ? `Transferred ${firstTransfer.quantity} of ${firstTransfer.productName} from ${firstTransfer.fromLocation.name} to ${firstTransfer.toLocation.name}`
          : `Transferred ${transfers.length} products from ${firstTransfer.fromLocation.name} to ${firstTransfer.toLocation.name} (${referenceNumber})`,
        outletId,
        timestamp: now,
      }], { session });
      response = {
        success: true,
        referenceNumber,
        transfer: firstTransfer,
        transfers,
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
