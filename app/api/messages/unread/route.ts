// app/api/messages/unread/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Message from '@/lib/models/Message';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/messages/unread - Get unread message count
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = verifyToken(token);

    const unreadCount = await Message.countDocuments({
      recipientId: currentUser.userId,
      isRead: false,
      isDeleted: false,
    });

    return NextResponse.json({ unreadCount });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}