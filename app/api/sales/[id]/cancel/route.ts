import { NextRequest, NextResponse } from 'next/server';
import Sale from '@/lib/models/Sale';
import Product from '@/lib/models/ProductEnhanced';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';

export async function POST(
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
    
    // Check if sale can be cancelled
    if (sale.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Sale already cancelled' }, { status: 400 });
    }
    
    if (sale.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Refunded sales cannot be cancelled' }, { status: 400 });
    }
    
    // Restore stock for non-labor items
    for (const item of sale.items) {
      if (!item.isLabor && item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { currentStock: item.quantity }
        });
      }
    }
    
    // Update sale status
    sale.status = 'CANCELLED';
    await sale.save();
    
    // Log activity
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'sales',
      description: `Cancelled sale: ${sale.invoiceNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ 
      message: 'Sale cancelled successfully',
      sale 
    });
    
  } catch (error: any) {
    console.error('Error cancelling sale:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to cancel sale' 
    }, { status: 500 });
  }
}