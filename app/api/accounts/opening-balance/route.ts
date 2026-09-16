import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountType } from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Voucher, { ReferenceType, VoucherType } from '@/lib/models/Voucher';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { calculateBalanceChange } from '@/lib/services/balanceEngine';
import { createPostedVoucher, reversePostedVoucher } from '@/lib/services/voucherPostingService';
import { hasPermission } from '@/lib/types/roles';

const generalOpeningQuery = (outletId: string | mongoose.Types.ObjectId) => ({
  outletId,
  referenceType: ReferenceType.OPENING_BALANCE,
  status: 'posted',
  $or: [
    { 'metadata.source': 'GENERAL_OPENING_BALANCE' },
    { 'metadata.source': { $exists: false }, referenceId: { $exists: false } },
  ],
});

function operationKey(request: NextRequest, body: any) {
  return String(request.headers.get('idempotency-key') || body.operationKey || '').trim();
}

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageAccounting')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }

    const body = await request.json();
    const key = operationKey(request, body);
    if (!key) return NextResponse.json({ error: 'Idempotency-Key is required' }, { status: 400 });
    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }
    const postingKey = `opening-balance:${key}`;
    const priorAttempt = await Voucher.findOne({ outletId: user.outletId, postingKey }).lean() as any;
    if (priorAttempt?.status === 'posted') {
      return NextResponse.json({
        success: true,
        voucherNumber: priorAttempt.voucherNumber,
        entriesCount: priorAttempt.entries?.length || 0,
        totals: { totalDebit: priorAttempt.totalDebit, totalCredit: priorAttempt.totalCredit },
        idempotent: true,
      });
    }
    if (priorAttempt) throw new Error('A prior opening-balance attempt is incomplete and requires reconciliation');

    const voucherDate = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(voucherDate.getTime())) {
      return NextResponse.json({ error: 'Invalid opening balance date' }, { status: 400 });
    }

    session = await mongoose.startSession();
    let responseData: any;
    await session.withTransaction(async () => {
      const outletId = new mongoose.Types.ObjectId(user.outletId!);
      const userId = new mongoose.Types.ObjectId(user.userId);
      const existing = await Voucher.find(generalOpeningQuery(outletId)).session(session!);
      if (existing.length > 1) throw new Error('Multiple active opening-balance vouchers require reconciliation');
      if (existing.length === 1 && !body.allowUpdate) {
        throw new Error(`Opening balance already posted as ${existing[0].voucherNumber}`);
      }
      if (existing.length === 1) {
        await reversePostedVoucher(
          existing[0]._id,
          outletId,
          userId,
          `Replaced by opening-balance operation ${key}`,
          session
        );
      }

      const ids = body.entries.map((row: any) => String(row.accountId || ''));
      if (ids.some((id: string) => !mongoose.Types.ObjectId.isValid(id))) {
        throw new Error('Every opening balance requires a valid account');
      }
      if (new Set(ids).size !== ids.length) throw new Error('Duplicate opening-balance accounts are not allowed');
      const accounts = await Account.find({
        _id: { $in: ids.map((id: string) => new mongoose.Types.ObjectId(id)) },
        outletId,
        isActive: true,
      }).session(session!);
      if (accounts.length !== ids.length) throw new Error('Every account must be active and belong to this outlet');
      const accountMap = new Map(accounts.map((account: any) => [String(account._id), account]));

      const entries: Array<{ accountId: mongoose.Types.ObjectId; debit: number; credit: number }> = [];
      let totalDebit = 0;
      let totalCredit = 0;
      for (const row of body.entries) {
        const account: any = accountMap.get(String(row.accountId));
        const amount = Number(row.balance);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error(`Opening balance for ${account?.name || row.accountId} must be greater than zero`);
        }
        const rounded = Number(amount.toFixed(2));
        const debitNormal = account.type === AccountType.ASSET || account.type === AccountType.EXPENSE;
        entries.push({ accountId: account._id, debit: debitNormal ? rounded : 0, credit: debitNormal ? 0 : rounded });
        totalDebit += debitNormal ? rounded : 0;
        totalCredit += debitNormal ? 0 : rounded;
      }

      let openingEquity: any = await Account.findOne({ outletId, code: 'OB-EQUITY' }).session(session!);
      if (!openingEquity) {
        [openingEquity] = await Account.create([{
          code: 'OB-EQUITY',
          name: 'Opening Balance Equity',
          type: AccountType.EQUITY,
          subType: 'owner_equity',
          accountGroup: 'Owner Equity',
          isSystem: true,
          isActive: true,
          outletId,
        }], { session });
      }
      const difference = Number((totalDebit - totalCredit).toFixed(2));
      if (difference > 0) {
        entries.push({ accountId: openingEquity._id, debit: 0, credit: difference });
      } else if (difference < 0) {
        entries.push({ accountId: openingEquity._id, debit: Math.abs(difference), credit: 0 });
      }

      const result = await createPostedVoucher({
        voucherType: VoucherType.JOURNAL,
        date: voucherDate,
        narration: 'Opening Balance Entry',
        entries,
        referenceType: ReferenceType.OPENING_BALANCE,
        postingKey,
        outletId,
        createdBy: userId,
        metadata: { source: 'GENERAL_OPENING_BALANCE' },
      }, session!);

      const allAccounts: any[] = await Account.find({ outletId }).session(session!).lean();
      const balanceRows = await LedgerEntry.aggregate([
        { $match: { outletId } },
        { $group: { _id: '$accountId', debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
      ]).session(session!);
      const balanceMap = new Map(balanceRows.map((row: any) => [String(row._id), row]));
      const openingMap = new Map(entries.map((entry) => {
        const account = allAccounts.find((candidate) => String(candidate._id) === String(entry.accountId));
        return [String(entry.accountId), calculateBalanceChange(account?.type, entry.debit, entry.credit)];
      }));
      await Account.bulkWrite(allAccounts.map((account) => {
        const totals = balanceMap.get(String(account._id)) || { debit: 0, credit: 0 };
        return {
          updateOne: {
            filter: { _id: account._id, outletId },
            update: { $set: {
              openingBalance: openingMap.get(String(account._id)) || 0,
              currentBalance: calculateBalanceChange(account.type, totals.debit, totals.credit),
            } },
          },
        };
      }), { session });

      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: existing.length ? 'update' : 'create',
        module: 'accounts',
        description: `${existing.length ? 'Replaced' : 'Posted'} opening balances - ${body.entries.length} accounts`,
        outletId,
        timestamp: new Date(),
      }], { session });

      responseData = {
        success: true,
        voucherNumber: result.voucher.voucherNumber,
        entriesCount: entries.length,
        totals: { totalDebit: result.voucher.totalDebit, totalCredit: result.voucher.totalCredit },
      };
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Opening balance error:', error);
    const status = /required|invalid|duplicate|already|must|belong|reconciliation/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}

export async function GET() {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const existing: any = await Voucher.findOne(generalOpeningQuery(user.outletId!)).lean();
    const accountsWithBalance = await Account.find({
      outletId: user.outletId,
      openingBalance: { $ne: 0 },
    }).select('code name type openingBalance currentBalance').lean();
    return NextResponse.json({
      hasOpeningBalance: Boolean(existing),
      voucherNumber: existing?.voucherNumber || null,
      voucherDate: existing?.date || null,
      totalDebit: existing?.totalDebit || 0,
      totalCredit: existing?.totalCredit || 0,
      accountsWithBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
