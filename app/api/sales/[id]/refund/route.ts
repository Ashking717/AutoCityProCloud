import { NextRequest, NextResponse } from 'next/server';
import Sale from '@/lib/models/Sale';
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
    const { refundAmount } = await request.json();
    
    // Find the sale
    const sale = await Sale.findById(saleId);
    
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    // Check if sale belongs to user's outlet
    if (sale.outletId.toString() !== user.outletId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Check if sale can be refunded
    if (sale.status !== 'COMPLETED') {
      return NextResponse.json({ 
        error: 'Only completed sales can be refunded' 
      }, { status: 400 });
    }
    
    // Calculate available amount for refund
    const availableForRefund = sale.amountPaid - (sale.grandTotal - sale.balanceDue);
    
    if (refundAmount > availableForRefund) {
      return NextResponse.json({ 
        error: `Refund amount exceeds available amount (QAR ${availableForRefund.toFixed(2)})` 
      }, { status: 400 });
    }
    
    // Update sale
    sale.amountPaid -= refundAmount;
    sale.balanceDue += refundAmount;
    
    // If full refund, mark as refunded
    if (Math.abs(sale.balanceDue - sale.grandTotal) < 0.01) {
      sale.status = 'REFUNDED';
    }
    
    await sale.save();
    
    // Log activity
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'refund',
      module: 'sales',
      description: `Processed refund of QAR ${refundAmount.toFixed(2)} for sale: ${sale.invoiceNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ 
      message: 'Refund processed successfully',
      sale 
    });
    
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process refund' 
    }, { status: 500 });
  }
}