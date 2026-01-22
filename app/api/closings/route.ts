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

// Type for earliest transaction results
interface EarliestTransaction {
  saleDate?: Date;
  purchaseDate?: Date;
  expenseDate?: Date;
}

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
// Helper: Get Earliest Transaction Date
// ─────────────────────────────────────────────
async function getEarliestTransactionDate(outletId: string): Promise<Date | null> {
  const [earliestSale, earliestPurchase, earliestExpense] = await Promise.all([
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
  if (earliestSale?.saleDate) dates.push(new Date(earliestSale.saleDate));
  if (earliestPurchase?.purchaseDate) dates.push(new Date(earliestPurchase.purchaseDate));
  if (earliestExpense?.expenseDate) dates.push(new Date(earliestExpense.expenseDate));

  if (dates.length === 0) return null;

  return new Date(Math.min(...dates.map(d => d.getTime())));
}

// ─────────────────────────────────────────────
// Helper: Calculate Period Boundaries
// ─────────────────────────────────────────────
interface PeriodBoundaries {
  periodStart: Date;
  periodEnd: Date;
  closingDay: Date;
  isFirstClosing: boolean;
}

async function calculatePeriodBoundaries(
  closingType: 'day' | 'month',
  closingDate: string,
  outletId: string
): Promise<PeriodBoundaries> {
  const closingDay = new Date(closingDate);
  closingDay.setHours(0, 0, 0, 0);

  let periodStart: Date;
  let periodEnd: Date;

  // Check if this is the first closing ever for this outlet
  const previousClosing = await Closing.findOne({
    outletId,
    closingType,
    closingDate: { $lt: closingDay },
  })
    .sort({ closingDate: -1 })
    .lean();

  const isFirstClosing = !previousClosing;

  if (closingType === 'day') {
    if (isFirstClosing) {
      // FIRST CLOSING: Include all historical data
      const earliestDate = await getEarliestTransactionDate(outletId);

      if (earliestDate) {
        periodStart = new Date(earliestDate);
        periodStart.setHours(0, 0, 0, 0);
      } else {
        // No historical data, start from today
        periodStart = new Date(closingDay);
        periodStart.setHours(0, 0, 0, 0);
      }

      console.log(`FIRST CLOSING: Including all data from ${periodStart.toISOString()}`);
    } else {
      // Subsequent closings: Start from day after previous closing
      const prevClosingDate = new Date(previousClosing.closingDate);
      periodStart = new Date(prevClosingDate);
      periodStart.setDate(periodStart.getDate() + 1);
      periodStart.setHours(0, 0, 0, 0);
    }

    // End time: Include transactions up to 6 AM next day (for late night operations)
    periodEnd = new Date(closingDay);
    periodEnd.setDate(periodEnd.getDate() + 1);
    periodEnd.setHours(6, 0, 0, 0); // 6 AM next day cutoff
  } else {
    // Monthly closing
    if (isFirstClosing) {
      // FIRST MONTHLY CLOSING: Include all historical data
      const earliestDate = await getEarliestTransactionDate(outletId);

      if (earliestDate) {
        periodStart = new Date(earliestDate);
        periodStart.setHours(0, 0, 0, 0);
      } else {
        // No historical data, start from beginning of month
        periodStart = new Date(closingDay.getFullYear(), closingDay.getMonth(), 1);
        periodStart.setHours(0, 0, 0, 0);
      }

      console.log(`FIRST MONTHLY CLOSING: Including all data from ${periodStart.toISOString()}`);
    } else {
      // Subsequent monthly closings: Start from month after previous closing
      const prevClosingDate = new Date(previousClosing.closingDate);
      periodStart = new Date(
        prevClosingDate.getFullYear(),
        prevClosingDate.getMonth() + 1,
        1
      );
      periodStart.setHours(0, 0, 0, 0);
    }

    // End of month + 6 hours buffer for late night operations
    periodEnd = new Date(closingDay.getFullYear(), closingDay.getMonth() + 1, 1);
    periodEnd.setHours(6, 0, 0, 0);
  }

  console.log(`Period boundaries: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  return { periodStart, periodEnd, closingDay, isFirstClosing };
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
    const { periodStart, periodEnd, closingDay, isFirstClosing } = 
      await calculatePeriodBoundaries(closingType, closingDate, user.outletId || '');

    console.log(`Closing ${closingType} for ${closingDay.toISOString()}`);
    console.log(`Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    console.log(`Is first closing: ${isFirstClosing}`);

    /* ---------------- SEQUENTIAL ENFORCEMENT (Skip for first closing) ---------------- */
    if (!isFirstClosing) {
      const previousClosing = await Closing.findOne({
        outletId: user.outletId,
        closingType,
        closingDate: { $lt: closingDay },
      })
        .sort({ closingDate: -1 })
        .lean();

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
              { 
                error: 'Previous day is not closed. Please close it first.',
                expectedDate: expectedPrev.toISOString().split('T')[0],
                lastClosedDate: new Date(previousClosing.closingDate).toISOString().split('T')[0]
              },
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
              { 
                error: 'Previous month is not closed. Please close it first.',
                expectedMonth: `${expectedPrevMonth.getFullYear()}-${String(expectedPrevMonth.getMonth() + 1).padStart(2, '0')}`,
                lastClosedMonth: `${prevClosingMonth.getFullYear()}-${String(prevClosingMonth.getMonth() + 1).padStart(2, '0')}`
              },
              { status: 400 }
            );
          }
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
    let openingCash = 0;
    let openingBank = 0;

    if (isFirstClosing) {
      // For first closing, calculate opening balance from ALL ledger entries up to and including
      // the start of the period, excluding operational transactions
      // Opening balance entries can be on the same day as first transaction - that's fine!
      
      async function getOpeningBalance(subType: AccountSubType): Promise<number> {
        console.log(`\n[DEBUG] Getting opening balance for subType: "${subType}"`);
        
        const accounts = await Account.find({
          outletId: user.outletId,
          subType: subType, // This will use the enum value directly (lowercase)
          isActive: true,
        }).select('_id name code subType').lean();

        console.log(`[DEBUG] Found ${accounts.length} accounts with subType="${subType}":`);
        accounts.forEach(acc => {
          console.log(`  - ${acc.name} (${acc.code})`);
          console.log(`    ID: ${acc._id}`);
          console.log(`    SubType: ${acc.subType}`);
        });

        if (!accounts.length) {
          console.log(`[DEBUG] No ${subType} accounts found for opening balance calculation`);
          
          // Debug: Check if ANY accounts exist for this outlet
          const allAccounts = await Account.find({
            outletId: user.outletId,
            isActive: true
          }).select('name code subType').lean();
          console.log(`[DEBUG] Total active accounts for outlet: ${allAccounts.length}`);
          if (allAccounts.length > 0) {
            console.log('[DEBUG] Sample accounts:');
            allAccounts.slice(0, 5).forEach(acc => {
              console.log(`  - ${acc.name}: subType="${acc.subType}"`);
            });
          }
          
          return 0;
        }

        const accountIds = accounts.map(a => a._id);
        console.log(`[DEBUG] Looking for ledger entries with:`);
        console.log(`  outletId: ${user.outletId}`);
        console.log(`  accountIds: [${accountIds.join(', ')}]`);
        console.log(`  date <= ${periodStart.toISOString()}`);
        
        // Get ALL entries up to period start
        const allEntriesUpToStart = await LedgerEntry.find({
          outletId: user.outletId,
          accountId: { $in: accountIds },
          date: { $lte: periodStart },
        }).lean();

        console.log(`[DEBUG] Found ${allEntriesUpToStart.length} ledger entries for ${subType} up to ${periodStart.toISOString()}`);

        if (allEntriesUpToStart.length > 0) {
          console.log('[DEBUG] Ledger entries found:');
          allEntriesUpToStart.forEach((e, i) => {
            console.log(`  ${i + 1}. Date: ${new Date(e.date).toISOString()}`);
            console.log(`     AccountId: ${e.accountId}`);
            console.log(`     Debit: ${e.debit}, Credit: ${e.credit}`);
            console.log(`     Narration: ${e.narration}`);
            console.log(`     Reference: ${e.referenceType}`);
          });
          
          // Show details of opening entries
          const openingEntries = allEntriesUpToStart.filter(e => 
            e.referenceType === 'OPENING_BALANCE' || 
            e.referenceType === 'ADJUSTMENT' ||
            (e.narration && e.narration.toLowerCase().includes('opening balance'))
          );
          
          if (openingEntries.length > 0) {
            console.log(`  → Found ${openingEntries.length} opening balance entries for ${subType}`);
          }
        } else {
          // Debug: Check if ledger entries exist at all for these accounts
          const anyEntries = await LedgerEntry.find({
            outletId: user.outletId,
            accountId: { $in: accountIds }
          }).limit(5).lean();
          
          console.log(`[DEBUG] Total ledger entries for these accounts (any date): ${anyEntries.length}`);
          if (anyEntries.length > 0) {
            console.log('[DEBUG] Sample entries (showing why they might be excluded):');
            anyEntries.forEach(e => {
              const entryDate = new Date(e.date);
              console.log(`  - Date: ${entryDate.toISOString()} (${entryDate > periodStart ? 'AFTER' : 'BEFORE'} period start)`);
              console.log(`    Amount: ${e.debit - e.credit}`);
            });
          }
        }

        // Calculate balance: Debits increase asset accounts (Cash/Bank), Credits decrease them
        const balance = allEntriesUpToStart.reduce(
          (sum, e) => sum + (e.debit || 0) - (e.credit || 0),
          0
        );

        return balance;
      }

      openingCash = await getOpeningBalance(AccountSubType.CASH); // 'cash'
      openingBank = await getOpeningBalance(AccountSubType.BANK); // 'bank'

      console.log(`First closing - Opening balances from ledger:`);
      console.log(`  Cash: ${openingCash} QAR (from entries up to ${periodStart.toISOString()})`);
      console.log(`  Bank: ${openingBank} QAR (from entries up to ${periodStart.toISOString()})`);
      console.log(`  Total Opening: ${openingCash + openingBank} QAR`);

      // If no ledger entries found but expecting opening balance, log warning
      if (openingCash === 0 && openingBank === 0) {
        console.log('⚠️  No opening balances found in ledger. If you have opening balances, please ensure:');
        console.log('   1. Opening balance ledger entries exist (can be on same day as first transaction)');
        console.log('   2. Accounts are properly set up with subType CASH or BANK');
        console.log('   3. Ledger entries are associated with correct account IDs');
        console.log('   4. Check referenceType is OPENING_BALANCE or ADJUSTMENT');
      }
    } else {
      // For subsequent closings, use previous closing's closing balances
      const previousClosing = await Closing.findOne({
        outletId: user.outletId,
        closingType,
        closingDate: { $lt: closingDay },
      })
        .sort({ closingDate: -1 })
        .lean();

      if (previousClosing) {
        openingCash = previousClosing.closingCash || 0;
        openingBank = previousClosing.closingBank || 0;
        console.log(`Subsequent closing - Opening balances from previous closing:`);
        console.log(`  Cash: ${openingCash} QAR`);
        console.log(`  Bank: ${openingBank} QAR`);
      }
    }

    /* ---------------- SALES (with late-night inclusion) ---------------- */
    const sales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      saleDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();

    console.log(`Found ${sales.length} sales in period`);

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

    console.log(`Sales totals: Revenue=${totalRevenue}, Cash=${cashSales}, Bank=${bankSales}`);

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

    console.log(`Cash payments: Purchases=${cashPurchasePayments}, Expenses=${cashExpensePayments}, Total=${cashPayments}`);

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

    console.log(`Bank payments: Purchases=${bankPurchasePayments}, Expenses=${bankExpensePayments}, Total=${bankPayments}`);

    /* ---------------- BANK CLOSING ---------------- */
    const closingBank = openingBank + bankSales - bankPayments;

    console.log(`Closing balances: Cash=${closingCash}, Bank=${closingBank}`);

    /* ---------------- TOTAL BALANCES ---------------- */
    const totalOpeningBalance = openingCash + openingBank;
    const totalClosingBalance = closingCash + closingBank;

    /* ---------------- PROFIT ---------------- */
    const totalExpenses = bankPayments + cashPayments;
    const netProfit = totalRevenue - totalExpenses;

    /* ---------------- INVENTORY (Optional - calculate if needed) ---------------- */
    const products = await Product.find({
      outletId: user.outletId,
      isActive: true,
    }).select('currentStock costPrice').lean();

    const closingStock = products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
    const stockValue = products.reduce(
      (sum, p) => sum + (p.currentStock || 0) * (p.costPrice || 0),
      0
    );

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

      totalOpeningBalance,
      totalClosingBalance,

      salesCount,
      totalDiscount,
      totalTax,

      openingStock: 0, // Can be calculated from previous closing if needed
      closingStock,
      stockValue,

      status: 'closed',
      closedBy: new mongoose.Types.ObjectId(user.userId),
      closedAt: new Date(),
      notes: isFirstClosing 
        ? `${notes || ''}\n\nNote: This is the first closing and includes all historical transactions from ${periodStart.toLocaleDateString()}.`.trim()
        : notes,

      outletId: user.outletId ? new mongoose.Types.ObjectId(user.outletId) : undefined,
    });

    console.log(`Closing created successfully: ${closing._id}`);

    // Log activity (with proper error handling)
    try {
      await ActivityLog.create({
        userId: user.userId,
        outletId: user.outletId,
        module: 'Closing',
        actionType: 'CREATE',
        description: isFirstClosing 
          ? `First ${closingType} closing created for period ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`
          : `${closingType.charAt(0).toUpperCase() + closingType.slice(1)} closing created for ${closingDay.toLocaleDateString()}`,
        username: `${user.username|| ''} ${user.username || ''}`.trim() || 'Unknown User',
        resourceType: 'Closing',
        resourceId: closing._id,
        details: {
          closingType,
          closingDate: closingDay,
          periodStart,
          periodEnd,
          isFirstClosing,
          totalRevenue,
          netProfit,
        },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });
    } catch (activityLogError) {
      // Log error but don't fail the closing
      console.error('Failed to create activity log:', activityLogError);
    }

    return NextResponse.json({ 
      success: true, 
      closing,
      message: isFirstClosing 
        ? `First ${closingType} closing created successfully! Included all transactions from ${periodStart.toLocaleDateString()}.`
        : `${closingType} closing created successfully!`
    });

  } catch (err: any) {
    console.error('Closing error:', err);
    return NextResponse.json(
      { error: err.message || 'Closing failed' },
      { status: 500 }
    );
  }
}