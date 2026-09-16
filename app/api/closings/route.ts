import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';

import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Purchase from '@/lib/models/Purchase';
import Expense from '@/lib/models/Expense';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Product from '@/lib/models/ProductEnhanced';
import Account, { AccountSubType, AccountType } from '@/lib/models/Account';

import { getClosingConfig } from '@/lib/config/closingConfig';
import { hasPermission } from '@/lib/types/roles';

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
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
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

    return NextResponse.json({
      closings: (closings as any[]).map((closing) => ({
        ...closing,
        grossProfit: Number((Number(closing.totalRevenue || 0) - Number(closing.totalCOGS || 0)).toFixed(2)),
        netProfit: Number((
          Number(closing.totalRevenue || 0)
          - Number(closing.totalCOGS || 0)
          - Number(closing.totalExpenses || 0)
        ).toFixed(2)),
      })),
    });
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
  if (Number.isNaN(closingDay.getTime())) throw new Error('Invalid closing date');
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
   
   Purchases remain capitalized inventory; operating expenses come from expense ledgers.
   
   Formula: Net Profit = Revenue - COGS - operating expenses.
   Purchases are inventory acquisitions and are informational only.
   ========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageAccounting')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const { closingType, closingDate, notes } = await req.json();

    if (!['day', 'month'].includes(closingType) || !closingDate) {
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
        { success: true, closing: exists, idempotent: true, message: 'This period is already closed' }
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
      }).select('_id').lean();

      if (accounts.length === 0) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $lt: upto },
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
      const accountQuery: any = {
        outletId: user.outletId,
        type: accountType,
      };
      if (subTypes.length) accountQuery.subType = { $in: subTypes };
      const accounts = await Account.find(accountQuery).select('_id').lean();

      if (accounts.length === 0) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $gte: start, $lt: end },
      }).lean();

      return entries.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
    }

    async function sumNetAmountInPeriod(
      accountType: AccountType,
      subTypes: AccountSubType[],
      start: Date,
      end: Date
    ): Promise<number> {
      const accountQuery: any = {
        outletId: user.outletId,
        type: accountType,
      };
      if (subTypes.length) accountQuery.subType = { $in: subTypes };
      const accounts = await Account.find(accountQuery).select('_id').lean();
    
      if (!accounts.length) return 0;
    
      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $gte: start, $lt: end },
      }).lean();
    
      // ✅ CREDIT increases revenue, DEBIT reduces revenue
      return entries.reduce(
        (sum, e) => sum + (e.credit || 0) - (e.debit || 0),
        0
      );
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
      }).select('_id').lean();

      if (accounts.length === 0) return 0;

      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: accounts.map(a => a._id) },
        date: { $gte: start, $lt: end },
      }).lean();

      return entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    }

    /* ========================================
       NEW: Calculate Purchases from Ledger Entries
       
       Logic:
       - Find all ledger entries with referenceType="PURCHASE"
       - These represent purchase transactions
       - Sum the CREDIT amounts from Cash/Bank accounts (money paid out)
       - This gives us the total cash basis purchases for the period
       ======================================== */
    async function calculatePurchasesFromLedger(
      start: Date,
      end: Date
    ): Promise<{
      totalPurchases: number;
      purchasesCount: number;
      purchaseEntries: any[];
    }> {
      const inventoryAccounts = await Account.find({
        outletId: user.outletId,
        subType: AccountSubType.INVENTORY,
      }).select('_id').lean();

      if (inventoryAccounts.length === 0) {
        return { totalPurchases: 0, purchasesCount: 0, purchaseEntries: [] };
      }

      // Inventory purchases are capitalized; this total is informational only.
      const purchaseEntries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: inventoryAccounts.map(a => a._id) },
        referenceType: 'PURCHASE',
        date: { $gte: start, $lt: end },
      }).lean();

      const totalPurchases = purchaseEntries.reduce(
        (sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0),
        0
      );

      // Count unique purchase transactions (by referenceId)
      const uniquePurchaseIds = new Set(
        purchaseEntries
          .map(e => e.referenceId?.toString())
          .filter(Boolean)
      );
      const purchasesCount = uniquePurchaseIds.size;

      return { totalPurchases, purchasesCount, purchaseEntries };
    }

    /* ========================================
       NEW: Calculate Expenses from Ledger Entries
       
       Logic:
       - Find ledger entries with narration containing "Expense payment"
       - These represent expense transactions
       - Sum the CREDIT amounts from Cash/Bank accounts (money paid out)
       - This gives us the total cash basis expenses for the period
       ======================================== */
    async function calculateExpensesFromLedger(
      start: Date,
      end: Date
    ): Promise<{
      totalExpenses: number;
      expensesCount: number;
      expenseEntries: any[];
    }> {
      const expenseAccounts = await Account.find({
        outletId: user.outletId,
        type: AccountType.EXPENSE,
        subType: { $ne: AccountSubType.COGS },
      }).select('_id').lean();

      if (expenseAccounts.length === 0) {
        return { totalExpenses: 0, expensesCount: 0, expenseEntries: [] };
      }

      const expenseEntries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: expenseAccounts.map(a => a._id) },
        date: { $gte: start, $lt: end },
      }).lean();

      const totalExpenses = expenseEntries.reduce(
        (sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0),
        0
      );

      // Count unique expense transactions (by referenceId or voucherId)
      const uniqueExpenseIds = new Set(
        expenseEntries
          .map(e => e.referenceId?.toString() || e.voucherId?.toString())
          .filter(Boolean)
      );
      const expensesCount = uniqueExpenseIds.size;

      return { totalExpenses, expensesCount, expenseEntries };
    }

    /* ========================================
       SALES METRICS (needed first for revenue calculation)
       ======================================== */
    const sales = await Sale.find({
      outletId: user.outletId,
      status: { $in: ['COMPLETED', 'REFUNDED'] },
      saleDate: { $gte: periodStart, $lt: periodEnd },
    }).lean();

    const salesCount = sales.length;
    const totalDiscount = sales.reduce((s, x) => s + (x.totalDiscount || 0), 0);
    const totalTax = await sumNetAmountInPeriod(
      AccountType.LIABILITY,
      [AccountSubType.VAT_PAYABLE],
      periodStart,
      periodEnd
    );

    // Sales by payment method (for informational purposes)
    const cashSales = sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((s, x) => s + (x.amountPaid || 0), 0);

    const bankSales = sales
      .filter(s => s.paymentMethod !== 'CASH')
      .reduce((s, x) => s + (x.amountPaid || 0), 0);

    /* ========================================
       REVENUE - Net of Discounts
       ======================================== */
    const totalRevenue = await sumNetAmountInPeriod(
      AccountType.REVENUE,
      [],
      periodStart,
      periodEnd
    );

    /* ========================================
       CASH & BANK BALANCES (from Ledger)
       ======================================== */
    const openingCash = await ledgerBalance([AccountSubType.CASH], periodStart);
    const openingBank = await ledgerBalance([AccountSubType.BANK], periodStart);

    const closingCash = await ledgerBalance([AccountSubType.CASH], periodEnd);
    const closingBank = await ledgerBalance([AccountSubType.BANK], periodEnd);
    
    const accountsPayable = -await ledgerBalance(
      [AccountSubType.ACCOUNTS_PAYABLE],
      periodEnd
    );

    /* ========================================
       CASH & BANK MOVEMENTS (from Ledger)
       ======================================== */
    const cashAccounts = await Account.find({
      outletId: user.outletId,
      subType: AccountSubType.CASH,
    }).select('_id').lean();

    const cashEntries = await LedgerEntry.find({
      outletId: user.outletId,
      accountId: { $in: cashAccounts.map(a => a._id) },
      date: { $gte: periodStart, $lt: periodEnd },
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
    }).select('_id').lean();

    const bankEntries = await LedgerEntry.find({
      outletId: user.outletId,
      accountId: { $in: bankAccounts.map(a => a._id) },
      date: { $gte: periodStart, $lt: periodEnd },
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
       PURCHASES (from Ledger Entries)
       
       NEW APPROACH: Calculate from ledger entries with referenceType="PURCHASE"
       This represents actual cash payments made for purchases during the period
       ======================================== */
    const {
      totalPurchases,
      purchasesCount,
      purchaseEntries
    } = await calculatePurchasesFromLedger(periodStart, periodEnd);

    /* ========================================
       EXPENSES (from Ledger Entries)
       
       NEW APPROACH: Calculate from ledger entries with "Expense payment" narration
       This represents actual cash payments made for expenses during the period
       ======================================== */
    const {
      totalExpenses,
      expensesCount,
      expenseEntries
    } = await calculateExpensesFromLedger(periodStart, periodEnd);

    /* ========================================
       ADDITIONAL METRICS FOR REPORTING
       
       Get counts from source documents for reference/verification
       ======================================== */
    const allPurchases = await Purchase.find({
      outletId: user.outletId,
      purchaseDate: { $gte: periodStart, $lt: periodEnd },
      status: { $ne: 'CANCELLED' },
    }).lean();

    const allExpenses = await Expense.find({
      outletId: user.outletId,
      expenseDate: { $gte: periodStart, $lt: periodEnd },
      status: { $ne: 'CANCELLED' },
    }).lean();

    // Separate paid and unpaid for reporting
    const paidPurchasesFromDocs = allPurchases.filter(
      p => p.status === 'PAID' || (p.amountPaid && p.amountPaid > 0)
    );

    const unpaidPurchases = allPurchases.filter(
      p => (!p.amountPaid || p.amountPaid === 0) && p.status !== 'PAID'
    );

    const unpaidPurchasesTotal = unpaidPurchases.reduce(
      (sum, p) => sum + (p.grandTotal || 0),
      0
    );

    /* ========================================
       PROFIT CALCULATION
       
       Revenue is NET of discounts (from grandTotal)
       Purchases are inventory acquisitions and are not deducted from profit.
       
       Gross Profit = Revenue - COGS
       Net Profit = Revenue - COGS - Operating Expenses
       ======================================== */
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    /* ========================================
       LEDGER STATISTICS
       ======================================== */
    const periodLedgerEntries = await LedgerEntry.find({
      outletId: user.outletId,
      date: { $gte: periodStart, $lt: periodEnd },
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
      closingKey: `${closingType}:${closingDay.toISOString().slice(0, 10)}`,
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
      totalDiscount,  // Tracked separately for reporting
      totalTax,

      // Revenue (NET of discounts)
      totalRevenue,

      // Costs (from Ledger Entries)
      totalCOGS,        // From ledger COGS entries
      totalPurchases,   // From ledger entries with referenceType="PURCHASE"
      totalExpenses,    // From ledger entries with "Expense payment" narration

      // Profit (calculated from net revenue and ledger-based costs)
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

      // Counts (from ledger entries)
      purchasesCount,
      expensesCount,

      // Metadata
      status: 'closed',
      closedBy: user.userId,
      closedAt: new Date(),
      notes,
    });

    return NextResponse.json({
      success: true,
      closing,
      message: 'Period closed successfully (ledger-based accrual accounting)',
      profitBreakdown: {
        revenue: totalRevenue,
        revenueNote: 'Net of discounts (from grandTotal)',
        discounts: totalDiscount,
        cogs: totalCOGS,
        purchases: totalPurchases,
        purchasesNote: 'Capitalized inventory purchases; shown for information and not deducted from profit',
        expenses: totalExpenses,
        expensesNote: 'Net operating expense postings from the ledger',
        grossProfit,
        netProfit,
        formula: 'Net Profit = Revenue - COGS - Operating Expenses',
      },
      ledgerStats: {
        entries: ledgerEntriesCount,
        debits: totalDebits,
        credits: totalCredits,
        balanced: trialBalanceMatched,
      },
      transactionCounts: {
        sales: salesCount,
        purchasesFromLedger: purchasesCount,
        expensesFromLedger: expensesCount,
        purchaseLedgerEntries: purchaseEntries.length,
        expenseLedgerEntries: expenseEntries.length,
      },
      documentCounts: {
        totalPurchaseDocs: allPurchases.length,
        paidPurchaseDocs: paidPurchasesFromDocs.length,
        unpaidPurchaseDocs: unpaidPurchases.length,
        totalExpenseDocs: allExpenses.length,
      },
      creditInfo: {
        unpaidPurchasesCount: unpaidPurchases.length,
        unpaidPurchasesTotal,
        accountsPayable,
        note: 'Unpaid purchases are tracked in Accounts Payable but not deducted from profit until paid (reflected in ledger)',
      },
      ledgerCalculationDetails: {
        purchaseCalculation: `Found ${purchaseEntries.length} ledger entries with referenceType="PURCHASE" totaling ${totalPurchases}`,
        expenseCalculation: `Found ${expenseEntries.length} ledger entries with "Expense payment" narration totaling ${totalExpenses}`,
        verificationNote: 'Purchases and expenses are calculated from actual ledger entries representing cash flows',
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
