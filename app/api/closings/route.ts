import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';

import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Product from '@/lib/models/ProductEnhanced';
import Account, { AccountSubType } from '@/lib/models/Account';
import Purchase from '@/lib/models/Purchase';
import Expense from '@/lib/models/Expense';

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

  const [sale, purchase, expense] = await Promise.all([
    Sale.findOne({ outletId })
      .sort({ saleDate: 1 })
      .select('saleDate')
      .lean<{ saleDate: Date } | null>(),

    Purchase.findOne({ outletId })
      .sort({ purchaseDate: 1 })
      .select('purchaseDate')
      .lean<{ purchaseDate: Date } | null>(),

    Expense.findOne({ outletId })
      .sort({ expenseDate: 1 })
      .select('expenseDate')
      .lean<{ expenseDate: Date } | null>(),
  ]);

  const dates: Date[] = [];

  if (sale?.saleDate) {
    dates.push(new Date(sale.saleDate));
  }

  if (purchase?.purchaseDate) {
    dates.push(new Date(purchase.purchaseDate));
  }

  if (expense?.expenseDate) {
    dates.push(new Date(expense.expenseDate));
  }

  if (!dates.length) return null;

  return new Date(Math.min(...dates.map(d => d.getTime())));
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
   POST /api/closings
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

    /* ---------- LEDGER HELPER ---------- */
    async function ledgerBalance(subTypes: AccountSubType[], upto: Date) {
      const accounts = await Account.find({
        outletId: user.outletId,
        subType: { $in: subTypes },
        isActive: true,
      }).select('_id').lean();

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

    const openingCutoff = new Date(periodStart.getTime() - 1);

    const openingCash = await ledgerBalance([AccountSubType.CASH], openingCutoff);
    const openingBank = await ledgerBalance([AccountSubType.BANK], openingCutoff);

    const closingCash = await ledgerBalance([AccountSubType.CASH], periodEnd);
    const closingBank = await ledgerBalance([AccountSubType.BANK], periodEnd);
    const accountsPayable = await ledgerBalance(
      [AccountSubType.ACCOUNTS_PAYABLE],
      periodEnd
    );

    /* ---------- LEDGER STATISTICS ---------- */
    // Get all ledger entries within the period
    const periodLedgerEntries = await LedgerEntry.find({
      outletId: user.outletId,
      date: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const ledgerEntriesCount = periodLedgerEntries.length;

    // Calculate total debits and credits for the period
    const totalDebits = periodLedgerEntries.reduce(
      (sum, entry) => sum + (entry.debit || 0),
      0
    );

    const totalCredits = periodLedgerEntries.reduce(
      (sum, entry) => sum + (entry.credit || 0),
      0
    );

    // Check if trial balance matches (debits should equal credits)
    const trialBalanceMatched = Math.abs(totalDebits - totalCredits) < 0.01; // Allow for rounding errors

    // Calculate cash movements from ledger
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

    // Calculate bank movements from ledger
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

    const bankPayments = bankEntries.reduce(
      (sum, entry) => sum + (entry.credit || 0),
      0
    );

    /* ---------- DOCUMENT METRICS ---------- */
    const sales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      saleDate: { $gte: periodStart, $lt: periodEnd },
    }).lean();

    const purchases = await Purchase.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'COMPLETED'] },
      purchaseDate: { $gte: periodStart, $lt: periodEnd },
    }).lean();

    const expenses = await Expense.find({
      outletId: user.outletId,
      status: { $in: ['PAID', 'PARTIALLY_PAID'] },
      expenseDate: { $gte: periodStart, $lt: periodEnd },
    }).lean();

    const salesCount = sales.length;
    const purchasesCount = purchases.length;
    const expensesCount = expenses.length;

    const totalRevenue = sales.reduce((s, x) => s + (x.grandTotal || 0), 0);
    const totalDiscount = sales.reduce((s, x) => s + (x.totalDiscount || 0), 0);
    const totalTax = sales.reduce((s, x) => s + (x.totalVAT || 0), 0);

    const cashSales = sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((s, x) => s + (x.amountPaid || 0), 0);

    const bankSales = sales
      .filter(s => s.paymentMethod !== 'CASH')
      .reduce((s, x) => s + (x.amountPaid || 0), 0);

    const totalPurchases = purchases.reduce((s, x) => s + (x.amountPaid || 0), 0);
    const totalExpensesOnly = expenses.reduce((s, x) => s + (x.amountPaid || 0), 0);

    const netProfit = totalRevenue - (totalPurchases + totalExpensesOnly);

    /* ---------- INVENTORY ---------- */
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

    /* ---------- CREATE ---------- */
    const closing = await Closing.create({
      outletId: user.outletId,
      closingType,
      closingDate: closingDay,
      periodStart,
      periodEnd,

      openingCash,
      openingBank,
      closingCash,
      closingBank,

      cashSales,
      bankSales,
      cashReceipts,
      cashPayments,
      bankPayments,

      salesCount,
      purchasesCount,
      expensesCount,

      totalRevenue,
      totalDiscount,
      totalTax,

      totalPurchases,
      totalExpenses: totalExpensesOnly,
      netProfit,

      totalOpeningBalance: openingCash + openingBank,
      totalClosingBalance: closingCash + closingBank,

      accountsPayable,

      openingStock,
      closingStock,
      stockValue,

      // Ledger statistics
      ledgerEntriesCount,
      totalDebits,
      totalCredits,
      trialBalanceMatched,

      status: 'closed',
      closedBy: user.userId,
      closedAt: new Date(),
      notes,
    });

    return NextResponse.json({
      success: true,
      closing,
      message: 'Period closed successfully (ledger-driven, no overlap, 3AM cutoff)',
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