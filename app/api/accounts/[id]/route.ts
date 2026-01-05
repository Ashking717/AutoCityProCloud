import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

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
    
    const account = await Account.findOne({
      _id: params.id,
      outletId: user.outletId,
    });
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
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
    
    // Map accountCode to accountNumber if present
    const updateData: any = { ...body };
    if (updateData.accountCode) {
      updateData.accountNumber = updateData.accountCode;
      delete updateData.accountCode;
    }
    
    const account = await Account.findOneAndUpdate(
      { _id: params.id, outletId: user.outletId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
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
    
    const account = await Account.findOneAndDelete({
      _id: params.id,
      outletId: user.outletId,
    });
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
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