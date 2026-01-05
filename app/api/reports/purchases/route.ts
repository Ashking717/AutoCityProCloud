import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Voucher from '@/lib/models/Voucher';
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
    
    // Get all purchase vouchers
    const purchases = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'purchase',
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
    })
      .sort({ date: -1 })
      .lean();
    
    // Get all payment vouchers (for purchase payments)
    const payments = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'payment',
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
    })
      .sort({ date: -1 })
      .lean();
    
    // Calculate summary
    const summary = {
      totalPurchases: purchases.length,
      totalPurchaseAmount: purchases.reduce((sum, p) => sum + (p.totalDebit || 0), 0),
      totalPayments: payments.length,
      totalPaymentAmount: payments.reduce((sum, p) => sum + (p.totalDebit || 0), 0),
      averagePurchaseValue: 0,
      outstandingPayables: 0,
    };
    
    if (purchases.length > 0) {
      summary.averagePurchaseValue = summary.totalPurchaseAmount / purchases.length;
    }
    
    // Group by supplier (account)
    const supplierPurchases: { [key: string]: { count: number; amount: number; payments: number } } = {};
    
    purchases.forEach(purchase => {
      purchase.entries.forEach((entry: any) => {
        // Credit entries are suppliers
        if (entry.credit > 0) {
          const supplierName = entry.accountName;
          if (!supplierPurchases[supplierName]) {
            supplierPurchases[supplierName] = { count: 0, amount: 0, payments: 0 };
          }
          supplierPurchases[supplierName].count += 1;
          supplierPurchases[supplierName].amount += entry.credit;
        }
      });
    });
    
    // Add payment tracking
    payments.forEach(payment => {
      payment.entries.forEach((entry: any) => {
        if (entry.debit > 0 && supplierPurchases[entry.accountName]) {
          supplierPurchases[entry.accountName].payments += entry.debit;
        }
      });
    });
    
    // Group by category (based on debit accounts)
    const categoryPurchases: { [key: string]: { count: number; amount: number } } = {};
    
    purchases.forEach(purchase => {
      purchase.entries.forEach((entry: any) => {
        // Debit entries are expense/inventory accounts
        if (entry.debit > 0) {
          const category = entry.accountName;
          if (!categoryPurchases[category]) {
            categoryPurchases[category] = { count: 0, amount: 0 };
          }
          categoryPurchases[category].count += 1;
          categoryPurchases[category].amount += entry.debit;
        }
      });
    });
    
    return NextResponse.json({
      purchases,
      payments,
      summary,
      supplierPurchases,
      categoryPurchases,
    });
  } catch (error: any) {
    console.error('Error generating purchases report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
