import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Purchase from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import Voucher from '@/lib/models/Voucher';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { postSupplierBalancePaymentAccounting } from '@/lib/services/transactionalAccountingService';
import { hasPermission } from '@/lib/types/roles';

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId) || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid outlet or supplier ID' }, { status: 400 });
    }
    const body = await request.json();
    const key = String(request.headers.get('idempotency-key') || body.paymentKey || '').trim();
    if (!key || key.length > 160) return NextResponse.json({ error: 'A valid Idempotency-Key is required' }, { status: 400 });
    const amount = round(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero' }, { status: 400 });
    }
    const method = String(body.paymentMethod || '').toUpperCase();
    if (!['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].includes(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }
    const date = body.paymentDate ? new Date(body.paymentDate) : new Date();
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid payment date' }, { status: 400 });

    session = await mongoose.startSession();
    let responseData: any;
    await session.withTransaction(async () => {
      const outletId = new mongoose.Types.ObjectId(user.outletId!);
      const userId = new mongoose.Types.ObjectId(user.userId);
      const postingKey = `supplier:${params.id}:payment:${key}`;
      const prior: any = await Voucher.findOne({ outletId, postingKey }).session(session!);
      if (prior) {
        const supplier = await Supplier.findOne({ _id: params.id, outletId }).session(session!);
        responseData = {
          voucherId: prior._id,
          voucherNumber: prior.voucherNumber,
          amount: Number(prior.metadata?.paymentAmount ?? amount),
          newBalance: supplier?.currentBalance || 0,
          idempotent: true,
        };
        return;
      }
      const supplier: any = await Supplier.findOneAndUpdate(
        { _id: params.id, outletId, isActive: { $ne: false }, currentBalance: { $gte: amount } },
        { $inc: { currentBalance: -amount } },
        { new: true, session }
      );
      if (!supplier) throw new Error('Supplier not found or payment exceeds the current balance');
      const result = await postSupplierBalancePaymentAccounting(supplier, {
        amount,
        method,
        date,
        reference: body.referenceNumber,
        notes: body.notes,
        paymentKey: postingKey,
      }, userId, session!);

      let remaining = amount;
      const allocations: Array<{
        purchaseId: mongoose.Types.ObjectId;
        purchaseNumber: string;
        amount: number;
        balanceDue: number;
      }> = [];
      const openPurchases: any[] = await Purchase.find({
        outletId,
        supplierId: supplier._id,
        status: { $ne: 'CANCELLED' },
        balanceDue: { $gt: 0.01 },
      }).sort({ purchaseDate: 1, createdAt: 1 }).session(session!);
      for (const purchase of openPurchases) {
        if (remaining <= 0.01) break;
        const allocation = round(Math.min(Number(purchase.balanceDue || 0), remaining));
        if (allocation <= 0) continue;
        purchase.amountPaid = round(Number(purchase.amountPaid || 0) + allocation);
        purchase.balanceDue = round(Number(purchase.grandTotal || 0) - purchase.amountPaid);
        if (purchase.balanceDue <= 0.01) purchase.status = 'PAID';
        purchase.payments ||= [];
        purchase.payments.push({
          paymentKey: `${postingKey}:allocation:${purchase._id}`,
          amount: allocation,
          method: method as any,
          reference: body.referenceNumber,
          voucherId: result.voucherId,
          paidAt: date,
        });
        await purchase.save({ session });
        remaining = round(remaining - allocation);
        allocations.push({
          purchaseId: purchase._id,
          purchaseNumber: purchase.purchaseNumber,
          amount: allocation,
          balanceDue: purchase.balanceDue,
        });
      }
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'payment',
        module: 'suppliers',
        description: `Recorded supplier payment QAR ${amount.toFixed(2)} for ${supplier.name}`,
        outletId,
        timestamp: new Date(),
      }], { session });
      responseData = {
        ...result,
        amount,
        newBalance: round(supplier.currentBalance),
        allocations,
        unallocatedAmount: remaining,
      };
    });
    return NextResponse.json({
      message: 'Supplier balance payment recorded successfully',
      payment: responseData,
    }, { status: responseData?.idempotent ? 200 : 201 });
  } catch (error: any) {
    const status = /required|invalid|not found|exceeds|greater/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
