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
   
   UPDATED: Calculate purchases and expenses from ledger entries
   - Purchases: Credits to Cash/Bank accounts with referenceType="PURCHASE"
   - Expenses: Credits to Cash/Bank accounts with narration containing "Expense payment"
   
   Formula: Net Profit = Revenue - (COGS + Purchases + Expenses)
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

    async function sumNetAmountInPeriod(
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
      // Get Cash and Bank account IDs
      const cashBankAccounts = await Account.find({
        outletId: user.outletId,
        subType: { $in: [AccountSubType.CASH, AccountSubType.BANK] },
        isActive: true,
      }).select('_id').lean();

      if (cashBankAccounts.length === 0) {
        return { totalPurchases: 0, purchasesCount: 0, purchaseEntries: [] };
      }

      // Find all purchase-related ledger entries where cash/bank was credited (paid out)
      const purchaseEntries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: cashBankAccounts.map(a => a._id) },
        referenceType: 'PURCHASE',
        date: { $gte: start, $lte: end },
        credit: { $gt: 0 }, // Only entries where money was paid (credited from cash/bank)
      }).lean();

      // Calculate total purchases (sum of credits = money paid out)
      const totalPurchases = purchaseEntries.reduce(
        (sum, entry) => sum + (entry.credit || 0),
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
      // Get Cash and Bank account IDs
      const cashBankAccounts = await Account.find({
        outletId: user.outletId,
        subType: { $in: [AccountSubType.CASH, AccountSubType.BANK] },
        isActive: true,
      }).select('_id').lean();

      if (cashBankAccounts.length === 0) {
        return { totalExpenses: 0, expensesCount: 0, expenseEntries: [] };
      }

      // Find all expense-related ledger entries where cash/bank was credited (paid out)
      const expenseEntries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: { $in: cashBankAccounts.map(a => a._id) },
        narration: { $regex: /Expense payment/i },
        date: { $gte: start, $lte: end },
        credit: { $gt: 0 }, // Only entries where money was paid (credited from cash/bank)
      }).lean();

      // Calculate total expenses (sum of credits = money paid out)
      const totalExpenses = expenseEntries.reduce(
        (sum, entry) => sum + (entry.credit || 0),
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
       REVENUE - Net of Discounts
       ======================================== */
    let totalRevenue = await sumNetAmountInPeriod(
      AccountType.REVENUE,
      [AccountSubType.SALES_REVENUE, AccountSubType.SERVICE_REVENUE],
      periodStart,
      periodEnd
    );

    // Fallback: If no ledger revenue found, calculate from sales
    if (totalRevenue === 0 && sales.length > 0) {
      totalRevenue = sales.reduce((s, x) => s + (x.grandTotal || 0), 0);
      console.warn(
        'No revenue found in ledger. Using sales grandTotal. ' +
        'Ensure sales are creating ledger entries with revenue account.'
      );
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
      purchaseDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    const allExpenses = await Expense.find({
      outletId: user.outletId,
      expenseDate: { $gte: periodStart, $lte: periodEnd },
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
       Only PAID purchases and expenses are deducted (from ledger)
       
       Gross Profit = Revenue - COGS
       Net Profit = Revenue - (COGS + Paid Purchases + Paid Expenses)
       ======================================== */
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = totalRevenue - (totalCOGS + totalPurchases + totalExpenses);

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
      message: 'Period closed successfully (Ledger-Based Cash Accounting)',
      profitBreakdown: {
        revenue: totalRevenue,
        revenueNote: 'Net of discounts (from grandTotal)',
        discounts: totalDiscount,
        cogs: totalCOGS,
        purchases: totalPurchases,
        purchasesNote: 'Calculated from ledger entries (referenceType=PURCHASE)',
        expenses: totalExpenses,
        expensesNote: 'Calculated from ledger entries (Expense payment narration)',
        grossProfit,
        netProfit,
        formula: 'Net Profit = Revenue - (COGS + Ledger Purchases + Ledger Expenses)',
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