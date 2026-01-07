import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import Account from '@/lib/models/Account';
import Outlet from '@/lib/models/Outlet';
import Product from '@/lib/models/ProductEnhanced';
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
      searchParams.get('fromDate') ??
        new Date(new Date().getFullYear(), 0, 1)
    );
    const toDate = new Date(
      searchParams.get('toDate') ?? new Date()
    );

    // Set time to end of day for toDate
    toDate.setHours(23, 59, 59, 999);
    fromDate.setHours(0, 0, 0, 0);

    // Fetch outlet information
    const outlet = await Outlet.findById(outletId).lean();

    // 1. Get all cash accounts for opening balance
    const cashAccounts = await Account.find({
      outletId,
      accountGroup: 'Cash & Bank',
    }).lean();

    // Calculate opening balance (sum of all cash accounts at beginning of period)
    const openingCash = cashAccounts.reduce(
      (sum: number, account: any) => sum + (account.openingBalance || 0),
      0
    );

    // 2. OPERATING ACTIVITIES
    // Cash from sales (only cash payments)
    const sales = await Sale.find({
      outletId,
      saleDate: { $gte: fromDate, $lte: toDate },
      status: 'COMPLETED',
    }).lean();

    let cashFromSales = 0;
    let creditSales = 0;

    sales.forEach((sale: any) => {
      // Cash payments
      if (sale.paymentMode === 'cash') {
        cashFromSales += sale.amountPaid || 0;
      }
      // Bank transfers (considered as cash for cash flow)
      else if (sale.paymentMode === 'bank') {
        cashFromSales += sale.amountPaid || 0;
      }
      // Credit sales
      else if (sale.paymentMode === 'credit') {
        creditSales += sale.totalAmount || 0;
      }
    });

    // Cash paid for expenses (expense vouchers)
    const expenseVouchers = await Voucher.find({
      outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      voucherType: 'payment',
    }).lean();

    let cashPaidForExpenses = 0;
    const operatingExpenses: { [key: string]: number } = {};

    expenseVouchers.forEach((voucher: any) => {
      const total = voucher.totalDebit || 0;
      cashPaidForExpenses += total;

      // Categorize expenses
      voucher.entries?.forEach((entry: any) => {
        if (entry.debit > 0 && entry.accountName) {
          const accountName = entry.accountName.toLowerCase();
          
          if (accountName.includes('salary') || accountName.includes('wage')) {
            operatingExpenses['Salaries & Wages'] = (operatingExpenses['Salaries & Wages'] || 0) + entry.debit;
          } else if (accountName.includes('rent')) {
            operatingExpenses['Rent Expense'] = (operatingExpenses['Rent Expense'] || 0) + entry.debit;
          } else if (accountName.includes('utility') || accountName.includes('electricity') || accountName.includes('water')) {
            operatingExpenses['Utilities'] = (operatingExpenses['Utilities'] || 0) + entry.debit;
          } else if (accountName.includes('supply') || accountName.includes('material')) {
            operatingExpenses['Supplies & Materials'] = (operatingExpenses['Supplies & Materials'] || 0) + entry.debit;
          } else if (accountName.includes('advert') || accountName.includes('marketing')) {
            operatingExpenses['Advertising'] = (operatingExpenses['Advertising'] || 0) + entry.debit;
          } else {
            operatingExpenses['Other Operating Expenses'] = (operatingExpenses['Other Operating Expenses'] || 0) + entry.debit;
          }
        }
      });
    });

    // Cash from customer receipts (receipt vouchers for credit sales)
    const receiptVouchers = await Voucher.find({
      outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      voucherType: 'receipt',
    }).lean();

    let cashFromCustomers = 0;
    receiptVouchers.forEach((voucher: any) => {
      voucher.entries?.forEach((entry: any) => {
        if (entry.credit > 0) {
          cashFromCustomers += entry.credit;
        }
      });
    });

    // Inventory purchase (cost of goods sold)
    const purchaseVouchers = await Voucher.find({
      outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      voucherType: 'payment',
    }).lean();

    let cashPaidForInventory = 0;
    purchaseVouchers.forEach((voucher: any) => {
      voucher.entries?.forEach((entry: any) => {
        const accountName = entry.accountName?.toLowerCase() || '';
        if ((accountName.includes('inventory') || accountName.includes('stock') || accountName.includes('purchase')) && entry.debit > 0) {
          cashPaidForInventory += entry.debit;
        }
      });
    });

    // 3. INVESTING ACTIVITIES
    const allVouchers = await Voucher.find({
      outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
    }).lean();

    let purchaseOfAssets = 0;
    let saleOfAssets = 0;
    const assetCategories: { [key: string]: number } = {};

    allVouchers.forEach((voucher: any) => {
      voucher.entries?.forEach((entry: any) => {
        const accountName = entry.accountName?.toLowerCase() || '';
        const isAssetAccount = accountName.includes('asset') || 
                              accountName.includes('equipment') || 
                              accountName.includes('vehicle') || 
                              accountName.includes('property') ||
                              accountName.includes('building') ||
                              accountName.includes('machine');

        if (isAssetAccount) {
          if (entry.debit > 0) {
            purchaseOfAssets += entry.debit;
            
            // Categorize assets
            if (accountName.includes('vehicle')) {
              assetCategories['Vehicles'] = (assetCategories['Vehicles'] || 0) + entry.debit;
            } else if (accountName.includes('equipment') || accountName.includes('machine')) {
              assetCategories['Equipment & Machinery'] = (assetCategories['Equipment & Machinery'] || 0) + entry.debit;
            } else if (accountName.includes('property') || accountName.includes('building')) {
              assetCategories['Property & Building'] = (assetCategories['Property & Building'] || 0) + entry.debit;
            } else if (accountName.includes('furniture') || accountName.includes('fixture')) {
              assetCategories['Furniture & Fixtures'] = (assetCategories['Furniture & Fixtures'] || 0) + entry.debit;
            } else {
              assetCategories['Other Assets'] = (assetCategories['Other Assets'] || 0) + entry.debit;
            }
          }
          if (entry.credit > 0) {
            saleOfAssets += entry.credit;
          }
        }
      });
    });

    // 4. FINANCING ACTIVITIES
    let loanReceipts = 0;
    let loanRepayments = 0;
    let capitalContributions = 0;
    let dividendsPaid = 0;
    const financingItems: { [key: string]: number } = {};

    allVouchers.forEach((voucher: any) => {
      voucher.entries?.forEach((entry: any) => {
        const accountName = entry.accountName?.toLowerCase() || '';
        
        // Loans
        if (accountName.includes('loan') || accountName.includes('borrowing')) {
          if (entry.credit > 0) {
            loanReceipts += entry.credit;
            financingItems['Loan Proceeds'] = (financingItems['Loan Proceeds'] || 0) + entry.credit;
          }
          if (entry.debit > 0) {
            loanRepayments += entry.debit;
            financingItems['Loan Repayments'] = (financingItems['Loan Repayments'] || 0) - entry.debit;
          }
        }
        
        // Equity/Capital
        if (accountName.includes('capital') || accountName.includes('equity')) {
          if (entry.credit > 0) {
            capitalContributions += entry.credit;
            financingItems['Capital Contributions'] = (financingItems['Capital Contributions'] || 0) + entry.credit;
          }
          if (entry.debit > 0 && accountName.includes('dividend')) {
            dividendsPaid += entry.debit;
            financingItems['Dividends Paid'] = (financingItems['Dividends Paid'] || 0) - entry.debit;
          }
        }
      });
    });

    // Calculate net cash flows
    const netOperatingCash = cashFromSales + cashFromCustomers - cashPaidForExpenses - cashPaidForInventory;
    const netInvestingCash = saleOfAssets - purchaseOfAssets;
    const netFinancingCash = loanReceipts + capitalContributions - loanRepayments - dividendsPaid;
    const netCashFlow = netOperatingCash + netInvestingCash + netFinancingCash;
    const closingCash = openingCash + netCashFlow;

    // Structure the response data
    const operatingItems: { [key: string]: number } = {
      'Cash Sales': cashFromSales,
      'Collections from Customers': cashFromCustomers,
    };

    // Add categorized expenses
    Object.entries(operatingExpenses).forEach(([category, amount]) => {
      operatingItems[category] = -amount;
    });

    // Add inventory purchase
    if (cashPaidForInventory > 0) {
      operatingItems['Inventory Purchases'] = -cashPaidForInventory;
    }

    // Add credit sales (as decrease in cash flow)
    if (creditSales > 0) {
      operatingItems['Credit Sales (Not Collected)'] = -creditSales;
    }

    const investingItems: { [key: string]: number } = {};
    
    // Add categorized asset purchases (as negative cash flow)
    Object.entries(assetCategories).forEach(([category, amount]) => {
      investingItems[`Purchase of ${category}`] = -amount;
    });
    
    // Add asset sales (as positive cash flow)
    if (saleOfAssets > 0) {
      investingItems['Sale of Assets'] = saleOfAssets;
    }

    // Calculate totals
    const operatingTotal = Object.values(operatingItems).reduce((sum, val) => sum + val, 0);
    const investingTotal = Object.values(investingItems).reduce((sum, val) => sum + val, 0);
    const financingTotal = Object.values(financingItems).reduce((sum, val) => sum + val, 0);

    return NextResponse.json({
      operatingActivities: {
        items: operatingItems,
        total: operatingTotal,
      },
      investingActivities: {
        items: investingItems,
        total: investingTotal,
      },
      financingActivities: {
        items: financingItems,
        total: financingTotal,
      },
      netCashFlow,
      openingCash,
      closingCash,
      metadata: {
        outletName: outlet?.name || 'AutoCity Pro',
        outletId,
        generatedAt: new Date().toISOString(),
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating cash flow:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}