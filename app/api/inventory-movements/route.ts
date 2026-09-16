import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import InventoryMovement from '@/lib/models/InventoryMovement';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { hasPermission } from '@/lib/types/roles';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageInventory') && !hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const { searchParams } = new URL(request.url);
    const query: any = { outletId };
    for (const field of ['sku', 'movementType']) {
      const value = searchParams.get(field);
      if (value) query[field] = value;
    }
    for (const field of ['productId', 'locationId']) {
      const value = searchParams.get(field);
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
      }
      if (value) query[field] = new mongoose.Types.ObjectId(value);
    }
    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      query.date = {};
      if (searchParams.get('startDate')) query.date.$gte = new Date(searchParams.get('startDate')!);
      if (searchParams.get('endDate')) {
        const endDate = new Date(searchParams.get('endDate')!);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
      if (Object.values(query.date).some((date: any) => Number.isNaN(date.getTime()))) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
      }
    }
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 100)));
    const [movements, stats] = await Promise.all([
      InventoryMovement.find(query)
        .sort({ date: -1, createdAt: -1 })
        .limit(limit)
        .populate('productId', 'name sku')
        .populate('createdBy', 'name email')
        .lean(),
      InventoryMovement.aggregate([
        { $match: { outletId } },
        { $group: { _id: '$movementType', count: { $sum: 1 }, totalValue: { $sum: '$totalValue' } } },
      ]),
    ]);
    return NextResponse.json({ movements, stats, total: movements.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch inventory movements' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Direct movement creation is disabled; use the transactional stock-adjustment endpoint' },
    { status: 410 }
  );
}
