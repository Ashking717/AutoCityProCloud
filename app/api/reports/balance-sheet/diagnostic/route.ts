// app/api/reports/balance-sheet/diagnostic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// Type for diagnostic recommendations
interface DiagnosticRecommendation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  action: string;
  missing?: string[];
  count?: number;
  difference?: number;
}

/**
 * Diagnostic endpoint to help identify balance sheet issues
 * Access: GET /api/reports/balance-sheet/diagnostic
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    // 1. Check System Accounts (case-insensitive)
    const systemAccounts = await Account.find({
      outletId: user.outletId,
      isSystem: true,
      isActive: true
    }).lean();
    
    const systemAccountsByType: any = {};
    systemAccounts.forEach(acc => {
      const subType = acc.subType?.toString().toLowerCase();
      if (subType) {
        systemAccountsByType[subType] = {
          id: acc._id,
          code: acc.code,
          name: acc.name,
          type: acc.type?.toString().toLowerCase()
        };
      }
    });
    
    const requiredSystemAccounts = [
      'cash',
      'bank',
      'accounts_receivable',
      'accounts_payable',
      'inventory',
      'sales_revenue',
      'service_revenue',
      'cogs',
      'cost_of_goods_sold' // Also check for full name
    ];
    
    // Check for COGS with either name
    const hasCogs = systemAccountsByType['cogs'] || systemAccountsByType['cost_of_goods_sold'];
    if (hasCogs && !systemAccountsByType['cogs']) {
      systemAccountsByType['cogs'] = systemAccountsByType['cost_of_goods_sold'];
    }
    
    const missingSystemAccounts = requiredSystemAccounts.filter(
      type => {
        if (type === 'cost_of_goods_sold') return false; // Skip duplicate check
        return !systemAccountsByType[type];
      }
    );
    
    // 2. Check all accounts by type (case-insensitive)
    const allAccounts = await Account.find({
      outletId: user.outletId,
      isActive: true
    }).lean();
    
    const accountsByType = {
      asset: allAccounts.filter(a => a.type?.toString().toLowerCase() === 'asset'),
      liability: allAccounts.filter(a => a.type?.toString().toLowerCase() === 'liability'),
      equity: allAccounts.filter(a => a.type?.toString().toLowerCase() === 'equity'),
      revenue: allAccounts.filter(a => a.type?.toString().toLowerCase() === 'revenue'),
      expense: allAccounts.filter(a => a.type?.toString().toLowerCase() === 'expense')
    };
    
    // 3. Calculate balances for each account type
    const balancesByType: any = {};
    
    for (const [type, accounts] of Object.entries(accountsByType)) {
      let totalBalance = 0;
      const accountDetails = [];
      
      for (const account of accounts) {
        const balance = await calculateAccountBalance(
          account._id,
          user.outletId,
          type as string
        );
        
        totalBalance += balance;
        
        if (Math.abs(balance) > 0.01) {
          accountDetails.push({
            code: account.code,
            name: account.name,
            subType: account.subType?.toString().toLowerCase(),
            balance: Math.round(balance * 100) / 100
          });
        }
      }
      
      balancesByType[type] = {
        total: Math.round(totalBalance * 100) / 100,
        count: accounts.length,
        activeAccounts: accountDetails
      };
    }
    
    // 4. Check accounting equation
    const totalAssets = balancesByType.asset.total;
    const totalLiabilities = balancesByType.liability.total;
    const totalEquity = balancesByType.equity.total;
    const netIncome = balancesByType.revenue.total - balancesByType.expense.total;
    
    const leftSide = totalAssets;
    const rightSide = totalLiabilities + totalEquity + netIncome;
    const difference = leftSide - rightSide;
    const isBalanced = Math.abs(difference) < 0.01;
    
    // 5. Check for ledger entries without accounts
    const ledgerEntries = await LedgerEntry.find({
      outletId: user.outletId
    }).lean();
    
    const accountIds = new Set(allAccounts.map((a: any) => a._id.toString()));
    const orphanedEntries = ledgerEntries.filter(
      entry => !accountIds.has(entry.accountId.toString())
    );
    
    // 6. Check for duplicate voucher numbers
    const voucherNumbers = await LedgerEntry.distinct('voucherNumber', {
      outletId: user.outletId
    });
    
    // Initialize recommendations array with proper typing
    const recommendations: DiagnosticRecommendation[] = [];
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      outletId: user.outletId,
      
      systemAccounts: {
        configured: systemAccountsByType,
        missing: missingSystemAccounts,
        allPresent: missingSystemAccounts.length === 0
      },
      
      accountSummary: {
        totalAccounts: allAccounts.length,
        byType: Object.fromEntries(
          Object.entries(accountsByType).map(([type, accounts]) => [
            type,
            accounts.length
          ])
        )
      },
      
      balances: balancesByType,
      
      accountingEquation: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        netIncome: Math.round(netIncome * 100) / 100,
        revenue: balancesByType.revenue.total,
        expenses: balancesByType.expense.total,
        leftSide,
        rightSide,
        difference: Math.round(difference * 100) / 100,
        isBalanced,
        formula: 'Assets = Liabilities + Equity + Net Income'
      },
      
      ledgerHealth: {
        totalEntries: ledgerEntries.length,
        uniqueVouchers: voucherNumbers.length,
        orphanedEntries: orphanedEntries.length,
        orphanedDetails: orphanedEntries.slice(0, 5).map(e => ({
          voucherNumber: e.voucherNumber,
          accountId: e.accountId,
          debit: e.debit,
          credit: e.credit
        }))
      },
      
      recommendations
    };
    
    // Add recommendations
    if (missingSystemAccounts.length > 0) {
      recommendations.push({
        severity: 'critical',
        issue: 'Missing system accounts',
        missing: missingSystemAccounts,
        action: 'Create these system accounts with the correct subType values (lowercase with underscores)'
      });
    }
    
    if (!isBalanced) {
      recommendations.push({
        severity: 'critical',
        issue: 'Balance sheet not balanced',
        difference: Math.round(difference * 100) / 100,
        action: 'Review ledger entries for posting errors. The difference suggests missing or incorrect entries.'
      });
    }
    
    if (orphanedEntries.length > 0) {
      recommendations.push({
        severity: 'high',
        issue: 'Orphaned ledger entries found',
        count: orphanedEntries.length,
        action: 'These ledger entries reference accounts that no longer exist. Clean up or reassign.'
      });
    }
    
    if (balancesByType.revenue.count === 0) {
      recommendations.push({
        severity: 'medium',
        issue: 'No revenue accounts found',
        action: 'Create revenue accounts to track sales and service income'
      });
    }
    
    if (balancesByType.expense.count === 0) {
      recommendations.push({
        severity: 'medium',
        issue: 'No expense accounts found',
        action: 'Create expense accounts to track COGS and operating expenses'
      });
    }
    
    return NextResponse.json({ diagnostic });
    
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

async function calculateAccountBalance(
  accountId: any,
  outletId: any,
  accountType: string
): Promise<number> {
  
  const entries = await LedgerEntry.find({
    accountId,
    outletId
  }).lean();
  
  let balance = 0;
  
  entries.forEach(entry => {
    const debit = entry.debit || 0;
    const credit = entry.credit || 0;
    
    if (accountType === 'asset' || accountType === 'expense') {
      balance += debit - credit;
    } else {
      balance += credit - debit;
    }
  });
  
  return balance;
}