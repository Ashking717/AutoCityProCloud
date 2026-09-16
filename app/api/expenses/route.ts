import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import Expense from '@/lib/models/Expense';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { postExpenseAccounting } from '@/lib/services/transactionalAccountingService';
import { hasPermission } from '@/lib/types/roles';

const CATEGORIES = new Set([
  'UTILITY', 'RENT', 'SALARY', 'MAINTENANCE', 'MARKETING',
  'OFFICE_SUPPLIES', 'TRANSPORTATION', 'PROFESSIONAL_FEES', 'OTHER',
]);
const METHODS = new Set(['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'CREDIT']);

function round(value: number) {
  return Number(value.toFixed(2));
}

function nextExpenseNumber(date = new Date()) {
  const period = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `EXP-${period}-${new mongoose.Types.ObjectId().toHexString().slice(-8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageAccounting')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const body = await request.json();
    const key = String(request.headers.get('idempotency-key') || body.operationKey || '').trim();
    if (!key) return NextResponse.json({ error: 'Idempotency-Key is required' }, { status: 400 });
    const category = String(body.category || '').toUpperCase();
    const method = String(body.paymentMethod || '').toUpperCase();
    if (!CATEGORIES.has(category) || !METHODS.has(method) || !Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json({ error: 'Valid category, payment method, and expense items are required' }, { status: 400 });
    }

    const expenseDate = body.expenseDate ? new Date(body.expenseDate) : new Date();
    const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
    if (Number.isNaN(expenseDate.getTime()) || (dueDate && Number.isNaN(dueDate.getTime()))) {
      return NextResponse.json({ error: 'Invalid expense or due date' }, { status: 400 });
    }
    const taxAmount = round(Number(body.taxAmount || 0));
    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      return NextResponse.json({ error: 'Tax must be a non-negative amount' }, { status: 400 });
    }

    session = await mongoose.startSession();
    let responseData: any;
    await session.withTransaction(async () => {
      const outletId = new mongoose.Types.ObjectId(user.outletId!);
      const userId = new mongoose.Types.ObjectId(user.userId);
      const prior: any = await Expense.findOne({ outletId, operationKey: key }).session(session!);
      if (prior) {
        responseData = { expense: prior, voucherId: prior.voucherId, idempotent: true };
        return;
      }

      const itemIds = body.items.map((item: any) => String(item.accountId || ''));
      if (itemIds.some((id: string) => !mongoose.Types.ObjectId.isValid(id))) {
        throw new Error('Every expense item requires a valid account');
      }
      const accounts: any[] = await Account.find({
        _id: { $in: [...new Set<string>(itemIds)].map((id) => new mongoose.Types.ObjectId(id)) },
        outletId,
        type: AccountType.EXPENSE,
        isActive: true,
      }).session(session!).lean();
      const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
      if (accountMap.size !== new Set(itemIds).size) throw new Error('Every expense account must be active and belong to this outlet');
      const expenseItems = body.items.map((item: any) => {
        const account = accountMap.get(String(item.accountId));
        const amount = round(Number(item.amount));
        if (!account || !Number.isFinite(amount) || amount <= 0) throw new Error('Every expense item requires a positive amount');
        return {
          description: String(item.description || account.name).trim(),
          accountId: account._id,
          accountName: account.name,
          accountCode: account.code,
          amount,
          notes: item.notes,
        };
      });
      const subtotal = round(expenseItems.reduce((sum: number, item: any) => sum + item.amount, 0));
      const grandTotal = round(subtotal + taxAmount);
      const amountPaid = round(Number(body.amountPaid || 0));
      if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > grandTotal + 0.01) {
        throw new Error('Invalid amount paid');
      }
      if (method === 'CREDIT' && amountPaid !== 0) throw new Error('Credit expenses cannot include an immediate tender payment');
      let paymentAccount: any;
      if (amountPaid > 0 && body.paymentAccountId) {
        paymentAccount = await Account.findOne({
          _id: body.paymentAccountId,
          outletId,
          type: AccountType.ASSET,
          subType: { $in: [AccountSubType.CASH, AccountSubType.BANK] },
          isActive: true,
        }).session(session!);
        if (!paymentAccount) throw new Error('Payment account must be an active cash or bank account in this outlet');
      }
      const balanceDue = round(grandTotal - amountPaid);
      const status = balanceDue === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';
      let nextDueDate: Date | undefined;
      if (body.isRecurring && body.recurringFrequency) {
        nextDueDate = new Date(expenseDate);
        const frequency = String(body.recurringFrequency).toUpperCase();
        if (frequency === 'WEEKLY') nextDueDate.setDate(nextDueDate.getDate() + 7);
        else if (frequency === 'MONTHLY') nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        else if (frequency === 'QUARTERLY') nextDueDate.setMonth(nextDueDate.getMonth() + 3);
        else if (frequency === 'YEARLY') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        else throw new Error('Invalid recurring frequency');
      }
      const [expense] = await Expense.create([{
        expenseNumber: nextExpenseNumber(expenseDate),
        operationKey: key,
        outletId,
        expenseDate,
        category,
        items: expenseItems,
        subtotal,
        taxAmount,
        grandTotal,
        paymentMethod: method,
        paymentAccount: paymentAccount?._id,
        amountPaid,
        balanceDue,
        vendorName: body.vendorName,
        vendorPhone: body.vendorPhone,
        vendorEmail: body.vendorEmail,
        referenceNumber: body.referenceNumber,
        dueDate,
        notes: body.notes,
        attachments: body.attachments,
        status,
        isRecurring: Boolean(body.isRecurring),
        recurringFrequency: body.recurringFrequency,
        nextDueDate,
        createdBy: userId,
        isPostedToGL: false,
      }], { session });
      const accounting = await postExpenseAccounting(expense, userId, session!);
      expense.voucherId = accounting.voucherId;
      expense.isPostedToGL = true;
      await expense.save({ session });
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'create',
        module: 'expenses',
        description: `Created expense ${expense.expenseNumber} - QAR ${grandTotal.toFixed(2)}`,
        outletId,
        timestamp: new Date(),
      }], { session });
      responseData = { expense, voucherId: accounting.voucherId };
    });
    return NextResponse.json({ success: true, ...responseData }, { status: responseData?.idempotent ? 200 : 201 });
  } catch (error: any) {
    const status = /required|invalid|cannot|must|positive|belong/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
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
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const sort = ['expenseDate', 'createdAt', 'grandTotal', 'expenseNumber'].includes(searchParams.get('sort') || '')
      ? searchParams.get('sort')!
      : 'expenseDate';
    const query: any = { outletId: user.outletId };
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    if (category && category !== 'all') query.category = category.toUpperCase();
    if (status && status !== 'all') query.status = status.toUpperCase();
    if (searchParams.get('vendorName')) query.vendorName = { $regex: searchParams.get('vendorName'), $options: 'i' };
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start || end) {
      query.expenseDate = {};
      if (start) query.expenseDate.$gte = new Date(start);
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = endDate;
      }
      if (Object.values(query.expenseDate).some((date: any) => Number.isNaN(date.getTime()))) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
      }
    }
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort({ [sort]: searchParams.get('order') === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email username')
        .populate('approvedBy', 'name email username')
        .populate('paymentAccount', 'code name')
        .lean(),
      Expense.countDocuments(query),
    ]);
    return NextResponse.json({
      expenses: (expenses as any[]).map((expense) => ({
        ...expense,
        expense_category: expense.category,
        created_at: new Date(expense.createdAt).toISOString().split('T')[0],
        date: new Date(expense.expenseDate).toISOString().split('T')[0],
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Use the scoped /api/expenses/:id action endpoint' },
    { status: 410 }
  );
}
