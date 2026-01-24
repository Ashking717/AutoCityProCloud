// app/api/closings/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';

import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { getClosingConfig } from '@/lib/config/closingConfig';

/* =========================================================
   PREVIEW CLOSING WITH COGS (NO OVERLAP, 3AM CUTOFF)
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
       PERIOD BOUNDARIES (NO OVERLAP)
       ================================================= */
    let periodStart: Date;
    let periodEnd: Date;
    let historicalDaysIncluded: number | null = null;

    /* ---------- PERIOD START ---------- */
    if (isFirstClosing) {
      if (config.includeHistoricalDataInFirstClosing) {
        // Get earliest ledger entry
        const earliestEntry = await LedgerEntry.findOne({ outletId: user.outletId })
          .sort({ date: 1 })
          .select('date')
          .lean<{ date: Date } | null>();

        if (earliestEntry?.date) {
          periodStart = new Date(earliestEntry.date);
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

    async function sumDebitsInPeriod(
      accountType: AccountType,
      subTypes: AccountSubType[],
      start: Date,
      end: Date
    ): Promise<number> {
      const accounts = await Account.find({
        outletId: user.outletId,
        type: accountType,
        subType: { $in: subTypes },
        isActive: true,
      }).select('_id').lean();

      if (!accounts.length) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $gte: start, $lte: end },
      }).lean();

      return entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    }

    async function sumCreditsInPeriod(
      accountType: AccountType,
      subTypes: AccountSubType[],
      start: Date,
      end: Date
    ): Promise<number> {
      const accounts = await Account.find({
        outletId: user.outletId,
        type: accountType,
        subType: { $in: subTypes },
        isActive: true,
      }).select('_id').lean();

      if (!accounts.length) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $gte: start, $lte: end },
      }).lean();

      return entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    }

    /* ---------------- OPENING & PROJECTED CLOSING ---------------- */
    const openingCutoff = new Date(periodStart.getTime() - 1);

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

    /* ---------------- REVENUE (from Ledger) ---------------- */
    const totalRevenue = await sumCreditsInPeriod(
      AccountType.REVENUE,
      [AccountSubType.SALES_REVENUE, AccountSubType.SERVICE_REVENUE],
      periodStart,
      periodEnd
    );

    /* ---------------- COGS (from Ledger) ---------------- */
    const totalCOGS = await sumDebitsInPeriod(
      AccountType.EXPENSE,
      [AccountSubType.COGS],
      periodStart,
      periodEnd
    );

    /* ---------------- PURCHASES (from Ledger) ---------------- */
    const totalPurchases = await sumDebitsInPeriod(
      AccountType.ASSET,
      [AccountSubType.INVENTORY],
      periodStart,
      periodEnd
    );

    /* ---------------- EXPENSES (from Ledger) ---------------- */
    const totalExpenses = await sumDebitsInPeriod(
      AccountType.EXPENSE,
      [AccountSubType.OPERATING_EXPENSE, AccountSubType.ADMIN_EXPENSE],
      periodStart,
      periodEnd
    );

    /* ---------------- PROFIT CALCULATIONS ---------------- */
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = totalRevenue - (totalCOGS + totalPurchases + totalExpenses);

    /* ---------------- SALES COUNT (for reference) ---------------- */
    const sales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      saleDate: { $gte: periodStart, $lt: periodEnd },
    }).lean();

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      isFirstClosing,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      cutoffTime: `${String(config.lateNightCutoffHour).padStart(2, '0')}:00`,

      // Cash & Bank
      openingCash,
      openingBank,
      projectedClosingCash,
      projectedClosingBank,
      totalOpeningBalance: openingCash + openingBank,
      totalClosingBalance: projectedClosingCash + projectedClosingBank,

      // Revenue & Costs (from Ledger)
      totalRevenue,
      totalCOGS,
      totalPurchases,
      totalExpenses,

      // Profit (calculated)
      grossProfit,
      netProfit,
      grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,

      // Metrics
      salesCount: sales.length,
      historicalDaysIncluded,
      
      // Source indicator
      dataSource: 'ledger',
    });

  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Preview failed' },
      { status: 500 }
    );
  }
}