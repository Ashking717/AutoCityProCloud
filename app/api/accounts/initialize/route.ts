import { NextRequest, NextResponse } from 'next/server';
import Account from '@/lib/models/Account';
import { defaultAccounts } from '@/lib/data/defaultAccounts';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';

// POST /api/accounts/initialize
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);

    // ✅ Guard against null outletId
    if (!user.outletId) {
      return NextResponse.json(
        { error: 'Invalid token: outlet not found' },
        { status: 401 }
      );
    }

    const outletId = user.outletId;

    // Check if accounts already exist
    const existingCount = await Account.countDocuments({ outletId });
    if (existingCount > 0) {
      return NextResponse.json(
        { error: 'Accounts already initialized' },
        { status: 400 }
      );
    }

    // Create default accounts
    const accounts = await Account.insertMany(
      defaultAccounts.map(acc => ({
        ...acc,
        accountNumber: acc.code,
        accountCode: `${outletId.slice(-4)}-${acc.code}`,
        accountName: acc.name,
        accountType: acc.type,
        accountGroup: acc.group,
        outletId,
        isSystem: true,
      }))
    );

    return NextResponse.json(
      {
        message: 'Accounts initialized successfully',
        count: accounts.length,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error initializing accounts:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
