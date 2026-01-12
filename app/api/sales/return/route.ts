// app/api/sales/return/route.ts - COMPLETE & FIXED
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
  reason?: string;
}

interface ReturnRequest {
  saleId: string;
  invoiceNumber: string;
  reason?: string;
  items: ReturnItemRequest[];
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    const { saleId, invoiceNumber, reason, items }: ReturnRequest =
      await request.json();

    /* ─────────── BASIC VALIDATION ─────────── */

    if (!saleId || !invoiceNumber || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sale = (await Sale.findById(saleId)) as ISale;
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (sale.outletId.toString() !== user.outletId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (sale.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed sales can be returned' },
        { status: 400 }
      );
    }

    /* ─────────── ITEM VALIDATION & CALCULATION ─────────── */

    const validatedItems: any[] = [];
    let calculatedTotal = 0;

    for (const returnItem of items) {
      const originalItem = sale.items.find(
        (i: any) =>
          (returnItem.productId &&
            i.productId?.toString() === returnItem.productId) ||
          i.sku === returnItem.sku
      );

      if (!originalItem) {
        return NextResponse.json(
          { error: `Item not found in sale: ${returnItem.productName}` },
          { status: 400 }
        );
      }

      if (originalItem.isLabor) {
        return NextResponse.json(
          { error: `Labor item "${originalItem.name}" cannot be returned` },
          { status: 400 }
        );
      }

      const alreadyReturned = originalItem.returnedQuantity || 0;
      const availableQty = originalItem.quantity - alreadyReturned;

      if (returnItem.quantity <= 0 || returnItem.quantity > availableQty) {
        return NextResponse.json(
          { error: `Invalid return quantity for ${originalItem.name}` },
          { status: 400 }
        );
      }

      /* ✅ CORRECT ERP RETURN CALCULATION */

      const grossLineTotal =
        originalItem.unitPrice * originalItem.quantity;

      const netLineTotal =
        grossLineTotal * (sale.grandTotal / sale.subtotal);

      const netUnitPrice =
        netLineTotal / originalItem.quantity;

      const itemTotal = Number(
        (netUnitPrice * returnItem.quantity).toFixed(2)
      );

      calculatedTotal += itemTotal;

      validatedItems.push({
        originalItem,
        quantity: returnItem.quantity,
        itemTotal,
        reason: returnItem.reason,
      });
    }

    /* ─────────── AUTHORITATIVE RETURN TOTAL ─────────── */

    const totalAmount = Number(calculatedTotal.toFixed(2));
    const remainingReturnable = sale.getRemainingReturnableAmount();

    if (totalAmount > remainingReturnable + 0.01) {
      return NextResponse.json(
        {
          error: `Return amount (QAR ${totalAmount.toFixed(
            2
          )}) exceeds remaining returnable amount (QAR ${remainingReturnable.toFixed(
            2
          )})`,
        },
        { status: 400 }
      );
    }

    /* ─────────── RETURN NUMBER ─────────── */

    const today = new Date();
    const ym =
      today.getFullYear().toString().slice(-2) +
      (today.getMonth() + 1).toString().padStart(2, '0');

    const count = await Sale.countDocuments({
      outletId: user.outletId,
      'returns.returnDate': {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
      },
    });

    const returnNumber = `RET-${ym}-${String(count + 1).padStart(5, '0')}`;

    /* ─────────── PROCESS RETURN ─────────── */

    const returnDetails: any[] = [];

    for (const v of validatedItems) {
      const { originalItem, quantity, itemTotal, reason } = v;

      originalItem.returnedQuantity =
        (originalItem.returnedQuantity || 0) + quantity;

      if (originalItem.productId) {
        const product = await Product.findById(originalItem.productId);
        if (product) {
          // Get last balance for this product
          const lastMovement = await InventoryMovement
            .findOne({ 
              productId: originalItem.productId, 
              outletId: user.outletId 
            })
            .sort({ date: -1 });

          const previousBalance = lastMovement?.balanceAfter || 0;
          const newBalance = previousBalance + quantity; // Adding back to stock

          // Update product stock
          product.currentStock = newBalance;
          await product.save();

          // Create inventory movement
          await InventoryMovement.create({
            productId: originalItem.productId,
            productName: originalItem.name,
            sku: originalItem.sku,
            movementType: 'RETURN',
            quantity: quantity, // Positive for returns (adding back)
            unitCost: originalItem.costPrice || 0,
            totalValue: quantity * (originalItem.costPrice || 0),
            referenceType: 'RETURN',
            referenceId: sale._id,
            referenceNumber: returnNumber,
            outletId: user.outletId,
            balanceAfter: newBalance,
            date: new Date(),
            createdBy: new mongoose.Types.ObjectId(user.userId),
            notes: reason,
            ledgerEntriesCreated: true,
          });
        }
      }

      returnDetails.push({
        productId: originalItem.productId,
        productName: originalItem.name,
        sku: originalItem.sku,
        quantity,
        unitPrice: originalItem.unitPrice,
        totalAmount: itemTotal,
        reason,
        returnDate: new Date(),
      });
    }

    /* ─────────── LEDGER ─────────── */

    let voucherId: mongoose.Types.ObjectId | undefined;

    try {
      const ledger = await postReturnToLedger(
        {
          returnNumber,
          returnDate: new Date(),
          items: returnDetails,
          totalAmount,
          saleId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          customerId: sale.customerId,
          customerName: sale.customerName,
          paymentMethod: sale.paymentMethod,
          outletId: user.outletId,
        },
        new mongoose.Types.ObjectId(user.userId)
      );
      voucherId = ledger.voucherId;
    } catch (e) {
      console.error('Ledger posting failed', e);
    }

    /* ─────────── SAVE SALE ─────────── */

    sale.returns ||= [];
    sale.returns.push({
      returnNumber,
      returnDate: new Date(),
      reason,
      items: returnDetails,
      totalAmount,
      voucherId,
      processedBy: new mongoose.Types.ObjectId(user.userId),
      processedByName: user.email,
    });

    sale.amountPaid = Math.max(0, sale.amountPaid - totalAmount);
    sale.balanceDue = Number(
      (sale.grandTotal - sale.amountPaid).toFixed(2)
    );

    if (Math.abs(sale.totalReturnedAmount - sale.grandTotal) < 0.01) {
      sale.status = 'REFUNDED';
    }

    await sale.save();

    /* ─────────── ACTIVITY LOG ─────────── */

    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(user.userId),
      username: user.email,
      actionType: 'return',
      module: 'sales',
      description: `Processed return ${returnNumber} for sale ${invoiceNumber} - QAR ${totalAmount.toFixed(2)}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        returnNumber,
        totalAmount,
        voucherId,
      },
    });
  } catch (error: any) {
    console.error('Return processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process return' },
      { status: 500 }
    );
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