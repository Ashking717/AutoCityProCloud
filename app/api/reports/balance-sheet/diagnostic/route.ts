import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { calculateBalanceChange } from '@/lib/services/balanceEngine';
import { hasPermission } from '@/lib/types/roles';

interface DiagnosticRecommendation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  action: string;
  missing?: string[];
  count?: number;
  difference?: number;
}

const REQUIRED_SYSTEM_ACCOUNTS = [
  AccountSubType.CASH,
  AccountSubType.BANK,
  AccountSubType.ACCOUNTS_RECEIVABLE,
  AccountSubType.ACCOUNTS_PAYABLE,
  AccountSubType.INVENTORY,
  AccountSubType.VAT_RECEIVABLE,
  AccountSubType.VAT_PAYABLE,
  AccountSubType.OWNER_EQUITY,
  AccountSubType.SALES_REVENUE,
  AccountSubType.SERVICE_REVENUE,
  AccountSubType.SALES_RETURNS,
  AccountSubType.COGS,
  AccountSubType.INVENTORY_ADJUSTMENT,
];

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function GET(_request: NextRequest) {
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
    const [accounts, ledgerEntries, voucherBalances] = await Promise.all([
      Account.find({ outletId }).lean(),
      LedgerEntry.find({ outletId }).lean(),
      LedgerEntry.aggregate([
        { $match: { outletId } },
        {
          $group: {
            _id: '$voucherId',
            voucherNumber: { $first: '$voucherNumber' },
            debit: { $sum: '$debit' },
            credit: { $sum: '$credit' },
            lineCount: { $sum: 1 },
          },
        },
        { $addFields: { difference: { $subtract: ['$debit', '$credit'] } } },
        { $match: { $expr: { $gt: [{ $abs: '$difference' }, 0.01] } } },
        { $sort: { voucherNumber: 1 } },
      ]),
    ]);

    const accountById = new Map((accounts as any[]).map((account) => [String(account._id), account]));
    const systemAccountsByType: Record<string, any> = {};
    for (const account of accounts as any[]) {
      if (account.isSystem && account.isActive && account.subType) {
        systemAccountsByType[account.subType] = {
          id: account._id,
          code: account.code,
          name: account.name,
          type: account.type,
        };
      }
    }
    const missingSystemAccounts = REQUIRED_SYSTEM_ACCOUNTS.filter(
      (subType) => !systemAccountsByType[subType]
    );

    const accountTotals = new Map<string, { debit: number; credit: number }>();
    let totalDebit = 0;
    let totalCredit = 0;
    const orphanedEntries: any[] = [];
    const malformedEntries: any[] = [];
    for (const entry of ledgerEntries as any[]) {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      totalDebit += debit;
      totalCredit += credit;
      const accountId = String(entry.accountId);
      const current = accountTotals.get(accountId) || { debit: 0, credit: 0 };
      current.debit += debit;
      current.credit += credit;
      accountTotals.set(accountId, current);
      if (!accountById.has(accountId)) orphanedEntries.push(entry);
      if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0 || (debit > 0) === (credit > 0)) {
        malformedEntries.push(entry);
      }
    }

    const balancesByType: Record<AccountType, { total: number; count: number; accounts: any[] }> = {
      [AccountType.ASSET]: { total: 0, count: 0, accounts: [] },
      [AccountType.LIABILITY]: { total: 0, count: 0, accounts: [] },
      [AccountType.EQUITY]: { total: 0, count: 0, accounts: [] },
      [AccountType.REVENUE]: { total: 0, count: 0, accounts: [] },
      [AccountType.EXPENSE]: { total: 0, count: 0, accounts: [] },
    };
    for (const account of accounts as any[]) {
      const bucket = balancesByType[account.type as AccountType];
      if (!bucket) continue;
      bucket.count += 1;
      const totals = accountTotals.get(String(account._id)) || { debit: 0, credit: 0 };
      const balance = round(calculateBalanceChange(account.type, totals.debit, totals.credit));
      bucket.total = round(bucket.total + balance);
      if (Math.abs(balance) > 0.01) {
        bucket.accounts.push({
          code: account.code,
          name: account.name,
          subType: account.subType,
          isActive: account.isActive,
          balance,
        });
      }
    }

    const assets = balancesByType[AccountType.ASSET].total;
    const liabilities = balancesByType[AccountType.LIABILITY].total;
    const equity = balancesByType[AccountType.EQUITY].total;
    const revenue = balancesByType[AccountType.REVENUE].total;
    const expenses = balancesByType[AccountType.EXPENSE].total;
    const netIncome = round(revenue - expenses);
    const equationDifference = round(assets - liabilities - equity - netIncome);
    const ledgerDifference = round(totalDebit - totalCredit);
    const recommendations: DiagnosticRecommendation[] = [];

    if (missingSystemAccounts.length) {
      recommendations.push({
        severity: 'critical',
        issue: 'Missing active system accounts',
        missing: missingSystemAccounts,
        action: 'Initialize the missing system accounts before posting more transactions.',
      });
    }
    if (Math.abs(ledgerDifference) > 0.01 || voucherBalances.length) {
      recommendations.push({
        severity: 'critical',
        issue: 'Unbalanced immutable ledger entries detected',
        difference: ledgerDifference,
        count: voucherBalances.length,
        action: 'Create audited correction vouchers for the listed vouchers; do not edit ledger entries.',
      });
    }
    if (orphanedEntries.length) {
      recommendations.push({
        severity: 'high',
        issue: 'Ledger entries reference missing accounts',
        count: orphanedEntries.length,
        action: 'Restore the referenced account records or post an audited correction after review.',
      });
    }
    if (malformedEntries.length) {
      recommendations.push({
        severity: 'critical',
        issue: 'Malformed debit/credit lines detected',
        count: malformedEntries.length,
        action: 'Review the source vouchers and create audited correction vouchers.',
      });
    }
    if (Math.abs(equationDifference) > 0.01) {
      recommendations.push({
        severity: 'critical',
        issue: 'Accounting equation is not balanced',
        difference: equationDifference,
        action: 'Review orphaned accounts, invalid account types, and unbalanced vouchers.',
      });
    }

    return NextResponse.json({
      diagnostic: {
        timestamp: new Date().toISOString(),
        outletId: user.outletId,
        systemAccounts: {
          configured: systemAccountsByType,
          missing: missingSystemAccounts,
          allPresent: missingSystemAccounts.length === 0,
        },
        accountSummary: {
          totalAccounts: accounts.length,
          byType: Object.fromEntries(
            Object.entries(balancesByType).map(([type, value]) => [type, value.count])
          ),
        },
        balances: balancesByType,
        accountingEquation: {
          assets,
          liabilities,
          equity,
          revenue,
          expenses,
          netIncome,
          leftSide: assets,
          rightSide: round(liabilities + equity + netIncome),
          difference: equationDifference,
          isBalanced: Math.abs(equationDifference) <= 0.01,
          formula: 'Assets = Liabilities + Equity + Net Income',
        },
        ledgerHealth: {
          totalEntries: ledgerEntries.length,
          totalDebit: round(totalDebit),
          totalCredit: round(totalCredit),
          difference: ledgerDifference,
          isBalanced: Math.abs(ledgerDifference) <= 0.01,
          unbalancedVouchers: voucherBalances.slice(0, 50).map((voucher: any) => ({
            voucherId: voucher._id,
            voucherNumber: voucher.voucherNumber,
            debit: round(voucher.debit),
            credit: round(voucher.credit),
            difference: round(voucher.difference),
            lineCount: voucher.lineCount,
          })),
          orphanedEntries: orphanedEntries.length,
          orphanedDetails: orphanedEntries.slice(0, 20).map((entry) => ({
            voucherNumber: entry.voucherNumber,
            accountId: entry.accountId,
            debit: entry.debit,
            credit: entry.credit,
          })),
          malformedEntries: malformedEntries.length,
          malformedDetails: malformedEntries.slice(0, 20).map((entry) => ({
            voucherNumber: entry.voucherNumber,
            accountId: entry.accountId,
            debit: entry.debit,
            credit: entry.credit,
          })),
        },
        recommendations,
      },
    });
  } catch (error: any) {
    console.error('Balance sheet diagnostic error:', error);
    return NextResponse.json({ error: 'Failed to generate accounting diagnostic' }, { status: 500 });
  }
}
