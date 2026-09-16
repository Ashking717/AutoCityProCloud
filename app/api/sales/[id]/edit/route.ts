import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import ActivityLog from '@/lib/models/ActivityLog';
import Sale, { PaymentMethod } from '@/lib/models/Sale';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import { postSaleAccounting } from '@/lib/services/transactionalAccountingService';
import { reversePostedVoucher } from '@/lib/services/voucherPostingService';

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function PUT(
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
    const correctionKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    if (!correctionKey) {
      return NextResponse.json({ error: 'A valid idempotencyKey is required' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    session = await mongoose.startSession();
    let correctedSale: any;
    await session.withTransaction(async () => {
      const sale = await Sale.findOne({ _id: params.id, outletId }).session(session!);
      if (!sale) throw new Error('Sale not found');
      if (sale.lastCorrectionKey === correctionKey) {
        correctedSale = sale;
        return;
      }
      if (sale.status !== 'COMPLETED') throw new Error('Only completed sales can be corrected');
      if (sale.returns?.length) throw new Error('Sales with returns cannot be edited');
      if (!sale.voucherId || !sale.isPostedToGL) {
        throw new Error('Sale accounting must be complete before correction');
      }

      if (Array.isArray(body.items)) {
        for (const oldItem of sale.items) {
          const requested = body.items.find((item: any) =>
            String(item.productId || item.sku) === String(oldItem.productId || oldItem.sku)
            || item.sku === oldItem.sku
          );
          if (!requested) continue;
          if (
            Number(requested.quantity ?? oldItem.quantity) !== Number(oldItem.quantity)
            || Number(requested.unitPrice ?? oldItem.unitPrice) !== Number(oldItem.unitPrice)
            || Number(requested.discount ?? oldItem.discount) !== Number(oldItem.discount)
          ) {
            throw new Error('Posted sale prices, quantities, and discounts are immutable; cancel or return and create a replacement sale');
          }
        }
      }

      const method = String(body.paymentMethod || sale.paymentMethod).toUpperCase() as PaymentMethod;
      if (method === PaymentMethod.CREDIT || !Object.values(PaymentMethod).includes(method)) {
        throw new Error('Correction requires a valid tender payment method');
      }
      if (body.amountPaid !== undefined && Math.abs(Number(body.amountPaid) - Number(sale.amountPaid)) > 0.01) {
        throw new Error('A correction cannot change the amount collected');
      }
      if ((sale.payments || []).length > 1 && !Array.isArray(body.payments)) {
        throw new Error('Split-payment corrections must provide the complete payments array');
      }

      const payments = Array.isArray(body.payments)
        ? body.payments.map((payment: any) => ({
          method: String(payment.method || '').toUpperCase(),
          amount: round(Number(payment.amount || 0)),
          reference: payment.reference || undefined,
        })).filter((payment: any) => payment.amount > 0)
        : (sale.payments || []).map((payment: any) => ({
          method,
          amount: Number(payment.amount || 0),
          reference: body.reference || payment.reference,
        }));
      const paid = round(payments.reduce((sum: number, payment: any) => sum + payment.amount, 0));
      if (Math.abs(paid - Number(sale.amountPaid)) > 0.01) {
        throw new Error('Corrected payment details must equal the original amount paid');
      }
      if (payments.some((payment: any) =>
        payment.method === PaymentMethod.CREDIT || !Object.values(PaymentMethod).includes(payment.method)
      )) throw new Error('Invalid corrected payment method');

      await reversePostedVoucher(
        sale.voucherId,
        outletId,
        userId,
        body.correctionReason || 'Payment allocation corrected',
        session!
      );
      sale.payments = payments as any;
      sale.paymentMethod = payments[0]?.method || method;
      sale.notes = body.notes ?? sale.notes;
      const accounting = await postSaleAccounting(sale, userId, session!, {
        skipCOGS: true,
        postingSuffix: `correction:${correctionKey}`,
      });
      sale.voucherId = accounting.voucherId;
      sale.lastCorrectionKey = correctionKey;
      await sale.save({ session });

      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'update',
        module: 'sales',
        description: `Corrected payment allocation on sale ${sale.invoiceNumber}: ${body.correctionReason || 'no reason supplied'}`,
        outletId,
        timestamp: new Date(),
      }], { session });
      correctedSale = sale;
    });

    return NextResponse.json({ message: 'Sale payment allocation corrected', sale: correctedSale });
  } catch (error: any) {
    console.error('SALE EDIT ERROR:', error);
    const status = /required|cannot|immutable|invalid|only completed|returns|must|not found|complete/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to edit sale' }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
