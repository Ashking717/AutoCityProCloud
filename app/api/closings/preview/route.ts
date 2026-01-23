// app/api/closings/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';

import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Purchase from '@/lib/models/Purchase';
import Expense from '@/lib/models/Expense';
import Account, { AccountSubType } from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { getClosingConfig } from '@/lib/config/closingConfig';

/* =========================================================
   PREVIEW CLOSING (NO OVERLAP, 3AM CUTOFF)
   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    /* ---------------- AUTH ---------------- */
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);

    const closingType = searchParams.get('type') as 'day' | 'month';
    const closingDateStr = searchParams.get('date');

    if (!closingType || !closingDateStr) {
      return NextResponse.json(
        { error: 'Type and date are required' },
        { status: 400 }
      );
    }

    const config = getClosingConfig(user.outletId || undefined);

    /* ---------------- CLOSING DAY ---------------- */
    const closingDay = new Date(closingDateStr);
    closingDay.setHours(0, 0, 0, 0);

    /* ---------------- PREVIOUS CLOSING ---------------- */
    const previousClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: { $lt: closingDay },
    })
      .sort({ closingDate: -1 })
      .lean<{ periodEnd: Date } | null>();

    const isFirstClosing = !previousClosing;

    /* =================================================
       PERIOD BOUNDARIES (CRITICAL FIX)
       ================================================= */
    let periodStart: Date;
    let periodEnd: Date;
    let historicalDaysIncluded: number | null = null;

    /* ---------- PERIOD START ---------- */
    if (isFirstClosing) {
      if (config.includeHistoricalDataInFirstClosing) {
        const [earliestSale, earliestPurchase, earliestExpense] =
          await Promise.all([
            Sale.findOne({ outletId: user.outletId })
              .sort({ saleDate: 1 })
              .select('saleDate')
              .lean<{ saleDate: Date } | null>(),

            Purchase.findOne({ outletId: user.outletId })
              .sort({ purchaseDate: 1 })
              .select('purchaseDate')
              .lean<{ purchaseDate: Date } | null>(),

            Expense.findOne({ outletId: user.outletId })
              .sort({ expenseDate: 1 })
              .select('expenseDate')
              .lean<{ expenseDate: Date } | null>(),
          ]);

        const dates: Date[] = [];
        if (earliestSale?.saleDate) dates.push(earliestSale.saleDate);
        if (earliestPurchase?.purchaseDate)
          dates.push(earliestPurchase.purchaseDate);
        if (earliestExpense?.expenseDate)
          dates.push(earliestExpense.expenseDate);

        if (dates.length > 0) {
          periodStart = new Date(Math.min(...dates.map(d => d.getTime())));
          periodStart.setHours(0, 0, 0, 0);

          historicalDaysIncluded =
            Math.floor(
              (closingDay.getTime() - periodStart.getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1;
        } else {
          periodStart = new Date(closingDay);
        }
      } else {
        periodStart = new Date(closingDay);
      }
    } else {
      // 🔒 NO OVERLAP — chain from previous period end
      periodStart = new Date(previousClosing!.periodEnd);
    }

    /* ---------- PERIOD END ---------- */
    if (closingType === 'day') {
      periodEnd = new Date(closingDay);
      periodEnd.setDate(periodEnd.getDate() + 1);
      periodEnd.setHours(config.lateNightCutoffHour, 0, 0, 0);
    } else {
      periodEnd = new Date(
        closingDay.getFullYear(),
        closingDay.getMonth() + 1,
        1
      );
      periodEnd.setHours(config.lateNightCutoffHour, 0, 0, 0);
    }

    if (periodStart >= periodEnd) {
      throw new Error('Invalid closing period: overlapping boundaries detected');
    }

    /* =================================================
       LEDGER HELPERS
       ================================================= */
    async function getLedgerBalance(
      subTypes: AccountSubType[],
      upto: Date
    ): Promise<number> {
      const accounts = await Account.find({
        outletId: user.outletId,
        subType: { $in: subTypes },
        isActive: true,
      }).select('_id').lean();

      if (!accounts.length) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $lte: upto },
      }).lean();

      return entries.reduce(
        (sum, e) => sum + (e.debit || 0) - (e.credit || 0),
        0
      );
    }

    /* ---------------- OPENING & PROJECTED CLOSING ---------------- */
    const openingCutoff = new Date(periodStart);
    openingCutoff.setMilliseconds(-1);

    const openingCash = await getLedgerBalance(
      [AccountSubType.CASH],
      openingCutoff
    );

    const openingBank = await getLedgerBalance(
      [AccountSubType.BANK],
      openingCutoff
    );

    const projectedClosingCash = await getLedgerBalance(
      [AccountSubType.CASH],
      periodEnd
    );

    const projectedClosingBank = await getLedgerBalance(
      [AccountSubType.BANK],
      periodEnd
    );

    /* ---------------- DOCUMENT TOTALS (INFO ONLY) ---------------- */
    const sales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      saleDate: { $gte: periodStart, $lt: periodEnd },
    }).lean<{ grandTotal?: number }[]>();

    const purchases = await Purchase.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'COMPLETED'] },
      purchaseDate: { $gte: periodStart, $lt: periodEnd },
    }).lean<{ amountPaid?: number }[]>();

    const expenses = await Expense.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'PARTIALLY_PAID'] },
      expenseDate: { $gte: periodStart, $lt: periodEnd },
    }).lean<{ amountPaid?: number }[]>();

    const totalRevenue = sales.reduce(
      (sum, s) => sum + (s.grandTotal || 0),
      0
    );

    const totalPurchases = purchases.reduce(
      (sum, p) => sum + (p.amountPaid || 0),
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (e.amountPaid || 0),
      0
    );

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      isFirstClosing,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      cutoffTime: `${String(config.lateNightCutoffHour).padStart(2, '0')}:00`,

      openingCash,
      openingBank,

      projectedClosingCash,
      projectedClosingBank,

      totalRevenue,
      totalPurchases,
      totalExpenses,

      salesCount: sales.length,
      historicalDaysIncluded,
    });

  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Preview failed' },
      { status: 500 }
    );
  }
}
