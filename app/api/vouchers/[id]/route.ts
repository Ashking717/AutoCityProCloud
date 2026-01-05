import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Voucher from '@/lib/models/Voucher';
import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/vouchers/[id]
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
    
    const voucher = await Voucher.findOne({
      _id: params.id,
      outletId: user.outletId,
    })
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');
    
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }
    
    return NextResponse.json({ voucher });
  } catch (error: any) {
    console.error('Error fetching voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/vouchers/[id]
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
    
    const voucher = await Voucher.findOne({
      _id: params.id,
      outletId: user.outletId,
    });
    
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }
    
    // Don't allow editing posted vouchers
    if (voucher.status === 'posted' || voucher.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot edit posted or approved vouchers' },
        { status: 400 }
      );
    }
    
    // Update voucher
    Object.assign(voucher, body);
    await voucher.save();
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'vouchers',
      description: `Updated voucher: ${voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ voucher });
  } catch (error: any) {
    console.error('Error updating voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/vouchers/[id]
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
    
    const voucher = await Voucher.findOne({
      _id: params.id,
      outletId: user.outletId,
    });
    
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }
    
    // Don't allow deleting posted vouchers
    if (voucher.status === 'posted' || voucher.status === 'approved') {
      return NextResponse.json(
        { error: 'Cannot delete posted or approved vouchers' },
        { status: 400 }
      );
    }
    
    await voucher.deleteOne();
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'vouchers',
      description: `Deleted voucher: ${voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ message: 'Voucher deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}