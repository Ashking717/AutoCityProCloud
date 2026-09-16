import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import Expense from '@/lib/models/Expense';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Voucher from '@/lib/models/Voucher';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import {
  postExpenseAccounting,
  postExpensePaymentAccounting,
} from '@/lib/services/transactionalAccountingService';
import { reversePostedVoucher } from '@/lib/services/voucherPostingService';
import { hasPermission } from '@/lib/types/roles';

interface RouteParams { params: { id: string } }

function round(value: number) {
  return Number(value.toFixed(2));
}

function requestKey(request: NextRequest, body?: any) {
  return String(request.headers.get('idempotency-key') || body?.operationKey || '').trim();
}

function getUser(permission: 'canViewFinancials' | 'canManageAccounting') {
  const token = cookies().get('auth-token')?.value;
  if (!token) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const user = verifyToken(token);
  if (!hasPermission(user.role, permission)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
    return { response: NextResponse.json({ error: 'Outlet is required' }, { status: 400 }) };
  }
  return { user };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const auth = getUser('canViewFinancials');
    if (auth.response) return auth.response;
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    const expense: any = await Expense.findOne({ _id: params.id, outletId: auth.user!.outletId })
      .populate('createdBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .populate('paymentAccount', 'code name')
      .lean();
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    const [voucher, ledgerEntries] = expense.voucherId
      ? await Promise.all([
          Voucher.findOne({ _id: expense.voucherId, outletId: auth.user!.outletId }).lean(),
          LedgerEntry.find({ voucherId: expense.voucherId, outletId: auth.user!.outletId }).sort({ lineNumber: 1 }).lean(),
        ])
      : [null, []];
    return NextResponse.json({ expense, voucher, ledgerEntries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Expense financial details are immutable; cancel and create a corrected expense' },
    { status: 410 }
  );
}

async function cancelExpense(request: NextRequest, params: { id: string }, body: any = {}) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const auth = getUser('canManageAccounting');
    if (auth.response) return auth.response;
    const user = auth.user!;
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    const key = requestKey(request, body);
    if (!key) return NextResponse.json({ error: 'Idempotency-Key is required' }, { status: 400 });
    session = await mongoose.startSession();
    let expenseResult: any;
    await session.withTransaction(async () => {
      const outletId = new mongoose.Types.ObjectId(user.outletId!);
      const userId = new mongoose.Types.ObjectId(user.userId);
      const expense: any = await Expense.findOne({ _id: params.id, outletId }).session(session!);
      if (!expense) throw new Error('Expense not found');
      if (expense.status === 'CANCELLED') {
        expenseResult = expense;
        return;
      }
      if (expense.isPostedToGL && !expense.voucherId) throw new Error('Posted expense is missing its voucher');
      if (expense.voucherId) {
        await reversePostedVoucher(expense.voucherId, outletId, userId, body.reason || 'Expense cancelled', session);
      }
      for (const payment of expense.payments || []) {
        if (payment.voucherId) {
          await reversePostedVoucher(payment.voucherId, outletId, userId, body.reason || 'Expense cancelled', session);
        }
      }
      expense.status = 'CANCELLED';
      expense.cancelledAt = new Date();
      expense.cancelledBy = userId;
      await expense.save({ session });
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'update',
        module: 'expenses',
        description: `Cancelled expense ${expense.expenseNumber} through ledger reversal`,
        outletId,
        timestamp: new Date(),
      }], { session });
      expenseResult = expense;
    });
    return NextResponse.json({ success: true, expense: expenseResult, message: 'Expense cancelled and reversed successfully' });
  } catch (error: any) {
    const status = /required|invalid|not found|missing/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return cancelExpense(request, params);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Valid JSON body is required' }, { status: 400 });
  }
  if (String(body.action || '').toLowerCase() === 'cancel') return cancelExpense(request, params, body);

  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const auth = getUser('canManageAccounting');
    if (auth.response) return auth.response;
    const user = auth.user!;
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
    const key = requestKey(request, body);
    if (!key) return NextResponse.json({ error: 'Idempotency-Key is required' }, { status: 400 });
    const action = String(body.action || '').toLowerCase();
    if (!['approve', 'pay'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    session = await mongoose.startSession();
    let responseData: any;
    await session.withTransaction(async () => {
      const outletId = new mongoose.Types.ObjectId(user.outletId!);
      const userId = new mongoose.Types.ObjectId(user.userId);
      const expense: any = await Expense.findOne({ _id: params.id, outletId }).session(session!);
      if (!expense) throw new Error('Expense not found');
      if (expense.status === 'CANCELLED') throw new Error('Cancelled expenses cannot be changed');

      if (action === 'approve') {
        if (expense.status !== 'DRAFT') throw new Error('Only draft expenses can be approved');
        if (!expense.isPostedToGL) {
          const result = await postExpenseAccounting(expense, userId, session!);
          expense.voucherId = result.voucherId;
          expense.isPostedToGL = true;
        }
        expense.status = expense.balanceDue === 0 ? 'PAID' : expense.amountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';
        expense.approvedBy = userId;
        expense.approvedAt = new Date();
        await expense.save({ session });
        responseData = { expense };
      } else {
        const postingKey = `expense:${expense._id}:payment:${key}`;
        const prior: any = await Voucher.findOne({ outletId, postingKey }).session(session!);
        if (prior) {
          responseData = { expense, voucherId: prior._id, voucherNumber: prior.voucherNumber, idempotent: true };
          return;
        }
        if (!['PENDING', 'PARTIALLY_PAID'].includes(expense.status)) {
          throw new Error('Only pending expenses can be paid');
        }
        const amount = round(Number(body.amount));
        if (!Number.isFinite(amount) || amount <= 0 || amount > Number(expense.balanceDue) + 0.01) {
          throw new Error('Payment must be positive and cannot exceed the balance due');
        }
        const method = String(body.paymentMethod || '').toUpperCase();
        if (!['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE'].includes(method)) throw new Error('Invalid payment method');
        const date = body.paymentDate ? new Date(body.paymentDate) : new Date();
        if (Number.isNaN(date.getTime())) throw new Error('Invalid payment date');
        let accountId: mongoose.Types.ObjectId | undefined;
        if (body.paymentAccountId) {
          const account: any = await Account.findOne({
            _id: body.paymentAccountId,
            outletId,
            type: AccountType.ASSET,
            subType: { $in: [AccountSubType.CASH, AccountSubType.BANK] },
            isActive: true,
          }).session(session!);
          if (!account) throw new Error('Payment account must be active cash or bank in this outlet');
          accountId = account._id;
        }
        if (!expense.isPostedToGL) {
          const initial = await postExpenseAccounting(expense, userId, session!);
          expense.voucherId = initial.voucherId;
          expense.isPostedToGL = true;
        }
        const payment = await postExpensePaymentAccounting(expense, {
          amount,
          method,
          accountId,
          date,
          reference: body.referenceNumber,
          paymentKey: postingKey,
        }, userId, session!);
        expense.amountPaid = round(Number(expense.amountPaid || 0) + amount);
        expense.balanceDue = round(Number(expense.grandTotal) - expense.amountPaid);
        expense.status = expense.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
        expense.payments ||= [];
        expense.payments.push({
          paymentKey: postingKey,
          amount,
          method,
          accountId,
          voucherId: payment.voucherId,
          date,
          reference: body.referenceNumber,
        });
        await expense.save({ session });
        responseData = { expense, ...payment };
      }
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'update',
        module: 'expenses',
        description: `${action === 'approve' ? 'Approved' : 'Paid'} expense ${expense.expenseNumber}`,
        outletId,
        timestamp: new Date(),
      }], { session });
    });
    return NextResponse.json({ success: true, ...responseData, message: `Expense ${action} completed successfully` });
  } catch (error: any) {
    const status = /required|invalid|only|cannot|must|not found|missing/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
