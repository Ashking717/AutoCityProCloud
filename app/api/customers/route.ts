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
      return NextResponse.json({ error: 'Outlet ID is required' }, { status: 400 });
    }

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectDB();

    // ── Generate a unique code server-side ───────────────────────────────
    const generateCode = async (): Promise<string> => {
      const base = body.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
      const suffix = Date.now().toString().slice(-4);
      const candidate = `${base}${suffix}`;
      const clash = await Customer.exists({ outletId, code: candidate });
      if (clash) {
        // Rare collision — retry with fresh timestamp
        await new Promise(r => setTimeout(r, 1));
        return generateCode();
      }
      return candidate;
    };

    const code = body.code
      ? body.code.toUpperCase()          // allow explicit override (e.g. admin forms)
      : await generateCode();

    // Check explicit code collision only if caller supplied one
    if (body.code) {
      const existing = await Customer.exists({ outletId, code });
      if (existing) {
        return NextResponse.json({ error: 'Customer code already exists' }, { status: 409 });
      }
    }

    const customer = await Customer.create({
      outletId,
      name: body.name,
      code,
      email: body.email,
      phone: body.phone,
      address: body.address || {},
      vehicleRegistrationNumber: body.vehicleRegistrationNumber,
      vehicleMake: body.vehicleMake,
      vehicleModel: body.vehicleModel,
      vehicleYear: body.vehicleYear,
      vehicleColor: body.vehicleColor,
      vehicleVIN: body.vehicleVIN,
      gstNumber: body.gstNumber,
      creditLimit: body.creditLimit || 0,
      currentBalance: 0,
      notes: body.notes,
      isActive: true,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}