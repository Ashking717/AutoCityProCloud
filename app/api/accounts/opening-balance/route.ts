// app/api/accounts/opening-balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import Voucher from '@/lib/models/Voucher';
import LedgerEntry from '@/lib/models/LedgerEntry';
import ActivityLog from '@/lib/models/ActivityLog';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { generateVoucherNumber } from '@/lib/services/accountingService';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const { entries, date, allowUpdate } = await request.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }

    // ─────────────────────────────────────────────
    // CHECK FOR EXISTING OPENING BALANCE
    // ─────────────────────────────────────────────
    const existing = await Voucher.findOne({
      outletId: user.outletId,
      referenceType: 'OPENING_BALANCE',
      status: 'posted',
    });

    if (existing && !allowUpdate) {
      return NextResponse.json(
        { 
          error: 'Opening balance already posted. Set allowUpdate=true to update, or use the reset endpoint.',
          existingVoucher: existing.voucherNumber,
          hint: 'Add all accounts at once in the Opening Balance page, or reset and start over.'
        },
        { status: 400 }
      );
    }

    // If updating, delete old voucher and ledger entries first
    if (existing && allowUpdate) {
      console.log('🔄 Updating existing opening balance...');
      
      // Delete old ledger entries
      await LedgerEntry.collection.deleteMany({
        voucherId: existing._id,
      });
      
      // Delete old voucher
      await Voucher.collection.deleteOne({ _id: existing._id });
      
      // Reset all account balances
      await Account.updateMany(
        { outletId: user.outletId },
        { $set: { openingBalance: 0, currentBalance: 0 } }
      );
      
      console.log('  ✓ Cleared previous opening balance');
    }

    // ─────────────────────────────────────────────
    // FIND OR CREATE OPENING BALANCE EQUITY
    // ─────────────────────────────────────────────
    let obEquity = await Account.findOne({
      outletId: user.outletId,
      code: 'OB-EQUITY',
    }) as any;

    if (!obEquity) {
      obEquity = await Account.create({
        code: 'OB-EQUITY',
        name: 'Opening Balance Equity',
        type: 'equity',
        subType: 'owner_equity',
        accountGroup: 'Owner Equity',
        openingBalance: 0,
        currentBalance: 0,
        isSystem: true,
        isActive: true,
        outletId: user.outletId,
      });
      console.log('✓ Created OB-EQUITY account');
    }

    // ─────────────────────────────────────────────
    // BUILD JOURNAL ENTRIES + SET BALANCES
    // ─────────────────────────────────────────────
    const journalEntries: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    console.log(`\n📊 Processing ${entries.length} opening balance entries...`);

    for (const row of entries) {
      const account = await Account.findById(row.accountId).lean() as any;
      if (!account) {
        console.warn(`⚠️ Account not found: ${row.accountId}`);
        continue;
      }

      const balance = Math.abs(Number(row.balance) || 0);
      if (balance === 0) continue;

      const accountCode = account.code || account.accountNumber || 'N/A';
      const accountName = account.name || account.accountName || 'Unknown';
      const accountType = (account.type || account.accountType || '').toLowerCase();
      
      // Assets and Expenses have DEBIT normal balance
      // Liabilities, Equity, Revenue have CREDIT normal balance
      const isDebitNormal = accountType === 'asset' || accountType === 'expense';

      if (isDebitNormal) {
        // DEBIT entry for assets/expenses
        journalEntries.push({
          accountId: account._id,
          accountNumber: accountCode,
          accountName: accountName,
          debit: balance,
          credit: 0,
        });
        totalDebit += balance;
        console.log(`  DR ${accountCode} (${accountType}): ${balance}`);
      } else {
        // CREDIT entry for liabilities/equity/revenue
        journalEntries.push({
          accountId: account._id,
          accountNumber: accountCode,
          accountName: accountName,
          debit: 0,
          credit: balance,
        });
        totalCredit += balance;
        console.log(`  CR ${accountCode} (${accountType}): ${balance}`);
      }

      // Set opening and current balance on the account
      // For ALL account types, the balance is stored as a POSITIVE number
      await Account.findByIdAndUpdate(account._id, {
        openingBalance: balance,
        currentBalance: balance,
      });
    }

    // ─────────────────────────────────────────────
    // BALANCE WITH OPENING BALANCE EQUITY
    // ─────────────────────────────────────────────
    const difference = totalDebit - totalCredit;

    console.log(`\n📊 Before balancing: DR=${totalDebit}, CR=${totalCredit}, Diff=${difference}`);

    if (Math.abs(difference) > 0.01) {
      const obCode = obEquity.code || 'OB-EQUITY';
      const obName = obEquity.name || 'Opening Balance Equity';

      if (difference > 0) {
        // More debits than credits - need to CREDIT equity
        journalEntries.push({
          accountId: obEquity._id,
          accountNumber: obCode,
          accountName: obName,
          debit: 0,
          credit: difference,
        });
        totalCredit += difference;

        await Account.findByIdAndUpdate(obEquity._id, {
          openingBalance: difference,
          currentBalance: difference,
        });

        console.log(`  CR OB-EQUITY: ${difference} (balancing entry)`);
      } else {
        // More credits than debits - need to DEBIT equity (rare)
        const absDiff = Math.abs(difference);
        journalEntries.push({
          accountId: obEquity._id,
          accountNumber: obCode,
          accountName: obName,
          debit: absDiff,
          credit: 0,
        });
        totalDebit += absDiff;

        await Account.findByIdAndUpdate(obEquity._id, {
          openingBalance: absDiff,
          currentBalance: absDiff,
        });

        console.log(`  DR OB-EQUITY: ${absDiff} (balancing entry)`);
      }
    }

    // Verify balance
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal not balanced: DR=${totalDebit}, CR=${totalCredit}`);
    }

    console.log(`✓ Balanced: DR=${totalDebit}, CR=${totalCredit}`);

    // ─────────────────────────────────────────────
    // CREATE VOUCHER
    // ─────────────────────────────────────────────
    const voucherNumber = await generateVoucherNumber(
      'journal',
      new mongoose.Types.ObjectId(user.outletId ?? undefined)
    );

    const voucher = await Voucher.create({
      voucherNumber,
      voucherType: 'journal',
      date: date ? new Date(date) : new Date(),
      narration: 'Opening Balance Entry',
      entries: journalEntries,
      totalDebit,
      totalCredit,
      status: 'posted',
      referenceType: 'OPENING_BALANCE',
      outletId: user.outletId,
      createdBy: user.userId,
    });

    console.log(`✓ Created voucher: ${voucherNumber}`);

    // ─────────────────────────────────────────────
    // CREATE LEDGER ENTRIES
    // ─────────────────────────────────────────────
    const ledgerDocs = journalEntries.map(e => ({
      voucherId: voucher._id,
      voucherNumber: voucher.voucherNumber,
      voucherType: 'journal',
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.debit,
      credit: e.credit,
      narration: 'Opening Balance Entry',
      date: voucher.date,
      referenceType: 'OPENING_BALANCE',
      isReversal: false,
      outletId: user.outletId,
      createdBy: user.userId,
    }));

    await LedgerEntry.insertMany(ledgerDocs);
    console.log(`✓ Created ${ledgerDocs.length} ledger entries`);

    // ─────────────────────────────────────────────
    // ACTIVITY LOG
    // ─────────────────────────────────────────────
    const userDoc = await User.findById(user.userId).lean() as any;
    await ActivityLog.create({
      userId: user.userId,
      username: userDoc?.username || userDoc?.email || user.email,
      actionType: 'create',
      module: 'accounts',
      description: `Posted opening balances - ${entries.length} accounts`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    console.log(`\n✅ Opening balance posted successfully!\n`);

    return NextResponse.json({
      success: true,
      voucherNumber: voucher.voucherNumber,
      entriesCount: journalEntries.length,
      totals: { totalDebit, totalCredit },
    });
  } catch (error: any) {
    console.error('Opening balance error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check if opening balance exists
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);

    const existing = await Voucher.findOne({
      outletId: user.outletId,
      referenceType: 'OPENING_BALANCE',
      status: 'posted',
    }).lean() as any;

    // Get accounts with non-zero balances
    const accountsWithBalance = await Account.find({
      outletId: user.outletId,
      $or: [
        { openingBalance: { $ne: 0 } },
        { currentBalance: { $ne: 0 } },
      ],
    })
      .select('code name type openingBalance currentBalance')
      .lean();

    return NextResponse.json({
      hasOpeningBalance: !!existing,
      voucherNumber: existing?.voucherNumber || null,
      voucherDate: existing?.date || null,
      totalDebit: existing?.totalDebit || 0,
      totalCredit: existing?.totalCredit || 0,
      accountsWithBalance,
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}