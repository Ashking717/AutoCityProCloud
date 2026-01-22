// app/api/sales/[id]/edit/route.ts
// CORRECT VERSION: Payment method changes update cash/bank accounts
// Last Updated: 2026-01-22

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

    // ───────────────── 2️⃣ PAYMENT-ONLY EDIT: UPDATE CASH/BANK ACCOUNTS ─────────────────
    if (isPaymentOnlyEdit) {
      const oldPaymentMethod = sale.paymentMethod;
      const newPaymentMethod = paymentMethod || sale.paymentMethod;
      
      console.log(`[SALE EDIT] Payment method change for ${sale.invoiceNumber}`);
      console.log(`  Old: ${oldPaymentMethod} → New: ${newPaymentMethod}`);
      
      // ✅ Reverse ONLY the revenue voucher (NOT COGS!)
      // This removes money from old account (Cash) and reverses revenue
      // NOTE: At this point, sale.paymentMethod still has OLD value
      await reverseSaleVoucher(
        sale,
        userId,
        correctionReason || `Payment method changed from ${oldPaymentMethod} to ${newPaymentMethod}`,
        { reverseCOGS: false } // 🔥 KEY: Don't reverse COGS - inventory already handled
      );

      // 🔥 NOW update sale metadata with NEW payment method
      sale.paymentMethod = newPaymentMethod;
      sale.notes = notes;
      
      // 🔥 CRITICAL: Also update the payments array if it exists
      // Some sales have a payments array that needs to be updated too
      if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
        // Update all payment methods in the array to match the new method
        sale.payments = sale.payments.map((p: any) => ({
          ...p,
          method: newPaymentMethod
        }));
        console.log(`  ✓ Updated payments array (${sale.payments.length} payment(s))`);
      }
      
      // Reset ONLY revenue voucher ID (preserve COGS voucher)
      sale.voucherId = undefined;
      // sale.cogsVoucherId stays unchanged ✓
      sale.isPostedToGL = false;

      await sale.save();

      // 🔥 Reload sale to ensure payment method is persisted
      const reloadedSale = await Sale.findById(sale._id);
      if (!reloadedSale) throw new Error("Sale not found after save");
      
      console.log(`  ✓ Sale saved and reloaded`);
      console.log(`  ✓ Verified payment method: ${reloadedSale.paymentMethod}`);

      // ✅ Create NEW revenue voucher with new payment account
      // This adds money to new account (Bank) and re-records revenue
      // NOTE: At this point, sale.paymentMethod has NEW value
      const postResult = await postSaleToLedger(
        reloadedSale,  // Use reloaded sale
        userId,
        { skipCOGS: true } // 🔥 KEY: Don't create new COGS - already exists!
      );

      sale.voucherId = postResult.voucherId;
      // sale.cogsVoucherId stays unchanged ✓
      sale.isPostedToGL = true;

      await sale.save();

      // ───────────────── AUDIT LOG ─────────────────
      await ActivityLog.create({
        userId,
        username: user.email,
        actionType: "update",
        module: "sales",
        description: `Changed payment method on sale ${sale.invoiceNumber} from ${sale.paymentMethod} to ${paymentMethod}`,
        outletId,
        timestamp: new Date(),
      });

      console.log(`✅ Payment method updated successfully`);
      console.log(`  Revenue voucher: ${sale.voucherId} (new)`);
      console.log(`  COGS voucher: ${sale.cogsVoucherId} (preserved)`);

      return NextResponse.json({
        message: "Sale payment method updated successfully",
        sale,
      });
    }

    // ───────────────── 3️⃣ PRICE CHANGE: FULL ACCOUNTING CORRECTION ─────────────────
    
    console.log(`[SALE EDIT] Price change detected for ${sale.invoiceNumber}`);
    
    // Reverse existing GL entries (INCLUDING COGS)
    await reverseSaleVoucher(
      sale,
      userId,
      correctionReason || "Sale price corrected",
      { reverseCOGS: true } // Always reverse COGS for price changes
    );

    // ───────────────── 4️⃣ REBUILD SALE TOTALS ─────────────────
    let newSubtotal = 0;
    let newTotalDiscount = 0;
    let newTotalVAT = 0;

    const rebuiltItems = sale.items.map((oldItem) => {
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

    const newGrandTotal = Number((newSubtotal + newTotalVAT).toFixed(2));
    const paid = Number(amountPaid ?? sale.amountPaid);
    let newBalanceDue = Number((newGrandTotal - paid).toFixed(2));

    // 🔒 Floating-point guard
    if (Math.abs(newBalanceDue) < 0.01) newBalanceDue = 0;

    // ───────────────── 5️⃣ UPDATE SALE DOCUMENT ─────────────────
    sale.items = rebuiltItems;
    sale.subtotal = Number(newSubtotal.toFixed(2));
    sale.totalDiscount = Number(newTotalDiscount.toFixed(2));
    sale.totalVAT = Number(newTotalVAT.toFixed(2));
    sale.grandTotal = newGrandTotal;
    sale.paymentMethod = paymentMethod || sale.paymentMethod;
    sale.amountPaid = paid;
    sale.balanceDue = newBalanceDue;
    sale.notes = notes;

    // Reset GL flags - new entries will be created
    sale.voucherId = undefined;
    sale.cogsVoucherId = undefined;
    sale.isPostedToGL = false;

    await sale.save();

    // ───────────────── 6️⃣ RE-POST TO LEDGER (FULL) ─────────────────
    const postResult = await postSaleToLedger(
      sale,
      userId,
      { skipCOGS: false } // Always post COGS for price changes
    );

    sale.voucherId = postResult.voucherId;
    sale.cogsVoucherId = postResult.cogsVoucherId || undefined;
    sale.isPostedToGL = true;

    await sale.save();

    // ───────────────── 7️⃣ AUDIT LOG ─────────────────
    await ActivityLog.create({
      userId,
      username: user.email,
      actionType: "update",
      module: "sales",
      description: `Corrected price on sale ${sale.invoiceNumber}`,
      outletId,
      timestamp: new Date(),
    });

    console.log(`✅ Price correction completed`);
    console.log(`  Revenue voucher: ${sale.voucherId} (new)`);
    console.log(`  COGS voucher: ${sale.cogsVoucherId} (new)`);

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