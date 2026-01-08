// app/api/reports/balance-sheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    
    const asOfDate = new Date(searchParams.get('asOfDate') || new Date());
    asOfDate.setHours(23, 59, 59, 999);
    
    // Get all active accounts
    const accounts = await Account.find({ 
      outletId: user.outletId,
      isActive: true 
    }).lean();
    
    console.log('📊 Total accounts found:', accounts.length);
    
    // Separate accounts by type (case-insensitive)
    const assetAccounts = accounts.filter(a => 
      a.type?.toString().toLowerCase() === 'asset'
    );
    const liabilityAccounts = accounts.filter(a => 
      a.type?.toString().toLowerCase() === 'liability'
    );
    const equityAccounts = accounts.filter(a => 
      a.type?.toString().toLowerCase() === 'equity'
    );
    const revenueAccounts = accounts.filter(a => 
      a.type?.toString().toLowerCase() === 'revenue'
    );
    const expenseAccounts = accounts.filter(a => 
      a.type?.toString().toLowerCase() === 'expense'
    );
    
    console.log('📋 Accounts by type:', {
      assets: assetAccounts.length,
      liabilities: liabilityAccounts.length,
      equity: equityAccounts.length,
      revenue: revenueAccounts.length,
      expense: expenseAccounts.length
    });
    
    // ==== ASSETS ====
    const currentAssets: { [key: string]: number } = {};
    const fixedAssets: { [key: string]: number } = {};
    
    for (const account of assetAccounts) {
      const balance = await calculateAccountBalanceFromLedger(
        account._id, 
        asOfDate, 
        user.outletId,
        'asset'
      );
      
      if (Math.abs(balance) > 0.01) {
        const subType = account.subType?.toString().toLowerCase();
        const isCurrentAsset = 
          subType === 'cash' ||
          subType === 'bank' ||
          subType === 'inventory' ||
          subType === 'accounts_receivable' ||
          account.code?.startsWith('CASH') ||
          account.code?.startsWith('BANK') ||
          account.code?.startsWith('AR') ||
          account.code?.startsWith('INV');
        
        if (isCurrentAsset) {
          currentAssets[account.name] = balance;
        } else {
          fixedAssets[account.name] = balance;
        }
        
        console.log(`💰 Asset: ${account.code} (${account.name}) = ${balance}`);
      }
    }
    
    // ==== LIABILITIES ====
    const currentLiabilities: { [key: string]: number } = {};
    const longTermLiabilities: { [key: string]: number } = {};
    
    for (const account of liabilityAccounts) {
      const balance = await calculateAccountBalanceFromLedger(
        account._id, 
        asOfDate, 
        user.outletId,
        'liability'
      );
      
      if (Math.abs(balance) > 0.01) {
        const subType = account.subType?.toString().toLowerCase();
        const isCurrentLiability = 
          subType === 'accounts_payable' ||
          account.code?.startsWith('AP') ||
          account.code?.startsWith('CL');
        
        if (isCurrentLiability) {
          currentLiabilities[account.name] = balance;
        } else {
          longTermLiabilities[account.name] = balance;
        }
        
        console.log(`📝 Liability: ${account.code} (${account.name}) = ${balance}`);
      }
    }
    
    // ==== EQUITY (from accounts only, NOT including retained earnings yet) ====
    const equity: { [key: string]: number } = {};
    
    for (const account of equityAccounts) {
      const balance = await calculateAccountBalanceFromLedger(
        account._id, 
        asOfDate, 
        user.outletId,
        'equity'
      );
      
      if (Math.abs(balance) > 0.01) {
        equity[account.name] = balance;
        console.log(`🏦 Equity: ${account.code} (${account.name}) = ${balance}`);
      }
    }
    
    // ==== CALCULATE RETAINED EARNINGS (Net Income) ====
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    // Calculate Revenue
    for (const account of revenueAccounts) {
      const entries = await LedgerEntry.find({
        accountId: account._id,
        outletId: user.outletId,
        date: { $lte: asOfDate }
      }).lean();
      
      const accountRevenue = entries.reduce((sum, entry) => {
        return sum + (entry.credit || 0) - (entry.debit || 0);
      }, 0);
      
      totalRevenue += accountRevenue;
      console.log(`📈 Revenue: ${account.code} (${account.name}) = ${accountRevenue}`);
    }
    
    // Calculate Expenses
    for (const account of expenseAccounts) {
      const entries = await LedgerEntry.find({
        accountId: account._id,
        outletId: user.outletId,
        date: { $lte: asOfDate }
      }).lean();
      
      const accountExpense = entries.reduce((sum, entry) => {
        return sum + (entry.debit || 0) - (entry.credit || 0);
      }, 0);
      
      totalExpenses += accountExpense;
      console.log(`📉 Expense: ${account.code} (${account.name}) = ${accountExpense}`);
    }
    
    const retainedEarnings = totalRevenue - totalExpenses;
    
    console.log('💡 Net Income Calculation:', {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netIncome: Math.round(retainedEarnings * 100) / 100
    });
    
    // Add Retained Earnings to equity
    if (Math.abs(retainedEarnings) > 0.01) {
      equity['Retained Earnings (Net Income)'] = retainedEarnings;
    }
    
    // Calculate totals
    const totalCurrentAssets = Object.values(currentAssets).reduce((sum, val) => sum + val, 0);
    const totalFixedAssets = Object.values(fixedAssets).reduce((sum, val) => sum + val, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;
    
    const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((sum, val) => sum + val, 0);
    const totalLongTermLiabilities = Object.values(longTermLiabilities).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
    
    const totalEquity = Object.values(equity).reduce((sum, val) => sum + val, 0);
    
    const balanceDifference = totalAssets - (totalLiabilities + totalEquity);
    const isBalanced = Math.abs(balanceDifference) < 0.01;
    
    console.log('✅ Balance Sheet Summary:', {
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      balanceDifference: Math.round(balanceDifference * 100) / 100,
      isBalanced
    });
    
    const reportData = {
      assets: {
        currentAssets: {
          items: currentAssets,
          total: Math.round(totalCurrentAssets * 100) / 100,
        },
        fixedAssets: {
          items: fixedAssets,
          total: Math.round(totalFixedAssets * 100) / 100,
        },
        totalAssets: Math.round(totalAssets * 100) / 100,
      },
      liabilities: {
        currentLiabilities: {
          items: currentLiabilities,
          total: Math.round(totalCurrentLiabilities * 100) / 100,
        },
        longTermLiabilities: {
          items: longTermLiabilities,
          total: Math.round(totalLongTermLiabilities * 100) / 100,
        },
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      },
      equity: {
        items: equity,
        total: Math.round(totalEquity * 100) / 100,
      },
      isBalanced,
      balanceDifference: Math.round(balanceDifference * 100) / 100,
      accountingEquation: {
        leftSide: Math.round(totalAssets * 100) / 100,
        rightSide: Math.round((totalLiabilities + totalEquity) * 100) / 100,
        difference: Math.round(balanceDifference * 100) / 100
      }
    };
    
    return NextResponse.json({ reportData });
  } catch (error: any) {
    console.error('❌ Error generating balance sheet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Calculate account balance from ledger entries
 */
async function calculateAccountBalanceFromLedger(
  accountId: any, 
  asOfDate: Date, 
  outletId: any,
  accountType: string
): Promise<number> {
  
  const entries = await LedgerEntry.find({
    accountId,
    outletId,
    date: { $lte: asOfDate }
  }).lean();
  
  let balance = 0;
  
  entries.forEach(entry => {
    const debit = entry.debit || 0;
    const credit = entry.credit || 0;
    
    if (accountType === 'asset') {
      // Assets: Debit increases, Credit decreases
      balance += debit - credit;
    } else {
      // Liabilities, Equity: Credit increases, Debit decreases
      balance += credit - debit;
    }
  });
  
  return Math.round(balance * 100) / 100;
}