// app/api/users/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// POST /api/users/activity - Update user's last activity timestamp
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = verifyToken(token);

    // Update user's lastActiveAt timestamp
    await User.findByIdAndUpdate(
      currentUser.userId,
      { 
        lastActiveAt: new Date(),
        isOnline: true 
      },
      { new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/users/activity - Get online users count and list
export async function GET() {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = verifyToken(token);

    if (currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Consider users online if active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const query: Record<string, any> = {
      lastActiveAt: { $gte: fiveMinutesAgo },
      isActive: true
    };

    // Admin can only see users in their outlet
    if (currentUser.role === 'ADMIN') {
      if (!currentUser.outletId) {
        return NextResponse.json({ onlineUsers: [], count: 0 });
      }
      query.outletId = currentUser.outletId;
    }

    const onlineUsers = await User.find(query)
      .select('_id firstName lastName email username role outletId lastActiveAt')
      .populate('outletId', 'name code')
      .lean();

    return NextResponse.json({
      onlineUsers,
      count: onlineUsers.length,
      threshold: '5 minutes'
    });
  } catch (error: any) {
    console.error('Error fetching online users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}