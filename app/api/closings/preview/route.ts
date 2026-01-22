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

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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
    const closingDay = new Date(closingDateStr);
    closingDay.setHours(0, 0, 0, 0);

    // Check if this is first closing
    const previousClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: { $lt: closingDay },
    })
      .sort({ closingDate: -1 })
      .lean();

    const isFirstClosing = !previousClosing;

    // Calculate period boundaries
    let periodStart: Date;
    let periodEnd: Date;
    let historicalDaysIncluded: number | null = null;

    if (closingType === 'day') {
      if (isFirstClosing) {
        // Find earliest transaction
        const [earliestSale, earliestPurchase, earliestExpense] = await Promise.all([
          Sale.findOne({ outletId: user.outletId }).sort({ saleDate: 1 }).select('saleDate').lean<{ saleDate: Date } | null>(),
          Purchase.findOne({ outletId: user.outletId }).sort({ purchaseDate: 1 }).select('purchaseDate').lean<{ purchaseDate: Date } | null>(),
          Expense.findOne({ outletId: user.outletId }).sort({ expenseDate: 1 }).select('expenseDate').lean<{ expenseDate: Date } | null>(),
        ]);

        const dates: Date[] = [];
        if (earliestSale?.saleDate) dates.push(new Date(earliestSale.saleDate));
        if (earliestPurchase?.purchaseDate) dates.push(new Date(earliestPurchase.purchaseDate));
        if (earliestExpense?.expenseDate) dates.push(new Date(earliestExpense.expenseDate));

        if (dates.length > 0) {
          periodStart = new Date(Math.min(...dates.map(d => d.getTime())));
          periodStart.setHours(0, 0, 0, 0);
          
          // Calculate days included
          const daysDiff = Math.floor(
            (closingDay.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          historicalDaysIncluded = daysDiff + 1;
        } else {
          periodStart = new Date(closingDay);
        }
      } else {
        const prevDate = new Date(previousClosing.closingDate);
        periodStart = new Date(prevDate);
        periodStart.setDate(periodStart.getDate() + 1);
        periodStart.setHours(0, 0, 0, 0);
      }

      // Period end with late-night buffer
      periodEnd = new Date(closingDay);
      periodEnd.setDate(periodEnd.getDate() + 1);
      periodEnd.setHours(config.lateNightCutoffHour, 0, 0, 0);
    } else {
      // Monthly
      if (isFirstClosing) {
        const [earliestSale, earliestPurchase, earliestExpense] = await Promise.all([
          Sale.findOne({ outletId: user.outletId }).sort({ saleDate: 1 }).select('saleDate').lean<{ saleDate: Date } | null>(),
          Purchase.findOne({ outletId: user.outletId }).sort({ purchaseDate: 1 }).select('purchaseDate').lean<{ purchaseDate: Date } | null>(),
          Expense.findOne({ outletId: user.outletId }).sort({ expenseDate: 1 }).select('expenseDate').lean<{ expenseDate: Date } | null>(),
        ]);

        const dates: Date[] = [];
        if (earliestSale?.saleDate) dates.push(new Date(earliestSale.saleDate));
        if (earliestPurchase?.purchaseDate) dates.push(new Date(earliestPurchase.purchaseDate));
        if (earliestExpense?.expenseDate) dates.push(new Date(earliestExpense.expenseDate));

        if (dates.length > 0) {
          periodStart = new Date(Math.min(...dates.map(d => d.getTime())));
          periodStart.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.floor(
            (closingDay.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          historicalDaysIncluded = daysDiff + 1;
        } else {
          periodStart = new Date(closingDay.getFullYear(), closingDay.getMonth(), 1);
        }
      } else {
        const prevDate = new Date(previousClosing.closingDate);
        periodStart = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
        periodStart.setHours(0, 0, 0, 0);
      }

      periodEnd = new Date(closingDay.getFullYear(), closingDay.getMonth() + 1, 1);
      periodEnd.setHours(config.lateNightCutoffHour, 0, 0, 0);
    }

    // Fetch transactions in period
    const [sales, cashPurchases, cashExpenses, bankPurchases, bankExpenses] = await Promise.all([
      Sale.find({
        outletId: user.outletId,
        status: 'COMPLETED',
        saleDate: { $gte: periodStart, $lte: periodEnd },
      }).lean(),
      
      Purchase.find({
        outletId: user.outletId,
        status: { $in: ['PAID', 'COMPLETED'] },
        paymentMethod: { $in: ['CASH'] },
        purchaseDate: { $gte: periodStart, $lte: periodEnd },
      }).lean(),
      
      Expense.find({
        outletId: user.outletId,
        status: { $in: ['PAID', 'PARTIALLY_PAID'] },
        paymentMethod: { $in: ['CASH'] },
        expenseDate: { $gte: periodStart, $lte: periodEnd },
      }).lean(),
      
      Purchase.find({
        outletId: user.outletId,
        status: { $in: ['PAID', 'COMPLETED'] },
        paymentMethod: { $in: ['CARD', 'BANK_TRANSFER'] },
        purchaseDate: { $gte: periodStart, $lte: periodEnd },
      }).lean(),
      
      Expense.find({
        outletId: user.outletId,
        status: { $in: ['PAID', 'PARTIALLY_PAID'] },
        paymentMethod: { $in: ['CARD', 'BANK_TRANSFER'] },
        expenseDate: { $gte: periodStart, $lte: periodEnd },
      }).lean(),
    ]);

    // Count late-night transactions (after midnight, before cutoff)
    const midnightCutoff = new Date(closingDay);
    midnightCutoff.setDate(midnightCutoff.getDate() + 1);
    midnightCutoff.setHours(0, 0, 0, 0);
    
    const lateNightTransactions = sales.filter(
      s => new Date(s.saleDate).getTime() >= midnightCutoff.getTime()
    ).length;

    // Calculate totals
    const cashSales = sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + (s.amountPaid || s.grandTotal || 0), 0);

    const bankSales = sales
      .filter(s => s.paymentMethod === 'CARD' || s.paymentMethod === 'BANK_TRANSFER')
      .reduce((sum, s) => sum + (s.amountPaid || s.grandTotal || 0), 0);

    const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    const cashPayments = 
      cashPurchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0) +
      cashExpenses.reduce((sum, e) => sum + (e.amountPaid || 0), 0);

    const bankPayments = 
      bankPurchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0) +
      bankExpenses.reduce((sum, e) => sum + (e.amountPaid || 0), 0);

    // Get opening balances
    let openingCash = 0;
    let openingBank = 0;

    if (isFirstClosing) {
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

        return entries.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
      }

      openingCash = await getOpeningBalance(AccountSubType.CASH);
      openingBank = await getOpeningBalance(AccountSubType.BANK);
    } else if (previousClosing) {
      openingCash = previousClosing.closingCash || 0;
      openingBank = previousClosing.closingBank || 0;
    }

    // Calculate projected closing balances
    const projectedClosingCash = openingCash + cashSales - cashPayments;
    const projectedClosingBank = openingBank + bankSales - bankPayments;

    // Generate warnings and info
    const warnings: string[] = [];
    const infos: string[] = [];

    if (projectedClosingCash < 0) {
      warnings.push('Projected closing cash balance is negative. Verify transactions.');
    }

    if (projectedClosingBank < 0) {
      warnings.push('Projected closing bank balance is negative. Verify transactions.');
    }

    if (sales.length === 0) {
      warnings.push('No sales found in this period.');
    }

    if (lateNightTransactions > 0) {
      infos.push(
        `${lateNightTransactions} transaction(s) recorded after midnight will be included due to late-night cutoff at ${config.lateNightCutoffHour}:00 AM.`
      );
    }

    if (isFirstClosing && historicalDaysIncluded && historicalDaysIncluded > 1) {
      infos.push(
        `This first closing includes ${historicalDaysIncluded} days of historical transactions.`
      );
    }

    // Format cutoff time
    const cutoffTime = config.lateNightCutoffHour === 0 
      ? 'Midnight (00:00)' 
      : `${String(config.lateNightCutoffHour).padStart(2, '0')}:00 AM`;

    return NextResponse.json({
      isFirstClosing,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      cutoffTime,
      
      salesCount: sales.length,
      totalRevenue,
      
      cashSales,
      bankSales,
      
      cashPayments,
      bankPayments,
      
      openingCash,
      openingBank,
      
      projectedClosingCash,
      projectedClosingBank,
      
      lateNightTransactions,
      historicalDaysIncluded,
      
      warnings,
      infos,
    });

  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}