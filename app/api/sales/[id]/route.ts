import { NextRequest, NextResponse } from 'next/server';
import Sale from '@/lib/models/Sale';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const saleId = params.id;

    const sale = await Sale.findById(saleId)
      .populate("customerId")
      .populate("createdBy", "email");

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Outlet security check
    if (sale.outletId.toString() !== user.outletId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      sale,
    });
  } catch (error: any) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sale" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const saleId = params.id;
    
    // Find the sale
    const sale = await Sale.findById(saleId);
    
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    // Check if sale belongs to user's outlet
    if (sale.outletId.toString() !== user.outletId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Only allow deletion of DRAFT sales
    if (sale.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: 'Only draft sales can be deleted' 
      }, { status: 400 });
    }
    
    // Delete the sale
    await Sale.findByIdAndDelete(saleId);
    
    // Log activity
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'sales',
      description: `Deleted draft sale: ${sale.invoiceNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ 
      message: 'Sale deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to delete sale' 
    }, { status: 500 });
  }
}