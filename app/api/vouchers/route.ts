import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Voucher from '@/lib/models/Voucher';
import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/vouchers
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    
    const query: any = {
      outletId: user.outletId,
    };
    
    const voucherType = searchParams.get('voucherType');
    if (voucherType) {
      query.voucherType = voucherType;
    }
    
    const status = searchParams.get('status');
    if (status) {
      query.status = status;
    }
    
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    if (fromDate && toDate) {
      query.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    const [vouchers, total] = await Promise.all([
      Voucher.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Voucher.countDocuments(query),
    ]);
    
    return NextResponse.json({
      vouchers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/vouchers
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    
    const { voucherType, date, narration, entries } = body;
    
    if (!voucherType || !date || !entries || entries.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate double-entry: total debits must equal total credits
    const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: 'Total debits must equal total credits' },
        { status: 400 }
      );
    }
    
    // Fetch account names for all entries
    const enrichedEntries = await Promise.all(
      entries.map(async (entry: any) => {
        const account = await Account.findById(entry.accountId);
        if (!account) {
          throw new Error(`Account not found: ${entry.accountId}`);
        }
        
        return {
          accountId: entry.accountId,
          accountName: account.accountName,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          narration: entry.narration || '',
        };
      })
    );
    
    // Generate voucher number
    const count = await Voucher.countDocuments({
      outletId: user.outletId,
      voucherType,
    });
    
    const prefix = voucherType.toUpperCase().substring(0, 3);
    const voucherNumber = `${prefix}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;
    
    // Create voucher
    const voucher = await Voucher.create({
      voucherNumber,
      voucherType,
      date: new Date(date),
      narration,
      entries: enrichedEntries,
      totalDebit,
      totalCredit,
      status: 'draft',
      outletId: user.outletId,
      createdBy: user.userId,
    });
    
    // Update account balances if status is posted
    if (body.status === 'posted') {
      for (const entry of enrichedEntries) {
        const debit = entry.debit || 0;
        const credit = entry.credit || 0;
        const balanceChange = debit - credit;
        
        await Account.findByIdAndUpdate(entry.accountId, {
          $inc: { currentBalance: balanceChange },
        });
      }
      
      voucher.status = 'posted';
      await voucher.save();
    }
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'vouchers',
      description: `Created ${voucherType} voucher: ${voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ voucher }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
