import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Voucher from '@/lib/models/Voucher';
import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// POST /api/vouchers/[id]/post
export async function POST(
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
    
    if (voucher.status === 'posted') {
      return NextResponse.json(
        { error: 'Voucher already posted' },
        { status: 400 }
      );
    }
    
    // Update account balances
    for (const entry of voucher.entries) {
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;
      const balanceChange = debit - credit;
      
      await Account.findByIdAndUpdate(entry.accountId, {
        $inc: { currentBalance: balanceChange },
      });
    }
    
    voucher.status = 'posted';
    await voucher.save();
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'vouchers',
      description: `Posted voucher: ${voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ voucher });
  } catch (error: any) {
    console.error('Error posting voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}