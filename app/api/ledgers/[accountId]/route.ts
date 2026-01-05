import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import Voucher from '@/lib/models/Voucher';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
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
    
    // Get account
    const account = await Account.findOne({
      _id: params.accountId,
      outletId: user.outletId,
    }).lean();
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Get all vouchers containing this account
    const vouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      'entries.accountId': params.accountId,
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();
    
    // Build ledger entries
    const ledgerEntries: any[] = [];
    let runningBalance = (account as any).openingBalance || 0;
    
    vouchers.forEach((voucher: any) => {
      voucher.entries.forEach((entry: any) => {
        if (entry.accountId.toString() === params.accountId) {
          const debit = entry.debit || 0;
          const credit = entry.credit || 0;
          
          runningBalance += debit - credit;
          
          ledgerEntries.push({
            date: voucher.date,
            voucherType: voucher.voucherType,
            voucherNumber: voucher.voucherNumber,
            narration: entry.narration || voucher.narration,
            debit,
            credit,
            balance: runningBalance,
          });
        }
      });
    });
    
    const summary = {
      openingBalance: (account as any).openingBalance || 0,
      totalDebit: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
      closingBalance: runningBalance,
      transactionCount: ledgerEntries.length,
    };
    
    return NextResponse.json({
      account,
      ledgerEntries,
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching account ledger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}