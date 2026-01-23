// app/api/ledgers/[accountId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    await connectDB();

    /* ───────── AUTH ───────── */
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!mongoose.Types.ObjectId.isValid(params.accountId)) {
      return NextResponse.json({ error: 'Invalid accountId' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);

    /* ───────── DATE RANGE ───────── */
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');

    const fromDate = fromDateStr
      ? new Date(fromDateStr)
      : new Date(new Date().getFullYear(), 0, 1);

    const toDate = toDateStr ? new Date(toDateStr) : new Date();

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    /* ───────── LOAD ACCOUNT ───────── */
    const accountRaw = (await Account.findOne({
      _id: params.accountId,
      outletId: user.outletId,
      isActive: true,
    }).lean()) as any;

    if (!accountRaw) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = {
      _id: accountRaw._id,
      accountNumber: accountRaw.code || accountRaw.accountNumber,
      accountName: accountRaw.name || accountRaw.accountName,
      accountType: (accountRaw.type || accountRaw.accountType || '').toLowerCase(),
    };

    /* ───────── OPENING BALANCE ───────── */
    const entriesBefore = await LedgerEntry.find({
      accountId: params.accountId,
      outletId: user.outletId,
      date: { $lt: fromDate },
    }).lean();

    const openingBalance = entriesBefore.reduce(
      (sum: number, e: any) => sum + (e.debit || 0) - (e.credit || 0),
      0
    );

    /* ───────── PERIOD ENTRIES ───────── */
    const entries = await LedgerEntry.find({
      accountId: params.accountId,
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const ledgerEntries = entries.map((entry: any) => {
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;

      runningBalance += debit - credit;
      totalDebit += debit;
      totalCredit += credit;

      return {
        _id: entry._id,
        date: entry.date,
        voucherType: entry.voucherType,
        voucherNumber: entry.voucherNumber,
        voucherId: entry.voucherId,
        narration: entry.narration || '',
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        referenceNumber: entry.referenceNumber,
        debit,
        credit,
        balance: runningBalance,
        createdAt: entry.createdAt,
      };
    });

    /* ───────── SUMMARY ───────── */
    const summary = {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance: runningBalance,
      transactionCount: ledgerEntries.length,
      netChange: runningBalance - openingBalance,
    };

    return NextResponse.json({
      account,
      ledgerEntries,
      summary,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
    });
  } catch (error: any) {
    console.error('❌ Ledger API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger' },
      { status: 500 }
    );
  }
}
