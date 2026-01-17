// app/api/reports/profit-loss/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Outlet from '@/lib/models/Outlet';
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
    
    if (!user.outletId) {
      return NextResponse.json({ error: 'Invalid token: outlet not found' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const fromDate = new Date(
      searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1)
    );
    const toDate = new Date(searchParams.get('toDate') || new Date());
    
    // Set time boundaries
    toDate.setHours(23, 59, 59, 999);
    fromDate.setHours(0, 0, 0, 0);

    console.log('='.repeat(60));
    console.log('PROFIT & LOSS STATEMENT GENERATION');
    console.log('='.repeat(60));
    console.log('From:', fromDate.toISOString());
    console.log('To:', toDate.toISOString());
    console.log('Outlet ID:', user.outletId);
    
    // Fetch outlet information
    const outlet = await Outlet.findById(user.outletId).lean();
    
    // Get all accounts (case-insensitive)
    const accounts = await Account.find({
      outletId: user.outletId,
      isActive: true
    }).lean() as any[];
    
    // Categorize accounts
    const revenueAccounts = accounts.filter(a => 
      a.type?.toString().toUpperCase() === 'REVENUE'
    );
    
    const expenseAccounts = accounts.filter(a => 
      a.type?.toString().toUpperCase() === 'EXPENSE'
    );
    
    console.log('\n📊 Account Summary:');
    console.log('  Revenue Accounts:', revenueAccounts.length);
    console.log('  Expense Accounts:', expenseAccounts.length);
    
    // Get all ledger entries for the period
    const periodEntries = await LedgerEntry.find({
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate }
    }).lean();
    
    console.log('  Ledger Entries:', periodEntries.length);
    
    // ==== REVENUE ====
    console.log('\n💰 CALCULATING REVENUE:');
    const revenueItems: { [key: string]: number } = {};
    let totalRevenue = 0;
    
    for (const account of revenueAccounts) {
      const entries = periodEntries.filter(e => 
        e.accountId.toString() === account._id.toString()
      );
      
      // Revenue increases with credits, decreases with debits
      const accountRevenue = entries.reduce((sum, entry) => 
        sum + (entry.credit || 0) - (entry.debit || 0), 0
      );
      
      if (Math.abs(accountRevenue) > 0.01) {
        revenueItems[account.name] = accountRevenue;
        totalRevenue += accountRevenue;
        console.log(`  ✓ ${account.code} (${account.name}): ${accountRevenue.toFixed(2)}`);
      }
    }
    
    console.log(`  📊 Total Revenue: ${totalRevenue.toFixed(2)}`);
    
    // ==== EXPENSES (categorized) ====
    console.log('\n💸 CALCULATING EXPENSES:');
    const cogsItems: { [key: string]: number } = {};
    const operatingExpenseItems: { [key: string]: number } = {};
    const otherExpenseItems: { [key: string]: number } = {};
    
    let totalCOGS = 0;
    let totalOperatingExpenses = 0;
    let totalOtherExpenses = 0;
    
    for (const account of expenseAccounts) {
      const entries = periodEntries.filter(e => 
        e.accountId.toString() === account._id.toString()
      );
      
      // Expenses increase with debits, decrease with credits
      const accountExpense = entries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      );
      
      if (Math.abs(accountExpense) > 0.01) {
        const subType = account.subType?.toString().toUpperCase();
        const name = account.name.toLowerCase();
        
        // Categorize expenses
        if (subType === 'COGS' || subType === 'COST_OF_GOODS_SOLD' || 
            name.includes('cost of goods') || name.includes('cogs')) {
          // Cost of Goods Sold
          cogsItems[account.name] = accountExpense;
          totalCOGS += accountExpense;
          console.log(`  ✓ [COGS] ${account.code} (${account.name}): ${accountExpense.toFixed(2)}`);
          
        } else if (name.includes('interest') || name.includes('bank charge') || 
                   name.includes('depreciation') || name.includes('amortization')) {
          // Other/Financial Expenses
          otherExpenseItems[account.name] = accountExpense;
          totalOtherExpenses += accountExpense;
          console.log(`  ✓ [Other] ${account.code} (${account.name}): ${accountExpense.toFixed(2)}`);
          
        } else {
          // Operating Expenses
          operatingExpenseItems[account.name] = accountExpense;
          totalOperatingExpenses += accountExpense;
          console.log(`  ✓ [Operating] ${account.code} (${account.name}): ${accountExpense.toFixed(2)}`);
        }
      }
    }
    
    console.log(`\n  📊 Total COGS: ${totalCOGS.toFixed(2)}`);
    console.log(`  📊 Total Operating Expenses: ${totalOperatingExpenses.toFixed(2)}`);
    console.log(`  📊 Total Other Expenses: ${totalOtherExpenses.toFixed(2)}`);
    
    // ==== OTHER INCOME (if any non-operating revenue exists) ====
    const otherIncomeItems: { [key: string]: number } = {};
    let totalOtherIncome = 0;
    
    // For now, all revenue is considered operating revenue
    // You can add logic here if you have non-operating income accounts
    
    // ==== CALCULATE PROFITS ====
    const grossProfit = totalRevenue - totalCOGS;
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const netProfit = operatingProfit + totalOtherIncome - totalOtherExpenses;
    
    console.log('\n' + '='.repeat(60));
    console.log('PROFIT & LOSS SUMMARY');
    console.log('='.repeat(60));
    console.log('Revenue:              ', totalRevenue.toFixed(2));
    console.log('Cost of Sales:        ', totalCOGS.toFixed(2));
    console.log('Gross Profit:         ', grossProfit.toFixed(2));
    console.log('Operating Expenses:   ', totalOperatingExpenses.toFixed(2));
    console.log('Operating Profit:     ', operatingProfit.toFixed(2));
    console.log('Other Income:         ', totalOtherIncome.toFixed(2));
    console.log('Other Expenses:       ', totalOtherExpenses.toFixed(2));
    console.log('Net Profit:           ', netProfit.toFixed(2));
    console.log('='.repeat(60) + '\n');
    
    // Calculate margins
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    console.log('Gross Margin:         ', grossMargin.toFixed(2) + '%');
    console.log('Operating Margin:     ', operatingMargin.toFixed(2) + '%');
    console.log('Net Margin:           ', netMargin.toFixed(2) + '%');
    console.log('='.repeat(60) + '\n');
    
    // Round all values
    const roundToTwo = (num: number) => Math.round(num * 100) / 100;
    
    const reportData = {
      revenue: {
        items: Object.fromEntries(
          Object.entries(revenueItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(totalRevenue),
      },
      costOfSales: {
        items: Object.fromEntries(
          Object.entries(cogsItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(totalCOGS),
      },
      expenses: {
        items: Object.fromEntries(
          Object.entries(operatingExpenseItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(totalOperatingExpenses),
      },
      otherIncome: {
        items: Object.fromEntries(
          Object.entries(otherIncomeItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(totalOtherIncome),
      },
      otherExpenses: {
        items: Object.fromEntries(
          Object.entries(otherExpenseItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(totalOtherExpenses),
      },
      grossProfit: roundToTwo(grossProfit),
      operatingProfit: roundToTwo(operatingProfit),
      netProfit: roundToTwo(netProfit),
      metadata: {
        outletName: outlet?.name || 'AutoCity',
        outletId: user.outletId,
        generatedAt: new Date().toISOString(),
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        margins: {
          grossMargin: roundToTwo(grossMargin),
          operatingMargin: roundToTwo(operatingMargin),
          netMargin: roundToTwo(netMargin),
        }
      },
    };
    
    return NextResponse.json({ reportData });
    
  } catch (error: any) {
    console.error('❌ Error generating P&L report:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}