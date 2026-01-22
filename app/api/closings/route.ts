import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import LedgerEntry from '@/lib/models/LedgerEntry';
import ActivityLog from '@/lib/models/ActivityLog';
import Product from '@/lib/models/ProductEnhanced';
import Account, { AccountSubType } from '@/lib/models/Account';
import Purchase from '@/lib/models/Purchase';
import Expense from '@/lib/models/Expense';


// ─────────────────────────────────────────────
// GET /api/closings
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);

    const query: any = { outletId: user.outletId };

    const closingType = searchParams.get('closingType');
    if (closingType) query.closingType = closingType;

    const status = searchParams.get('status');
    if (status) query.status = status;

    const closings = await Closing.find(query)
      .populate('closedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ closingDate: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ closings });
  } catch (error: any) {
    console.error('GET closings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// Helper: Calculate Period Boundaries
// ─────────────────────────────────────────────
function calculatePeriodBoundaries(closingType: 'day' | 'month', closingDate: string) {
  const closingDay = new Date(closingDate);
  closingDay.setHours(0, 0, 0, 0);

  let periodStart: Date;
  let periodEnd: Date;

  if (closingType === 'day') {
    // Daily closing: same day
    periodStart = new Date(closingDay);
    periodEnd = new Date(closingDay);
    periodEnd.setHours(23, 59, 59, 999);
  } else {
    // Monthly closing: entire month
    periodStart = new Date(closingDay.getFullYear(), closingDay.getMonth(), 1);
    periodStart.setHours(0, 0, 0, 0);
    
    periodEnd = new Date(closingDay.getFullYear(), closingDay.getMonth() + 1, 0);
    periodEnd.setHours(23, 59, 59, 999);
  }

  return { periodStart, periodEnd, closingDay };
}

// ─────────────────────────────────────────────
// POST /api/closings
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    /* ---------------- AUTH ---------------- */
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const { closingType, closingDate, notes } = await req.json();

    if (!closingType || !closingDate) {
      return NextResponse.json(
        { error: 'Closing type and date are required' },
        { status: 400 }
      );
    }

    /* ---------------- PERIOD BOUNDARIES ---------------- */
    const { periodStart, periodEnd, closingDay } = calculatePeriodBoundaries(closingType, closingDate);

    console.log(`Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    /* ---------------- PREVIOUS CLOSING ---------------- */
    const previousClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: { $lt: closingDay },
    })
      .sort({ closingDate: -1 })
      .lean();

    /* ---------------- SEQUENTIAL ENFORCEMENT ---------------- */
    if (previousClosing) {
      if (closingType === 'day') {
        // For daily closing, ensure previous day is closed
        const expectedPrev = new Date(closingDay);
        expectedPrev.setDate(expectedPrev.getDate() - 1);

        if (
          new Date(previousClosing.closingDate).toDateString() !==
          expectedPrev.toDateString()
        ) {
          return NextResponse.json(
            { error: 'Previous day is not closed. Please close it first.' },
            { status: 400 }
          );
        }
      } else if (closingType === 'month') {
        // For monthly closing, ensure previous month is closed
        const expectedPrevMonth = new Date(closingDay.getFullYear(), closingDay.getMonth() - 1, 1);
        const prevClosingMonth = new Date(previousClosing.closingDate);
        
        if (
          prevClosingMonth.getFullYear() !== expectedPrevMonth.getFullYear() ||
          prevClosingMonth.getMonth() !== expectedPrevMonth.getMonth()
        ) {
          return NextResponse.json(
            { error: 'Previous month is not closed. Please close it first.' },
            { status: 400 }
          );
        }
      }
    }

    /* ---------------- CHECK FOR DUPLICATE ---------------- */
    const existingClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: closingDay,
    });

    if (existingClosing) {
      return NextResponse.json(
        { error: `This ${closingType} is already closed.` },
        { status: 400 }
      );
    }

    /* ---------------- OPENING BALANCES ---------------- */
    const endOfPreviousPeriod = new Date(periodStart);
    endOfPreviousPeriod.setMilliseconds(-1);

    async function getOpeningBalance(subType: AccountSubType) {
      const accounts = await Account.find({
        outletId: user.outletId,
        subType,
        isActive: true,
      }).select('_id');

      if (!accounts.length) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $lte: endOfPreviousPeriod },
      }).lean();

      return entries.reduce(
        (sum, e) => sum + (e.debit || 0) - (e.credit || 0),
        0
      );
    }

    const openingCash = previousClosing
      ? previousClosing.closingCash
      : await getOpeningBalance(AccountSubType.CASH);

    const openingBank = previousClosing
      ? previousClosing.closingBank
      : await getOpeningBalance(AccountSubType.BANK);

    /* ---------------- SALES ---------------- */
    const sales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      saleDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const cashSales = sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + (s.amountPaid || s.grandTotal || 0), 0);

    const bankSales = sales
      .filter(s => s.paymentMethod === 'CARD' || s.paymentMethod === 'BANK_TRANSFER')
      .reduce((sum, s) => sum + (s.amountPaid || s.grandTotal || 0), 0);

    const totalRevenue = sales.reduce(
      (sum, s) => sum + (s.grandTotal || 0),
      0
    );

    const totalDiscount = sales.reduce(
      (sum, s) => sum + (s.totalDiscount || 0),
      0
    );

    const totalTax = sales.reduce(
      (sum, s) => sum + (s.totalVAT || 0),
      0
    );

    const salesCount = sales.length;

    /* ---------------- CASH PAYMENTS ---------------- */
    const cashPurchases = await Purchase.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'COMPLETED'] },
      paymentMethod: { $in: ['CASH'] },
      purchaseDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const cashPurchasePayments = cashPurchases.reduce(
      (sum, p) => sum + (p.amountPaid || 0),
      0
    );

    const cashExpenses = await Expense.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'PARTIALLY_PAID'] },
      paymentMethod: { $in: ['CASH'] },
      expenseDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const cashExpensePayments = cashExpenses.reduce(
      (sum, e) => sum + (e.amountPaid || 0),
      0
    );

    const cashPayments = cashPurchasePayments + cashExpensePayments;

    /* ---------------- CASH CLOSING ---------------- */
    const closingCash = openingCash + cashSales - cashPayments;

    /* ---------------- BANK PAYMENTS ---------------- */
    const bankPurchases = await Purchase.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'COMPLETED'] },
      paymentMethod: { $in: ['CARD', 'BANK_TRANSFER'] },
      purchaseDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const bankPurchasePayments = bankPurchases.reduce(
      (sum, p) => sum + (p.amountPaid || 0),
      0
    );

    const bankExpenses = await Expense.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'PARTIALLY_PAID'] },
      paymentMethod: { $in: ['CARD', 'BANK_TRANSFER'] },
      expenseDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const bankExpensePayments = bankExpenses.reduce(
      (sum, e) => sum + (e.amountPaid || 0),
      0
    );

    const bankPayments = bankPurchasePayments + bankExpensePayments;

    console.log("Bank Sales:", bankSales, "Bank Payments:", bankPayments);

    /* ---------------- BANK CLOSING ---------------- */
    const bankMovement = bankSales - bankPayments;
    const closingBank = openingBank + bankMovement;

    /* ---------------- TOTAL BALANCES ---------------- */
    const totalOpeningBalance = openingCash + openingBank;
    const totalClosingBalance = closingCash + closingBank;

    /* ---------------- PROFIT ---------------- */
    const totalExpenses = bankPayments + cashPayments;
    const netProfit = totalRevenue - totalExpenses;

    /* ---------------- CREATE CLOSING ---------------- */
    const closing = await Closing.create({
      closingType,
      closingDate: closingDay,
      periodStart,
      periodEnd,

      totalSales: totalRevenue,
      totalExpenses,
      totalRevenue,
      netProfit,

      openingCash,
      cashSales,
      cashReceipts: 0,
      cashPayments,
      closingCash,

      openingBank,
      bankSales,
      bankPayments,
      closingBank,

      // Add total balances
      totalOpeningBalance,
      totalClosingBalance,

      salesCount,
      totalDiscount,
      totalTax,

      status: 'closed',
      closedBy: new mongoose.Types.ObjectId(user.userId),
      closedAt: new Date(),
      notes,

      outletId: user.outletId ? new mongoose.Types.ObjectId(user.outletId) : undefined,
    });

    return NextResponse.json({ success: true, closing });

  } catch (err: any) {
    console.error('Closing error:', err);
    return NextResponse.json(
      { error: err.message || 'Closing failed' },
      { status: 500 }
    );
  }
}