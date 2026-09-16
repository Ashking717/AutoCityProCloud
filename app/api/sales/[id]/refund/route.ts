import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Sale, { PaymentMethod } from '@/lib/models/Sale';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import { postCustomerRefundAccounting } from '@/lib/services/transactionalAccountingService';

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

    const body = await request.json();
    const refundKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    const amount = round(Number(body.refundAmount || 0));
    const method = String(body.paymentMethod || '').toUpperCase() as PaymentMethod;
    if (!refundKey || amount <= 0) {
      return NextResponse.json({ error: 'idempotencyKey and a positive refundAmount are required' }, { status: 400 });
    }
    if (![PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE].includes(method)) {
      return NextResponse.json({ error: 'Refund must use a cash, bank, card, or cheque method' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    session = await mongoose.startSession();
    let resultSale: any;
    await session.withTransaction(async () => {
      const sale = await Sale.findOne({ _id: params.id, outletId }).session(session!);
      if (!sale) throw new Error('Sale not found');
      const prior = sale.refunds?.find((refund: any) => refund.refundKey === refundKey);
      if (prior) {
        resultSale = sale;
        return;
      }
      if (sale.status !== 'COMPLETED') throw new Error('Only completed sales can receive an overpayment refund');
      if (!sale.isPostedToGL || !sale.voucherId) {
        throw new Error('Sale accounting must be reconciled before an overpayment can be refunded');
      }

      const totalReturned = (sale.returns || []).reduce(
        (sum: number, entry: any) => sum + Number(entry.totalAmount || 0),
        0
      );
      const netSale = round(Number(sale.grandTotal) - totalReturned);
      const overpayment = round(Math.max(0, Number(sale.amountPaid) - netSale));
      if (overpayment <= 0) throw new Error('Sale has no refundable overpayment');
      if (Math.abs(amount - overpayment) > 0.01) {
        throw new Error(`Refund must clear the complete overpayment of QAR ${overpayment.toFixed(2)}`);
      }

      const accounting = await postCustomerRefundAccounting(
        sale,
        { amount, method, reference: body.reference, refundKey: `sale:${sale._id}:refund:${refundKey}` },
        userId,
        session!
      );

      let remaining = amount;
      const payments = [...(sale.payments || [])].reverse().map((payment: any) => {
        if (remaining <= 0 || payment.method !== method) return payment;
        const reduction = Math.min(Number(payment.amount || 0), remaining);
        remaining = round(remaining - reduction);
        const plainPayment = typeof payment.toObject === 'function' ? payment.toObject() : payment;
        return { ...plainPayment, amount: round(Number(payment.amount || 0) - reduction) };
      }).reverse().filter((payment: any) => payment.amount > 0);
      if (remaining > 0.01) throw new Error('Refund method exceeds the amount originally collected by that method');

      sale.payments = payments as any;
      sale.amountPaid = round(Number(sale.amountPaid) - amount);
      sale.balanceDue = round(netSale - Number(sale.amountPaid));
      sale.refunds ||= [];
      sale.refunds.push({
        refundKey,
        amount,
        method,
        reference: body.reference,
        voucherId: accounting.voucherId,
        refundedAt: new Date(),
        processedBy: userId,
      });
      await sale.save({ session });
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'refund',
        module: 'sales',
        description: `Refunded overpayment of QAR ${amount.toFixed(2)} for ${sale.invoiceNumber}`,
        outletId,
        timestamp: new Date(),
      }], { session });
      resultSale = sale;
    });

    return NextResponse.json({ message: 'Refund processed successfully', sale: resultSale });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    const status = /required|must|no refundable|not found|only completed|reconciled|exceeds/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to process refund' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
