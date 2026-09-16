import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import InventoryMovement, { MovementType } from '@/lib/models/InventoryMovement';
import Product from '@/lib/models/ProductEnhanced';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import {
  applyProductLocationStockDelta,
  ensureProductHasLocationStock,
} from '@/lib/services/locationStockService';
import { postInventoryAdjustmentAccounting } from '@/lib/services/transactionalAccountingService';
import { hasPermission } from '@/lib/types/roles';

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const productId = new mongoose.Types.ObjectId(params.id);
    const product: any = await Product.findOne({ _id: productId, outletId })
      .populate('category', 'name');
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const startDate = parseDate(searchParams.get('startDate'));
    const endDate = parseDate(searchParams.get('endDate'), true);
    if (startDate === null || endDate === null || (startDate && endDate && startDate > endDate)) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    const movementType = searchParams.get('type');
    const referenceType = searchParams.get('referenceType');
    const query: any = { outletId, productId };
    if (startDate || endDate) {
      query.date = {
        ...(startDate ? { $gte: startDate } : {}),
        ...(endDate ? { $lte: endDate } : {}),
      };
    }
    if (movementType && Object.values(MovementType).includes(movementType as MovementType)) {
      query.movementType = movementType;
    }
    if (referenceType && ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'].includes(referenceType)) {
      query.referenceType = referenceType;
    }
    const referenceNumber = searchParams.get('referenceNumber');
    if (referenceNumber) query.referenceNumber = { $regex: referenceNumber, $options: 'i' };

    const [movements, totalCount, summaryRows, typeDistribution, stockRows] = await Promise.all([
      InventoryMovement.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(query),
      InventoryMovement.aggregate([
        { $match: query },
        { $group: {
          _id: null,
          totalMovements: { $sum: 1 },
          totalInQuantity: { $sum: { $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0] } },
          totalOutQuantity: { $sum: { $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0] } },
          netQuantityChange: { $sum: '$quantity' },
          totalInValue: { $sum: { $cond: [{ $gt: ['$totalValue', 0] }, '$totalValue', 0] } },
          totalOutValue: { $sum: { $cond: [{ $lt: ['$totalValue', 0] }, { $abs: '$totalValue' }, 0] } },
          avgUnitCost: { $avg: '$unitCost' },
          maxUnitCost: { $max: '$unitCost' },
          minUnitCost: { $min: '$unitCost' },
        } },
      ]),
      InventoryMovement.aggregate([
        { $match: query },
        { $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' },
          avgUnitCost: { $avg: '$unitCost' },
        } },
        { $sort: { count: -1 } },
      ]),
      InventoryMovement.aggregate([
        { $match: { outletId, productId } },
        { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
      ]),
    ]);

    const summary: any = summaryRows[0] || {
      totalMovements: 0,
      totalInQuantity: 0,
      totalOutQuantity: 0,
      netQuantityChange: 0,
      totalInValue: 0,
      totalOutValue: 0,
      avgUnitCost: 0,
      maxUnitCost: 0,
      minUnitCost: 0,
    };
    const calculatedStock = Number(stockRows[0]?.totalQuantity || 0);
    const totalPages = Math.ceil(totalCount / limit);
    return NextResponse.json({
      history: (movements as any[]).map((movement) => ({
        _id: movement._id,
        type: movement.quantity > 0 ? 'in' : 'out',
        quantity: Math.abs(Number(movement.quantity)),
        previousStock: Number(movement.balanceAfter) - Number(movement.quantity),
        newStock: movement.balanceAfter,
        unitCost: movement.unitCost,
        totalValue: Math.abs(Number(movement.totalValue || 0)),
        reference: movement.referenceNumber,
        referenceType: movement.referenceType,
        locationName: movement.locationName,
        fromLocationName: movement.fromLocationName,
        toLocationName: movement.toLocationName,
        locationBalanceAfter: movement.locationBalanceAfter,
        reason: movement.notes,
        performedBy: movement.createdBy
          ? `${movement.createdBy.firstName || ''} ${movement.createdBy.lastName || ''}`.trim() || movement.createdBy.email
          : 'System',
        timestamp: movement.date,
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: {
        ...summary,
        stockAccuracy: Math.abs(Number(product.currentStock) - calculatedStock) < 0.01 ? 'ACCURATE' : 'MISMATCH',
        calculatedStock,
        currentStock: product.currentStock,
      },
      typeDistribution: typeDistribution.map((row: any) => ({
        type: row._id,
        count: row.count,
        totalQuantity: row.totalQuantity,
        totalValue: row.totalValue,
        avgUnitCost: row.avgUnitCost,
      })),
      monthlyTrend: [],
      productInfo: {
        name: product.name,
        sku: product.sku,
        currentStock: product.currentStock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        stockStatus: product.currentStock <= product.minStock
          ? 'LOW'
          : product.currentStock >= product.maxStock * 0.9 ? 'HIGH' : 'NORMAL',
        unit: product.unit,
        category: product.category?.name || 'Uncategorized',
        reorderPoint: product.minStock,
        safetyStock: Math.max(0, product.minStock - product.currentStock),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock history:', error);
    return NextResponse.json({ error: 'Failed to fetch stock history' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }
    const body = await request.json();
    const clientKey = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim();
    const quantity = Number(body.quantity);
    if (!clientKey || clientKey.length > 160 || !['in', 'out'].includes(body.type)) {
      return NextResponse.json({ error: 'idempotencyKey and an in/out adjustment type are required' }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || !String(body.reason || '').trim()) {
      return NextResponse.json({ error: 'A positive quantity and reason are required' }, { status: 400 });
    }
    const date = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid adjustment date' }, { status: 400 });

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const productId = new mongoose.Types.ObjectId(params.id);
    const userId = new mongoose.Types.ObjectId(user.userId);
    const operationKey = `adjustment:${clientKey}`;
    const existing = await InventoryMovement.findOne({ outletId, operationKey });
    if (existing) return NextResponse.json({ success: true, movement: existing, idempotent: true });

    session = await mongoose.startSession();
    let response: any;
    await session.withTransaction(async () => {
      const duplicate = await InventoryMovement.findOne({ outletId, operationKey }).session(session!);
      if (duplicate) {
        response = { success: true, movement: duplicate, idempotent: true };
        return;
      }
      const signedQuantity = body.type === 'out' ? -quantity : quantity;
      const product: any = await Product.findOne({
        _id: productId,
        outletId,
        isActive: true,
      }).session(session!);
      if (!product) throw new Error('Product not found');
      if (signedQuantity < 0 && Number(product.currentStock || 0) + 0.000001 < quantity) {
        throw new Error('Insufficient stock');
      }
      await ensureProductHasLocationStock(product, outletId, userId, session!);
      product.currentStock = Number(product.currentStock || 0) + signedQuantity;
      await product.save({ session });
      const locationResults = await applyProductLocationStockDelta({
        outletId,
        product,
        quantityDelta: signedQuantity,
        locationId: body.locationId,
        locationName: body.locationName,
        userId,
        session,
      });
      const referenceId = new mongoose.Types.ObjectId();
      const referenceNumber = `ADJ-${referenceId.toHexString().slice(-10).toUpperCase()}`;
      const accounting = await postInventoryAdjustmentAccounting({
        referenceId,
        referenceNumber,
        productName: product.name,
        sku: product.sku,
        quantity: signedQuantity,
        unitCost: Number(product.costPrice || 0),
        date,
        reason: String(body.reason).trim(),
        outletId,
        postingKey: `inventory:${operationKey}:gl`,
      }, userId, session!);

      let runningBalance = Number(product.currentStock) - signedQuantity;
      const movements: any[] = [];
      for (const [index, locationResult] of locationResults.entries()) {
        const locationQuantity = Number(locationResult.newQuantity) - Number(locationResult.previousQuantity);
        runningBalance += locationQuantity;
        const [movement] = await InventoryMovement.create([{
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          movementType: MovementType.ADJUSTMENT,
          quantity: locationQuantity,
          unit: product.unit,
          unitCost: Number(product.costPrice || 0),
          totalValue: locationQuantity * Number(product.costPrice || 0),
          referenceType: 'ADJUSTMENT',
          referenceId,
          referenceNumber,
          locationId: locationResult.location._id,
          locationName: locationResult.location.name,
          locationBalanceAfter: locationResult.newQuantity,
          balanceAfter: runningBalance,
          date,
          notes: String(body.reason).trim(),
          outletId,
          createdBy: userId,
          voucherId: accounting.voucherId,
          ledgerEntriesCreated: Boolean(accounting.voucherId),
          operationKey: index === 0 ? operationKey : `${operationKey}:${index}`,
        }], { session });
        movements.push(movement);
      }
      if (Math.abs(runningBalance - Number(product.currentStock)) > 0.000001) {
        throw new Error('Location movement allocation does not match product stock');
      }
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'adjustment',
        module: 'inventory',
        description: `Adjusted ${product.name} by ${signedQuantity} ${product.unit}: ${String(body.reason).trim()}`,
        outletId,
        timestamp: date,
      }], { session });
      response = {
        success: true,
        message: 'Stock adjusted successfully',
        movement: movements[0],
        movements,
        product: { name: product.name, sku: product.sku, newStock: product.currentStock },
      };
    });
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error creating stock adjustment:', error);
    const status = /required|not found|insufficient|positive|invalid|match/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to adjust stock' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
