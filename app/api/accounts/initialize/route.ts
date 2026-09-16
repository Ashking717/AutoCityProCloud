import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account from '@/lib/models/Account';
import { seedSystemAccounts } from '@/lib/accounting/seedSystemAccounts';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { hasPermission } from '@/lib/types/roles';

export async function POST() {
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
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const before = await Account.countDocuments({ outletId, isSystem: true, isActive: true });
    await seedSystemAccounts(outletId);
    const after = await Account.countDocuments({ outletId, isSystem: true, isActive: true });
    return NextResponse.json({
      message: 'System accounts initialized successfully',
      systemAccounts: after,
      created: Math.max(0, after - before),
      idempotent: before === after,
    });
  } catch (error: any) {
    console.error('Error initializing system accounts:', error);
    return NextResponse.json({ error: 'Failed to initialize system accounts' }, { status: 500 });
  }
}
