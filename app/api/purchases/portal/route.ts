import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Purchase from '@/lib/models/Purchase';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';

// Purchase creation has one authoritative, transactional endpoint.
export async function POST() {
  return NextResponse.json(
    { error: 'Use POST /api/purchases for purchase creation' },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const { searchParams } = new URL(request.url);
    const query: any = { outletId };
    const status = searchParams.get('status');
    query.status = status && status !== 'all' ? status.toUpperCase() : { $ne: 'CANCELLED' };
    if (searchParams.get('supplierId') && searchParams.get('supplierId') !== 'all') {
      query.supplierId = searchParams.get('supplierId');
    }
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      query.purchaseDate = {
        $gte: new Date(searchParams.get('startDate')!),
        $lte: new Date(searchParams.get('endDate')!),
      };
    }
    const allowedSorts = new Set(['purchaseDate', 'createdAt', 'grandTotal', 'purchaseNumber']);
    const sort = allowedSorts.has(searchParams.get('sort') || '')
      ? searchParams.get('sort')!
      : 'purchaseDate';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .sort({ [sort]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('supplierId', 'name code phone')
        .populate('createdBy', 'name email username')
        .lean(),
      Purchase.countDocuments(query),
    ]);
    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
        id: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        supplier_name: purchase.supplierName,
        vendor: purchase.supplierName,
        amount: purchase.grandTotal,
        total_amount: purchase.grandTotal,
        status: purchase.status?.toLowerCase() || 'complete',
        purchaseDate: purchase.purchaseDate,
        created_at: new Date(purchase.createdAt).toISOString().split('T')[0],
        date: new Date(purchase.purchaseDate || purchase.createdAt).toISOString().split('T')[0],
        supplier: purchase.supplierId,
        items: purchase.items,
        balanceDue: purchase.balanceDue,
      })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch purchases' }, { status: 500 });
  }
}
