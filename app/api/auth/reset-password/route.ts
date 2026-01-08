// app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';
import { sendPasswordChangedEmail } from '@/lib/email/resend';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    // Validate input
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Hash the received token to match against stored hash
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpiry: { $gt: Date.now() }, // Token must not be expired
      isActive: true,
    });

    if (!user) {
      console.log('Invalid or expired reset token attempt');
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Update password (User model's pre-save hook will hash it)
    user.password = password;
    
    // Clear reset token and expiry (one-time use)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    
    await user.save();

    console.log(`Password successfully reset for user: ${user.email}`);

    // Send confirmation email (optional but recommended for security)
    try {
      await sendPasswordChangedEmail(
        user.email,
        user.firstName || user.username
      );
      console.log(`Password change confirmation email sent to: ${user.email}`);
    } catch (emailError) {
      // Log but don't fail the request if confirmation email fails
      console.error('Failed to send password change confirmation:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    
    return NextResponse.json(
      { error: 'An error occurred resetting your password' },
      { status: 500 }
    );
  }
}