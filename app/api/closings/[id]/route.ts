// app/api/closings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import Closing from '@/lib/models/Closing';

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

    // Enrich closing data with calculated fields (for backwards compatibility)
    const enrichedClosing = {
      ...closing,
      
      // Ensure COGS is present (defaults to 0 for old closings)
      totalCOGS: closing.totalCOGS ?? 0,
      
      // Calculate gross profit if missing
      grossProfit: closing.grossProfit ?? (closing.totalRevenue - (closing.totalCOGS || 0)),
      
      // Calculate net profit if missing (use new formula, fallback to old)
      netProfit: closing.netProfit ?? (
        closing.totalCOGS !== undefined 
          ? closing.totalRevenue - ((closing.totalCOGS || 0) + closing.totalPurchases + closing.totalExpenses)
          : closing.totalRevenue - (closing.totalPurchases + closing.totalExpenses)
      ),
      
      // Add calculated margins for convenience
      grossProfitMargin: closing.totalRevenue > 0 
        ? ((closing.grossProfit ?? (closing.totalRevenue - (closing.totalCOGS || 0))) / closing.totalRevenue) * 100 
        : 0,
      
      netProfitMargin: closing.totalRevenue > 0 
        ? ((closing.netProfit ?? 0) / closing.totalRevenue) * 100 
        : 0,
      
      // Add total costs for display
      totalCosts: (closing.totalCOGS || 0) + closing.totalPurchases + closing.totalExpenses,
      
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

    // Check if closing is locked
    if (closing.status === 'locked' && body.status !== 'locked') {
      return NextResponse.json(
        { error: 'Cannot modify a locked closing' },
        { status: 400 }
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
      grossProfit: updatedClosing.grossProfit ?? (updatedClosing.totalRevenue - (updatedClosing.totalCOGS || 0)),
      grossProfitMargin: updatedClosing.totalRevenue > 0 
        ? ((updatedClosing.grossProfit ?? (updatedClosing.totalRevenue - (updatedClosing.totalCOGS || 0))) / updatedClosing.totalRevenue) * 100 
        : 0,
      netProfitMargin: updatedClosing.totalRevenue > 0 
        ? ((updatedClosing.netProfit ?? 0) / updatedClosing.totalRevenue) * 100 
        : 0,
      totalCosts: (updatedClosing.totalCOGS || 0) + updatedClosing.totalPurchases + updatedClosing.totalExpenses,
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

    // Check if closing is locked
    if (closing.status === 'locked') {
      return NextResponse.json(
        { error: 'Cannot delete a locked closing. Unlock it first.' },
        { status: 400 }
      );
    }

    // Safety check: Only allow deletion of the most recent closing
    // This prevents deleting closings that other closings depend on
    const mostRecentClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType: closing.closingType,
    })
      .sort({ closingDate: -1 })
      .lean();

    if (mostRecentClosing?._id.toString() !== closingId) {
      return NextResponse.json(
        { 
          error: 'Can only delete the most recent closing to maintain period integrity',
          mostRecentClosing: {
            id: mostRecentClosing?._id,
            date: mostRecentClosing?.closingDate,
          }
        },
        { status: 400 }
      );
    }

    // Check if there are any subsequent closings (shouldn't be, but double-check)
    const subsequentClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType: closing.closingType,
      closingDate: { $gt: closing.closingDate },
    });

    if (subsequentClosing) {
      return NextResponse.json(
        { error: 'Cannot delete closing - subsequent closings exist' },
        { status: 400 }
      );
    }

    // Delete the closing
    await Closing.deleteOne({ _id: closingId });

    return NextResponse.json({
      success: true,
      message: 'Closing deleted successfully',
      deletedClosing: {
        id: closingId,
        type: closing.closingType,
        date: closing.closingDate,
      },
    });
    
  } catch (error: any) {
    console.error('DELETE closing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete closing' },
      { status: 500 }
    );
  }
}