import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Outlet from '@/lib/models/Outlet';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { UserRole } from '@/lib/types/roles';
import type { IOutlet } from '@/lib/models/Outlet';

// GET /api/outlets/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await connectDB();

    const outlet = await Outlet.findById(params.id);

    if (!outlet) {
      return NextResponse.json(
        { error: 'Outlet not found' },
        { status: 404 }
      );
    }

    // Check access
    if (user.role !== UserRole.SUPERADMIN && user.outletId !== params.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ outlet });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH /api/outlets/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]);
    const user = await requireAuth();
    const body = await request.json();

    await connectDB();

    const outlet = await Outlet.findById(params.id);

    if (!outlet) {
      return NextResponse.json(
        { error: 'Outlet not found' },
        { status: 404 }
      );
    }

    // Check access
    if (user.role !== UserRole.SUPERADMIN && user.outletId !== params.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // ✅ Strongly typed allowed fields
    const allowedFields: (keyof IOutlet)[] = [
      'name',
      'address',
      'contact',
      'taxInfo',
      'settings',
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        outlet.set(field, body[field]);
      }
    });

    await outlet.save();

    return NextResponse.json({ outlet });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/outlets/[id] - Deactivate (SUPERADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole([UserRole.SUPERADMIN]);
    await connectDB();

    const outlet = await Outlet.findById(params.id);

    if (!outlet) {
      return NextResponse.json(
        { error: 'Outlet not found' },
        { status: 404 }
      );
    }

    outlet.isActive = false;
    await outlet.save();

    return NextResponse.json({
      message: 'Outlet deactivated successfully',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
