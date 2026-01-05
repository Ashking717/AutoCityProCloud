import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import Account from '@/lib/models/Account';
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

    // ✅ REQUIRED guard
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

    // Get all cash accounts
    const cashAccounts = await Account.find({
      outletId,
      accountGroup: 'Cash & Bank',
    }).lean();

    // Operating Activities
    const sales = await Sale.find({
      outletId,
      saleDate: { $gte: fromDate, $lte: toDate },
      status: 'COMPLETED',
    }).lean();

    const cashFromSales = sales.reduce(
      (sum, s: any) => sum + (s.amountPaid || 0),
      0
    );

    // Expense vouchers
    const expenseVouchers = await Voucher.find({
      outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      voucherType: 'payment',
    }).lean();

    const cashPaidForExpenses = expenseVouchers.reduce(
      (sum, v: any) => sum + (v.totalDebit || 0),
      0
    );

    const operatingActivities = {
      cashFromSales,
      cashPaidForExpenses: -cashPaidForExpenses,
      netOperatingCash: cashFromSales - cashPaidForExpenses,
    };

    // Investing Activities
    const investingVouchers = await Voucher.find({
      outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      voucherType: { $in: ['payment', 'receipt'] },
    }).lean();

    let assetPurchases = 0;
    let assetSales = 0;

    investingVouchers.forEach((v: any) => {
      v.entries?.forEach((entry: any) => {
        const name = entry.accountName?.toLowerCase() || '';

        if (name.includes('asset') || name.includes('equipment')) {
          if (entry.debit > 0) assetPurchases += entry.debit;
          if (entry.credit > 0) assetSales += entry.credit;
        }
      });
    });

    const investingActivities = {
      assetPurchases: -assetPurchases,
      assetSales,
      netInvestingCash: assetSales - assetPurchases,
    };

    // Financing Activities
    let loanReceipts = 0;
    let loanRepayments = 0;

    investingVouchers.forEach((v: any) => {
      v.entries?.forEach((entry: any) => {
        if (entry.accountName?.toLowerCase().includes('loan')) {
          if (entry.credit > 0) loanReceipts += entry.credit;
          if (entry.debit > 0) loanRepayments += entry.debit;
        }
      });
    });

    const financingActivities = {
      loanReceipts,
      loanRepayments: -loanRepayments,
      netFinancingCash: loanReceipts - loanRepayments,
    };

    const netCashFlow =
      operatingActivities.netOperatingCash +
      investingActivities.netInvestingCash +
      financingActivities.netFinancingCash;

    const openingCash = cashAccounts.reduce(
      (sum: number, a: any) => sum + (a.openingBalance || 0),
      0
    );

    const closingCash = openingCash + netCashFlow;

    return NextResponse.json({
      operatingActivities,
      investingActivities,
      financingActivities,
      netCashFlow,
      openingCash,
      closingCash,
    });
  } catch (error: any) {
    console.error('Error generating cash flow:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
