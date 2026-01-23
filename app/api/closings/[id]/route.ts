// app/api/closings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import Closing from '@/lib/models/Closing';

// GET single closing by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const closingId = params.id;

    // Fetch closing with populated fields
    const closing = await Closing.findOne({
      _id: closingId,
      outletId: user.outletId, // Ensure user can only access their outlet's closings
    })
      .populate('closedBy', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .lean();

    if (!closing) {
      return NextResponse.json(
        { error: 'Closing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ closing });
  } catch (error: any) {
    console.error('GET closing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch closing' },
      { status: 500 }
    );
  }
}

// DELETE closing (if needed)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const closingId = params.id;

    // Check if closing exists and belongs to user's outlet
    const closing = await Closing.findOne({
      _id: closingId,
      outletId: user.outletId,
    });

    if (!closing) {
      return NextResponse.json(
        { error: 'Closing not found' },
        { status: 404 }
      );
    }

    // Optional: Add permission check
    // Only allow deletion of most recent closing or by admin users
    const mostRecentClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType: closing.closingType,
    })
      .sort({ closingDate: -1 })
      .lean();

    if (mostRecentClosing?._id.toString() !== closingId) {
      return NextResponse.json(
        { error: 'Can only delete the most recent closing' },
        { status: 400 }
      );
    }

    // Delete the closing
    await Closing.deleteOne({ _id: closingId });

    return NextResponse.json({
      success: true,
      message: 'Closing deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE closing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete closing' },
      { status: 500 }
    );
  }
}

// PATCH - Update closing (for verification or notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const closingId = params.id;
    const body = await request.json();

    // Check if closing exists and belongs to user's outlet
    const closing = await Closing.findOne({
      _id: closingId,
      outletId: user.outletId,
    });

    if (!closing) {
      return NextResponse.json(
        { error: 'Closing not found' },
        { status: 404 }
      );
    }

    // Allow updating specific fields only
    const allowedUpdates = ['notes', 'status', 'verifiedBy', 'verifiedAt'];
    const updates: any = {};

    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // If verifying, set verifiedBy and verifiedAt
    if (body.status === 'verified') {
      updates.verifiedBy = user.userId;
      updates.verifiedAt = new Date();
    }

    // Update the closing
    const updatedClosing = await Closing.findByIdAndUpdate(
      closingId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('closedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .lean();

    return NextResponse.json({
      success: true,
      closing: updatedClosing,
      message: 'Closing updated successfully',
    });
  } catch (error: any) {
    console.error('PATCH closing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update closing' },
      { status: 500 }
    );
  }
}