import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import ActivityLog from '@/lib/models/ActivityLog';
import { requireAuth } from '@/lib/auth/session';
import { UserRole } from '@/lib/types/roles';

// GET /api/activity-logs
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const module = searchParams.get('module');
    const actionType = searchParams.get('actionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    let query: any = {};

    // Outlet filter
    if (user.role !== UserRole.SUPERADMIN) {
      query.outletId = user.outletId;
    } else if (searchParams.get('outletId')) {
      query.outletId = searchParams.get('outletId');
    }

    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { module: { $regex: search, $options: 'i' } },
        { actionType: { $regex: search, $options: 'i' } },
      ];
    }

    // Module filter
    if (module && module !== 'all') {
      query.module = module;
    }

    // Action type filter
    if (actionType && actionType !== 'all') {
      query.actionType = actionType;
    }

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/activity-logs (for creating logs programmatically)
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const outletId = user.role === UserRole.SUPERADMIN && body.outletId 
      ? body.outletId 
      : user.outletId;

    if (!body.actionType || !body.module || !body.description) {
      return NextResponse.json(
        { error: 'Action type, module, and description are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const log = await ActivityLog.create({
      userId: user.userId,
      username: user.username || user.email,
      actionType: body.actionType,
      module: body.module,
      description: body.description,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}