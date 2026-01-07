import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import Account from '@/lib/models/Account';
import Product from '@/lib/models/ProductEnhanced';
import Outlet from '@/lib/models/Outlet';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';


  interface LeanProduct {
  _id: any;
  costPrice?: number;
  currentStock?: number;
  category?: string;
  [key: string]: any;
}

interface LeanAccount {
  _id: any;
  accountName: string;
  accountGroup?: string;
  accountType: string;
  [key: string]: any;
}
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
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    
    // Set time boundaries
    toDate.setHours(23, 59, 59, 999);
    fromDate.setHours(0, 0, 0, 0);
    
    // Fetch outlet information
    const outlet = await Outlet.findById(user.outletId).lean();
    
    // ========== 1. CALCULATE REVENUE & COGS (LIKE DASHBOARD API) ==========
    const sales = await Sale.find({
      outletId: user.outletId,
      saleDate: { $gte: fromDate, $lte: toDate },
      status: 'COMPLETED',
    })
    .populate({
      path: 'items.productId',
      select: 'costPrice name'
    })
    .lean();

    let totalRevenue = 0;
    let totalCOGS = 0;
    const revenueItems: { [key: string]: number } = {};
    const costItems: { [key: string]: number } = {};

    // Calculate revenue and COGS exactly like dashboard API
    for (const sale of sales) {
      totalRevenue += sale.grandTotal || 0;
      
      // Categorize revenue by sale type or product
      // const saleType = sale.saleType || 'Retail Sale';
      // revenueItems[saleType] = (revenueItems[saleType] || 0) + (sale.grandTotal || 0);
      
      // Calculate COGS for this sale (like dashboard)
      let saleCost = 0;
      
      for (const item of sale.items || []) {
        // Skip labor items (like dashboard does)
        if (item.isLabor) continue;
        
        // Get product cost - check different possible structures
        let itemCost = 0;
        
        if (item.productId && typeof item.productId === 'object') {
          // If productId is populated with costPrice
          if ('costPrice' in item.productId) {
            itemCost = (item.productId as any).costPrice || 0;
          }
        } else if (item.productId) {
          // If productId is just an ObjectId, we need to look it up
          // But in our query we populated it, so this shouldn't happen
        }
        
        // If no cost found, estimate (70% of selling price)
        if (itemCost === 0 && item.unitPrice) {
          itemCost = item.unitPrice * 0.7;
          costItems['Estimated Costs'] = (costItems['Estimated Costs'] || 0) + (itemCost * (item.quantity || 0));
        } else {
          // Use actual cost
          const productName = (item.productId as any)?.name || 'Product';
          costItems[productName] = (costItems[productName] || 0) + (itemCost * (item.quantity || 0));
        }
        
        saleCost += itemCost * (item.quantity || 0);
      }
      
      totalCOGS += saleCost;
    }

    // ========== 2. VALIDATE COGS ==========
    // If COGS is too low (less than 30% of revenue), use estimation
    if (totalRevenue > 0 && totalCOGS < totalRevenue * 0.3) {
      console.warn(`COGS too low (${totalCOGS}) vs Revenue (${totalRevenue}). Using estimated COGS.`);
      
      // Calculate estimated COGS at 70% of revenue
      const estimatedCOGS = totalRevenue * 0.7;
      totalCOGS = estimatedCOGS;
      
      // Update cost items
      costItems['Cost of Goods Sold (Estimated)'] = estimatedCOGS;
    }

    // ========== 3. CALCULATE GROSS PROFIT ==========
    const grossProfit = totalRevenue - totalCOGS;
    
    // ========== 4. CALCULATE EXPENSES ==========
    const expenseVouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
    }).lean();
    
    const expenseAccounts = await Account.find({
      outletId: user.outletId,
      accountType: 'expense',
    }).lean<LeanAccount[]>();
    
    const expenseItems: { [key: string]: number } = {};
    const otherExpenseItems: { [key: string]: number } = {};
    
    // Create account map for quick lookup
    const expenseAccountMap = new Map();
    expenseAccounts.forEach(account => {
      expenseAccountMap.set(account._id.toString(), account);
    });
    
    expenseVouchers.forEach(voucher => {
      voucher.entries?.forEach((entry: any) => {
        const amount = entry.debit || 0;
        if (amount > 0 && entry.accountId) {
          const account = expenseAccountMap.get(entry.accountId.toString());
          
          if (account) {
            const accountName = account.accountName;
            const accountGroup = account.accountGroup || 'Other Expenses';
            
            if (accountGroup === 'Financial Expenses' || 
                accountName.toLowerCase().includes('interest') ||
                accountName.toLowerCase().includes('bank charge')) {
              otherExpenseItems[accountName] = (otherExpenseItems[accountName] || 0) + amount;
            } else {
              expenseItems[accountName] = (expenseItems[accountName] || 0) + amount;
            }
          }
        }
      });
    });
    
    // ========== 5. CALCULATE OTHER INCOME ==========
    const receiptVouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      voucherType: 'receipt',
    }).lean();
    
    const revenueAccounts = await Account.find({
      outletId: user.outletId,
      accountType: 'revenue',
    }).lean<LeanAccount[]>();
    
    const otherIncomeItems: { [key: string]: number } = {};
    
    const revenueAccountMap = new Map();
    revenueAccounts.forEach(account => {
      revenueAccountMap.set(account._id.toString(), account);
    });
    
    receiptVouchers.forEach(voucher => {
      voucher.entries?.forEach((entry: any) => {
        const amount = entry.credit || 0;
        if (amount > 0 && entry.accountId) {
          const account = revenueAccountMap.get(entry.accountId.toString());
          
          if (account && !account.accountName.toLowerCase().includes('sales')) {
            otherIncomeItems[account.accountName] = (otherIncomeItems[account.accountName] || 0) + amount;
          }
        }
      });
    });
    
    // ========== 6. CALCULATE TOTALS ==========
    const totalExpenses = Object.values(expenseItems).reduce((sum, val) => sum + val, 0);
    const totalOtherExpenses = Object.values(otherExpenseItems).reduce((sum, val) => sum + val, 0);
    const totalOtherIncome = Object.values(otherIncomeItems).reduce((sum, val) => sum + val, 0);
    
    // ========== 7. CALCULATE PROFITS ==========
    const operatingProfit = grossProfit - totalExpenses;
    const netProfit = operatingProfit + totalOtherIncome - totalOtherExpenses;
    
    
    // ========== 9. STRUCTURE THE RESPONSE ==========
    const reportData = {
      revenue: {
        items: revenueItems,
        total: totalRevenue,
      },
      costOfSales: {
        items: costItems,
        total: totalCOGS,
      },
      expenses: {
        items: expenseItems,
        total: totalExpenses,
      },
      otherIncome: {
        items: otherIncomeItems,
        total: totalOtherIncome,
      },
      otherExpenses: {
        items: otherExpenseItems,
        total: totalOtherExpenses,
      },
      grossProfit,
      operatingProfit,
      netProfit,
      metadata: {
        outletName: outlet?.name || outlet?.name || 'AutoCity Pro',
        outletId: user.outletId,
        generatedAt: new Date().toISOString(),
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        calculationDetails: {
          salesCount: sales.length,
          revenue: totalRevenue,
          cogs: totalCOGS,
          cogsPercentage: totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(2) + '%' : '0%',
          grossMargin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%',
          calculationMethod: 'Dashboard API Method'
        }
      },
    };
    
    return NextResponse.json({ reportData });
  } catch (error: any) {
    console.error('Error generating P&L report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}