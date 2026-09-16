import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Voucher, { ReferenceType, VoucherType } from '@/lib/models/Voucher';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { hasPermission } from '@/lib/types/roles';

function getUser(permission: 'canViewFinancials' | 'canManageAccounting') {
  const token = cookies().get('auth-token')?.value;
  if (!token) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const user = verifyToken(token);
  if (!hasPermission(user.role, permission)) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const auth = getUser('canViewFinancials');
    if (auth.response) return auth.response;
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid voucher ID' }, { status: 400 });
    const voucher = await Voucher.findOne({ _id: params.id, outletId: auth.user!.outletId })
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');
    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    return NextResponse.json({ voucher });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const auth = getUser('canManageAccounting');
    if (auth.response) return auth.response;
    const user = auth.user!;
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid voucher ID' }, { status: 400 });
    const voucher: any = await Voucher.findOne({ _id: params.id, outletId: user.outletId });
    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    if (voucher.status !== 'draft' || await LedgerEntry.exists({ voucherId: voucher._id })) {
      return NextResponse.json({ error: 'Only an unposted draft voucher can be edited' }, { status: 400 });
    }
    const body = await request.json();
    const type = body.voucherType ?? voucher.voucherType;
    const date = body.date ? new Date(body.date) : voucher.date;
    const rawEntries = body.entries ?? voucher.entries;
    if (!Object.values(VoucherType).includes(type) || Number.isNaN(date.getTime()) || !Array.isArray(rawEntries) || !rawEntries.length) {
      return NextResponse.json({ error: 'Valid voucher type, date, and entries are required' }, { status: 400 });
    }
    const ids = [...new Set(rawEntries.map((entry: any) => String(entry.accountId || '')))];
    if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    const accounts: any[] = await Account.find({ _id: { $in: ids }, outletId: user.outletId, isActive: true });
    if (accounts.length !== ids.length) return NextResponse.json({ error: 'Every account must be active and belong to this outlet' }, { status: 400 });
    const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
    voucher.voucherType = type;
    voucher.date = date;
    voucher.narration = String(body.narration ?? voucher.narration ?? 'Manual voucher').trim();
    voucher.entries = rawEntries.map((entry: any) => ({
      accountId: entry.accountId,
      accountNumber: accountMap.get(String(entry.accountId)).code,
      accountName: accountMap.get(String(entry.accountId)).name,
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      narration: entry.narration,
    }));
    if (body.referenceType && Object.values(ReferenceType).includes(body.referenceType)) voucher.referenceType = body.referenceType;
    if (body.referenceNumber !== undefined) voucher.referenceNumber = body.referenceNumber;
    await voucher.save();
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'vouchers',
      description: `Updated draft voucher: ${voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    return NextResponse.json({ voucher });
  } catch (error: any) {
    const status = /voucher|account|entry|balanced|valid/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const auth = getUser('canManageAccounting');
    if (auth.response) return auth.response;
    const user = auth.user!;
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid voucher ID' }, { status: 400 });
    const voucher: any = await Voucher.findOne({ _id: params.id, outletId: user.outletId });
    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    if (await LedgerEntry.exists({ voucherId: voucher._id })) {
      return NextResponse.json({ error: 'Posted voucher history cannot be deleted; use cancellation to create a reversal' }, { status: 400 });
    }
    if (!['draft', 'cancelled'].includes(voucher.status)) {
      return NextResponse.json({ error: 'Only an unposted draft can be deleted' }, { status: 400 });
    }
    await Voucher.deleteOne({ _id: voucher._id, outletId: user.outletId });
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'vouchers',
      description: `Deleted unposted draft voucher: ${voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    return NextResponse.json({ message: 'Draft voucher deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
