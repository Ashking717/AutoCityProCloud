import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { calculateBalanceChange } from '@/lib/services/balanceEngine';
import { hasPermission } from '@/lib/types/roles';

function mapAccountFields(account: any) {
  return {
    ...account,
    accountNumber: account.code,
    accountName: account.name,
    accountType: account.type,
    accountSubType: account.subType,
  };
}

async function authenticatedUser(permission: 'canViewFinancials' | 'canManageAccounting') {
  const token = cookies().get('auth-token')?.value;
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const user = verifyToken(token);
  if (!hasPermission(user.role, permission)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
    return { error: NextResponse.json({ error: 'Outlet is required' }, { status: 400 }) };
  }
  return { user };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const auth = await authenticatedUser('canViewFinancials');
    if (auth.error) return auth.error;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }
    const account: any = await Account.findOne({ _id: params.id, outletId: auth.user!.outletId }).lean();
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const totals = await LedgerEntry.aggregate([
      { $match: { accountId: account._id, outletId: new mongoose.Types.ObjectId(auth.user!.outletId!) } },
      { $group: { _id: null, debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
    ]);
    return NextResponse.json({
      account: mapAccountFields({
        ...account,
        currentBalance: calculateBalanceChange(account.type, totals[0]?.debit || 0, totals[0]?.credit || 0),
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const auth = await authenticatedUser('canManageAccounting');
    if (auth.error) return auth.error;
    const user = auth.user!;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }
    const existing: any = await Account.findOne({ _id: params.id, outletId: user.outletId });
    if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const body = await request.json();
    if (body.openingBalance !== undefined && Math.abs(Number(body.openingBalance) - Number(existing.openingBalance || 0)) > 0.001) {
      return NextResponse.json({ error: 'Opening balances can only be changed through the Opening Balance page' }, { status: 400 });
    }

    const code = body.accountCode ? String(body.accountCode).trim().toUpperCase() : existing.code;
    const name = body.accountName ? String(body.accountName).trim() : existing.name;
    const type = body.accountType ? String(body.accountType).toLowerCase() : existing.type;
    const subType = body.accountSubType ? String(body.accountSubType).toLowerCase() : existing.subType;
    if (!code || !name || !Object.values(AccountType).includes(type as AccountType)) {
      return NextResponse.json({ error: 'Invalid account details' }, { status: 400 });
    }
    if (subType && !Object.values(AccountSubType).includes(subType as AccountSubType)) {
      return NextResponse.json({ error: 'Invalid account subtype' }, { status: 400 });
    }
    if (existing.isSystem && (code !== existing.code || type !== existing.type || subType !== existing.subType)) {
      return NextResponse.json({ error: 'System account code, type, and subtype are immutable' }, { status: 400 });
    }
    const hasEntries = await LedgerEntry.exists({ accountId: existing._id, outletId: user.outletId });
    if (hasEntries && type !== existing.type) {
      return NextResponse.json({ error: 'Account type cannot change after ledger posting' }, { status: 400 });
    }
    const duplicate = await Account.exists({ _id: { $ne: existing._id }, outletId: user.outletId, code });
    if (duplicate) return NextResponse.json({ error: 'Account code already exists' }, { status: 409 });

    existing.code = code;
    existing.name = name;
    existing.type = type;
    existing.subType = subType || undefined;
    if (body.accountGroup !== undefined) existing.accountGroup = String(body.accountGroup).trim();
    if (body.description !== undefined) existing.description = String(body.description).trim();
    await existing.save();
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'accounts',
      description: `Updated account: ${existing.name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    return NextResponse.json({ account: mapAccountFields(existing.toObject()) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error?.code === 11000 ? 409 : 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const auth = await authenticatedUser('canManageAccounting');
    if (auth.error) return auth.error;
    const user = auth.user!;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }
    const account: any = await Account.findOne({ _id: params.id, outletId: user.outletId });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (account.isSystem) return NextResponse.json({ error: 'Cannot deactivate a system account' }, { status: 400 });
    if (await LedgerEntry.exists({ accountId: account._id, outletId: user.outletId })) {
      return NextResponse.json({ error: 'Accounts with ledger history cannot be deleted; keep them for audit history' }, { status: 400 });
    }
    account.isActive = false;
    await account.save();
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'accounts',
      description: `Deactivated account: ${account.name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    return NextResponse.json({ message: 'Account deactivated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
