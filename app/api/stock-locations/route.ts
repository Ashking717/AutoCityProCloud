import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';

import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import ProductLocationStock from '@/lib/models/ProductLocationStock';
import {
  getOrCreateStockLocation,
  listStockLocations,
} from '@/lib/services/locationStockService';
import { hasPermission } from '@/lib/types/roles';

export async function GET() {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user.outletId) {
      return NextResponse.json({ error: 'Invalid token: outletId missing' }, { status: 401 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId);

    const locations = await listStockLocations(outletId);

    const stockStats = await ProductLocationStock.aggregate([
      { $match: { outletId } },
      {
        $group: {
          _id: '$locationId',
          productCount: { $sum: 1 },
          quantity: { $sum: '$quantity' },
        },
      },
    ]);

    const statsByLocation = new Map(
      stockStats.map((item) => [
        String(item._id),
        {
          productCount: item.productCount || 0,
          quantity: item.quantity || 0,
        },
      ])
    );

    return NextResponse.json({
      locations: locations.map((location) => ({
        ...location,
        productCount: statsByLocation.get(String(location._id))?.productCount || 0,
        quantity: statsByLocation.get(String(location._id))?.quantity || 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching stock locations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageInventory')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) {
      return NextResponse.json({ error: 'Invalid token: outletId missing' }, { status: 401 });
    }
    const body = await request.json();
    const name = String(body.name || '').trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    const location = await getOrCreateStockLocation({
      outletId: user.outletId,
      name,
      createdBy: user.userId,
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating stock location:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
