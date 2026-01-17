// app/api/reports/cashflow/route.ts
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
      return NextResponse.json(
        { error: 'Invalid token: outlet not found' },
        { status: 401 }
      );
    }

    const outletId = user.outletId;
    const { searchParams } = new URL(request.url);

    const fromDate = new Date(
      searchParams.get('fromDate') ?? new Date(new Date().getFullYear(), 0, 1)
    );
    const toDate = new Date(searchParams.get('toDate') ?? new Date());

    // Set time boundaries
    toDate.setHours(23, 59, 59, 999);
    fromDate.setHours(0, 0, 0, 0);

    console.log('='.repeat(60));
    console.log('CASH FLOW STATEMENT GENERATION');
    console.log('='.repeat(60));
    console.log('From:', fromDate.toISOString());
    console.log('To:', toDate.toISOString());
    console.log('Outlet ID:', outletId);

    // Fetch outlet information
    const outlet = await Outlet.findById(outletId).lean();

    // Get all accounts (case-insensitive)
    const accounts = await Account.find({ outletId, isActive: true }).lean() as any[];

    // Categorize accounts by type and subType
    const cashAccounts = accounts.filter((a: any) => {
      const subType = a.subType?.toString().toUpperCase();
      return subType === 'CASH' || subType === 'BANK';
    });

    const revenueAccounts = accounts.filter((a: any) => 
      a.type?.toString().toUpperCase() === 'REVENUE'
    );

    const expenseAccounts = accounts.filter((a: any) => 
      a.type?.toString().toUpperCase() === 'EXPENSE'
    );

    const assetAccounts = accounts.filter((a: any) => 
      a.type?.toString().toUpperCase() === 'ASSET'
    );

    const liabilityAccounts = accounts.filter((a: any) => 
      a.type?.toString().toUpperCase() === 'LIABILITY'
    );

    const equityAccounts = accounts.filter((a: any) => 
      a.type?.toString().toUpperCase() === 'EQUITY'
    );

    console.log('\n📋 Account Summary:');
    console.log('  Cash/Bank:', cashAccounts.length);
    console.log('  Revenue:', revenueAccounts.length);
    console.log('  Expense:', expenseAccounts.length);
    console.log('  Asset:', assetAccounts.length);
    console.log('  Liability:', liabilityAccounts.length);
    console.log('  Equity:', equityAccounts.length);

    // Calculate opening cash balance (before period starts)
    let openingCash = 0;
    for (const cashAccount of cashAccounts) {
      const entries = await LedgerEntry.find({
        accountId: (cashAccount as any)._id,
        outletId,
        date: { $lt: fromDate } // Before period
      }).lean();

      const balance = entries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      );
      
      openingCash += balance;
      console.log(`  Opening ${(cashAccount as any).name}: ${balance.toFixed(2)}`);
    }

    console.log(`\n💰 Total Opening Cash: ${openingCash.toFixed(2)}`);

    // Get all ledger entries for the period
    const periodEntries = await LedgerEntry.find({
      outletId,
      date: { $gte: fromDate, $lte: toDate }
    }).lean();

    console.log(`\n📊 Period Entries: ${periodEntries.length}`);

    // ==== OPERATING ACTIVITIES ====
    console.log('\n💼 OPERATING ACTIVITIES:');
    const operatingItems: { [key: string]: number } = {};

    // 1. Cash from Revenue (Credits to Revenue accounts = Income received)
    let totalRevenueCash = 0;
    for (const account of revenueAccounts) {
      const entries = periodEntries.filter(e => 
        e.accountId.toString() === (account as any)._id.toString()
      );

      const cashFromRevenue = entries.reduce((sum, entry) => 
        sum + (entry.credit || 0) - (entry.debit || 0), 0
      );

      if (Math.abs(cashFromRevenue) > 0.01) {
        operatingItems[`Cash from ${(account as any).name}`] = cashFromRevenue;
        totalRevenueCash += cashFromRevenue;
        console.log(`  ✓ ${(account as any).name}: +${cashFromRevenue.toFixed(2)}`);
      }
    }

    // 2. Cash paid for Expenses (Debits to Expense accounts = Cash paid out)
    let totalExpenseCash = 0;
    for (const account of expenseAccounts) {
      const entries = periodEntries.filter(e => 
        e.accountId.toString() === (account as any)._id.toString()
      );

      const cashForExpense = entries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      );

      if (Math.abs(cashForExpense) > 0.01) {
        operatingItems[`${(account as any).name}`] = -cashForExpense;
        totalExpenseCash += cashForExpense;
        console.log(`  ✓ ${(account as any).name}: -${cashForExpense.toFixed(2)}`);
      }
    }

    // 3. Changes in Operating Assets/Liabilities (AR, AP, Inventory)
    const arAccount = accounts.find((a: any) => 
      a.subType?.toString().toUpperCase() === 'ACCOUNTS_RECEIVABLE'
    );
    const apAccount = accounts.find((a: any) => 
      a.subType?.toString().toUpperCase() === 'ACCOUNTS_PAYABLE'
    );
    const inventoryAccount = accounts.find((a: any) => 
      a.subType?.toString().toUpperCase() === 'INVENTORY'
    );

    // Accounts Receivable: Increase = Cash decrease, Decrease = Cash increase
    if (arAccount) {
      const entries = periodEntries.filter(e => 
        e.accountId.toString() === (arAccount as any)._id.toString()
      );
      const arChange = entries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      );
      
      if (Math.abs(arChange) > 0.01) {
        operatingItems['(Increase) in Accounts Receivable'] = -arChange;
        console.log(`  ✓ AR Change: ${(-arChange).toFixed(2)}`);
      }
    }

    // Accounts Payable: Increase = Cash increase, Decrease = Cash decrease
    if (apAccount) {
      const entries = periodEntries.filter(e => 
        e.accountId.toString() === (apAccount as any)._id.toString()
      );
      const apChange = entries.reduce((sum, entry) => 
        sum + (entry.credit || 0) - (entry.debit || 0), 0
      );
      
      if (Math.abs(apChange) > 0.01) {
        operatingItems['Increase in Accounts Payable'] = apChange;
        console.log(`  ✓ AP Change: ${apChange.toFixed(2)}`);
      }
    }

    // Inventory: Increase = Cash decrease, Decrease = Cash increase
    if (inventoryAccount) {
      const entries = periodEntries.filter(e => 
        e.accountId.toString() === (inventoryAccount as any)._id.toString()
      );
      const inventoryChange = entries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      );
      
      if (Math.abs(inventoryChange) > 0.01) {
        operatingItems['(Increase) in Inventory'] = -inventoryChange;
        console.log(`  ✓ Inventory Change: ${(-inventoryChange).toFixed(2)}`);
      }
    }

    const netOperatingCash = Object.values(operatingItems).reduce((sum, val) => sum + val, 0);
    console.log(`  📊 Net Operating Cash Flow: ${netOperatingCash.toFixed(2)}`);

    // ==== INVESTING ACTIVITIES ====
    console.log('\n🏗️ INVESTING ACTIVITIES:');
    const investingItems: { [key: string]: number } = {};

    // Fixed assets (excluding cash, AR, inventory, AP)
    for (const account of assetAccounts) {
      const subType = (account as any).subType?.toString().toUpperCase();
      
      // Skip current assets
      if (subType === 'CASH' || subType === 'BANK' || 
          subType === 'ACCOUNTS_RECEIVABLE' || subType === 'INVENTORY') {
        continue;
      }

      const entries = periodEntries.filter(e => 
        e.accountId.toString() === (account as any)._id.toString()
      );

      const assetChange = entries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      );

      if (Math.abs(assetChange) > 0.01) {
        if (assetChange > 0) {
          // Purchase of asset (cash outflow)
          investingItems[`Purchase of ${(account as any).name}`] = -assetChange;
          console.log(`  ✓ Purchase ${(account as any).name}: -${assetChange.toFixed(2)}`);
        } else {
          // Sale of asset (cash inflow)
          investingItems[`Sale of ${(account as any).name}`] = Math.abs(assetChange);
          console.log(`  ✓ Sale ${(account as any).name}: +${Math.abs(assetChange).toFixed(2)}`);
        }
      }
    }

    const netInvestingCash = Object.values(investingItems).reduce((sum, val) => sum + val, 0);
    console.log(`  📊 Net Investing Cash Flow: ${netInvestingCash.toFixed(2)}`);

    // ==== FINANCING ACTIVITIES ====
    console.log('\n💳 FINANCING ACTIVITIES:');
    const financingItems: { [key: string]: number } = {};

    // Equity and Liability changes (excluding AP)
    for (const account of [...equityAccounts, ...liabilityAccounts]) {
      const subType = (account as any).subType?.toString().toUpperCase();
      
      // Skip AP (already in operating)
      if (subType === 'ACCOUNTS_PAYABLE') {
        continue;
      }

      const entries = periodEntries.filter(e => 
        e.accountId.toString() === (account as any)._id.toString()
      );

      const change = entries.reduce((sum, entry) => 
        sum + (entry.credit || 0) - (entry.debit || 0), 0
      );

      if (Math.abs(change) > 0.01) {
        if (change > 0) {
          // Increase in equity/liability = Cash inflow
          financingItems[`${(account as any).name} - Contribution`] = change;
          console.log(`  ✓ ${(account as any).name}: +${change.toFixed(2)}`);
        } else {
          // Decrease in equity/liability = Cash outflow
          financingItems[`${(account as any).name} - Payment`] = change;
          console.log(`  ✓ ${(account as any).name}: ${change.toFixed(2)}`);
        }
      }
    }

    const netFinancingCash = Object.values(financingItems).reduce((sum, val) => sum + val, 0);
    console.log(`  📊 Net Financing Cash Flow: ${netFinancingCash.toFixed(2)}`);

    // ==== CALCULATE NET CASH FLOW ====
    const netCashFlow = netOperatingCash + netInvestingCash + netFinancingCash;
    const closingCash = openingCash + netCashFlow;

    console.log('\n' + '='.repeat(60));
    console.log('CASH FLOW SUMMARY');
    console.log('='.repeat(60));
    console.log('Opening Cash:         ', openingCash.toFixed(2));
    console.log('Operating Activities: ', netOperatingCash.toFixed(2));
    console.log('Investing Activities: ', netInvestingCash.toFixed(2));
    console.log('Financing Activities: ', netFinancingCash.toFixed(2));
    console.log('Net Cash Flow:        ', netCashFlow.toFixed(2));
    console.log('Closing Cash:         ', closingCash.toFixed(2));
    console.log('='.repeat(60) + '\n');

    // Round all values
    const roundToTwo = (num: number) => Math.round(num * 100) / 100;

    return NextResponse.json({
      operatingActivities: {
        items: Object.fromEntries(
          Object.entries(operatingItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(netOperatingCash),
      },
      investingActivities: {
        items: Object.fromEntries(
          Object.entries(investingItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(netInvestingCash),
      },
      financingActivities: {
        items: Object.fromEntries(
          Object.entries(financingItems).map(([k, v]) => [k, roundToTwo(v)])
        ),
        total: roundToTwo(netFinancingCash),
      },
      netCashFlow: roundToTwo(netCashFlow),
      openingCash: roundToTwo(openingCash),
      closingCash: roundToTwo(closingCash),
      metadata: {
        outletName: outlet?.name || 'AutoCity',
        outletId,
        generatedAt: new Date().toISOString(),
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      },
    });

  } catch (error: any) {
    console.error('❌ Error generating cash flow:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}