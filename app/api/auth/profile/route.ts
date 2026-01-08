// ═══════════════════════════════════════════════════════════
// app/api/auth/profile/route.ts - Update Profile
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Outlet from '@/lib/models/Outlet';
import ActivityLog from '@/lib/models/ActivityLog';
import { verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

export async function PATCH(request: NextRequest) {
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
    const { firstName, lastName, username, email, phone } = body;

    // Validation
    if (!firstName) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: payload.userId },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: payload.userId },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already in use' },
          { status: 400 }
        );
      }
    }

    // Build update object (only include fields that were provided)
    const updateData: any = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (username) updateData.username = username.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    // Update user
    const user = await User.findByIdAndUpdate(
      payload.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get outlet info
    let outletName = null;
    if (user.outletId) {
      const outlet = await Outlet.findById(user.outletId);
      outletName = outlet?.name || null;
    }

    // Activity Log
    await ActivityLog.create({
      userId: user._id,
      username: user.username,
      actionType: 'update',
      module: 'profile',
      description: `Updated profile information`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        outletId: user.outletId || null,
        outletName: outletName,
        phone: user.phone,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}