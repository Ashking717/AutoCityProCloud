import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    console.log('🔧 Test login endpoint called');
    
    await connectDB();
    
    const { identifier, password } = await request.json();
    
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier (email/username) and password are required' },
        { status: 400 }
      );
    }
    
    console.log('Testing login for:', identifier);
    
    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    }).select('+password');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        identifier: identifier
      }, { status: 404 });
    }
    
    console.log('Found user:', user.email);
    
    // Try bcrypt compare
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(password, user.password);
      console.log('Bcrypt compare result:', passwordValid);
    } catch (bcryptError: any) {
      console.error('Bcrypt compare error:', bcryptError);
    }
    
    return NextResponse.json({
      success: passwordValid,
      user: {
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        role: user.role
      },
      passwordCheck: {
        bcryptMatch: passwordValid,
        passwordHashPreview: user.password?.substring(0, 30) + '...',
        inputPassword: password
      },
      message: passwordValid 
        ? '✅ Password is correct!' 
        : '❌ Password does not match'
    });
  } catch (error: any) {
    console.error('Test login error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}