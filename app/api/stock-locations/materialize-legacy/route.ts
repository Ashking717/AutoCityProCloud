import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Product from '@/lib/models/ProductEnhanced';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { materializeLegacyLocationStocksForProducts } from '@/lib/services/locationStockService';

export async function POST() {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageInventory')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const products = await Product.find({
      outletId,
      isActive: true,
      $or: [
        { currentStock: { $gt: 0 } },
        { location: { $exists: true, $type: 'string', $ne: '' } },
      ],
    })
      .select('_id name sku currentStock location')
      .lean();

    const result = await materializeLegacyLocationStocksForProducts(
      products,
      outletId,
      user.userId
    );

    return NextResponse.json({
      success: true,
      scannedCount: products.length,
      migratedCount: result.migratedCount,
    });
  } catch (error: any) {
    console.error('Legacy location stock materialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to prepare legacy location stock' },
      { status: 500 }
    );
  }
}
