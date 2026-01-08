// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';

import Expense from '@/lib/models/Expense';
import Account from '@/lib/models/Account';
import Outlet from '@/lib/models/Outlet';
import ActivityLog from '@/lib/models/ActivityLog';
import User from '@/lib/models/User';

import { postExpenseToLedger } from '@/lib/services/accountingService';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';

/* ═══════════════════════════════════════════════════════════
   GENERATE UNIQUE EXPENSE NUMBER
   - Uses same logic as voucher number generation
   - Prevents race conditions and duplicates
   ═══════════════════════════════════════════════════════════ */
async function generateExpenseNumber(outletId: mongoose.Types.ObjectId): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;
  
  const maxAttempts = 5;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Find the latest expense number for this period
    const latestExpense = await Expense.findOne({
      outletId,
      expenseNumber: { $regex: `^EXP-${yearMonth}-` }
    })
      .sort({ expenseNumber: -1 })
      .select('expenseNumber')
      .lean();
    
    let nextNumber = 1;
    
    if (latestExpense && (latestExpense as any).expenseNumber) {
      // Extract sequence number from last expense
      const match = (latestExpense as any).expenseNumber.match(/-(\d{5})$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    const expenseNumber = `EXP-${yearMonth}-${String(nextNumber).padStart(5, '0')}`;
    
    // Check if this number already exists
    const exists = await Expense.exists({ expenseNumber });
    
    if (!exists) {
      return expenseNumber;
    }
  }
  
  // Fallback: use timestamp-based unique number
  const timestamp = Date.now().toString().slice(-5);
  return `EXP-${yearMonth}-${timestamp}`;
}

/* ═══════════════════════════════════════════════════════════
   CREATE EXPENSE API
   - Automatic expense number generation (fixed for race conditions)
   - Posts to general ledger
   - Activity logging
   ═══════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const userId = new mongoose.Types.ObjectId(user.userId);

    if (!user.outletId) {
      return NextResponse.json(
        { error: 'Invalid token: outletId missing' },
        { status: 401 }
      );
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);

    // ───────────────── BODY ─────────────────
    const body = await request.json();
    const {
      category,
      items,
      taxAmount = 0,
      paymentMethod,
      paymentAccountId,
      amountPaid,
      vendorName,
      vendorPhone,
      vendorEmail,
      referenceNumber,
      dueDate,
      notes,
      isRecurring = false,
      recurringFrequency,
    } = body;

    // ───────────────── VALIDATION ─────────────────
    if (!category || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Category and items are required' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    if (paymentMethod !== 'CREDIT' && !paymentAccountId) {
      return NextResponse.json(
        { error: 'Payment account is required for non-credit payments' },
        { status: 400 }
      );
    }

    // ───────────────── OUTLET ─────────────────
    const outlet = await Outlet.findById(outletId);
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    // ───────────────── EXPENSE NUMBER (FIXED) ─────────────────
    const expenseNumber = await generateExpenseNumber(outletId);
    console.log(`✓ Generated expense number: ${expenseNumber}`);

    // ───────────────── CALCULATIONS ─────────────────
    let subtotal = 0;
    const expenseItems: any[] = [];

    for (const item of items) {
      const account = await Account.findById(item.accountId);
      if (!account) {
        throw new Error(`Account not found: ${item.accountId}`);
      }

      // Validate it's an expense account
      if (account.type !== 'EXPENSE') {
        throw new Error(`Account ${account.code} - ${account.name} is not an expense account`);
      }

      const amount = Number(item.amount) || 0;

      if (amount <= 0) {
        throw new Error(`Invalid amount for ${item.description}`);
      }

      subtotal += amount;

      expenseItems.push({
        description: item.description,
        accountId: account._id,
        accountName: account.name,
        accountCode: account.code,
        amount,
        notes: item.notes || '',
      });
    }

    const grandTotal = subtotal + Number(taxAmount);
    const paidAmount = Number(amountPaid) || 0;
    const balanceDue = grandTotal - paidAmount;

    // ───────────────── STATUS ─────────────────
    let status = 'PAID';

    if (paymentMethod === 'CREDIT') {
      status = 'PENDING';
    } else if (paidAmount < grandTotal) {
      status = 'PARTIALLY_PAID';
    }

    // ───────────────── RECURRING ─────────────────
    const now = new Date();
    let nextDueDate = null;
    if (isRecurring && recurringFrequency) {
      nextDueDate = new Date(now);

      switch (recurringFrequency) {
        case 'WEEKLY':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'MONTHLY':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'QUARTERLY':
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          break;
        case 'YEARLY':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }
    }

    // ───────────────── CREATE EXPENSE ─────────────────
    const expenseDocs = await Expense.create([
      {
        expenseNumber,
        outletId,
        expenseDate: now,
        category,
        items: expenseItems,
        subtotal,
        taxAmount: Number(taxAmount),
        grandTotal,
        paymentMethod: paymentMethod.toUpperCase(),
        paymentAccount: paymentAccountId
          ? new mongoose.Types.ObjectId(paymentAccountId)
          : undefined,
        amountPaid: paidAmount,
        balanceDue,
        vendorName,
        vendorPhone,
        vendorEmail,
        referenceNumber,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
        status,
        isRecurring,
        recurringFrequency,
        nextDueDate,
        createdBy: userId,
        isPostedToGL: false,
      },
    ]);

    const expense = expenseDocs[0];
    console.log(`✓ Expense created: ${expense.expenseNumber}`);

    // ───────────────── ACCOUNTING ─────────────────
    let voucherId = null;

    // Post to ledger only if paid or partially paid
    if (status === 'PAID' || status === 'PARTIALLY_PAID') {
      try {
        const result = await postExpenseToLedger(expense, userId);
        voucherId = result.voucherId;

        expense.set('voucherId', voucherId);
        expense.set('isPostedToGL', true);
        await expense.save();
        
        console.log(`✓ Posted to ledger: ${result.voucherNumber}`);
      } catch (ledgerError: any) {
        console.error('Ledger posting error:', ledgerError);
        return NextResponse.json(
          { error: `Failed to post to ledger: ${ledgerError.message}` },
          { status: 500 }
        );
      }
    }

    // ───────────────── FETCH USERNAME FOR ACTIVITY LOG ─────────────────
    const userDoc = await User.findById(userId).lean();
    const username =
      (userDoc as any)?.username || user.username || user.email || 'Unknown User';

    // ───────────────── ACTIVITY LOG ─────────────────
    await ActivityLog.create([
      {
        userId,
        username,
        actionType: 'create',
        module: 'expenses',
        description: `Created expense ${expenseNumber} - ${category} - QAR ${grandTotal.toFixed(
          2
        )}${vendorName ? ` (${vendorName})` : ''}`,
        outletId,
        timestamp: now,
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        expense,
        voucherId,
        message: 'Expense created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('EXPENSE ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   GET EXPENSES
   - List expenses with filters
   - Pagination support
   ═══════════════════════════════════════════════════════════ */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const outletId = new mongoose.Types.ObjectId(user.outletId || '');

    // ───────────────── QUERY PARAMS ─────────────────
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const vendorName = searchParams.get('vendorName');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // ───────────────── BUILD QUERY ─────────────────
    const query: any = { outletId };

    if (category) query.category = category;
    if (status) query.status = status;
    if (vendorName) query.vendorName = { $regex: vendorName, $options: 'i' };

    if (startDate && endDate) {
      query.expenseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // ───────────────── PAGINATION ─────────────────
    const skip = (page - 1) * limit;

    // ───────────────── EXECUTE QUERY ─────────────────
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email username')
        .populate('approvedBy', 'name email username')
        .populate('paymentAccount', 'code name')
        .lean(),
      Expense.countDocuments(query),
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   UPDATE EXPENSE STATUS
   - Approve, Pay, Cancel actions
   ═══════════════════════════════════════════════════════════ */

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const userId = new mongoose.Types.ObjectId(user.userId);

    // ───────────────── BODY ─────────────────
    const body = await request.json();
    const { expenseId, action, amountPaid } = body;

    if (!expenseId || !action) {
      return NextResponse.json(
        { error: 'Expense ID and action are required' },
        { status: 400 }
      );
    }

    // ───────────────── FETCH EXPENSE ─────────────────
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    let result;

    // ───────────────── ACTIONS ─────────────────
    switch (action.toUpperCase()) {
      case 'APPROVE':
        if (expense.status === 'DRAFT') {
          expense.status = 'PENDING';
          expense.approvedBy = userId;
          expense.approvedAt = new Date();
          await expense.save();

          // Activity log
          await ActivityLog.create([
            {
              userId,
              username: user.username || user.email,
              actionType: 'update',
              module: 'expenses',
              description: `Approved expense ${expense.expenseNumber}`,
              outletId: expense.outletId,
              timestamp: new Date(),
            },
          ]);
        }
        break;

      case 'PAY':
        if (expense.status === 'PENDING' || expense.status === 'PARTIALLY_PAID') {
          const payment = Number(amountPaid) || expense.balanceDue;
          const newAmountPaid = expense.amountPaid + payment;
          const newBalanceDue = expense.grandTotal - newAmountPaid;

          expense.amountPaid = newAmountPaid;
          expense.balanceDue = newBalanceDue;
          expense.status = newBalanceDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

          await expense.save();

          // Post to ledger if not already posted
          if (!expense.isPostedToGL) {
            result = await postExpenseToLedger(expense, userId);

            expense.voucherId = result.voucherId;
            expense.isPostedToGL = true;
            await expense.save();
          }

          // Activity log
          await ActivityLog.create([
            {
              userId,
              username: user.username || user.email,
              actionType: 'update',
              module: 'expenses',
              description: `Paid QAR ${payment.toFixed(2)} for expense ${
                expense.expenseNumber
              }`,
              outletId: expense.outletId,
              timestamp: new Date(),
            },
          ]);
        }
        break;

      case 'CANCEL':
        expense.status = 'CANCELLED';
        await expense.save();

        // Activity log
        await ActivityLog.create([
          {
            userId,
            username: user.username || user.email,
            actionType: 'update',
            module: 'expenses',
            description: `Cancelled expense ${expense.expenseNumber}`,
            outletId: expense.outletId,
            timestamp: new Date(),
          },
        ]);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      expense,
      message: `Expense ${action.toLowerCase()}ed successfully`,
    });
  } catch (error: any) {
    console.error('PATCH /api/expenses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}