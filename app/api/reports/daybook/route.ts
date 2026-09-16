import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    
    const date = new Date(searchParams.get('date') || new Date());
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const ledgerRows = await LedgerEntry.find({
      outletId: user.outletId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ date: 1, createdAt: 1, lineNumber: 1 })
      .lean();
    const groups = new Map<string, any[]>();
    for (const row of ledgerRows as any[]) {
      const key = String(row.voucherId);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    const entries = [...groups.values()].map((rows) => ({
      time: rows[0].date,
      type: rows[0].voucherType.charAt(0).toUpperCase() + rows[0].voucherType.slice(1),
      reference: rows[0].voucherNumber,
      description: rows[0].narration,
      debit: rows.reduce((sum, row) => sum + Number(row.debit || 0), 0),
      credit: rows.reduce((sum, row) => sum + Number(row.credit || 0), 0),
      balance: 0,
      referenceType: rows[0].referenceType,
      referenceId: rows[0].referenceId,
    }));
    
    // Sort by time
    entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    // Calculate running balance
    let runningBalance = 0;
    entries.forEach(entry => {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    });
    
    const summary = {
      totalDebit: entries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: entries.reduce((sum, e) => sum + e.credit, 0),
      netBalance: runningBalance,
      totalTransactions: entries.length,
      salesCount: new Set(
        entries
          .filter((entry: any) => entry.referenceType === 'SALE')
          .map((entry: any) => String(entry.referenceId))
      ).size,
      vouchersCount: entries.length,
    };
    
    return NextResponse.json({
      entries,
      summary,
      date: startOfDay,
    });
  } catch (error: any) {
    console.error('Error generating daybook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
