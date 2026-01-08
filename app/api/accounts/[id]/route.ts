// app/api/accounts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// Helper function to map DB fields to frontend expected fields
function mapAccountFields(account: any) {
  return {
    ...account,
    accountNumber: account.code || account.accountNumber,
    accountName: account.name || account.accountName,
    accountType: account.type || account.accountType,
    accountSubType: account.subType || account.accountSubType,
    accountGroup: account.accountGroup || account.group,
  };
}

// GET /api/accounts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const accountRaw = await Account.findOne({
      _id: params.id,
      outletId: user.outletId,
    }).lean() as any;
    
    if (!accountRaw) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Calculate current balance from ledger entries
    const LedgerEntry = (await import('@/lib/models/LedgerEntry')).default;
    
    const entries = await LedgerEntry.find({
      accountId: params.id,
      outletId: user.outletId,
    }).lean();
    
    const totalDebits = entries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0);
    const totalCredits = entries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0);
    
    const accountType = (accountRaw.type || accountRaw.accountType || '').toUpperCase();
    let currentBalance = accountRaw.openingBalance || 0;

    if (accountType === 'asset' || accountType === 'expense') {
      currentBalance += (totalDebits - totalCredits);
    } else {
      currentBalance += (totalCredits - totalDebits);
    }
    
    const account = mapAccountFields({
      ...accountRaw,
      currentBalance,
    });
    
    return NextResponse.json({ account });
  } catch (error: any) {
    console.error('Error fetching account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/accounts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    
    // Map frontend fields to DB schema fields
    const updateData: any = {};
    
    if (body.accountCode) updateData.code = body.accountCode;
    if (body.accountName) updateData.name = body.accountName;
    if (body.accountType) updateData.type = body.accountType.toUpperCase();
    if (body.accountSubType) updateData.subType = body.accountSubType.toUpperCase();
    if (body.accountGroup) updateData.accountGroup = body.accountGroup;
    if (body.openingBalance !== undefined) updateData.openingBalance = body.openingBalance;
    if (body.description !== undefined) updateData.description = body.description;
    
    const accountRaw = await Account.findOneAndUpdate(
      { _id: params.id, outletId: user.outletId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean() as any;
    
    if (!accountRaw) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    const account = mapAccountFields(accountRaw);
    
    // Fetch user for activity log
    const userDoc = await User.findById(user.userId).lean();
    const username = userDoc?.username || userDoc?.username || user.username || user.email || "Unknown User";
    
    await ActivityLog.create({
      userId: user.userId,
      username,
      actionType: 'update',
      module: 'accounts',
      description: `Updated account: ${account.accountName}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ account });
  } catch (error: any) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/accounts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const accountRaw = await Account.findOne({
      _id: params.id,
      outletId: user.outletId,
    }).lean() as any;
    
    if (!accountRaw) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Don't allow deleting system accounts
    if (accountRaw.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system accounts' }, { status: 400 });
    }
    
    await Account.findByIdAndDelete(params.id);
    
    const account = mapAccountFields(accountRaw);
    
    // Fetch user for activity log
    const userDoc = await User.findById(user.userId).lean();
    const username = userDoc?.username || userDoc?.username || user.username || user.email || "Unknown User";
    
    await ActivityLog.create({
      userId: user.userId,
      username,
      actionType: 'delete',
      module: 'accounts',
      description: `Deleted account: ${account.accountName}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}