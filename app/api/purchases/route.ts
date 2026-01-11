// app/api/purchases/route.ts
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

    if (!supplierId || !supplierName || !Array.isArray(items) || items.length === 0) {
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

      purchaseItems.push({
        productId: product._id,
        name: item.name || product.name,
        sku: item.sku || product.sku,
        quantity,
        unit: item.unit || product.unit || "pcs",
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
    const [purchase] = await Purchase.create([
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

    console.log(`✓ Purchase created: ${purchase.purchaseNumber}`);

    // ═══════════════════════════════════════════════════════════
    // COST UPDATE + INVENTORY MOVEMENTS
    // ═══════════════════════════════════════════════════════════

    const costUpdates: any[] = [];

    for (const item of purchase.items) {
      try {
        const productId = new mongoose.Types.ObjectId(item.productId);
        const purchaseQty = Number(item.quantity);
        const purchasePrice = Number(item.unitPrice);

        // 1️⃣ Update weighted average COST only
        const result = await updateWeightedAverageCost(
          productId,
          purchaseQty,
          purchasePrice
        );
        costUpdates.push(result);

        // 2️⃣ Get previous stock balance
        const lastMovement = await InventoryMovement
          .findOne({ productId, outletId })
          .sort({ date: -1 });

        const previousBalance = lastMovement?.balanceAfter || 0;
        const newBalance = previousBalance + purchaseQty;

        // 3️⃣ Create inventory movement (SOURCE OF TRUTH)
        await InventoryMovement.create({
          productId,
          productName: item.name,
          sku: item.sku,

          movementType: 'PURCHASE',
          quantity: purchaseQty,
          unitCost: purchasePrice,
          totalValue: purchaseQty * purchasePrice,

          referenceType: 'PURCHASE',
          referenceId: purchase._id,
          referenceNumber: purchase.purchaseNumber,

          outletId,
          balanceAfter: newBalance,
          date: new Date(),
          createdBy: userId,
          ledgerEntriesCreated: true,
        });

        // 4️⃣ Update cached stock on product
        await Product.findByIdAndUpdate(productId, {
          currentStock: newBalance,
        });

      } catch (error: any) {
        console.error(`⚠️ Failed processing ${item.name}:`, error.message);
      }
    }

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
    const username = userDoc?.username || user.username || user.email || "Unknown User";

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
        message: 'Purchase created successfully',
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
 * GET PURCHASES
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
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    const purchases = await Purchase.find(query)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .populate("supplierId", "name code phone")
      .populate("createdBy", "name email username")
      .lean();

    return NextResponse.json({ purchases });
  } catch (error: any) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

