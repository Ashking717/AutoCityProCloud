import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Voucher, { ReferenceType } from '@/lib/models/Voucher';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { calculateBalanceChange } from '@/lib/services/balanceEngine';
import { reversePostedVoucher } from '@/lib/services/voucherPostingService';
import { hasPermission } from '@/lib/types/roles';

export async function DELETE(request: NextRequest) {
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
    const key = String(request.headers.get('idempotency-key') || '').trim();
    if (!key) return NextResponse.json({ error: 'Idempotency-Key is required' }, { status: 400 });

    session = await mongoose.startSession();
    let reversedVoucherNumber: string | null = null;
    await session.withTransaction(async () => {
      const outletId = new mongoose.Types.ObjectId(user.outletId!);
      const vouchers = await Voucher.find({
        outletId,
        referenceType: ReferenceType.OPENING_BALANCE,
        status: 'posted',
        $or: [
          { 'metadata.source': 'GENERAL_OPENING_BALANCE' },
          { 'metadata.source': { $exists: false }, referenceId: { $exists: false } },
        ],
      }).session(session!);
      if (vouchers.length > 1) throw new Error('Multiple active opening-balance vouchers require reconciliation');
      if (vouchers.length === 0) return;

      const reversal = await reversePostedVoucher(
        vouchers[0]._id,
        outletId,
        new mongoose.Types.ObjectId(user.userId),
        `Opening balance reversed by operation ${key}`,
        session!
      );
      reversedVoucherNumber = reversal.reversal?.voucherNumber || null;

      const accounts: any[] = await Account.find({ outletId }).session(session!).lean();
      const rows = await LedgerEntry.aggregate([
        { $match: { outletId } },
        { $group: { _id: '$accountId', debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
      ]).session(session!);
      const balanceMap = new Map(rows.map((row: any) => [String(row._id), row]));
      await Account.bulkWrite(accounts.map((account) => {
        const totals = balanceMap.get(String(account._id)) || { debit: 0, credit: 0 };
        return {
          updateOne: {
            filter: { _id: account._id, outletId },
            update: { $set: {
              openingBalance: 0,
              currentBalance: calculateBalanceChange(account.type, totals.debit, totals.credit),
            } },
          },
        };
      }), { session });
      await ActivityLog.create([{
        userId: new mongoose.Types.ObjectId(user.userId),
        username: user.email,
        actionType: 'delete',
        module: 'accounts',
        description: `Reversed opening balance voucher ${vouchers[0].voucherNumber}`,
        outletId,
        timestamp: new Date(),
      }], { session });
    });
    return NextResponse.json({ success: true, reversedVoucherNumber });
  } catch (error: any) {
    const status = /required|multiple|reconciliation/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
