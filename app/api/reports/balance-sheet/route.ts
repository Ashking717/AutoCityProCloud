import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import Product from '@/lib/models/ProductEnhanced';
import Sale from '@/lib/models/Sale';
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
    
    const accounts = await Account.find({ outletId: user.outletId }).lean();
    
    const assetAccounts = accounts.filter(a => a.accountType === 'asset');
    const liabilityAccounts = accounts.filter(a => a.accountType === 'liability');
    const equityAccounts = accounts.filter(a => a.accountType === 'equity');
    
    const currentAssets: { [key: string]: number } = {};
    const fixedAssets: { [key: string]: number } = {};
    
    assetAccounts.forEach(account => {
      const balance = account.currentBalance || 0;
      if (account.accountGroup === 'Current Assets' || account.accountGroup === 'Cash & Bank') {
        currentAssets[account.accountName] = balance;
      } else {
        fixedAssets[account.accountName] = balance;
      }
    });
    
    // Inventory - flat structure
    const products = await Product.find({ outletId: user.outletId }).lean();
    const inventoryValue = products.reduce((sum, p) => {
      return sum + ((p.currentStock || 0) * (p.costPrice || 0));
    }, 0);
    currentAssets['Inventory'] = inventoryValue;
    
    const unpaidSales = await Sale.find({
      outletId: user.outletId,
      status: 'COMPLETED',
      balanceDue: { $gt: 0 },
    }).lean();
    
    const accountsReceivable = unpaidSales.reduce((sum, sale) => sum + (sale.balanceDue || 0), 0);
    currentAssets['Accounts Receivable'] = accountsReceivable;
    
    const currentLiabilities: { [key: string]: number } = {};
    const longTermLiabilities: { [key: string]: number } = {};
    
    liabilityAccounts.forEach(account => {
      const balance = account.currentBalance || 0;
      if (account.accountGroup === 'Current Liabilities') {
        currentLiabilities[account.accountName] = balance;
      } else {
        longTermLiabilities[account.accountName] = balance;
      }
    });
    
    const equity: { [key: string]: number } = {};
    equityAccounts.forEach(account => {
      equity[account.accountName] = account.currentBalance || 0;
    });
    
    const totalCurrentAssets = Object.values(currentAssets).reduce((sum, val) => sum + val, 0);
    const totalFixedAssets = Object.values(fixedAssets).reduce((sum, val) => sum + val, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;
    
    const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((sum, val) => sum + val, 0);
    const totalLongTermLiabilities = Object.values(longTermLiabilities).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
    
    const totalEquity = Object.values(equity).reduce((sum, val) => sum + val, 0);
    
    const reportData = {
      assets: {
        currentAssets: {
          items: currentAssets,
          total: totalCurrentAssets,
        },
        fixedAssets: {
          items: fixedAssets,
          total: totalFixedAssets,
        },
        totalAssets,
      },
      liabilities: {
        currentLiabilities: {
          items: currentLiabilities,
          total: totalCurrentLiabilities,
        },
        longTermLiabilities: {
          items: longTermLiabilities,
          total: totalLongTermLiabilities,
        },
        totalLiabilities,
      },
      equity: {
        items: equity,
        total: totalEquity,
      },
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
    
    return NextResponse.json({ reportData });
  } catch (error: any) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
