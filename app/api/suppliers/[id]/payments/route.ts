import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import ActivityLog from "@/lib/models/ActivityLog";
import Supplier from "@/lib/models/Supplier";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import { postSupplierBalancePaymentToLedger } from "@/lib/services/accountingService";
import { getSupplierOutstandingBalance, toAmount } from "@/lib/services/supplierBalanceService";

export async function POST(
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
    if (!user.outletId) {
      return NextResponse.json(
        { error: "Invalid token: outletId missing" },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid supplier ID" }, { status: 400 });
    }

    const userId = new mongoose.Types.ObjectId(user.userId);
    const outletId = new mongoose.Types.ObjectId(user.outletId);

    const body = await request.json();
    const { amount, paymentMethod, paymentDate, referenceNumber, notes } = body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!["CASH", "CARD", "BANK_TRANSFER"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const supplier = await Supplier.findOne({
      _id: params.id,
      outletId,
      isActive: { $ne: false },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const summary = await getSupplierOutstandingBalance({
      outletId,
      supplierId: supplier._id,
    });

    if (summary.balance <= 0) {
      return NextResponse.json(
        { error: "Supplier has no outstanding balance" },
        { status: 400 }
      );
    }

    if (paymentAmount > summary.balance) {
      return NextResponse.json(
        {
          error: `Payment amount (${paymentAmount}) exceeds supplier balance (${summary.balance})`,
        },
        { status: 400 }
      );
    }

    const ledgerResult = await postSupplierBalancePaymentToLedger(
      {
        supplierId: supplier._id,
        supplierCode: supplier.code,
        supplierName: supplier.name,
        amount: paymentAmount,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNumber,
        notes,
        outletId,
      },
      userId
    );

    const newBalance = toAmount(summary.balance - paymentAmount);
    supplier.set("currentBalance", newBalance);
    await supplier.save();

    await ActivityLog.create({
      userId,
      username: user.email || user.username,
      actionType: "payment",
      module: "suppliers",
      description: `Recorded supplier balance payment of QAR ${paymentAmount.toFixed(2)} for ${supplier.name}`,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        message: "Supplier balance payment recorded successfully",
        payment: {
          voucherId: ledgerResult.voucherId,
          voucherNumber: ledgerResult.voucherNumber,
          amount: paymentAmount,
          newBalance,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error recording supplier balance payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record supplier balance payment" },
      { status: 500 }
    );
  }
}
