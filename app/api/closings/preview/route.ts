import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import Closing from '@/lib/models/Closing';
import Expense from '@/lib/models/Expense';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Purchase from '@/lib/models/Purchase';
import Sale from '@/lib/models/Sale';
import { verifyToken } from '@/lib/auth/jwt';
import { getClosingConfig } from '@/lib/config/closingConfig';
import { connectDB } from '@/lib/db/mongodb';
import { hasPermission } from '@/lib/types/roles';

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const closingType = searchParams.get('type');
    const closingDateValue = searchParams.get('date');
    if (!['day', 'month'].includes(closingType || '') || !closingDateValue) {
      return NextResponse.json({ error: 'Valid type and date are required' }, { status: 400 });
    }
    const closingDate = new Date(closingDateValue);
    if (Number.isNaN(closingDate.getTime())) {
      return NextResponse.json({ error: 'Invalid closing date' }, { status: 400 });
    }
    closingDate.setHours(0, 0, 0, 0);
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const config = getClosingConfig(user.outletId);
    const previousClosing = await Closing.findOne({
      outletId,
      closingType,
      closingDate: { $lt: closingDate },
    }).sort({ closingDate: -1 }).lean() as any;
    const isFirstClosing = !previousClosing;

    let periodStart: Date;
    let historicalDaysIncluded: number | null = null;
    if (previousClosing) {
      periodStart = new Date(previousClosing.periodEnd);
    } else if (config.includeHistoricalDataInFirstClosing) {
      const earliest = await LedgerEntry.findOne({ outletId }).sort({ date: 1 }).select('date').lean() as any;
      periodStart = earliest?.date ? new Date(earliest.date) : new Date(closingDate);
      periodStart.setHours(0, 0, 0, 0);
      historicalDaysIncluded = Math.floor((closingDate.getTime() - periodStart.getTime()) / 86_400_000) + 1;
    } else {
      periodStart = new Date(closingDate);
    }

    const periodEnd = closingType === 'day'
      ? new Date(closingDate.getFullYear(), closingDate.getMonth(), closingDate.getDate() + 1, config.lateNightCutoffHour)
      : new Date(closingDate.getFullYear(), closingDate.getMonth() + 1, 1, config.lateNightCutoffHour);
    if (periodStart >= periodEnd) {
      return NextResponse.json({ error: 'Invalid or overlapping closing period' }, { status: 400 });
    }

    const [accounts, ledgerEntries, sales, purchases, expenses] = await Promise.all([
      Account.find({ outletId }).lean(),
      LedgerEntry.find({ outletId, date: { $lt: periodEnd } }).lean(),
      Sale.find({
        outletId,
        status: { $in: ['COMPLETED', 'REFUNDED'] },
        saleDate: { $gte: periodStart, $lt: periodEnd },
      }).lean(),
      Purchase.find({
        outletId,
        status: { $ne: 'CANCELLED' },
        purchaseDate: { $gte: periodStart, $lt: periodEnd },
      }).lean(),
      Expense.find({
        outletId,
        status: { $ne: 'CANCELLED' },
        expenseDate: { $gte: periodStart, $lt: periodEnd },
      }).lean(),
    ]);
    const accountById = new Map((accounts as any[]).map((account) => [String(account._id), account]));
    const beforeStart = (ledgerEntries as any[]).filter((entry) => new Date(entry.date) < periodStart);
    const inPeriod = (ledgerEntries as any[]).filter((entry) => new Date(entry.date) >= periodStart);
    const cashBalance = (entries: any[], subtype: AccountSubType) => round(entries.reduce((sum, entry) => {
      const account: any = accountById.get(String(entry.accountId));
      return account?.subType === subtype
        ? sum + Number(entry.debit || 0) - Number(entry.credit || 0)
        : sum;
    }, 0));

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;
    let totalPurchases = 0;
    let totalTax = 0;
    for (const entry of inPeriod) {
      const account: any = accountById.get(String(entry.accountId));
      if (!account) continue;
      if (account.subType === AccountSubType.VAT_PAYABLE) {
        totalTax += Number(entry.credit || 0) - Number(entry.debit || 0);
      }
      if (account.type === AccountType.REVENUE) {
        totalRevenue += Number(entry.credit || 0) - Number(entry.debit || 0);
      } else if (account.type === AccountType.EXPENSE && account.subType === AccountSubType.COGS) {
        totalCOGS += Number(entry.debit || 0) - Number(entry.credit || 0);
      } else if (account.type === AccountType.EXPENSE) {
        totalExpenses += Number(entry.debit || 0) - Number(entry.credit || 0);
      }
      if (account.subType === AccountSubType.INVENTORY && entry.referenceType === 'PURCHASE') {
        totalPurchases += Number(entry.debit || 0) - Number(entry.credit || 0);
      }
    }
    totalRevenue = round(totalRevenue);
    totalCOGS = round(totalCOGS);
    totalExpenses = round(totalExpenses);
    totalPurchases = round(totalPurchases);
    totalTax = round(totalTax);
    const openingCash = cashBalance(beforeStart, AccountSubType.CASH);
    const openingBank = cashBalance(beforeStart, AccountSubType.BANK);
    const projectedClosingCash = cashBalance(ledgerEntries as any[], AccountSubType.CASH);
    const projectedClosingBank = cashBalance(ledgerEntries as any[], AccountSubType.BANK);
    const grossProfit = round(totalRevenue - totalCOGS);
    const netProfit = round(grossProfit - totalExpenses);
    const totalDiscount = round((sales as any[]).reduce((sum, sale) => sum + Number(sale.totalDiscount || 0), 0));
    const unpaidPurchases = (purchases as any[]).filter((purchase) => Number(purchase.balanceDue || 0) > 0.01);

    return NextResponse.json({
      isFirstClosing,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      cutoffTime: `${String(config.lateNightCutoffHour).padStart(2, '0')}:00`,
      openingCash,
      openingBank,
      projectedClosingCash,
      projectedClosingBank,
      totalOpeningBalance: round(openingCash + openingBank),
      totalClosingBalance: round(projectedClosingCash + projectedClosingBank),
      totalRevenue,
      totalDiscount,
      totalTax,
      totalCOGS,
      totalPurchases,
      totalExpenses,
      grossProfit,
      netProfit,
      grossProfitMargin: totalRevenue ? round(grossProfit / totalRevenue * 100) : 0,
      netProfitMargin: totalRevenue ? round(netProfit / totalRevenue * 100) : 0,
      salesCount: sales.length,
      paidPurchasesCount: (purchases as any[]).filter((purchase) => Number(purchase.amountPaid || 0) > 0).length,
      unpaidPurchasesCount: unpaidPurchases.length,
      paidExpensesCount: (expenses as any[]).filter((expense) => Number(expense.amountPaid || 0) > 0).length,
      historicalDaysIncluded,
      unpaidPurchasesTotal: round(unpaidPurchases.reduce((sum, purchase) => sum + Number(purchase.balanceDue || 0), 0)),
      dataSource: 'ledger-accrual',
      note: 'Purchases are capitalized into inventory and are not deducted again from profit.',
    });
  } catch (error: any) {
    console.error('Closing preview error:', error);
    return NextResponse.json({ error: 'Failed to preview closing' }, { status: 500 });
  }
}
