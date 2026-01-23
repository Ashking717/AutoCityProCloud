import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Account from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
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
       1️⃣ LOAD OUTLET
    ---------------------------------------------------- */
    const outlet = await Outlet.findById(outletId).select('name').lean();
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    /* ----------------------------------------------------
       2️⃣ LOAD ACCOUNTS
    ---------------------------------------------------- */
    const accounts = await Account.find({
      outletId,
      isActive: true,
    }).lean();

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
  const accountId = (acc._id as mongoose.Types.ObjectId).toString();

  tbMap.set(accountId, {
    accountId,
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
       3️⃣ LOAD LEDGER ENTRIES (SINGLE SOURCE OF TRUTH)
    ---------------------------------------------------- */
    const ledgerEntries = await LedgerEntry.find({
      outletId,
      date: { $lte: to },
    }).lean();

    /* ----------------------------------------------------
       4️⃣ PROCESS LEDGER ENTRIES
    ---------------------------------------------------- */
    for (const entry of ledgerEntries) {
      const key = entry.accountId.toString();

      let row = tbMap.get(key);

      // 🔒 Ensure ALL ledger entries are counted
      if (!row) {
        row = {
          accountId: key,
          accountCode: entry.accountNumber || '',
          accountName: entry.accountName || 'Unknown Account',
          accountType: 'unknown',
          openingBalance: 0,
          periodDebit: 0,
          periodCredit: 0,
          closingBalance: 0,
        };
        tbMap.set(key, row);
      }

      const debit = entry.debit || 0;
      const credit = entry.credit || 0;

      if (entry.date < from) {
        row.openingBalance += debit - credit;
      } else {
        row.periodDebit += debit;
        row.periodCredit += credit;
      }
    }

    /* ----------------------------------------------------
       5️⃣ FINALIZE & TOTALS
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
       6️⃣ SORT (ACCOUNTING ORDER)
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
       7️⃣ BALANCE CHECK
    ---------------------------------------------------- */
    const difference = Math.abs(totalDebit - totalCredit);

    /* ----------------------------------------------------
       8️⃣ RESPONSE
    ---------------------------------------------------- */
    return NextResponse.json({
      success: true,
      report: {
        name: 'Trial Balance',
        outletName: outlet.name,
        period: { from: fromDate, to: toDate },
        generatedAt: new Date(),
      },
      totals: {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        difference: Number(difference.toFixed(2)),
        isBalanced: difference < 0.01,
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
