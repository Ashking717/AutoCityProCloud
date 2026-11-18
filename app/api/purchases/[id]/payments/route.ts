import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Purchase from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import Voucher from '@/lib/models/Voucher';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import { postPurchasePaymentAccounting } from '@/lib/services/transactionalAccountingService';
import { supplierLedgerBalance } from '@/lib/services/supplierLedgerBalance';

function round(value: number) {
  return Number(value.toFixed(2));
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
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const purchase = await Purchase.findOne({ _id: params.id, outletId: user.outletId }).select('_id');
    if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    const payments = await Voucher.find({
      referenceType: 'PURCHASE_PAYMENT',
      referenceId: purchase._id,
      outletId: user.outletId,
      status: 'posted',
    }).sort({ date: -1, createdAt: -1 }).populate('createdBy', 'name email username firstName lastName').lean();
    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch payments' }, { status: 500 });
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
    if (!hasPermission(user.role, 'canProcessPurchases')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId) || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid outlet or purchase ID' }, { status: 400 });
    }
    const body = await request.json();
    const clientKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    const paymentKey = `purchase:${params.id}:payment:${clientKey}`;
    const submitted = body.payments ?? [{ method: body.paymentMethod || 'CASH', amount: body.amount || 0 }];
    if (!Array.isArray(submitted) || submitted.length > 20) return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 });
    const tenders = submitted.map((row: any) => ({ method: String(row?.method || '').toUpperCase(), amount: round(Number(row?.amount)) }));
    const amount = round(tenders.reduce((sum, row) => sum + row.amount, 0));
    const discount = round(Number(body.discount ?? 0));
    const settlement = round(amount + discount);
    const method = tenders.find(row => row.amount > 0)?.method || 'CASH';
    if (!clientKey || clientKey.length > 160 || !Number.isFinite(discount) || discount < 0 || !Number.isFinite(amount) || tenders.some(row => !Number.isFinite(row.amount) || row.amount < 0) || settlement <= 0) {
      return NextResponse.json({ error: 'A valid idempotencyKey and positive payment or discount are required' }, { status: 400 });
    }
    if (tenders.some(row => !['CASH', 'PETTY_CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].includes(row.method))) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    session = await mongoose.startSession();
    let result: any;
    await session.withTransaction(async () => {
      const purchase = await Purchase.findOne({ _id: params.id, outletId }).session(session!);
      if (!purchase) throw new Error('Purchase not found');
      const prior = purchase.payments?.find((payment: any) => payment.paymentKey === paymentKey);
      if (prior) {
        result = {
          voucherId: prior.voucherId,
          amount: prior.amount,
          discount: prior.discount || 0,
          newBalance: purchase.balanceDue,
          newAmountPaid: purchase.amountPaid,
          idempotent: true,
        };
        return;
      }
      if (purchase.status === 'CANCELLED') throw new Error('Cancelled purchases cannot be paid');
      if (settlement > round(Number(purchase.balanceDue))) {
        throw new Error(`Payment exceeds balance due of QAR ${Number(purchase.balanceDue).toFixed(2)}`);
      }

      const paidAt = body.paymentDate ? new Date(body.paymentDate) : new Date();
      if (Number.isNaN(paidAt.getTime())) throw new Error('Invalid payment date');
      const supplierBalance = await supplierLedgerBalance(outletId, purchase.supplierId, session!);
      if (settlement > supplierBalance + 0.01) throw new Error('Payment exceeds supplier ledger balance; allocate prior supplier credits first');
      const updatedSupplier = await Supplier.findOneAndUpdate(
        {
          _id: purchase.supplierId,
          outletId,
        },
        { $set: { currentBalance: round(supplierBalance - settlement) } },
        { new: true, session }
      );
      if (!updatedSupplier) {
        throw new Error('Supplier balance is lower than this purchase payment; reconcile prior supplier payments first');
      }
      const accounting = await postPurchasePaymentAccounting(
        purchase,
        { amount, method, tenders, discount, date: paidAt, reference: body.referenceNumber, paymentKey },
        userId,
        session!
      );
      purchase.amountPaid = round(Number(purchase.amountPaid) + amount);
      purchase.balanceDue = round(Number(purchase.balanceDue) - settlement);
      purchase.settlementDiscountTotal = round(Number(purchase.settlementDiscountTotal || 0) + discount);
      if (discount > 0) {
        const eligible = purchase.items.filter(item => item.quantity > Number(item.returnedQuantity || 0));
        const weights = eligible.map(item => round(item.total * (item.quantity - Number(item.returnedQuantity || 0)) / item.quantity - Number(item.settlementDiscountRemaining || 0)));
        const total = weights.reduce((sum, value) => sum + value, 0);
        if (total < discount || total <= 0) throw new Error('Discount exceeds remaining goods value');
        let allocated = 0;
        let cumulativeWeight = 0;
        eligible.forEach((item, index) => {
          cumulativeWeight += weights[index];
          const target = index === eligible.length - 1 ? discount : round(discount * cumulativeWeight / total);
          const share = round(target - allocated);
          item.settlementDiscountRemaining = round(Number(item.settlementDiscountRemaining || 0) + share);
          allocated = round(allocated + share);
        });
      }
      if (purchase.balanceDue <= 0.01) purchase.status = 'PAID';
      purchase.payments ||= [];
      purchase.payments.push({
        paymentKey,
        amount,
        discount,
        tenders,
        method: method as any,
        reference: body.referenceNumber,
        voucherId: accounting.voucherId,
        paidAt,
      });
      await purchase.save({ session });
      await ActivityLog.create([{
        userId,
        username: user.email || user.username,
        actionType: 'payment',
        module: 'purchases',
        description: `Recorded payment of QAR ${amount.toFixed(2)} for purchase ${purchase.purchaseNumber}`,
        outletId,
        timestamp: paidAt,
      }], { session });
      result = {
        voucherId: accounting.voucherId,
        voucherNumber: accounting.voucherNumber,
        amount,
        discount,
        settlement,
        newBalance: purchase.balanceDue,
        newAmountPaid: purchase.amountPaid,
        supplierBalance: updatedSupplier.currentBalance,
      };
    });
    return NextResponse.json({ message: 'Payment recorded successfully', payment: result }, { status: 201 });
  } catch (error: any) {
    console.error('PURCHASE PAYMENT ERROR:', error);
    const status = /required|invalid|not found|cannot|exceeds/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to record payment' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
