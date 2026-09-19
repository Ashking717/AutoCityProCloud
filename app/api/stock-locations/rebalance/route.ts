import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Product from '@/lib/models/ProductEnhanced';
import ProductLocationStock from '@/lib/models/ProductLocationStock';
import StockLocation from '@/lib/models/StockLocation';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import {
  adjustProductLocationStock,
  ensureProductHasLocationStock,
  transferProductBetweenLocations,
} from '@/lib/services/locationStockService';
import { postInventoryAdjustmentAccounting } from '@/lib/services/transactionalAccountingService';
import { hasPermission } from '@/lib/types/roles';

const EPSILON = 0.000001;

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
    const clientKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    if (!clientKey || clientKey.length > 160) {
      return NextResponse.json({ error: 'A valid idempotency key is required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(body.productId)) {
      return NextResponse.json({ error: 'A valid product is required' }, { status: 400 });
    }
    if (!Array.isArray(body.allocations) || body.allocations.length === 0 || body.allocations.length > 100) {
      return NextResponse.json({ error: 'At least one location allocation is required' }, { status: 400 });
    }

    const allocations = body.allocations.map((item: any) => ({
      locationId: String(item?.locationId || ''),
      quantity: Number(item?.quantity),
    }));
    if (allocations.some((item: any) =>
      !mongoose.Types.ObjectId.isValid(item.locationId)
      || !Number.isFinite(item.quantity)
      || item.quantity < 0
    )) {
      return NextResponse.json(
        { error: 'Every allocation needs a valid location and a non-negative quantity' },
        { status: 400 }
      );
    }
    if (new Set(allocations.map((item: any) => item.locationId)).size !== allocations.length) {
      return NextResponse.json({ error: 'Each location can appear only once' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    const productId = new mongoose.Types.ObjectId(body.productId);
    const operationPrefix = `rebalance:${clientKey}`;
    const prior: any = await InventoryMovement.findOne({
      outletId,
      operationKey: { $in: [`${operationPrefix}:0`, `${operationPrefix}:0:out`] },
    }).lean();
    if (prior) {
      return NextResponse.json({
        success: true,
        referenceNumber: prior.referenceNumber,
        idempotent: true,
      });
    }

    session = await mongoose.startSession();
    let response: any;
    await session.withTransaction(async () => {
      const duplicate = await InventoryMovement.findOne({
        outletId,
        operationKey: { $in: [`${operationPrefix}:0`, `${operationPrefix}:0:out`] },
      }).session(session!);
      if (duplicate) {
        response = {
          success: true,
          referenceNumber: duplicate.referenceNumber,
          idempotent: true,
        };
        return;
      }

      const product: any = await Product.findOne({
        _id: productId,
        outletId,
        isActive: true,
      }).session(session!);
      if (!product) throw new Error('Product not found');

      await ensureProductHasLocationStock(product, outletId, userId, session!);

      const locationIds = allocations.map((item: any) => new mongoose.Types.ObjectId(item.locationId));
      const locations: any[] = await StockLocation.find({
        _id: { $in: locationIds },
        outletId,
        isActive: true,
      }).session(session!);
      if (locations.length !== allocations.length) {
        throw new Error('One or more selected locations were not found');
      }

      const expectedTotal = Number(product.currentStock || 0);
      const requestedTotal = allocations.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      );
      const currentStocks: any[] = await ProductLocationStock.find({
        outletId,
        productId,
      }).session(session!);
      const currentTotal = currentStocks.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
      if (Math.abs(currentTotal - expectedTotal) > EPSILON) {
        throw new Error('Location stock is out of sync with product stock; refresh and try again');
      }

      const currentByLocation = new Map<string, number>(
        currentStocks.map((item) => [String(item.locationId), Number(item.quantity || 0)])
      );
      const targetByLocation = new Map<string, number>(
        allocations.map((item: any) => [item.locationId, item.quantity])
      );
      const allLocationIds = new Set<string>([
        ...currentByLocation.keys(),
        ...targetByLocation.keys(),
      ]);
      const surpluses: Array<{ locationId: string; quantity: number }> = [];
      const deficits: Array<{ locationId: string; quantity: number }> = [];

      for (const locationId of allLocationIds) {
        const difference = (targetByLocation.get(locationId) || 0)
          - (currentByLocation.get(locationId) || 0);
        if (difference > EPSILON) deficits.push({ locationId, quantity: difference });
        if (difference < -EPSILON) surpluses.push({ locationId, quantity: -difference });
      }

      const referenceId = new mongoose.Types.ObjectId();
      const referenceNumber = `TRF-${referenceId.toHexString().slice(-10).toUpperCase()}`;
      const now = new Date();
      const unitCost = Number(product.costPrice || 0);
      const productBalance = Number(product.currentStock || 0);
      const movements: any[] = [];
      let surplusIndex = 0;
      let deficitIndex = 0;

      while (surplusIndex < surpluses.length && deficitIndex < deficits.length) {
        const surplus = surpluses[surplusIndex];
        const deficit = deficits[deficitIndex];
        const quantity = Math.min(surplus.quantity, deficit.quantity);
        const transfer = await transferProductBetweenLocations({
          outletId,
          product,
          fromLocationId: surplus.locationId,
          toLocationId: deficit.locationId,
          quantity,
          userId,
          session,
        });

        movements.push(
          {
            productId,
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
            notes: 'Location allocation updated from Edit Product',
            outletId,
            createdBy: userId,
            ledgerEntriesCreated: false,
          },
          {
            productId,
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
            notes: 'Location allocation updated from Edit Product',
            outletId,
            createdBy: userId,
            ledgerEntriesCreated: false,
          }
        );

        surplus.quantity -= quantity;
        deficit.quantity -= quantity;
        if (surplus.quantity <= EPSILON) surplusIndex += 1;
        if (deficit.quantity <= EPSILON) deficitIndex += 1;
      }

      const netAdjustment = requestedTotal - expectedTotal;
      let adjustmentAccounting: any = {};
      if (Math.abs(netAdjustment) > EPSILON) {
        adjustmentAccounting = await postInventoryAdjustmentAccounting({
          referenceId,
          referenceNumber,
          productName: product.name,
          sku: product.sku,
          quantity: netAdjustment,
          unitCost,
          date: now,
          reason: 'Stock quantity updated from Edit Product',
          outletId,
          postingKey: `inventory:${operationPrefix}:gl`,
        }, userId, session!);
      }

      let runningBalance = productBalance;
      for (const deficit of deficits.slice(deficitIndex)) {
        if (deficit.quantity <= EPSILON) continue;
        const result = await adjustProductLocationStock({
          outletId,
          product,
          locationId: deficit.locationId,
          quantityDelta: deficit.quantity,
          userId,
          session,
        });
        runningBalance += deficit.quantity;
        movements.push({
          productId,
          productName: product.name,
          sku: product.sku,
          movementType: 'ADJUSTMENT',
          quantity: deficit.quantity,
          unit: product.unit,
          unitCost,
          totalValue: deficit.quantity * unitCost,
          referenceType: 'ADJUSTMENT',
          referenceId,
          referenceNumber,
          locationId: result.location._id,
          locationName: result.location.name,
          locationBalanceAfter: result.newQuantity,
          balanceAfter: runningBalance,
          date: now,
          notes: 'Stock quantity increased from Edit Product',
          outletId,
          createdBy: userId,
          voucherId: adjustmentAccounting.voucherId,
          ledgerEntriesCreated: Boolean(adjustmentAccounting.voucherId),
        });
      }
      for (const surplus of surpluses.slice(surplusIndex)) {
        if (surplus.quantity <= EPSILON) continue;
        const result = await adjustProductLocationStock({
          outletId,
          product,
          locationId: surplus.locationId,
          quantityDelta: -surplus.quantity,
          userId,
          session,
        });
        runningBalance -= surplus.quantity;
        movements.push({
          productId,
          productName: product.name,
          sku: product.sku,
          movementType: 'ADJUSTMENT',
          quantity: -surplus.quantity,
          unit: product.unit,
          unitCost,
          totalValue: -(surplus.quantity * unitCost),
          referenceType: 'ADJUSTMENT',
          referenceId,
          referenceNumber,
          locationId: result.location._id,
          locationName: result.location.name,
          locationBalanceAfter: result.newQuantity,
          balanceAfter: runningBalance,
          date: now,
          notes: 'Stock quantity decreased from Edit Product',
          outletId,
          createdBy: userId,
          voucherId: adjustmentAccounting.voucherId,
          ledgerEntriesCreated: Boolean(adjustmentAccounting.voucherId),
        });
      }

      if (Math.abs(runningBalance - requestedTotal) > EPSILON) {
        throw new Error('Could not apply the requested location quantities');
      }

      if (movements.length > 0) {
        movements.forEach((movement, index) => {
          movement.operationKey = `${operationPrefix}:${index}`;
        });
        await InventoryMovement.create(movements, { session, ordered: true });
      }

      const primaryAllocation = allocations.find((item: any) => item.quantity > EPSILON)
        || allocations[0];
      const primaryLocation = locations.find(
        (location) => String(location._id) === primaryAllocation.locationId
      );
      product.location = primaryLocation?.name || product.location;
      product.currentStock = requestedTotal;
      await product.save({ session });

      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'update',
        module: 'inventory',
        description: `Updated location allocation for ${product.name} (${product.sku}); stock ${expectedTotal} → ${requestedTotal}`,
        outletId,
        timestamp: now,
      }], { session });

      response = {
        success: true,
        changed: movements.length > 0,
        referenceNumber: movements.length > 0 ? referenceNumber : undefined,
        totalStock: requestedTotal,
      };
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Rebalance location stock error:', error);
    const status = /required|valid|not found|only once|non-negative|must equal|out of sync|balance/i.test(
      error.message
    ) ? 400 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to update location allocation' },
      { status }
    );
  } finally {
    if (session) await session.endSession();
  }
}
