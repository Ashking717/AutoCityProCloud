// ═══════════════════════════════════════════════════════════
// app/api/auth/login/route.ts - Updated Login API
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Outlet from '@/lib/models/Outlet';
import { signToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ],
      isActive: true
    }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password using the model's comparePassword method
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get outlet info
    let outletName = null;
    if (user.outletId) {
      const outlet = await Outlet.findById(user.outletId);
      outletName = outlet?.name || null;
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      outletId: user.outletId?.toString() || null,
    };

    const token = signToken(tokenPayload);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        outletId: user.outletId || null,
        outletName: outletName,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}