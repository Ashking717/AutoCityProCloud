// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email/resend';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    // Security: Always return success to prevent email enumeration attacks
    // This prevents attackers from determining if an email exists in the system
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If that email exists, a reset link has been sent',
      });
    }

    // Generate cryptographically secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing (prevents token theft if database is compromised)
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiry time (15 minutes from now)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Create reset URL with the UNHASHED token (sent to user)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/autocityPro/reset-password?token=${resetToken}`;

    // Send email with reset link
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.firstName || user.username
    );

    // Log email sending result (but don't expose to user for security)
    if (!emailResult.success) {
      console.error('Failed to send password reset email:', {
        email: user.email,
        error: emailResult.error
      });
      // Note: We still return success to the user to prevent information leakage
    } else {
      console.log(`Password reset email sent successfully to: ${user.email}`);
    }

    // In development mode, also return the reset URL for easy testing
    if (process.env.NODE_ENV === 'development') {
      console.log('='.repeat(80));
      console.log('PASSWORD RESET LINK (Development Mode):');
      console.log(resetUrl);
      console.log('='.repeat(80));
      
      return NextResponse.json({
        success: true,
        message: 'Password reset link generated',
        resetUrl, // Only expose in development!
      });
    }

    // Production response (generic message for security)
    return NextResponse.json({
      success: true,
      message: 'If that email exists, a reset link has been sent',
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    // Generic error message to prevent information leakage
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}