// app/api/sales/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Sale from "@/lib/models/Sale";
import Product from "@/lib/models/ProductEnhanced";
import InventoryMovement from "@/lib/models/InventoryMovement";
import ActivityLog from "@/lib/models/ActivityLog";

import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import { reverseSaleVoucher } from "@/lib/services/accountingService";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: "Invalid outlet ID" }, { status: 400 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId);

    // ───────────────── FETCH SALE ─────────────────
    const sale = await Sale.findById(params.id);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.outletId.toString() !== outletId.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sale.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Sale already cancelled" },
        { status: 400 }
      );
    }

    if (sale.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Refunded sales cannot be cancelled" },
        { status: 400 }
      );
    }

    // ───────────────── INVENTORY REVERSAL ─────────────────
    for (const item of sale.items) {
      if (item.isLabor || !item.productId) continue;

      const productId = new mongoose.Types.ObjectId(item.productId);
      const qty = Number(item.quantity);

      // Get last inventory balance
      const lastMovement = await InventoryMovement
        .findOne({ productId, outletId })
        .sort({ date: -1 });

      const previousBalance = lastMovement?.balanceAfter || 0;
      const newBalance = previousBalance + qty;

      // Create inventory movement (SALE REVERSAL)
      await InventoryMovement.create({
        productId,
        productName: item.name,
        sku: item.sku,

        movementType: "SALE_REVERSAL",
        quantity: qty, // 🔁 STOCK IN
        unitCost: item.costPrice || 0,
        totalValue: qty * (item.costPrice || 0),

        referenceType: "SALE_CANCEL",
        referenceId: sale._id,
        referenceNumber: sale.invoiceNumber,

        outletId,
        balanceAfter: newBalance,

        date: new Date(),
        createdBy: userId,
        ledgerEntriesCreated: true,
      });

      // Update cached stock
      await Product.findByIdAndUpdate(productId, {
        currentStock: newBalance,
      });
    }

    // ───────────────── LEDGER REVERSAL ─────────────────
    // Creates:
    // - Receipt reversal voucher
    // - COGS reversal voucher
    // - LedgerEntry rows (isReversal = true)
    await reverseSaleVoucher(
      sale,
      userId,
      "Sale cancelled"
    );

    // ───────────────── UPDATE SALE ─────────────────
    sale.status = "CANCELLED";
    sale.cancelledAt = new Date();
    sale.cancelledBy = userId;
    sale.isPostedToGL = true; // remains true for audit
    await sale.save();

    // ───────────────── ACTIVITY LOG ─────────────────
    await ActivityLog.create({
      userId,
      username: user.email,
      actionType: "update",
      module: "sales",
      description: `Cancelled sale ${sale.invoiceNumber}`,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      message: "Sale cancelled successfully",
      sale,
    });
  } catch (error: any) {
    console.error("SALE CANCEL ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel sale" },
      { status: 500 }
    );
  }
}
