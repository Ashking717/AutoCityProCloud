import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Outlet from '@/lib/models/Outlet';
import Product from '@/lib/models/ProductEnhanced';
import Purchase from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import User from '@/lib/models/User';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import {
  adjustProductLocationStock,
  ensureProductHasLocationStock,
  getOrCreateStockLocation,
} from '@/lib/services/locationStockService';
import { postPurchaseAccounting } from '@/lib/services/transactionalAccountingService';

function round(value: number) {
  return Number(value.toFixed(2));
}

function nextPurchaseNumber(date = new Date()) {
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8).toUpperCase();
  return `PUR-${yearMonth}-${suffix}`;
}

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });

    const body = await request.json();
    const operationKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    if (!operationKey || operationKey.length > 160) {
      return NextResponse.json({ error: 'A valid idempotencyKey is required' }, { status: 400 });
    }
    if (!body.supplierId || !Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json({ error: 'Supplier and at least one item are required' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    const existing = await Purchase.findOne({ outletId, operationKey });
    if (existing) return NextResponse.json({ success: true, purchase: existing, idempotent: true });

    session = await mongoose.startSession();
    let createdPurchase: any;
    let costUpdates: any[] = [];
    await session.withTransaction(async () => {
      const duplicate = await Purchase.findOne({ outletId, operationKey }).session(session!);
      if (duplicate) {
        createdPurchase = duplicate;
        return;
      }
      const [outlet, supplier] = await Promise.all([
        Outlet.findById(outletId).session(session!),
        Supplier.findOne({ _id: body.supplierId, outletId, isActive: true }).session(session!),
      ]);
      if (!outlet) throw new Error('Outlet not found');
      if (!supplier) throw new Error('Active supplier not found in this outlet');

      const items: any[] = [];
      const seen = new Set<string>();
      let subtotal = 0;
      let totalTax = 0;
      for (const input of body.items) {
        const product = await Product.findOne({
          _id: input.productId,
          outletId,
          isActive: true,
        }).session(session!);
        if (!product) throw new Error(`Active product not found in this outlet: ${input.productId}`);
        if (input.unit && input.unit !== product.unit) {
          throw new Error(`Unit mismatch for ${product.name}; expected ${product.unit}`);
        }
        const quantity = Number(input.quantity);
        const unitPrice = Number(input.unitPrice);
        const taxRate = Number(input.taxRate || 0);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid quantity or price for ${product.name}`);
        }
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
          throw new Error(`Invalid tax rate for ${product.name}`);
        }
        const location = await getOrCreateStockLocation({
          outletId,
          locationId: input.locationId,
          name: input.locationName || input.location,
          createdBy: userId,
          session,
        });
        const lineKey = String(product._id);
        if (seen.has(lineKey)) throw new Error(`Duplicate product line: ${product.name}`);
        seen.add(lineKey);
        const itemSubtotal = round(quantity * unitPrice);
        const taxAmount = round(itemSubtotal * taxRate / 100);
        subtotal = round(subtotal + itemSubtotal);
        totalTax = round(totalTax + taxAmount);
        items.push({
          product,
          productId: product._id,
          name: product.name,
          sku: product.sku,
          locationId: location._id,
          locationName: location.name,
          quantity,
          unit: product.unit,
          unitPrice,
          taxRate,
          taxAmount,
          total: round(itemSubtotal + taxAmount),
        });
      }

      const grandTotal = round(subtotal + totalTax);
      const amountPaid = round(Number(body.amountPaid || 0));
      const paymentMethod = String(body.paymentMethod || 'CREDIT').toUpperCase();
      if (!['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'].includes(paymentMethod)) {
        throw new Error('Invalid payment method');
      }
      if (amountPaid < 0 || amountPaid > grandTotal + 0.01) throw new Error('Invalid purchase amount paid');
      if (paymentMethod === 'CREDIT' && amountPaid > 0) {
        throw new Error('A credit purchase cannot contain an immediate payment');
      }
      const balanceDue = round(grandTotal - amountPaid);
      const purchaseDate = new Date();
      const [purchase] = await Purchase.create([{
        purchaseNumber: nextPurchaseNumber(purchaseDate),
        operationKey,
        outletId,
        supplierId: supplier._id,
        supplierName: supplier.name,
        items: items.map(({ product, ...item }) => item),
        subtotal,
        totalTax,
        grandTotal,
        paymentMethod,
        amountPaid,
        balanceDue,
        status: balanceDue <= 0.01 ? 'PAID' : 'COMPLETED',
        notes: body.notes,
        createdBy: userId,
        purchaseDate,
        isPostedToGL: false,
      }], { session });

      const accounting = await postPurchaseAccounting(purchase, userId, session!);
      costUpdates = [];
      for (const item of items) {
        await ensureProductHasLocationStock(item.product, outletId, userId, session!);
        const oldStock = Number(item.product.currentStock || 0);
        const oldCost = Number(item.product.costPrice || 0);
        const newStock = round(oldStock + item.quantity);
        const newCost = newStock > 0
          ? round((oldStock * oldCost + item.quantity * item.unitPrice) / newStock)
          : oldCost;
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, outletId, currentStock: oldStock, costPrice: oldCost },
          { $set: { costPrice: newCost }, $inc: { currentStock: item.quantity } },
          { new: true, session }
        );
        if (!product) throw new Error(`Concurrent stock update detected for ${item.name}; retry purchase`);
        const location = await adjustProductLocationStock({
          product,
          outletId,
          locationId: item.locationId,
          locationName: item.locationName,
          quantityDelta: item.quantity,
          userId,
          session,
        });
        await InventoryMovement.create([{
          productId: product._id,
          productName: item.name,
          sku: item.sku,
          movementType: 'PURCHASE',
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitPrice,
          totalValue: round(item.quantity * item.unitPrice),
          referenceType: 'PURCHASE',
          referenceId: purchase._id,
          referenceNumber: purchase.purchaseNumber,
          locationId: location.location._id,
          locationName: location.location.name,
          locationBalanceAfter: location.newQuantity,
          outletId,
          balanceAfter: product.currentStock,
          date: purchaseDate,
          createdBy: userId,
          voucherId: accounting.voucherId,
          ledgerEntriesCreated: true,
          operationKey: `purchase:${purchase._id}:stock:${product._id}:${location.location._id}`,
        }], { session });
        costUpdates.push({
          productId: product._id,
          productName: product.name,
          oldCostPrice: oldCost,
          newCostPrice: newCost,
        });
      }

      purchase.voucherId = accounting.voucherId;
      purchase.isPostedToGL = true;
      if (amountPaid > 0) {
        purchase.payments = [{
          paymentKey: `${operationKey}:initial`,
          amount: amountPaid,
          method: paymentMethod as any,
          voucherId: accounting.voucherId,
          paidAt: purchaseDate,
        }];
      }
      await purchase.save({ session });
      if (balanceDue > 0) {
        await Supplier.updateOne(
          { _id: supplier._id, outletId },
          { $inc: { currentBalance: balanceDue } },
          { session }
        );
      }
      const userDoc = await User.findById(userId).session(session!).lean();
      await ActivityLog.create([{
        userId,
        username: userDoc?.username || user.email,
        actionType: 'create',
        module: 'purchases',
        description: `Created purchase ${purchase.purchaseNumber} - QAR ${grandTotal.toFixed(2)}`,
        outletId,
        timestamp: purchaseDate,
      }], { session });
      createdPurchase = purchase;
    });

    return NextResponse.json({
      success: true,
      purchase: createdPurchase,
      voucherId: createdPurchase?.voucherId,
      costUpdates,
      message: 'Purchase created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('PURCHASE ERROR:', error);
    const status = /required|invalid|not found|duplicate|mismatch|cannot|concurrent/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to create purchase' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases') && !hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    const query: any = { outletId: new mongoose.Types.ObjectId(user.outletId) };
    const status = searchParams.get('status');
    query.status = status && status !== 'all' ? status.toUpperCase() : { $ne: 'CANCELLED' };
    if (searchParams.get('supplierId') && searchParams.get('supplierId') !== 'all') {
      query.supplierId = searchParams.get('supplierId');
    }
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      const fromDate = new Date(searchParams.get('startDate')!);
      const toDate = new Date(searchParams.get('endDate')!);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
      }
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      query.purchaseDate = {
        $gte: fromDate,
        $lte: toDate,
      };
    }
    const purchases = await Purchase.find(query)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .populate('supplierId', 'name code phone')
      .populate('createdBy', 'name email username')
      .lean();
    return NextResponse.json({ purchases });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch purchases' }, { status: 500 });
  }
}
