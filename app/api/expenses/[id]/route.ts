// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';

import Expense from '@/lib/models/Expense';
import Voucher from '@/lib/models/Voucher';
import LedgerEntry from '@/lib/models/LedgerEntry';
import ActivityLog from '@/lib/models/ActivityLog';
import User from '@/lib/models/User';

import { reverseExpenseVoucher, postExpenseToLedger } from '@/lib/services/accountingService';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';

interface RouteParams {
  params: {
    id: string;
  };
}

/* ═══════════════════════════════════════════════════════════
   GET /api/expenses/[id] - Get single expense details
   ═══════════════════════════════════════════════════════════ */

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);

    // ───────────────── FETCH EXPENSE ─────────────────
    const expense = await Expense.findById(params.id)
      .populate('createdBy', 'name email username')
      .populate('approvedBy', 'name email username')
      .populate('paymentAccount', 'code name')
      .lean();

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // ───────────────── VOUCHER ─────────────────
    let voucher: any = null;
    if ((expense as any).voucherId) {
      voucher = await Voucher.findById((expense as any).voucherId).lean();
    }

    // ───────────────── LEDGER ENTRIES ─────────────────
    let ledgerEntries: any[] = [];
    if ((expense as any).isPostedToGL && (expense as any).voucherId) {
      ledgerEntries = await LedgerEntry.find({ voucherId: (expense as any).voucherId })
        .sort({ debit: -1 })
        .lean();
    }

    return NextResponse.json({
      expense,
      voucher,
      ledgerEntries,
    });
  } catch (error: any) {
    console.error('GET /api/expenses/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   PUT /api/expenses/[id] - Update expense (before posting)
   ═══════════════════════════════════════════════════════════ */

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const userId = new mongoose.Types.ObjectId(user.userId);

    // ───────────────── FETCH EXPENSE ─────────────────
    const expense = await Expense.findById(params.id);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // ───────────────── VALIDATE ─────────────────
    if (expense.isPostedToGL) {
      return NextResponse.json(
        { error: 'Cannot edit expense that has been posted to ledger' },
        { status: 400 }
      );
    }

    // ───────────────── BODY ─────────────────
    const body = await request.json();
    const {
      category,
      items,
      taxAmount,
      vendorName,
      vendorPhone,
      vendorEmail,
      referenceNumber,
      notes,
    } = body;

    // ───────────────── UPDATE FIELDS ─────────────────
    if (category) expense.category = category;

    if (items && Array.isArray(items)) {
      // Recalculate totals
      const subtotal = items.reduce(
        (sum: number, item: any) => sum + Number(item.amount || 0),
        0
      );
      const grandTotal = subtotal + Number(taxAmount || 0);

      expense.items = items;
      expense.subtotal = subtotal;
      expense.taxAmount = Number(taxAmount || 0);
      expense.grandTotal = grandTotal;
      expense.balanceDue = grandTotal - expense.amountPaid;

      // Update status based on payment
      if (expense.amountPaid >= grandTotal) {
        expense.status = 'PAID';
        expense.balanceDue = 0;
      } else if (expense.amountPaid > 0) {
        expense.status = 'PARTIALLY_PAID';
      }
    }

    if (vendorName !== undefined) expense.vendorName = vendorName;
    if (vendorPhone !== undefined) expense.vendorPhone = vendorPhone;
    if (vendorEmail !== undefined) expense.vendorEmail = vendorEmail;
    if (referenceNumber !== undefined) expense.referenceNumber = referenceNumber;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

    // ───────────────── ACTIVITY LOG ─────────────────
    const userDoc = await User.findById(userId).lean();
    const username =
      userDoc?.username || user.username || user.email || 'Unknown User';

    await ActivityLog.create([
      {
        userId,
        username,
        actionType: 'update',
        module: 'expenses',
        description: `Updated expense ${expense.expenseNumber}`,
        outletId: expense.outletId,
        timestamp: new Date(),
      },
    ]);

    return NextResponse.json({
      success: true,
      expense,
      message: 'Expense updated successfully',
    });
  } catch (error: any) {
    console.error('PUT /api/expenses/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   DELETE /api/expenses/[id] - Delete expense
   ═══════════════════════════════════════════════════════════ */

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const userId = new mongoose.Types.ObjectId(user.userId);

    // ───────────────── FETCH EXPENSE ─────────────────
    const expense = await Expense.findById(params.id);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // ───────────────── REVERSAL ─────────────────
    let reversalMessage = '';

    if ((expense as any).isPostedToGL && (expense as any).voucherId) {
      await reverseExpenseVoucher(
        expense,
        userId,
        'Expense deleted by user'
      );
      reversalMessage = ' and reversed in ledger';
    }

    // ───────────────── DELETE ─────────────────
    await Expense.findByIdAndDelete(params.id);

    // ───────────────── ACTIVITY LOG ─────────────────
    const userDoc = await User.findById(userId).lean();
    const username =
      userDoc?.username || user.username || user.email || 'Unknown User';

    await ActivityLog.create([
      {
        userId,
        username,
        actionType: 'delete',
        module: 'expenses',
        description: `Deleted expense ${(expense as any).expenseNumber} - QAR ${(expense as any).grandTotal.toFixed(
          2
        )}${reversalMessage}`,
        outletId: (expense as any).outletId,
        timestamp: new Date(),
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Expense deleted successfully${reversalMessage}`,
    });
  } catch (error: any) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   POST /api/expenses/[id]/actions - Perform actions
   ═══════════════════════════════════════════════════════════ */

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
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
    const { action, amount, paymentAccountId } = body;

    // ───────────────── FETCH EXPENSE ─────────────────
    const expense = await Expense.findById(params.id);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    let result;
    let activityDescription = '';

    // ───────────────── ACTIONS ─────────────────
    switch (action.toLowerCase()) {
      case 'approve':
        if (expense.status !== 'DRAFT') {
          return NextResponse.json(
            { error: 'Can only approve draft expenses' },
            { status: 400 }
          );
        }

        expense.status = 'PENDING';
        expense.approvedBy = userId;
        expense.approvedAt = new Date();
        await expense.save();

        activityDescription = `Approved expense ${(expense as any).expenseNumber}`;
        break;

      case 'pay':
        if (expense.status !== 'PENDING' && expense.status !== 'PARTIALLY_PAID') {
          return NextResponse.json(
            { error: 'Can only pay pending or partially paid expenses' },
            { status: 400 }
          );
        }

        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Valid payment amount required' },
            { status: 400 }
          );
        }

        if (amount > (expense as any).balanceDue) {
          return NextResponse.json(
            { error: 'Payment amount exceeds balance due' },
            { status: 400 }
          );
        }

        if (!paymentAccountId) {
          return NextResponse.json(
            { error: 'Payment account required' },
            { status: 400 }
          );
        }

        // Update payment details
        (expense as any).amountPaid += Number(amount);
        (expense as any).balanceDue -= Number(amount);
        (expense as any).paymentAccount = new mongoose.Types.ObjectId(paymentAccountId);

        if ((expense as any).balanceDue <= 0) {
          expense.status = 'PAID';
          (expense as any).balanceDue = 0;
        } else {
          expense.status = 'PARTIALLY_PAID';
        }

        // Post to ledger if not already posted
        if (!(expense as any).isPostedToGL) {
          result = await postExpenseToLedger(expense, userId);

          (expense as any).voucherId = result.voucherId;
          (expense as any).isPostedToGL = true;
        }

        await expense.save();

        activityDescription = `Paid QAR ${Number(amount).toFixed(2)} for expense ${
          (expense as any).expenseNumber
        }`;
        break;

      case 'cancel':
        if ((expense as any).isPostedToGL) {
          // Create reversal if already posted
          result = await reverseExpenseVoucher(
            expense,
            userId,
            'Expense cancelled by user'
          );
        }

        expense.status = 'CANCELLED';
        await expense.save();

        activityDescription = `Cancelled expense ${(expense as any).expenseNumber}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ───────────────── ACTIVITY LOG ─────────────────
    const userDoc = await User.findById(userId).lean();
    const username =
      userDoc?.username || user.username || user.email || 'Unknown User';

    await ActivityLog.create([
      {
        userId,
        username,
        actionType: 'update',
        module: 'expenses',
        description: activityDescription,
        outletId: (expense as any).outletId,
        timestamp: new Date(),
      },
    ]);

    return NextResponse.json({
      success: true,
      expense,
      result,
      message: `Expense ${action}ed successfully`,
    });
  } catch (error: any) {
    console.error('POST /api/expenses/[id]/actions error:', error);
    return NextResponse.json(
      { error: error.message || 'Action failed' },
      { status: 500 }
    );
  }
}