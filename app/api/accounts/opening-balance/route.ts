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
    const body = await request.json();
    const { entries, date } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }

    // Calculate totals
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const accountDetails = await Promise.all(
      entries.map(async (entry: any) => {
        const account = await Account.findById(entry.accountId).lean() as any;
        if (!account) {
          throw new Error(`Account not found: ${entry.accountId}`);
        }

        const accountType = (account.type || account.accountType || '').toUpperCase();
        const balance = parseFloat(entry.balance) || 0;

        if (accountType === 'ASSET') {
          totalAssets += balance;
        } else if (accountType === 'LIABILITY') {
          totalLiabilities += balance;
        } else if (accountType === 'EQUITY') {
          totalEquity += balance;
        }

        return {
          account,
          accountType,
          balance,
        };
      })
    );

    // Check if equation balances
    const difference = totalAssets - (totalLiabilities + totalEquity);
    const isBalanced = Math.abs(difference) < 0.01;

    // Find or create Opening Balance Equity account
    let obEquityAccount = await Account.findOne({
      outletId: user.outletId,
      code: 'OB-EQUITY',
    }) as any;

    if (!obEquityAccount) {
      obEquityAccount = await Account.create({
        code: 'OB-EQUITY',
        name: 'Opening Balance Equity',
        type: 'equity',  // lowercase
        subType: 'owner_equity',  // lowercase with underscore
        accountGroup: 'Owner Equity',
        openingBalance: 0,
        currentBalance: 0,
        isSystem: true,
        isActive: true,
        outletId: user.outletId,
      });
    }

    // Generate voucher number
    const voucherNumber = await generateVoucherNumber('journal', new mongoose.Types.ObjectId(user.outletId || ''));

    // Build journal entries
    const journalEntries: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    // Add entries for each account
    for (const detail of accountDetails) {
      const { account, accountType, balance } = detail;
      
      if (balance === 0) continue;

      const accountNumber = account.code || account.accountNumber;
      const accountName = account.name || account.accountName;

      // Assets and Expenses have debit balances
      if (accountType === 'ASSET' || accountType === 'EXPENSE') {
        journalEntries.push({
          accountId: account._id,
          accountNumber,
          accountName,
          debit: Math.abs(balance),
          credit: 0,
        });
        totalDebit += Math.abs(balance);
      } else {
        // Liabilities, Equity, and Revenue have credit balances
        journalEntries.push({
          accountId: account._id,
          accountNumber,
          accountName,
          debit: 0,
          credit: Math.abs(balance),
        });
        totalCredit += Math.abs(balance);
      }

      // Update account opening balance
      await Account.findByIdAndUpdate(account._id, {
        openingBalance: balance,
      });
    }

    // Add balancing entry to Opening Balance Equity if needed
    if (!isBalanced) {
      if (difference > 0) {
        // Assets > Liabilities + Equity, credit OB Equity
        journalEntries.push({
          accountId: obEquityAccount._id,
          accountNumber: obEquityAccount.code,
          accountName: obEquityAccount.name,
          debit: 0,
          credit: Math.abs(difference),
        });
        totalCredit += Math.abs(difference);
      } else {
        // Assets < Liabilities + Equity, debit OB Equity
        journalEntries.push({
          accountId: obEquityAccount._id,
          accountNumber: obEquityAccount.code,
          accountName: obEquityAccount.name,
          debit: Math.abs(difference),
          credit: 0,
        });
        totalDebit += Math.abs(difference);
      }
    }

    // Create voucher
    const voucher = await Voucher.create({
      voucherNumber,
      voucherType: 'journal',
      date: date ? new Date(date) : new Date(),
      narration: 'Opening Balance Entry',
      entries: journalEntries,
      totalDebit: Math.max(totalDebit, totalCredit),
      totalCredit: Math.max(totalDebit, totalCredit),
      status: 'posted',
      referenceType: 'ADJUSTMENT',  // Use ADJUSTMENT instead of OPENING_BALANCE
      outletId: user.outletId,
      createdBy: user.userId,
    });

    // Create ledger entries
    const ledgerEntries = journalEntries.map((e: any) => ({
      voucherId: voucher._id,
      voucherNumber: voucher.voucherNumber,
      voucherType: 'journal',
      accountId: e.accountId,
      accountNumber: e.accountNumber,
      accountName: e.accountName,
      debit: e.debit,
      credit: e.credit,
      narration: 'Opening Balance Entry',
      date: date ? new Date(date) : new Date(),
      referenceType: 'ADJUSTMENT',  // Use ADJUSTMENT instead of OPENING_BALANCE
      outletId: user.outletId,
      createdBy: user.userId,
    }));

    await LedgerEntry.insertMany(ledgerEntries);

    // Activity log
    const userDoc = await User.findById(user.userId).lean();
    const username = userDoc?.username || userDoc?.username || user.username || user.email || "Unknown User";

    await ActivityLog.create({
      userId: user.userId,
      username,
      actionType: 'create',
      module: 'accounts',
      description: `Posted opening balances for ${entries.length} accounts (Total Assets: QAR ${totalAssets.toFixed(2)})`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      voucherNumber: voucher.voucherNumber,
      entriesCount: entries.length,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        difference: isBalanced ? 0 : difference,
      },
    });
  } catch (error: any) {
    console.error('Error posting opening balances:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}