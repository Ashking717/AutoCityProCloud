// app/api/purchases/[id]/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Purchase from "@/lib/models/Purchase";
import ActivityLog from "@/lib/models/ActivityLog";
import User from "@/lib/models/User";
import Voucher from "@/lib/models/Voucher";

import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import { postPurchasePaymentToLedger } from "@/lib/services/accountingService";

/**
 * GET - Fetch all payments for a purchase
 * FIXED: Properly cast referenceId to ObjectId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const outletId = new mongoose.Types.ObjectId(user.outletId || "");

    console.log('\n🔍 Fetching payment vouchers:');
    console.log(`  Purchase ID: ${params.id}`);
    console.log(`  Outlet ID: ${outletId}`);

    // ✅ FIX: Cast referenceId to ObjectId for proper comparison
    const purchaseObjectId = new mongoose.Types.ObjectId(params.id);

    // Find all payment vouchers for this purchase
    const payments = await Voucher.find({
      referenceType: "PURCHASE_PAYMENT",
      referenceId: purchaseObjectId,  // ← FIXED: Use ObjectId
      outletId,
      status: "posted",
    })
      .sort({ date: -1, createdAt: -1 })
      .populate("createdBy", "name email username firstName lastName")
      .lean();

    console.log(`✅ Found ${payments.length} payment voucher(s)`);
    
    if (payments.length > 0) {
      console.log(`  First payment: ${payments[0].voucherNumber} - ${payments[0].totalCredit} QAR`);
    }

    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error("❌ Error fetching purchase payments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

/**
 * POST - Record a payment against a purchase on credit
 */
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
      return NextResponse.json(
        { error: "Invalid token: outletId missing" },
        { status: 401 }
      );
    }

    const outletId = new mongoose.Types.ObjectId(user.outletId);

    // ───────────────── BODY ─────────────────
    const body = await request.json();
    const {
      amount,
      paymentMethod, // "CASH", "CARD", "BANK_TRANSFER"
      paymentDate,
      notes,
      referenceNumber, // Check number, transaction ID, etc.
    } = body;

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!["CASH", "CARD", "BANK_TRANSFER"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // ───────────────── FETCH PURCHASE ─────────────────
    const purchase = await Purchase.findOne({
      _id: params.id,
      outletId,
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    // ───────────────── VALIDATE PAYMENT ─────────────────
    if (purchase.balanceDue <= 0) {
      return NextResponse.json(
        { error: "Purchase has no outstanding balance" },
        { status: 400 }
      );
    }

    if (paymentAmount > purchase.balanceDue) {
      return NextResponse.json(
        {
          error: `Payment amount (${paymentAmount}) exceeds balance due (${purchase.balanceDue})`,
        },
        { status: 400 }
      );
    }

    console.log("\n🔍 Purchase Payment Request:");
    console.log(`  Purchase: ${purchase.purchaseNumber}`);
    console.log(`  Grand Total: QAR ${purchase.grandTotal}`);
    console.log(`  Current Balance Due: QAR ${purchase.balanceDue}`);
    console.log(`  Payment Amount: QAR ${paymentAmount}`);
    console.log(`  Payment Method: ${paymentMethod}\n`);

    // ───────────────── POST TO LEDGER ─────────────────
    const ledgerResult = await postPurchasePaymentToLedger(
      {
        purchaseId: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        supplierName: purchase.supplierName,
        amount: paymentAmount,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNumber,
        notes,
        outletId,
      },
      userId
    );

    // ───────────────── UPDATE PURCHASE ─────────────────
    const newAmountPaid = purchase.amountPaid + paymentAmount;
    const newBalanceDue = purchase.grandTotal - newAmountPaid;

    console.log("\n💰 Updating Purchase Balance:");
    console.log(`  Old Paid: QAR ${purchase.amountPaid}`);
    console.log(`  New Paid: QAR ${newAmountPaid}`);
    console.log(`  Old Balance: QAR ${purchase.balanceDue}`);
    console.log(`  New Balance: QAR ${newBalanceDue}`);

    // Update purchase
    purchase.set("amountPaid", newAmountPaid);
    purchase.set("balanceDue", newBalanceDue);

    // Update status if fully paid
    if (newBalanceDue <= 0.01) {
      purchase.set("status", "PAID");
      console.log(`  ✓ Status updated to PAID`);
    }

    await purchase.save();

    // ───────────────── ACTIVITY LOG ─────────────────
    await ActivityLog.create({
      userId,
      username: user.email || user.username,
      actionType: "payment",
      module: "purchases",
      description: `Recorded payment of QAR ${paymentAmount} for purchase ${purchase.purchaseNumber}`,
      outletId,
      timestamp: new Date(),
    });

    console.log(`\n✓ Payment recorded successfully\n`);

    return NextResponse.json(
      {
        message: "Payment recorded successfully",
        payment: {
          voucherId: ledgerResult.voucherId,
          voucherNumber: ledgerResult.voucherNumber,
          amount: paymentAmount,
          newBalance: newBalanceDue,
          newAmountPaid,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("\n❌ PURCHASE PAYMENT ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}