import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/accounts
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const accounts = await Account.find({
      outletId: user.outletId,
    })
      .sort({ accountNumber: 1 })
      .lean();
    
    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    const body = await request.json();

    const {
      accountCode,
      accountName,
      accountType,
      accountSubType,
      accountGroup,
      openingBalance,
      description,
    } = body;

    if (!accountCode || !accountName || !accountType || !accountSubType || !accountGroup) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await Account.findOne({
      outletId: user.outletId,
      accountNumber: accountCode,
    });

    if (existing) {
      return NextResponse.json({ error: 'Account number already exists' }, { status: 400 });
    }

    const account = await Account.create({
      accountNumber: accountCode,
      accountName,
      accountType,
      accountSubType,
      accountGroup,
      openingBalance: openingBalance || 0,
      currentBalance: openingBalance || 0,
      description,
      outletId: user.outletId,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
