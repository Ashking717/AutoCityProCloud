

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

interface RouteParams {
  params: {
    id: string;  // Changed from userId to id
  };
}

// GET /api/users/[id]/status - Get specific user's online status
export async function GET(
  request: NextRequest, 
  { params }: RouteParams
) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = verifyToken(token);
    const { id } = params;  // Changed from userId to id

    // Fetch the user
    const targetUser = await User.findById(id)  // Changed from userId to id
      .select('_id firstName lastName lastActiveAt isOnline')
      .lean();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Consider user online if active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isOnline = targetUser.lastActiveAt && 
                     new Date(targetUser.lastActiveAt) >= fiveMinutesAgo;

    return NextResponse.json({
      userId: targetUser._id,
      isOnline,
      lastActiveAt: targetUser.lastActiveAt,
    });
  } catch (error: any) {
    console.error('Error fetching user status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}