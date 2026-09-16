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

export async function GET() {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const [accounts, rows] = await Promise.all([
      Account.find({ outletId: user.outletId }).sort({ code: 1 }).lean(),
      LedgerEntry.aggregate([
        { $match: { outletId: new mongoose.Types.ObjectId(user.outletId) } },
        { $group: { _id: '$accountId', debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
      ]),
    ]);
    const balanceMap = new Map(rows.map((row: any) => [String(row._id), row]));
    return NextResponse.json({
      accounts: (accounts as any[]).map((account) => {
        const totals = balanceMap.get(String(account._id)) || { debit: 0, credit: 0 };
        return mapAccountFields({
          ...account,
          currentBalance: calculateBalanceChange(account.type, totals.debit, totals.credit),
        });
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const code = String(body.accountCode || '').trim().toUpperCase();
    const name = String(body.accountName || '').trim();
    const type = String(body.accountType || '').toLowerCase();
    const subType = body.accountSubType ? String(body.accountSubType).toLowerCase() : undefined;
    const accountGroup = String(body.accountGroup || '').trim();
    if (!code || !name || !accountGroup || !Object.values(AccountType).includes(type as AccountType)) {
      return NextResponse.json({ error: 'Valid code, name, type, and group are required' }, { status: 400 });
    }
    if (subType && !Object.values(AccountSubType).includes(subType as AccountSubType)) {
      return NextResponse.json({ error: 'Invalid account subtype' }, { status: 400 });
    }
    if (Math.abs(Number(body.openingBalance || 0)) > 0.001) {
      return NextResponse.json({ error: 'Post opening balances from the Opening Balance page so a balanced voucher is created' }, { status: 400 });
    }
    const account = await Account.create({
      code,
      name,
      type,
      subType,
      accountGroup,
      openingBalance: 0,
      currentBalance: 0,
      description: body.description,
      outletId: user.outletId,
      isSystem: false,
      isActive: true,
    });
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'accounts',
      description: `Created account: ${name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    return NextResponse.json({ account: mapAccountFields(account.toObject()) }, { status: 201 });
  } catch (error: any) {
    const status = error?.code === 11000 ? 409 : 500;
    return NextResponse.json({ error: error?.code === 11000 ? 'Account code already exists' : error.message }, { status });
  }
}
