import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';

// GET /api/users
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

    const query: Record<string, any> = {};

    if (currentUser.role === 'ADMIN') {
      if (!currentUser.outletId) {
        return NextResponse.json({ users: [] });
      }
      query.outletId = currentUser.outletId;
    }

    const users = await User.find(query)
      .populate('outletId', 'name code')
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/users - COMPLETE FIXED VERSION
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { firstName, lastName, email, username, password, role, outletId, phone } = body;

    // Debug log
    console.log('🔧 Creating user with:', {
      email,
      username,
      passwordLength: password?.length,
      role,
      firstName,
      lastName
    });

    if (!firstName || !email || !password || !username) {
      return NextResponse.json(
        { error: 'First name, email, username, and password are required' },
        { status: 400 }
      );
    }

    let finalOutletId = outletId;

    if (currentUser.role === 'ADMIN') {
      if (!currentUser.outletId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      finalOutletId = currentUser.outletId;

      if (role === 'SUPERADMIN') {
        return NextResponse.json(
          { error: 'You cannot create superadmin users' },
          { status: 403 }
        );
      }
    }

    // Check if email already exists
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUsernameUser = await User.findOne({ username });
    if (existingUsernameUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    // Store plain password - User model's pre-save hook will hash it
    const user = await User.create({
      firstName,
      lastName,
      email,
      username,
      phone,
      password: password,
      role: role ?? 'VIEWER',
      outletId: finalOutletId ?? null,
      isActive: true,
    });

    console.log('✅ User created successfully:', {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password,
      passwordHashPreview: user.password?.substring(0, 30) + '...'
    });

    // Create activity log
    try {
      const activityLogData: any = {
        userId: currentUser.userId,
        username: currentUser.email,
        actionType: 'create',
        module: 'users',
        description: `Created user: ${email} (${username}) with role: ${role}`,
        timestamp: new Date(),
      };

      if (currentUser.outletId) {
        activityLogData.outletId = currentUser.outletId;
      } else if (finalOutletId) {
        activityLogData.outletId = finalOutletId;
      }

      await ActivityLog.create(activityLogData);
      console.log('✅ Activity log created');
    } catch (logError: any) {
      console.error('⚠️ Failed to create activity log:', logError.message);
    }

    // Verify password was hashed correctly
    const verifyUser = await User.findById(user._id).select('+password');
    if (verifyUser) {
      const passwordMatches = await bcrypt.compare(password, verifyUser.password);
      console.log('🔑 Password verification after creation:', passwordMatches);
    }

    // ✅ FIX: Use destructuring to exclude password
    const { password: _, ...userResponse } = user.toObject();

    return NextResponse.json({ 
      success: true,
      user: userResponse,
      message: 'User created successfully. Note: Password was automatically hashed by the system.'
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    
    let errorMessage = error.message;
    if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.values(error.errors).map((e: any) => e.message).join(', ')}`;
    } else if (error.code === 11000) {
      if (error.message.includes('email')) {
        errorMessage = 'Email already exists';
      } else if (error.message.includes('username')) {
        errorMessage = 'Username already exists';
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage 
    }, { status: 500 });
  }
}