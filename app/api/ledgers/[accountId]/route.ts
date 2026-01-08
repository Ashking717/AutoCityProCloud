// app/api/ledgers/[accountId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
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
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    
    // Parse date range
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');
    
    const fromDate = fromDateStr 
      ? new Date(fromDateStr) 
      : new Date(new Date().getFullYear(), 0, 1); // Jan 1st of current year
    
    const toDate = toDateStr 
      ? new Date(toDateStr) 
      : new Date(); // Today
    
    // Set time to start and end of day
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    
    console.log('📊 Fetching ledger:');
    console.log(`   Account: ${params.accountId}`);
    console.log(`   Date Range: ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}`);
    
    // Get account details
    const accountRaw = await Account.findOne({
      _id: params.accountId,
      outletId: user.outletId,
    }).lean() as any;
    
    if (!accountRaw) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Map account fields for frontend
    const account = {
      ...accountRaw,
      accountNumber: accountRaw.code || accountRaw.accountNumber,
      accountName: accountRaw.name || accountRaw.accountName,
      accountType: (accountRaw.type || accountRaw.accountType || '').toLowerCase(),
    };
    
    console.log(`   Account: ${account.accountNumber} - ${account.accountName}`);
    
    // Get opening balance (entries before fromDate)
    const entriesBeforeRange = await LedgerEntry.find({
      accountId: params.accountId,
      outletId: user.outletId,
      date: { $lt: fromDate },
    }).lean();
    
    const totalDebitBefore = entriesBeforeRange.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCreditBefore = entriesBeforeRange.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);
    
    // Calculate opening balance based on account type
    const accountType = (accountRaw.type || accountRaw.accountType || '').toUpperCase();
    let openingBalance = 0;

    if (accountType === 'asset' || accountType === 'expense') {
      openingBalance = totalDebitBefore - totalCreditBefore;
    } else {
      openingBalance = totalCreditBefore - totalDebitBefore;
    }
    
    console.log(`   Opening Balance: QAR ${openingBalance.toFixed(2)}`);
    
    // Get ledger entries within date range
    const entries = await LedgerEntry.find({
      accountId: params.accountId,
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();
    
    console.log(`   Found ${entries.length} entries`);
    
    // Build ledger with running balance
    const ledgerEntries: any[] = [];
    let runningBalance = openingBalance;
    
    entries.forEach((entry: any) => {
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;
      
      // Update running balance based on account type
      if (accountType === 'asset' || accountType === 'expense') {
        runningBalance += (debit - credit);
      } else {
        runningBalance += (credit - debit);
      }
      
      ledgerEntries.push({
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
      });
    });
    
    // Calculate summary
    const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
    const closingBalance = runningBalance;
    
    const summary = {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      transactionCount: ledgerEntries.length,
      netChange: closingBalance - openingBalance,
    };
    
    console.log('   Summary:');
    console.log(`   - Total Debits: QAR ${totalDebit.toFixed(2)}`);
    console.log(`   - Total Credits: QAR ${totalCredit.toFixed(2)}`);
    console.log(`   - Closing Balance: QAR ${closingBalance.toFixed(2)}`);
    
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
    console.error('❌ Error fetching account ledger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}