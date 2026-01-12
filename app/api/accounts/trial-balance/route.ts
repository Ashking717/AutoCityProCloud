import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Account from '@/lib/models/Account';
import Voucher from '@/lib/models/Voucher';
import Outlet from '@/lib/models/Outlet';
import { connectDB } from '@/lib/db/mongodb';

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const outletId = searchParams.get('outletId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    if (!outletId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: 'outletId, fromDate and toDate are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(outletId)) {
      return NextResponse.json(
        { error: 'Invalid outletId' },
        { status: 400 }
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    /* ----------------------------------------------------
       1️⃣ LOAD OUTLET (NAME FOR AUDIT)
    ---------------------------------------------------- */
    const outlet = await Outlet.findById(outletId)
      .select('name')
      .lean();

    if (!outlet) {
      return NextResponse.json(
        { error: 'Outlet not found' },
        { status: 404 }
      );
    }

    const outletName = outlet.name;

    /* ----------------------------------------------------
       2️⃣ LOAD ACCOUNTS (OUTLET-SCOPED)
    ---------------------------------------------------- */
    type AccountDoc = {
      _id: mongoose.Types.ObjectId | string;
      code: string;
      name: string;
      type: string;
      subType?: string;
    };

    const rawAccounts = await Account.find({
      outletId,
      isActive: true,
    }).lean();

    const accounts: AccountDoc[] = rawAccounts.map((acc: any) => ({
      _id: acc._id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      subType: acc.subType,
    }));

    /* ----------------------------------------------------
       3️⃣ LOAD VOUCHERS ONCE (POSTED / APPROVED ONLY)
    ---------------------------------------------------- */
    const vouchers = await Voucher.find({
      outletId,
      status: { $in: ['posted', 'approved'] },
      date: { $lte: to },
    }).lean();

    /* ----------------------------------------------------
       4️⃣ INITIALIZE TRIAL BALANCE MAP
    ---------------------------------------------------- */
    type TBRow = {
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      accountGroup?: string;
      openingBalance: number;
      periodDebit: number;
      periodCredit: number;
      closingBalance: number;
    };

    const tbMap = new Map<string, TBRow>();

    for (const acc of accounts) {
      tbMap.set(acc._id.toString(), {
        accountId: acc._id.toString(),
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        accountGroup: acc.subType,
        openingBalance: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingBalance: 0,
      });
    }

    /* ----------------------------------------------------
       5️⃣ PROCESS VOUCHERS (SINGLE PASS)
    ---------------------------------------------------- */
    for (const voucher of vouchers) {
      for (const entry of voucher.entries) {
        const row = tbMap.get(entry.accountId.toString());
        if (!row) continue;

        const debit = entry.debit || 0;
        const credit = entry.credit || 0;

        if (voucher.date < from) {
          row.openingBalance += debit - credit;
        } else {
          row.periodDebit += debit;
          row.periodCredit += credit;
        }
      }
    }

    /* ----------------------------------------------------
       6️⃣ FINALIZE ROWS & TOTALS
    ---------------------------------------------------- */
    let totalDebit = 0;
    let totalCredit = 0;
    const results: TBRow[] = [];

    for (const row of tbMap.values()) {
      row.closingBalance =
        row.openingBalance + row.periodDebit - row.periodCredit;

      if (
        row.openingBalance !== 0 ||
        row.periodDebit !== 0 ||
        row.periodCredit !== 0
      ) {
        totalDebit += row.periodDebit;
        totalCredit += row.periodCredit;

        results.push({
          ...row,
          openingBalance: Number(row.openingBalance.toFixed(2)),
          periodDebit: Number(row.periodDebit.toFixed(2)),
          periodCredit: Number(row.periodCredit.toFixed(2)),
          closingBalance: Number(row.closingBalance.toFixed(2)),
        });
      }
    }

    /* ----------------------------------------------------
       7️⃣ SORT (ACCOUNTING ORDER)
    ---------------------------------------------------- */
    const typeOrder: Record<string, number> = {
      asset: 1,
      liability: 2,
      equity: 3,
      revenue: 4,
      expense: 5,
    };

    results.sort((a, b) => {
      const tA = typeOrder[a.accountType] || 99;
      const tB = typeOrder[b.accountType] || 99;
      if (tA !== tB) return tA - tB;
      return a.accountName.localeCompare(b.accountName);
    });

    /* ----------------------------------------------------
       8️⃣ BALANCE CHECK
    ---------------------------------------------------- */
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;

    /* ----------------------------------------------------
       9️⃣ RESPONSE (AUDIT-READY)
    ---------------------------------------------------- */
    return NextResponse.json({
      success: true,
      report: {
        name: 'Trial Balance',
        outletName,
        period: {
          from: fromDate,
          to: toDate,
        },
        generatedAt: new Date(),
      },
      totals: {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        difference: Number(difference.toFixed(2)),
        isBalanced,
      },
      accounts: results,
    });

  } catch (error) {
    console.error('Trial Balance API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate trial balance' },
      { status: 500 }
    );
  }
}
