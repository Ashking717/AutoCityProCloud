import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';

import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Product from '@/lib/models/ProductEnhanced';
import Account, { AccountSubType, AccountType } from '@/lib/models/Account';

import { getClosingConfig } from '@/lib/config/closingConfig';

/* =========================================================
   GET /api/closings
   ========================================================= */
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

/* =========================================================
   Helper: Earliest Transaction Date
   ========================================================= */
async function getEarliestTransactionDate(
  outletId: string
): Promise<Date | null> {
  // Get earliest ledger entry date
  const earliestEntry = await LedgerEntry.findOne({ outletId })
    .sort({ date: 1 })
    .select('date')
    .lean<{ date: Date } | null>();

  return earliestEntry?.date ? new Date(earliestEntry.date) : null;
}

/* =========================================================
   Helper: Calculate Period Boundaries (NO OVERLAP)
   ========================================================= */
async function calculatePeriodBoundaries(
  closingType: 'day' | 'month',
  closingDate: string,
  outletId: string
) {
  const config = getClosingConfig(outletId);

  const closingDay = new Date(closingDate);
  closingDay.setHours(0, 0, 0, 0);

  const previousClosing = await Closing.findOne({
    outletId,
    closingType,
    closingDate: { $lt: closingDay },
  })
    .sort({ closingDate: -1 })
    .lean<{ periodEnd: Date } | null>();

  const isFirstClosing = !previousClosing;

  let periodStart: Date;
  let periodEnd: Date;

  /* ---------- START ---------- */
  if (isFirstClosing) {
    if (config.includeHistoricalDataInFirstClosing) {
      const earliest = await getEarliestTransactionDate(outletId);
      periodStart = earliest ? new Date(earliest) : new Date(closingDay);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(closingDay);
    }
  } else {
    // 🔒 CRITICAL RULE: CONTIGUOUS PERIODS
    periodStart = new Date(previousClosing!.periodEnd);
  }

  /* ---------- END ---------- */
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
    throw new Error('Invalid closing period: overlap detected');
  }

  return { periodStart, periodEnd, closingDay, isFirstClosing };
}

/* =========================================================
   POST /api/closings - LEDGER-DRIVEN WITH PROPER PROFIT
   Formula: Net Profit = Sales - (COGS + Purchases + Expenses)
   ========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

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

    const { periodStart, periodEnd, closingDay } =
      await calculatePeriodBoundaries(
        closingType,
        closingDate,
        user.outletId || ''
      );

    const exists = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: closingDay,
    });
    if (exists) {
      return NextResponse.json(
        { error: 'This period is already closed' },
        { status: 400 }
      );
    }

    /* ========================================
       LEDGER HELPER FUNCTIONS
       ======================================== */
    
    // Get account balance from ledger entries up to a date
    async function ledgerBalance(subTypes: AccountSubType[], upto: Date) {
      const accounts = await Account.find({
        outletId: user.outletId,
        subType: { $in: subTypes },
        isActive: true,
      }).select('_id').lean();

      if (accounts.length === 0) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $lte: upto },
      }).lean();

      return entries.reduce(
        (s, e) => s + (e.debit || 0) - (e.credit || 0),
        0
      );
    }

    // Get sum of debits to specific account types in a period
    async function sumDebitsInPeriod(
      accountType: AccountType,
      subTypes: AccountSubType[],
      start: Date,
      end: Date
    ) {
      const accounts = await Account.find({
        outletId: user.outletId,
        type: accountType,
        subType: { $in: subTypes },
        isActive: true,
      }).select('_id').lean();

      if (accounts.length === 0) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $gte: start, $lte: end },
      }).lean();

      return entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    }

    // Get sum of credits to specific account types in a period
    async function sumCreditsInPeriod(
      accountType: AccountType,
      subTypes: AccountSubType[],
      start: Date,
      end: Date
    ) {
      const accounts = await Account.find({
        outletId: user.outletId,
        type: accountType,
        subType: { $in: subTypes },
        isActive: true,
      }).select('_id').lean();

      if (accounts.length === 0) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $gte: start, $lte: end },
      }).lean();

      return entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    }

    /* ========================================
       CASH & BANK BALANCES (from Ledger)
       ======================================== */
    const openingCutoff = new Date(periodStart.getTime() - 1);

    const openingCash = await ledgerBalance([AccountSubType.CASH], openingCutoff);
    const openingBank = await ledgerBalance([AccountSubType.BANK], openingCutoff);

    const closingCash = await ledgerBalance([AccountSubType.CASH], periodEnd);
    const closingBank = await ledgerBalance([AccountSubType.BANK], periodEnd);
    
    const accountsPayable = await ledgerBalance(
      [AccountSubType.ACCOUNTS_PAYABLE],
      periodEnd
    );

    /* ========================================
       CASH & BANK MOVEMENTS (from Ledger)
       ======================================== */
    const cashAccounts = await Account.find({
      outletId: user.outletId,
      subType: AccountSubType.CASH,
      isActive: true,
    }).select('_id').lean();

    const cashEntries = await LedgerEntry.find({
      outletId: user.outletId,
      accountId: { $in: cashAccounts.map(a => a._id) },
      date: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const cashReceipts = cashEntries.reduce(
      (sum, entry) => sum + (entry.debit || 0),
      0
    );

    const cashPayments = cashEntries.reduce(
      (sum, entry) => sum + (entry.credit || 0),
      0
    );

    const bankAccounts = await Account.find({
      outletId: user.outletId,
      subType: AccountSubType.BANK,
      isActive: true,
    }).select('_id').lean();

    const bankEntries = await LedgerEntry.find({
      outletId: user.outletId,
      accountId: { $in: bankAccounts.map(a => a._id) },
      date: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const bankReceipts = bankEntries.reduce(
      (sum, entry) => sum + (entry.debit || 0),
      0
    );

    const bankPayments = bankEntries.reduce(
      (sum, entry) => sum + (entry.credit || 0),
      0
    );

    /* ========================================
       REVENUE (from Ledger - Credits to Sales/Revenue)
       ======================================== */
    const totalRevenue = await sumCreditsInPeriod(
      AccountType.REVENUE,
      [AccountSubType.SALES_REVENUE, AccountSubType.SERVICE_REVENUE],
      periodStart,
      periodEnd
    );

    /* ========================================
       COGS (from Ledger - Debits to COGS)
       This is the cost of goods that were SOLD
       ======================================== */
    const totalCOGS = await sumDebitsInPeriod(
      AccountType.EXPENSE,
      [AccountSubType.COGS],
      periodStart,
      periodEnd
    );

    /* ========================================
       PURCHASES (from Ledger - Debits to Inventory)
       This is inventory BOUGHT in the period
       ======================================== */
    const totalPurchases = await sumDebitsInPeriod(
      AccountType.ASSET,
      [AccountSubType.INVENTORY],
      periodStart,
      periodEnd
    );

    /* ========================================
       EXPENSES (from Ledger - Debits to Expense accounts)
       Excluding COGS which we already calculated
       ======================================== */
    const expenseSubTypes = [
      AccountSubType.OPERATING_EXPENSE,
      AccountSubType.ADMIN_EXPENSE,
    ];

    const totalExpenses = await sumDebitsInPeriod(
      AccountType.EXPENSE,
      expenseSubTypes,
      periodStart,
      periodEnd
    );

    /* ========================================
       PROFIT CALCULATION
       Gross Profit = Revenue - COGS
       Net Profit = Revenue - (COGS + Purchases + Expenses)
       ======================================== */
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = totalRevenue - (totalCOGS + totalPurchases + totalExpenses);

    /* ========================================
       SALES METRICS (for reference only)
       ======================================== */
    const sales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      saleDate: { $gte: periodStart, $lt: periodEnd },
    }).lean();

    const salesCount = sales.length;
    const totalDiscount = sales.reduce((s, x) => s + (x.totalDiscount || 0), 0);
    const totalTax = sales.reduce((s, x) => s + (x.totalVAT || 0), 0);

    // Sales by payment method (for informational purposes)
    const cashSales = sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((s, x) => s + (x.amountPaid || 0), 0);

    const bankSales = sales
      .filter(s => s.paymentMethod !== 'CASH')
      .reduce((s, x) => s + (x.amountPaid || 0), 0);

    /* ========================================
       LEDGER STATISTICS
       ======================================== */
    const periodLedgerEntries = await LedgerEntry.find({
      outletId: user.outletId,
      date: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const ledgerEntriesCount = periodLedgerEntries.length;

    const totalDebits = periodLedgerEntries.reduce(
      (sum, entry) => sum + (entry.debit || 0),
      0
    );

    const totalCredits = periodLedgerEntries.reduce(
      (sum, entry) => sum + (entry.credit || 0),
      0
    );

    const trialBalanceMatched = Math.abs(totalDebits - totalCredits) < 0.01;

    /* ========================================
       INVENTORY
       ======================================== */
    const previousClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: { $lt: closingDay },
    })
      .sort({ closingDate: -1 })
      .lean();

    const openingStock = previousClosing?.closingStock ?? 0;

    const products = await Product.find({
      outletId: user.outletId,
      isActive: true,
    }).select('currentStock costPrice').lean();

    const closingStock = products.reduce((s, p) => s + (p.currentStock || 0), 0);
    const stockValue = products.reduce(
      (s, p) => s + (p.currentStock || 0) * (p.costPrice || 0),
      0
    );

    /* ========================================
       CREATE CLOSING RECORD
       ======================================== */
    const closing = await Closing.create({
      outletId: user.outletId,
      closingType,
      closingDate: closingDay,
      periodStart,
      periodEnd,

      // Cash & Bank Balances (from Ledger)
      openingCash,
      openingBank,
      closingCash,
      closingBank,

      // Cash & Bank Movements (from Ledger)
      cashSales, // Informational only
      bankSales, // Informational only
      cashReceipts,
      cashPayments,
      bankReceipts,
      bankPayments,

      // Sales Metrics (for reference)
      salesCount,
      totalDiscount,
      totalTax,

      // Revenue (from Ledger)
      totalRevenue,

      // Costs (from Ledger)
      totalCOGS,
      totalPurchases,
      totalExpenses,

      // Profit (calculated)
      grossProfit,
      netProfit,

      // Total Balances
      totalOpeningBalance: openingCash + openingBank,
      totalClosingBalance: closingCash + closingBank,

      // Liabilities
      accountsPayable,

      // Inventory
      openingStock,
      closingStock,
      stockValue,

      // Ledger Statistics
      ledgerEntriesCount,
      totalDebits,
      totalCredits,
      trialBalanceMatched,

      // Metadata
      status: 'closed',
      closedBy: user.userId,
      closedAt: new Date(),
      notes,
    });

    return NextResponse.json({
      success: true,
      closing,
      message: 'Period closed successfully (Ledger-driven: Profit = Sales - COGS - Purchases - Expenses)',
      profitBreakdown: {
        revenue: totalRevenue,
        cogs: totalCOGS,
        purchases: totalPurchases,
        expenses: totalExpenses,
        grossProfit,
        netProfit,
      },
      ledgerStats: {
        entries: ledgerEntriesCount,
        debits: totalDebits,
        credits: totalCredits,
        balanced: trialBalanceMatched,
      },
    });

  } catch (err: any) {
    console.error('Closing error:', err);
    return NextResponse.json(
      { error: err.message || 'Closing failed' },
      { status: 500 }
    );
  }
}