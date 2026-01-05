
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import Account from '@/lib/models/Account';
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
    const { searchParams } = new URL(request.url);
    
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    
    const sales = await Sale.find({
      outletId: user.outletId,
      saleDate: { $gte: fromDate, $lte: toDate },
      status: 'COMPLETED',
    }).lean();
    
    const salesRevenue = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
    
    const totalProfit = sales.reduce((sum, sale) => {
      const saleProfit = sale.items.reduce((p, item: any) => {
        const estimatedCost = item.unitPrice * 0.7;
        const profit = (item.unitPrice - estimatedCost) * item.quantity;
        return p + profit;
      }, 0);
      return sum + saleProfit;
    }, 0);
    
    const expenseAccounts = await Account.find({
      outletId: user.outletId,
      accountType: 'expense',
    }).lean();
    
    const expenseVouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
    }).lean();
    
    const expensesByCategory: { [key: string]: number } = {};
    
    expenseVouchers.forEach(voucher => {
      voucher.entries.forEach((entry: any) => {
        const account = expenseAccounts.find((a:any) => a._id.toString() === entry.accountId.toString());
        if (account) {
          const category = account.accountGroup;
          expensesByCategory[category] = (expensesByCategory[category] || 0) + (entry.debit || 0);
        }
      });
    });
    
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    
    // Get stock values - flat structure
    const products = await Product.find({ outletId: user.outletId }).lean();
    
    let totalStockValue = 0;
    products.forEach(p => {
      totalStockValue += (p.currentStock || 0) * (p.costPrice || 0);
    });
    
    const totalCost = salesRevenue - totalProfit;
    
    const reportData = {
      revenue: {
        sales: salesRevenue,
        serviceRevenue: 0,
        otherIncome: 0,
        total: salesRevenue,
      },
      costOfSales: {
        openingStock: totalStockValue * 0.8,
        purchases: totalCost,
        closingStock: totalStockValue,
        total: totalCost,
      },
      grossProfit: totalProfit,
      expenses: {
        categories: expensesByCategory,
        total: totalExpenses,
      },
      operatingProfit: totalProfit - totalExpenses,
      otherExpenses: {
        interest: expensesByCategory['Financial Expenses'] || 0,
        bankCharges: 0,
        total: expensesByCategory['Financial Expenses'] || 0,
      },
      netProfit: totalProfit - totalExpenses - (expensesByCategory['Financial Expenses'] || 0),
    };
    
    return NextResponse.json({ reportData });
  } catch (error: any) {
    console.error('Error generating P&L report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
