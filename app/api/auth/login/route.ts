// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Outlet from '@/lib/models/Outlet';
import { signToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    console.log('Login attempt for identifier:', email);
    console.log('Password received (first 5 chars):', password?.substring(0, 5) + '...');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: email },
        { username: email }
      ],
      isActive: true
    }).select('+password');

    if (!user) {
      console.log('❌ User not found for:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      username: user.username,
      hasPassword: !!user.password,
      passwordHashLength: user.password?.length,
      role: user.role
    });

    // Debug: Log the stored password hash (first 30 chars)
    console.log('Stored password hash (first 30 chars):', user.password?.substring(0, 30) + '...');

    // Verify password using bcrypt directly
    console.log('Comparing password with bcrypt...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    console.log('Password comparison result:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', user.email);
      // For debugging, let's also check if it's a simple string match
      console.log('Plain text match:', password === user.password);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('✅ Password verified successfully');

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
      maxAge: 60 * 60 * 24 * 7,
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
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}