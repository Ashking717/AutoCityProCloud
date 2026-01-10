// app/api/purchases/route.ts
// This is an UPDATED version of your existing purchases route
// It adds support for sort, order, and limit query parameters
// Keep all your existing POST logic - only the GET method is enhanced

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Purchase from "@/lib/models/Purchase";
import Product from "@/lib/models/ProductEnhanced";
import Supplier from "@/lib/models/Supplier";
import Outlet from "@/lib/models/Outlet";
import ActivityLog from "@/lib/models/ActivityLog";
import User from "@/lib/models/User";
import InventoryMovement from "@/lib/models/InventoryMovement";

import { postPurchaseToLedger } from "@/lib/services/accountingService";
import { updateWeightedAverageCost } from "@/lib/services/inventoryService";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

/**
 * GENERATE UNIQUE PURCHASE NUMBER
 */
async function generatePurchaseNumber(outletId: mongoose.Types.ObjectId): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;
  
  const maxAttempts = 5;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const latestPurchase = await Purchase.findOne({
      outletId,
      purchaseNumber: { $regex: `^PUR-${yearMonth}-` }
    })
      .sort({ purchaseNumber: -1 })
      .select('purchaseNumber')
      .lean();
    
    let nextNumber = 1;
    
    if (latestPurchase && (latestPurchase as any).purchaseNumber) {
      const match = (latestPurchase as any).purchaseNumber.match(/-(\d{5})$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    const purchaseNumber = `PUR-${yearMonth}-${String(nextNumber).padStart(5, '0')}`;
    const exists = await Purchase.exists({ purchaseNumber });
    
    if (!exists) {
      return purchaseNumber;
    }
  }
  
  const timestamp = Date.now().toString().slice(-5);
  return `PUR-${yearMonth}-${timestamp}`;
}

/**
 * CREATE PURCHASE API
 * (Keep your existing POST logic - no changes here)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const userId = new mongoose.Types.ObjectId(user.userId);

    if (!user.outletId) {
      return NextResponse.json(
        { error: "Invalid token: outletId missing" },
        { status: 401 }
      );
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);

    // ───────────────── BODY ─────────────────
    const body = await request.json();
    const {
      supplierId,
      supplierName,
      items,
      paymentMethod,
      amountPaid,
      notes,
    } = body;

    if (
      !supplierId ||
      !supplierName ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ───────────────── OUTLET ─────────────────
    const outlet = await Outlet.findById(outletId);
    if (!outlet) {
      return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
    }

    // ───────────────── SUPPLIER ─────────────────
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // ───────────────── PURCHASE NUMBER ─────────────────
    const purchaseNumber = await generatePurchaseNumber(outletId);
    console.log(`✓ Generated purchase number: ${purchaseNumber}`);

    // ───────────────── CALCULATIONS ─────────────────
    let subtotal = 0;
    let totalTax = 0;

    const purchaseItems: any[] = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;

      const itemSubtotal = unitPrice * quantity;
      const taxAmount = (itemSubtotal * taxRate) / 100;
      const itemTotal = itemSubtotal + taxAmount;

      subtotal += itemSubtotal;
      totalTax += taxAmount;

      const unit = item.unit || product.unit || "pcs";

      purchaseItems.push({
        productId: product._id,
        name: item.name || product.name,
        sku: item.sku || product.sku,
        quantity,
        unit,
        unitPrice,
        taxRate,
        taxAmount,
        total: itemTotal,
      });
    }

    const grandTotal = subtotal + totalTax;
    const paidAmount = Number(amountPaid) || 0;
    const balanceDue = grandTotal - paidAmount;

    // ───────────────── CREATE PURCHASE ─────────────────
    const purchaseDocs = await Purchase.create([
      {
        purchaseNumber,
        outletId,
        supplierId,
        supplierName,
        items: purchaseItems,
        subtotal,
        taxAmount: totalTax,
        grandTotal,
        paymentMethod: paymentMethod?.toUpperCase() || "CASH",
        amountPaid: paidAmount,
        balanceDue,
        status: "COMPLETED",
        notes,
        createdBy: userId,
        purchaseDate: new Date(),
        isPostedToGL: false,
      },
    ]);

    const purchase = purchaseDocs[0];
    console.log(`✓ Purchase created: ${purchase.purchaseNumber}`);

    // ═══════════════════════════════════════════════════════════
    // UPDATE PRODUCT COSTS WITH WEIGHTED AVERAGE
    // ═══════════════════════════════════════════════════════════
    console.log('\n💰 Updating product costs with weighted average...');
    
    const costUpdates: any[] = [];
    
    for (const item of purchase.items) {
      try {
        const productId = new mongoose.Types.ObjectId(item.productId);
        const purchaseQty = Number(item.quantity);
        const purchasePrice = Number(item.unitPrice);
        
        // Update weighted average cost
        const result = await updateWeightedAverageCost(
          productId,
          purchaseQty,
          purchasePrice
        );
        
        costUpdates.push(result);
        
        console.log(`✓ Updated ${result.productName}:`);
        console.log(`  Old Cost: QAR ${result.oldCostPrice.toFixed(2)}`);
        console.log(`  New Cost: QAR ${result.newCostPrice.toFixed(2)}`);
        console.log(`  Change: ${result.priceChangePercent > 0 ? '+' : ''}${result.priceChangePercent.toFixed(2)}%`);
        
        // Create inventory movement
        await InventoryMovement.create({
          productId,
          productName: item.name,
          sku: item.sku,
          movementType: 'PURCHASE',
          quantity: purchaseQty,
          unitCost: purchasePrice,
          totalCost: purchaseQty * purchasePrice,
          referenceType: 'PURCHASE',
          referenceId: purchase._id,
          referenceNumber: purchase.purchaseNumber,
          outletId,
          createdBy: userId,
        });
        
      } catch (error: any) {
        console.error(`⚠️ Failed to update cost for ${item.name}:`, error.message);
      }
    }
    
    console.log(`\n✓ Updated ${costUpdates.length}/${purchase.items.length} product costs`);

    // ───────────────── ACCOUNTING ─────────────────
    let voucherId = null;
    try {
      const { voucherId: vid } = await postPurchaseToLedger(purchase, userId);
      voucherId = vid;

      purchase.set('voucherId', voucherId);
      purchase.set('isPostedToGL', true);
      await purchase.save();

      console.log(`✓ Posted to ledger`);
    } catch (error: any) {
      console.error('⚠️ Ledger posting error:', error);
    }

    // ───────────────── ACTIVITY LOG ─────────────────
    const userDoc = await User.findById(userId).lean();
    const username =
      userDoc?.username ||
      user.username ||
      user.email ||
      "Unknown User";

    await ActivityLog.create([
      {
        userId,
        username,
        actionType: "create",
        module: "purchases",
        description: `Created purchase ${purchaseNumber} - ${supplierName} - QAR ${grandTotal.toFixed(2)}`,
        outletId,
        timestamp: new Date(),
      },
    ]);

    return NextResponse.json(
      { 
        success: true,
        purchase, 
        voucherId,
        costUpdates,
        message: 'Purchase created successfully'
      }, 
      { status: 201 }
    );
  } catch (error: any) {
    console.error("PURCHASE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create purchase" },
      { status: 500 }
    );
  }
}

/**
 * GET PURCHASES (ENHANCED with sort, order, limit)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const outletId = new mongoose.Types.ObjectId(user.outletId || "");

    const { searchParams } = new URL(request.url);
    
    // Existing filters
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    // NEW: Sort, order, and limit parameters
    const sort = searchParams.get("sort") || "purchaseDate";
    const order = searchParams.get("order") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const query: any = { outletId };

    if (status && status !== 'all') query.status = status.toUpperCase();
    if (supplierId && supplierId !== 'all') {
      query.supplierId = new mongoose.Types.ObjectId(supplierId);
    }
    if (startDate && endDate) {
      query.purchaseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Build sort object
    const sortOrder = order === "desc" ? -1 : 1;
    const sortObj: any = {};
    sortObj[sort] = sortOrder;

    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate("supplierId", "name code phone")
        .populate("createdBy", "name email username")
        .lean(),
      Purchase.countDocuments(query),
    ]);

    // Format for frontend consumption
    const formattedPurchases = purchases.map((purchase) => ({
      id: purchase._id,
      purchaseNumber: purchase.purchaseNumber,
      supplier_name: purchase.supplierName,
      vendor: purchase.supplierName, // Alternative field
      amount: purchase.grandTotal,
      total_amount: purchase.grandTotal, // Alternative field
      status: purchase.status?.toLowerCase() || "complete",
      purchaseDate: purchase.purchaseDate,
      created_at: new Date(purchase.createdAt).toISOString().split("T")[0],
      date: new Date(purchase.purchaseDate || purchase.createdAt)
        .toISOString()
        .split("T")[0],
      supplier: purchase.supplierId,
      items: purchase.items,
      balanceDue: purchase.balanceDue,
    }));

    return NextResponse.json({
      purchases: formattedPurchases,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}