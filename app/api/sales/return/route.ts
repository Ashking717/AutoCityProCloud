import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Customer from '@/lib/models/Customer';
import InventoryMovement from '@/lib/models/InventoryMovement';
import Sale, { ISale, PaymentMethod } from '@/lib/models/Sale';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import {
  adjustProductLocationStock,
  restoreProductStockAtHistoricalCost,
} from '@/lib/services/locationStockService';
import { postReturnAccounting } from '@/lib/services/transactionalAccountingService';

interface ReturnItemRequest {
  productId?: string;
  sku: string;
  locationId?: string;
  locationName?: string;
  quantity: number;
  reason?: string;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function nextReturnNumber(date = new Date()) {
  const yearMonth = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8).toUpperCase();
  return `RET-${yearMonth}-${suffix}`;
}

function allocateRefunds(
  payments: Array<{ method: PaymentMethod; amount: number; reference?: string }>,
  refundAmount: number
) {
  const paid = round(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  if (refundAmount > paid + 0.01) throw new Error('Refund exceeds collected payments');
  if (refundAmount <= 0) return { refunds: [], remainingPayments: payments };

  let remaining = refundAmount;
  const refunds: Array<{ method: string; amount: number }> = [];
  const remainingPayments = payments.map((payment) => {
    const amount = round(Number(payment.amount || 0));
    const refunded = round(Math.min(amount, remaining));
    remaining = round(remaining - refunded);
    if (refunded > 0) refunds.push({ method: payment.method, amount: refunded });
    return { ...payment, amount: round(amount - refunded) };
  }).filter((payment) => payment.amount > 0);

  if (remaining > 0.01) {
    throw new Error('Unable to allocate refund across original payment methods');
  }
  return { refunds, remainingPayments };
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const returnKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    if (!returnKey || returnKey.length > 160) {
      return NextResponse.json({ error: 'A valid idempotencyKey is required' }, { status: 400 });
    }
    if (!body.saleId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Sale and return items are required' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    session = await mongoose.startSession();
    let responseData: any;

    await session.withTransaction(async () => {
      const sale = await Sale.findOne({ _id: body.saleId, outletId }).session(session!) as ISale | null;
      if (!sale) throw new Error('Sale not found');
      const priorReturn = sale.returns?.find((entry: any) => entry.returnKey === returnKey);
      if (priorReturn) {
        responseData = {
          returnNumber: priorReturn.returnNumber,
          totalAmount: priorReturn.totalAmount,
          voucherId: priorReturn.voucherId,
          idempotent: true,
        };
        return;
      }
      if (sale.status !== 'COMPLETED') throw new Error('Only completed sales can be returned');

      const aggregated = new Map<string, ReturnItemRequest>();
      for (const input of body.items as ReturnItemRequest[]) {
        const quantity = Number(input.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Return quantity must be greater than zero');
        const itemKey = input.productId ? `id:${input.productId}` : `sku:${input.sku}`;
        const locationKey = input.locationId || input.locationName || 'unspecified';
        const key = `${itemKey}:location:${locationKey}`;
        const current = aggregated.get(key);
        aggregated.set(key, { ...input, quantity: round((current?.quantity || 0) + quantity) });
      }

      const returnNumber = nextReturnNumber();
      const returnDate = new Date();
      const validated: any[] = [];
      let revenueAmount = 0;
      let vatAmount = 0;
      let cogsAmount = 0;

      for (const input of aggregated.values()) {
        const candidates: any[] = sale.items.filter((item: any) =>
          input.productId
            ? String(item.productId || '') === input.productId
            : item.sku === input.sku
        );
        let originalItem: any;
        if (input.locationId) {
          originalItem = candidates.find((item: any) => String(item.locationId || '') === input.locationId);
        } else if (input.locationName) {
          originalItem = candidates.find((item: any) => item.locationName === input.locationName);
        } else if (candidates.length === 1) {
          [originalItem] = candidates;
        } else if (candidates.length > 1) {
          throw new Error(`Location is required to identify the sale line for ${input.sku}`);
        }
        if (!originalItem) throw new Error(`Item not found in sale: ${input.sku}`);
        if (originalItem.isLabor || !originalItem.productId) {
          throw new Error(`Labor item ${originalItem.name} cannot be returned`);
        }
        const available = Number(originalItem.quantity) - Number(originalItem.returnedQuantity || 0);
        if (input.quantity > available + 0.000001) {
          throw new Error(`Return quantity exceeds remaining quantity for ${originalItem.name}`);
        }

        const previousReturnItems = (sale.returns || [])
          .flatMap((entry: any) => entry.items || [])
          .filter((item: any) => {
            if (String(item.productId || '') !== String(originalItem.productId || '')) return false;
            if (candidates.length === 1) return true;
            return String(item.locationId || '') === String(originalItem.locationId || '');
          });
        const priorRevenue = round(previousReturnItems.reduce(
          (sum: number, item: any) => sum + Number(item.netAmount ?? (Number(item.totalAmount || 0) - Number(item.vatAmount || 0))),
          0
        ));
        const priorVAT = round(previousReturnItems.reduce((sum: number, item: any) => sum + Number(item.vatAmount || 0), 0));
        const isFinalQuantity = Math.abs(input.quantity - available) < 0.000001;
        const lineRevenue = isFinalQuantity
          ? round(Number(originalItem.total || 0) - priorRevenue)
          : round(Number(originalItem.total || 0) * input.quantity / originalItem.quantity);
        const lineVat = isFinalQuantity
          ? round(Number(originalItem.vatAmount || 0) - priorVAT)
          : round(Number(originalItem.vatAmount || 0) * input.quantity / originalItem.quantity);
        const lineCogs = round(Number(originalItem.costPrice || 0) * input.quantity);
        revenueAmount = round(revenueAmount + lineRevenue);
        vatAmount = round(vatAmount + lineVat);
        cogsAmount = round(cogsAmount + lineCogs);
        validated.push({ input, originalItem, lineRevenue, lineVat, lineCogs });
      }

      const totalAmount = round(revenueAmount + vatAmount);
      const receivableReduction = Math.min(totalAmount, Math.max(0, Number(sale.balanceDue || 0)));
      const cashRefund = round(totalAmount - receivableReduction);
      const paymentAllocation = allocateRefunds(
        (sale.payments || []) as any,
        cashRefund
      );

      const accounting = await postReturnAccounting({
        sale,
        returnNumber,
        returnDate,
        revenueAmount,
        vatAmount,
        cogsAmount,
        receivableReduction,
        refundAllocations: paymentAllocation.refunds,
      }, userId, session!);

      const returnItems: any[] = [];
      for (const item of validated) {
        item.originalItem.returnedQuantity = round(
          Number(item.originalItem.returnedQuantity || 0) + item.input.quantity
        );
        const product = await restoreProductStockAtHistoricalCost({
          productId: item.originalItem.productId,
          outletId,
          quantity: item.input.quantity,
          unitCost: Number(item.originalItem.costPrice || 0),
          session: session!,
        });
        const location = await adjustProductLocationStock({
          product,
          outletId,
          locationId: item.originalItem.locationId,
          locationName: item.originalItem.locationName,
          quantityDelta: item.input.quantity,
          userId,
          session,
        });

        await InventoryMovement.create([{
          productId: product._id,
          productName: item.originalItem.name,
          sku: item.originalItem.sku,
          movementType: 'RETURN',
          quantity: item.input.quantity,
          unit: item.originalItem.unit,
          unitCost: item.originalItem.costPrice || 0,
          totalValue: item.lineCogs,
          referenceType: 'RETURN',
          referenceId: sale._id,
          referenceNumber: returnNumber,
          locationId: location.location._id,
          locationName: location.location.name,
          locationBalanceAfter: location.newQuantity,
          outletId,
          balanceAfter: product.currentStock,
          date: returnDate,
          createdBy: userId,
          notes: item.input.reason || body.reason,
          voucherId: accounting.voucherId,
          ledgerEntriesCreated: true,
          operationKey: `return:${returnKey}:${product._id}:${location.location._id}`,
        }], { session });

        returnItems.push({
          productId: product._id,
          productName: item.originalItem.name,
          sku: item.originalItem.sku,
          quantity: item.input.quantity,
          unitPrice: item.originalItem.unitPrice,
          netAmount: item.lineRevenue,
          vatAmount: item.lineVat,
          costPrice: item.originalItem.costPrice || 0,
          totalAmount: round(item.lineRevenue + item.lineVat),
          locationId: location.location._id,
          locationName: location.location.name,
          reason: item.input.reason || body.reason,
          returnDate,
        });
      }

      sale.returns ||= [];
      sale.returns.push({
        returnKey,
        returnNumber,
        returnDate,
        reason: body.reason,
        items: returnItems,
        totalAmount,
        voucherId: accounting.voucherId,
        processedBy: userId,
        processedByName: user.email,
      });
      sale.payments = paymentAllocation.remainingPayments as any;
      sale.amountPaid = round(Number(sale.amountPaid || 0) - cashRefund);
      sale.balanceDue = round(Number(sale.balanceDue || 0) - receivableReduction);
      const totalReturned = round(sale.returns.reduce((sum, entry) => sum + Number(entry.totalAmount || 0), 0));
      if (Math.abs(totalReturned - sale.grandTotal) <= 0.01) sale.status = 'REFUNDED';
      await sale.save({ session });

      if (receivableReduction > 0) {
        await Customer.updateOne(
          { _id: sale.customerId, outletId },
          { $inc: { currentBalance: -receivableReduction } },
          { session }
        );
      }
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'return',
        module: 'sales',
        description: `Processed return ${returnNumber} for sale ${sale.invoiceNumber} - QAR ${totalAmount.toFixed(2)}`,
        outletId,
        timestamp: returnDate,
      }], { session });
      responseData = { returnNumber, totalAmount, voucherId: accounting.voucherId };
    });

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error('Return processing error:', error);
    const status = /required|invalid|exceed|not found|cannot|only completed/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to process return' }, { status });
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
    const { searchParams } = new URL(request.url);
    const query: any = {
      outletId: user.outletId,
      'returns.0': { $exists: true },
    };
    if (searchParams.get('saleId')) query._id = searchParams.get('saleId');
    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      query['returns.returnDate'] = {};
      if (searchParams.get('startDate')) query['returns.returnDate'].$gte = new Date(searchParams.get('startDate')!);
      if (searchParams.get('endDate')) query['returns.returnDate'].$lte = new Date(searchParams.get('endDate')!);
    }
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const sales = await Sale.find(query)
      .select('invoiceNumber saleDate returns customerName grandTotal status paymentMethod')
      .sort({ 'returns.returnDate': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const returns = sales.flatMap((sale: any) => (sale.returns || []).map((entry: any) => ({
      ...entry,
      saleId: sale._id,
      saleInvoice: sale.invoiceNumber,
      customerName: sale.customerName,
    })));
    return NextResponse.json({ returns, total: returns.length, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
