import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Outlet from '@/lib/models/Outlet';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { hasPermission } from '@/lib/types/roles';

function round(value: number) {
  return Number(value.toFixed(2));
}

function addItem(items: Record<string, number>, label: string, amount: number) {
  items[label] = round((items[label] || 0) + amount);
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
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const { searchParams } = new URL(request.url);
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const [outlet, accounts, periodEntries] = await Promise.all([
      Outlet.findOne({ _id: outletId }).lean(),
      Account.find({ outletId }).lean(),
      LedgerEntry.find({ outletId, date: { $gte: fromDate, $lte: toDate } })
        .sort({ date: 1, createdAt: 1, lineNumber: 1 })
        .lean(),
    ]);
    const accountMap = new Map((accounts as any[]).map((account) => [String(account._id), account]));
    const cashIds = new Set((accounts as any[])
      .filter((account) => [AccountSubType.CASH, AccountSubType.BANK].includes(account.subType))
      .map((account) => String(account._id)));
    if (!cashIds.size) throw new Error('Cash and bank system accounts are missing');

    const openingEntries = await LedgerEntry.find({
      outletId,
      accountId: { $in: [...cashIds].map((id) => new mongoose.Types.ObjectId(id)) },
      date: { $lt: fromDate },
    }).select('debit credit').lean();
    const openingCash = round(openingEntries.reduce(
      (sum, entry) => sum + Number(entry.debit || 0) - Number(entry.credit || 0),
      0
    ));

    const byVoucher = new Map<string, any[]>();
    for (const entry of periodEntries as any[]) {
      const key = String(entry.voucherId);
      if (!byVoucher.has(key)) byVoucher.set(key, []);
      byVoucher.get(key)!.push(entry);
    }
    const operatingItems: Record<string, number> = {};
    const investingItems: Record<string, number> = {};
    const financingItems: Record<string, number> = {};
    for (const entries of byVoucher.values()) {
      const cashChange = round(entries
        .filter((entry) => cashIds.has(String(entry.accountId)))
        .reduce((sum, entry) => sum + Number(entry.debit || 0) - Number(entry.credit || 0), 0));
      if (Math.abs(cashChange) <= 0.001) continue;
      const counterpartAccounts = entries
        .filter((entry) => !cashIds.has(String(entry.accountId)))
        .map((entry) => accountMap.get(String(entry.accountId)))
        .filter(Boolean) as any[];
      const hasInvesting = counterpartAccounts.some((account) =>
        account.type === AccountType.ASSET
        && ![
          AccountSubType.CASH,
          AccountSubType.BANK,
          AccountSubType.ACCOUNTS_RECEIVABLE,
          AccountSubType.INVENTORY,
          AccountSubType.VAT_RECEIVABLE,
        ].includes(account.subType)
      );
      const hasOperating = counterpartAccounts.some((account) =>
        account.type === AccountType.REVENUE
        || account.type === AccountType.EXPENSE
        || [
          AccountSubType.ACCOUNTS_RECEIVABLE,
          AccountSubType.ACCOUNTS_PAYABLE,
          AccountSubType.INVENTORY,
          AccountSubType.VAT_RECEIVABLE,
          AccountSubType.VAT_PAYABLE,
        ].includes(account.subType)
      );
      const hasFinancing = counterpartAccounts.some((account) =>
        account.type === AccountType.EQUITY
        || (account.type === AccountType.LIABILITY
          && ![AccountSubType.ACCOUNTS_PAYABLE, AccountSubType.VAT_PAYABLE].includes(account.subType))
      );
      const label = `${entries[0].voucherNumber} — ${entries[0].narration}`;
      if (hasInvesting && !hasOperating) addItem(investingItems, label, cashChange);
      else if (hasFinancing && !hasOperating) addItem(financingItems, label, cashChange);
      else addItem(operatingItems, label, cashChange);
    }
    const netOperatingCash = round(Object.values(operatingItems).reduce((sum, value) => sum + value, 0));
    const netInvestingCash = round(Object.values(investingItems).reduce((sum, value) => sum + value, 0));
    const netFinancingCash = round(Object.values(financingItems).reduce((sum, value) => sum + value, 0));
    const netCashFlow = round(netOperatingCash + netInvestingCash + netFinancingCash);
    return NextResponse.json({
      operatingActivities: { items: operatingItems, total: netOperatingCash },
      investingActivities: { items: investingItems, total: netInvestingCash },
      financingActivities: { items: financingItems, total: netFinancingCash },
      netCashFlow,
      openingCash,
      closingCash: round(openingCash + netCashFlow),
      metadata: {
        outletName: (outlet as any)?.name || 'AutoCity',
        outletId: user.outletId,
        generatedAt: new Date().toISOString(),
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        method: 'Direct cash and bank ledger movements',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
