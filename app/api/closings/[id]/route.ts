// app/api/closings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import Closing from '@/lib/models/Closing';
import mongoose from 'mongoose';
import { hasPermission } from '@/lib/types/roles';

/* =========================================================
   GET - Fetch single closing by ID
   ========================================================= */
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
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const closingId = params.id;
    if (!mongoose.Types.ObjectId.isValid(closingId)) {
      return NextResponse.json({ error: 'Invalid closing ID' }, { status: 400 });
    }

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

    // Enrich closing data with calculated fields (for backwards compatibility)
    const enrichedClosing = {
      ...closing,
      
      // Ensure COGS is present (defaults to 0 for old closings)
      totalCOGS: closing.totalCOGS ?? 0,
      
      grossProfit: closing.totalRevenue - (closing.totalCOGS || 0),
      
      netProfit: closing.totalRevenue - (closing.totalCOGS || 0) - closing.totalExpenses,
      
      // Add calculated margins for convenience
      grossProfitMargin: closing.totalRevenue > 0 
        ? ((closing.totalRevenue - (closing.totalCOGS || 0)) / closing.totalRevenue) * 100
        : 0,
      
      netProfitMargin: closing.totalRevenue > 0 
        ? ((closing.totalRevenue - (closing.totalCOGS || 0) - closing.totalExpenses) / closing.totalRevenue) * 100
        : 0,
      
      // Add total costs for display
      totalCosts: (closing.totalCOGS || 0) + closing.totalExpenses,
      
      // Add movements for convenience
      cashMovement: closing.closingCash - closing.openingCash,
      bankMovement: closing.closingBank - closing.openingBank,
      netMovement: (closing.closingCash + closing.closingBank) - (closing.openingCash + closing.openingBank),
    };

    return NextResponse.json({ 
      success: true,
      closing: enrichedClosing 
    });
    
  } catch (error: any) {
    console.error('GET closing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch closing' },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH - Update closing (for verification or notes)
   ========================================================= */
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
    if (!hasPermission(user.role, 'canManageAccounting')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const closingId = params.id;
    if (!mongoose.Types.ObjectId.isValid(closingId)) {
      return NextResponse.json({ error: 'Invalid closing ID' }, { status: 400 });
    }
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

    // Check if closing is locked
    if (closing.status === 'locked' && body.status !== 'locked') {
      return NextResponse.json(
        { error: 'Cannot modify a locked closing' },
        { status: 400 }
      );
    }

    // Allow updating specific fields only
    const allowedUpdates = ['notes'];
    const updates: any = {};

    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // If verifying, set verifiedBy and verifiedAt
    if (body.verify === true) {
      updates.verifiedBy = user.userId;
      updates.verifiedAt = new Date();
    }

    // If locking, update status
    if (body.lock === true) {
      updates.status = 'locked';
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

    // Check if update was successful
    if (!updatedClosing) {
      return NextResponse.json(
        { error: 'Failed to update closing' },
        { status: 500 }
      );
    }

    // Enrich with calculated fields
    const enrichedClosing = {
      ...updatedClosing,
      totalCOGS: updatedClosing.totalCOGS ?? 0,
      grossProfit: updatedClosing.totalRevenue - (updatedClosing.totalCOGS || 0),
      netProfit: updatedClosing.totalRevenue - (updatedClosing.totalCOGS || 0) - updatedClosing.totalExpenses,
      grossProfitMargin: updatedClosing.totalRevenue > 0 
        ? ((updatedClosing.totalRevenue - (updatedClosing.totalCOGS || 0)) / updatedClosing.totalRevenue) * 100
        : 0,
      netProfitMargin: updatedClosing.totalRevenue > 0 
        ? ((updatedClosing.totalRevenue - (updatedClosing.totalCOGS || 0) - updatedClosing.totalExpenses) / updatedClosing.totalRevenue) * 100
        : 0,
      totalCosts: (updatedClosing.totalCOGS || 0) + updatedClosing.totalExpenses,
    };

    return NextResponse.json({
      success: true,
      closing: enrichedClosing,
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

/* =========================================================
   DELETE - Delete closing (with safety checks)
   ========================================================= */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: 'Closing snapshots are immutable and cannot be deleted' },
    { status: 405, headers: { Allow: 'GET, PATCH' } }
  );
}
