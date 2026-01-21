// app/api/sales/[id]/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Sale from "@/lib/models/Sale";
import ActivityLog from "@/lib/models/ActivityLog";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import {
  reverseSaleVoucher,
  postSaleToLedger,
} from "@/lib/services/accountingService";

export async function PUT(
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

    const body = await request.json();
    const {
      items,           // unitPrice / discount ONLY
      paymentMethod,
      amountPaid,
      notes,
      correctionReason,
    } = body;

    const sale = await Sale.findById(params.id);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.outletId.toString() !== outletId.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ───────────────── SAFETY RULES ─────────────────
    if (sale.status === "CANCELLED" || sale.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Cancelled or refunded sales cannot be edited" },
        { status: 400 }
      );
    }

    if (sale.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Only completed sales can be corrected" },
        { status: 400 }
      );
    }

    if (sale.returns && sale.returns.length > 0) {
      return NextResponse.json(
        { error: "Sales with returns cannot be edited" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items are required for correction" },
        { status: 400 }
      );
    }

    // ───────────────── 1️⃣ DETECT CHANGE TYPE ─────────────────
    const priceChanged = sale.items.some((oldItem) => {
      const updated = items.find((i: any) => i.sku === oldItem.sku);
      if (!updated) return false;

      return (
        Number(updated.unitPrice) !== Number(oldItem.unitPrice) ||
        Number(updated.discount || 0) !== Number(oldItem.discount || 0)
      );
    });

    const isPaymentOnlyEdit = !priceChanged;

    // ───────────────── 2️⃣ REVERSE LEDGER (SELECTIVE) ─────────────────
    await reverseSaleVoucher(
      sale,
      userId,
      correctionReason ||
        (priceChanged ? "Sale price corrected" : "Payment method corrected"),
      { reverseCOGS: priceChanged }
    );

    // ───────────────── 3️⃣ REBUILD SALE TOTALS ─────────────────
    // 🔒 DEFAULT: preserve existing values
    let rebuiltItems = sale.items;
    let newSubtotal = sale.subtotal;
    let newTotalDiscount = sale.totalDiscount;
    let newTotalVAT = sale.totalVAT;
    let newGrandTotal = sale.grandTotal;

    // 🔒 PRESERVE PAID/BALANCE FOR PAYMENT-ONLY EDIT
    let paid = sale.amountPaid;
    let newBalanceDue = sale.balanceDue;

    // 🔥 ONLY RECALCULATE WHEN PRICE CHANGED
    if (priceChanged) {
      newSubtotal = 0;
      newTotalDiscount = 0;
      newTotalVAT = 0;

      rebuiltItems = sale.items.map((oldItem) => {
        const updated = items.find((i: any) => i.sku === oldItem.sku);
        if (!updated) return oldItem;

        // ❌ Quantity MUST NOT change
        if (
          updated.quantity &&
          Number(updated.quantity) !== Number(oldItem.quantity)
        ) {
          throw new Error("Quantity cannot be changed in correction");
        }

        const unitPrice = Number(updated.unitPrice ?? oldItem.unitPrice);
        const discountPct = Number(updated.discount ?? oldItem.discount ?? 0);

        const gross = unitPrice * oldItem.quantity;
        const discountAmount =
          discountPct > 0 ? (gross * discountPct) / 100 : 0;

        const net = gross - discountAmount;
        const taxRate = oldItem.taxRate || 0;
        const vatAmount = (net * taxRate) / 100;

        newSubtotal += net;
        newTotalDiscount += discountAmount;
        newTotalVAT += vatAmount;

        return {
          ...oldItem,
          unitPrice,
          discount: discountPct,
          vatAmount: Number(vatAmount.toFixed(2)),
          total: Number((net + vatAmount).toFixed(2)),
        };
      });

      newGrandTotal = Number((newSubtotal + newTotalVAT).toFixed(2));

      // Paid may change ONLY when price changes
      paid = Number(amountPaid ?? sale.amountPaid);
      newBalanceDue = Number((newGrandTotal - paid).toFixed(2));

      // 🔒 Floating-point guard
      if (Math.abs(newBalanceDue) < 0.01) newBalanceDue = 0;
    }

    // ───────────────── 4️⃣ UPDATE SALE DOCUMENT ─────────────────
    if (priceChanged) {
      sale.items = rebuiltItems;
      sale.subtotal = Number(newSubtotal.toFixed(2));
      sale.totalDiscount = Number(newTotalDiscount.toFixed(2));
      sale.totalVAT = Number(newTotalVAT.toFixed(2));
      sale.grandTotal = newGrandTotal;
    }

    sale.paymentMethod = paymentMethod || sale.paymentMethod;
    sale.amountPaid = paid;
    sale.balanceDue = newBalanceDue;
    sale.notes = notes;

    // Reset GL flags
    sale.voucherId = undefined;
    sale.cogsVoucherId = undefined;
    sale.isPostedToGL = false;

    await sale.save();

    // ───────────────── 5️⃣ RE-POST LEDGER ─────────────────
    const postResult = await postSaleToLedger(
      sale,
      userId,
      { skipCOGS: isPaymentOnlyEdit }
    );

    sale.voucherId = postResult.voucherId;
    sale.cogsVoucherId = postResult.cogsVoucherId || undefined;
    sale.isPostedToGL = true;

    await sale.save();

    // ───────────────── 6️⃣ AUDIT LOG ─────────────────
    await ActivityLog.create({
      userId,
      username: user.email,
      actionType: "update",
      module: "sales",
      description: priceChanged
        ? `Corrected price on sale ${sale.invoiceNumber}`
        : `Corrected payment method on sale ${sale.invoiceNumber}`,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({
      message: "Sale corrected successfully",
      sale,
    });
  } catch (error: any) {
    console.error("SALE EDIT ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to edit sale" },
      { status: 500 }
    );
  }
}
