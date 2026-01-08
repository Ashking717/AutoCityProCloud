// ═══════════════════════════════════════════════════════════
// app/api/auth/change-password/route.ts - Change Password
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import ActivityLog from '@/lib/models/ActivityLog';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new passwords are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    // Get user with password (password is select: false by default)
    const user = await User.findById(payload.userId).select('+password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password using the model's comparePassword method
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password (the pre-save hook will hash it automatically)
    user.password = newPassword;
    await user.save();

    // Activity Log
    await ActivityLog.create({
      userId: user._id,
      username: user.username,
      actionType: 'update',
      module: 'security',
      description: `Changed account password`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}