import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Customer from '@/lib/models/Customer';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Sale from '@/lib/models/Sale';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import {
  adjustProductLocationStock,
  restoreProductStockAtHistoricalCost,
} from '@/lib/services/locationStockService';
import { reverseSaleAccounting } from '@/lib/services/transactionalAccountingService';

function round(value: number) {
  return Number(value.toFixed(2));
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
    if (!hasPermission(user.role, 'canProcessSales')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    session = await mongoose.startSession();
    let cancelledSale: any;

    await session.withTransaction(async () => {
      const sale = await Sale.findOne({ _id: params.id, outletId }).session(session!);
      if (!sale) throw new Error('Sale not found');
      if (sale.status === 'CANCELLED') {
        cancelledSale = sale;
        return;
      }
      if (sale.status === 'REFUNDED') throw new Error('Refunded sales cannot be cancelled');
      if (sale.returns?.length) {
        throw new Error('A sale with returns cannot be cancelled; return the remaining items instead');
      }
      if (!sale.isPostedToGL || !sale.voucherId) {
        throw new Error('Sale accounting is incomplete and must be reconciled before cancellation');
      }

      const reversals = await reverseSaleAccounting(
        sale,
        userId,
        'Sale cancelled',
        session!
      );

      for (const item of sale.items) {
        if (item.isLabor || !item.productId) continue;
        const product = await restoreProductStockAtHistoricalCost({
          productId: item.productId,
          outletId,
          quantity: Number(item.quantity),
          unitCost: Number(item.costPrice || 0),
          session: session!,
        });
        const location = await adjustProductLocationStock({
          product,
          outletId,
          locationId: item.locationId,
          locationName: item.locationName,
          quantityDelta: Number(item.quantity),
          userId,
          session,
        });
        await InventoryMovement.create([{
          productId: product._id,
          productName: item.name,
          sku: item.sku,
          movementType: 'RETURN',
          quantity: Number(item.quantity),
          unit: item.unit,
          unitCost: Number(item.costPrice || 0),
          totalValue: round(Number(item.quantity) * Number(item.costPrice || 0)),
          referenceType: 'SALE',
          referenceId: sale._id,
          referenceNumber: sale.invoiceNumber,
          locationId: location.location._id,
          locationName: location.location.name,
          locationBalanceAfter: location.newQuantity,
          outletId,
          balanceAfter: product.currentStock,
          date: new Date(),
          createdBy: userId,
          voucherId: reversals.cogsReversalId || reversals.receiptReversalId,
          ledgerEntriesCreated: true,
          operationKey: `cancel:${sale._id}:${product._id}:${location.location._id}`,
        }], { session });
      }

      if (sale.balanceDue > 0) {
        await Customer.updateOne(
          { _id: sale.customerId, outletId },
          { $inc: { currentBalance: -Number(sale.balanceDue) } },
          { session }
        );
      }
      sale.status = 'CANCELLED';
      sale.cancelledAt = new Date();
      sale.cancelledBy = userId;
      await sale.save({ session });
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'update',
        module: 'sales',
        description: `Cancelled sale ${sale.invoiceNumber}`,
        outletId,
        timestamp: new Date(),
      }], { session });
      cancelledSale = sale;
    });

    return NextResponse.json({ message: 'Sale cancelled successfully', sale: cancelledSale });
  } catch (error: any) {
    console.error('SALE CANCEL ERROR:', error);
    const status = /not found|cannot|incomplete|returns/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to cancel sale' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
