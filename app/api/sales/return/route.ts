// app/api/sales/return/route.ts - COMPLETE WITH LEDGER INTEGRATION
import { NextRequest, NextResponse } from 'next/server';
import Sale, { ISale } from '@/lib/models/Sale';
import Product from '@/lib/models/ProductEnhanced';
import ActivityLog from '@/lib/models/ActivityLog';
import InventoryMovement from '@/lib/models/InventoryMovement';
import { postReturnToLedger } from '@/lib/services/accountingService';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import mongoose from 'mongoose';

interface ReturnItemRequest {
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  reason?: string;
}

interface ReturnRequest {
  saleId: string;
  invoiceNumber: string;
  reason?: string;
  items: ReturnItemRequest[];
  totalAmount: number;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RETURN PROCESSING');
    console.log('═══════════════════════════════════════════════════════════');
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { saleId, invoiceNumber, reason, items, totalAmount }: ReturnRequest = await request.json();
    
    // Validate input
    if (!saleId || !invoiceNumber || !items || items.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: saleId, invoiceNumber, items' 
      }, { status: 400 });
    }
    
    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid total amount' 
      }, { status: 400 });
    }
    
    // Find the sale
    const sale = await Sale.findById(saleId) as ISale;
    
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    
    // Check if sale belongs to user's outlet
    if (sale.outletId.toString() !== user.outletId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Store status in variable to avoid TypeScript narrowing issues
    const saleStatus = sale.status;
    
    // Check if sale is already fully refunded
    if (saleStatus === 'REFUNDED') {
      return NextResponse.json({ 
        error: 'This sale has already been fully refunded' 
      }, { status: 400 });
    }
    
    // Check if sale can be returned
    if (saleStatus !== 'COMPLETED') {
      return NextResponse.json({ 
        error: 'Only completed sales can be returned' 
      }, { status: 400 });
    }
    
    // Check if remaining returnable amount is sufficient
    const remainingReturnable = sale.getRemainingReturnableAmount();
    if (totalAmount > remainingReturnable) {
      return NextResponse.json({ 
        error: `Return amount (QAR ${totalAmount.toFixed(2)}) exceeds remaining returnable amount (QAR ${remainingReturnable.toFixed(2)})` 
      }, { status: 400 });
    }
    
    // Validate return items - IMPORTANT: Filter out labor items
    const validatedItems: Array<{
      originalItem: any;
      quantity: number;
      reason?: string;
      itemValue: number;
      taxAmount: number;
      discountAmount: number;
      itemTotal: number;
    }> = [];
    let calculatedTotal = 0;
    
    for (const returnItem of items) {
      // Find the original item by productId or sku
      const originalItem = sale.items.find((item: any) => {
        if (returnItem.productId && item.productId) {
          return item.productId.toString() === returnItem.productId;
        }
        if (returnItem.sku) {
          return item.sku === returnItem.sku;
        }
        return false;
      });
      
      if (!originalItem) {
        return NextResponse.json({ 
          error: `Item not found in sale: ${returnItem.productName || 'Unknown item'}` 
        }, { status: 400 });
      }
      
      // Check if item is labor (cannot be returned)
      if (originalItem.isLabor || 
          originalItem.sku === 'LABOR' || 
          originalItem.name?.includes('Labor') ||
          originalItem.name?.includes('labor')) {
        return NextResponse.json({ 
          error: `Labor item "${originalItem.name}" cannot be returned` 
        }, { status: 400 });
      }
      
      // Calculate available quantity for return
      const alreadyReturnedQty = originalItem.returnedQuantity || 0;
      const availableQty = originalItem.quantity - alreadyReturnedQty;
      
      if (returnItem.quantity <= 0) {
        return NextResponse.json({ 
          error: `Invalid quantity for "${originalItem.name}"` 
        }, { status: 400 });
      }
      
      if (returnItem.quantity > availableQty) {
        return NextResponse.json({ 
          error: `Cannot return ${returnItem.quantity} of "${originalItem.name}". Available: ${availableQty}` 
        }, { status: 400 });
      }
      
      // Calculate return amount (including original tax and discount proportion)
      const itemValue = originalItem.unitPrice * returnItem.quantity;
      const taxAmount = (itemValue * (originalItem.taxRate || 0)) / 100;
      const discountAmount = (originalItem.discount / originalItem.quantity) * returnItem.quantity;
      const itemTotal = itemValue + taxAmount - discountAmount;
      
      calculatedTotal += itemTotal;
      
      validatedItems.push({
        originalItem,
        quantity: returnItem.quantity,
        reason: returnItem.reason,
        itemValue,
        taxAmount,
        discountAmount,
        itemTotal
      });
    }
    
    // Validate total amount (allow 0.01 difference for rounding)
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return NextResponse.json({ 
        error: `Amount mismatch. Calculated: QAR ${calculatedTotal.toFixed(2)}, Provided: QAR ${totalAmount.toFixed(2)}` 
      }, { status: 400 });
    }
    
    // Generate return number
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    const returnCount = await Sale.countDocuments({
      outletId: user.outletId,
      'returns.returnDate': {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
        $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
      }
    });
    
    const returnNumber = `RET-${year}${month}-${(returnCount + 1).toString().padStart(5, '0')}`;
    
    console.log(`✓ Generated return number: ${returnNumber}`);
    
    // Process each return item
    const returnDetails: any[] = [];
    
    for (const validatedItem of validatedItems) {
      const { originalItem, quantity, reason, itemTotal } = validatedItem;
      
      // Update sale item returned quantity
      originalItem.returnedQuantity = (originalItem.returnedQuantity || 0) + quantity;
      
      // Update product stock if applicable
      if (originalItem.productId) {
        try {
          const product = await Product.findById(originalItem.productId);
          if (product) {
            product.currentStock += quantity;
            await product.save();
            
            // Create inventory movement
            await InventoryMovement.create({
              productId: originalItem.productId,
              productName: originalItem.name,
              sku: originalItem.sku,
              movementType: 'RETURN',
              quantity: quantity,
              unitCost: originalItem.costPrice || originalItem.unitPrice,
              totalCost: quantity * (originalItem.costPrice || originalItem.unitPrice),
              referenceType: 'RETURN',
              referenceId: sale._id,
              referenceNumber: returnNumber,
              outletId: user.outletId,
              createdBy: new mongoose.Types.ObjectId(user.userId),
              notes: reason,
            });
            
            console.log(`  ✓ Restored ${quantity} x ${originalItem.name}`);
          }
        } catch (error: any) {
          console.error(`  ⚠️ Failed to restore inventory for ${originalItem.sku}:`, error.message);
        }
      }
      
      // Add to return details
      returnDetails.push({
        productId: originalItem.productId || null,
        productName: originalItem.name,
        sku: originalItem.sku,
        quantity: quantity,
        unitPrice: originalItem.unitPrice,
        totalAmount: itemTotal,
        reason: reason || '',
        returnDate: new Date()
      });
    }
    
    // ═══════════════════════════════════════════════════════════
    // POST TO LEDGER
    // ═══════════════════════════════════════════════════════════
    console.log('\n💰 Posting return to ledger...');
    
    const returnData = {
      _id: new mongoose.Types.ObjectId(),
      returnNumber,
      returnDate: new Date(),
      reason: reason || 'Customer return',
      items: returnDetails,
      totalAmount,
      processedBy: new mongoose.Types.ObjectId(user.userId),
      processedByName: user.email,
      // Sale info for ledger posting
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      paymentMethod: sale.paymentMethod,
      outletId: user.outletId,
    };
    
    let voucherId = null;
    
    try {
      const ledgerResult = await postReturnToLedger(returnData, new mongoose.Types.ObjectId(user.userId));
      voucherId = ledgerResult.voucherId;
      console.log(`✓ Posted to ledger: ${ledgerResult.voucherNumber}`);
    } catch (ledgerError: any) {
      console.error('⚠️ Ledger posting error:', ledgerError);
      // Continue even if ledger fails - we can re-post later
    }
    
    // ═══════════════════════════════════════════════════════════
    // UPDATE SALE RECORD
    // ═══════════════════════════════════════════════════════════
    
    // Initialize returns array if needed
    if (!sale.returns) {
      sale.returns = [];
    }
    
    // Add return record
    sale.returns.push({
      returnNumber,
      returnDate: new Date(),
      reason,
      items: returnDetails,
      totalAmount,
      voucherId,
      processedBy: new mongoose.Types.ObjectId(user.userId),
      processedByName: user.email
    });
    
    // Update sale financials
    sale.amountPaid = Math.max(0, sale.amountPaid - totalAmount);
    sale.balanceDue = sale.grandTotal - sale.amountPaid;
    
    // Check if sale should be marked as REFUNDED
    const totalReturned = sale.totalReturnedAmount;
    if (Math.abs(totalReturned - sale.grandTotal) < 0.01) {
      sale.status = 'REFUNDED';
    }
    
    await sale.save();
    
    console.log(`✓ Return saved to sale record`);
    
    // ═══════════════════════════════════════════════════════════
    // ACTIVITY LOG
    // ═══════════════════════════════════════════════════════════
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'return',
      module: 'sales',
      description: `Processed return ${returnNumber} for sale ${invoiceNumber} - QAR ${totalAmount.toFixed(2)}`,
      details: {
        saleId: sale._id,
        invoiceNumber,
        returnNumber,
        totalAmount,
        reason,
        items: returnDetails.map(item => ({
          product: item.productName,
          quantity: item.quantity,
          amount: item.totalAmount
        }))
      },
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    console.log(`\n✓ Return processed successfully`);
    console.log(`  Return Number: ${returnNumber}`);
    console.log(`  Items: ${returnDetails.length}`);
    console.log(`  Amount: QAR ${totalAmount.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return NextResponse.json({ 
      success: true,
      message: 'Return processed successfully',
      data: {
        returnNumber,
        totalAmount,
        returnDetails,
        voucherId,
        sale: {
          _id: sale._id,
          invoiceNumber: sale.invoiceNumber,
          status: sale.status,
          balanceDue: sale.balanceDue,
          amountPaid: sale.amountPaid,
          grandTotal: sale.grandTotal,
          totalReturnedAmount: totalReturned,
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error processing return:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process return' 
    }, { status: 500 });
  }
}

// Get returns
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);

    const saleId = searchParams.get("saleId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { outletId: user.outletId };

    if (saleId) {
      query._id = new mongoose.Types.ObjectId(saleId);
    }

    if (startDate || endDate) {
      query["returns.returnDate"] = {};
      if (startDate) {
        query["returns.returnDate"].$gte = new Date(startDate);
      }
      if (endDate) {
        query["returns.returnDate"].$lte = new Date(endDate);
      }
    }

    // Find sales with returns
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .select(
          "invoiceNumber saleDate returns customerName grandTotal status paymentMethod"
        )
        .sort({ "returns.returnDate": -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query),
    ]);

    // Extract and flatten returns
    const returns = sales.flatMap((sale: any) =>
      (sale.returns || []).map((ret: any) => ({
        ...ret,
        saleId: sale._id,
        saleInvoice: sale.invoiceNumber,
        saleDate: sale.saleDate,
        customerName: sale.customerName,
        saleGrandTotal: sale.grandTotal,
        saleStatus: sale.status,
        salePaymentMethod: sale.paymentMethod,
      }))
    );

    // Sort by return date
    returns.sort(
      (a: any, b: any) =>
        new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        returns: returns.slice(0, limit),
        pagination: {
          total: returns.length,
          page,
          limit,
          pages: Math.ceil(returns.length / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch returns",
      },
      { status: 500 }
    );
  }
}