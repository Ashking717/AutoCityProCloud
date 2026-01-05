import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Customer from '@/lib/models/Customer';
import { requireAuth } from '@/lib/auth/session';
import { UserRole } from '@/lib/types/roles';

// GET /api/customers
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query: any = { isActive: true };

    // Outlet filter
    if (user.role !== UserRole.SUPERADMIN) {
      query.outletId = user.outletId;
    } else if (searchParams.get('outletId')) {
      query.outletId = searchParams.get('outletId');
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ name: 1 });

    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/customers
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const outletId = user.role === UserRole.SUPERADMIN && body.outletId 
      ? body.outletId 
      : user.outletId;

    if (!outletId) {
      return NextResponse.json(
        { error: 'Outlet ID is required' },
        { status: 400 }
      );
    }

    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if code exists
    const existing = await Customer.findOne({
      outletId,
      code: body.code.toUpperCase(),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Customer code already exists' },
        { status: 409 }
      );
    }

    const customer = await Customer.create({
      outletId,
      name: body.name,
      code: body.code.toUpperCase(),
      email: body.email,
      phone: body.phone,
      address: body.address || {},
      gstNumber: body.gstNumber,
      creditLimit: body.creditLimit || 0,
      currentBalance: 0,
      notes: body.notes,
      isActive: true,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
