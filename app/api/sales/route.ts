// app/api/sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Sale from "@/lib/models/Sale";
import Product from "@/lib/models/ProductEnhanced";
import Outlet from "@/lib/models/Outlet";
import ActivityLog from "@/lib/models/ActivityLog";
import User from "@/lib/models/User";

import { postSaleToLedger } from "@/lib/services/accountingService";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

/// GET /api/sales
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    const query: any = {
      outletId: user.outletId,
    };

    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    if (status && status !== "all") {
      query.status = status;
    }
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .populate("customerId", "name phone")
        .populate("createdBy", "firstName lastName")
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query),
    ]);

    return NextResponse.json({
      sales,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
      customerId,
      customerName,
      items,
      paymentMethod,
      amountPaid,
      notes,
    } = body;

    if (
      !customerId ||
      !customerName ||
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

    // ───────────────── INVOICE NUMBER ─────────────────
    const count = await Sale.countDocuments({ outletId });
    const now = new Date();

    const invoiceNumber = `INV-${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(count + 1).padStart(5, "0")}`;

    // ───────────────── CALCULATIONS ─────────────────
    let subtotal = 0;
    let totalDiscount = 0;

    const saleItems: any[] = [];

    for (const item of items) {
      const isLabor = item.isLabor === true;

      let product: any = null;

      if (!isLabor) {
        product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.currentStock}`
          );
        }
      }

      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const costPrice = isLabor ? 0 : Number(product.costPrice || 0);

      // ✅ NEW: Handle discount type (percentage or fixed amount)
      const discountType = item.discountType || "percentage";
      let itemDiscount = 0;

      if (discountType === "percentage") {
        // Discount is a percentage (0-100)
        const discountRate = Number(item.discount) || 0;
        const itemSubtotalBeforeDiscount = unitPrice * quantity;
        itemDiscount = (itemSubtotalBeforeDiscount * discountRate) / 100;
      } else {
        // Discount is a fixed amount in QAR
        itemDiscount = Number(item.discountAmount) || Number(item.discount) || 0;
      }

      const itemSubtotalBeforeDiscount = unitPrice * quantity;
      const itemTotal = itemSubtotalBeforeDiscount - itemDiscount;

      subtotal += itemSubtotalBeforeDiscount;
      totalDiscount += itemDiscount;

      // ✅ UNIT ENFORCEMENT
      const unit = item.unit || (isLabor ? "job" : product.unit || "pcs");

      saleItems.push({
        productId: isLabor ? undefined : product._id,
        name: item.name || product?.name || "Labor Service",
        sku: item.sku || product?.sku || "LABOR",
        quantity,
        unit,
        unitPrice,
        costPrice,
        discount: itemDiscount, // ✅ Store discount AMOUNT in QAR
        total: itemTotal,
        isLabor,
      });
    }

    const grandTotal = subtotal - totalDiscount;
    const paidAmount = Number(amountPaid) || 0;
    const balanceDue = grandTotal - paidAmount;

    // ───────────────── CREATE SALE ─────────────────
    const saleDocs = await Sale.create([
      {
        invoiceNumber,
        outletId,
        customerId,
        customerName,
        items: saleItems,
        subtotal,
        totalDiscount,
        totalVAT: 0,
        grandTotal,
        paymentMethod: paymentMethod?.toUpperCase() || "CASH",
        amountPaid: paidAmount,
        balanceDue,
        status: "COMPLETED",
        notes,
        createdBy: userId,
        saleDate: now,
        isPostedToGL: false,
      },
    ]);

    const sale = saleDocs[0];

    // ───────────────── UPDATE STOCK ─────────────────
    for (const item of saleItems) {
      if (!item.isLabor && item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { currentStock: -item.quantity },
        });
      }
    }

    // ───────────────── ACCOUNTING ─────────────────
    const { voucherId, cogsVoucherId } = await postSaleToLedger(sale, userId);

    sale.voucherId = voucherId;
    sale.cogsVoucherId = cogsVoucherId || undefined;
    sale.isPostedToGL = true;
    await sale.save();

    // ───────────────── FETCH USERNAME FOR ACTIVITY LOG ─────────────────
    const userDoc = await User.findById(userId).lean();
    const username =
      userDoc?.username ||
      user.username ||
      user.email ||
      "Unknown User";

    // ───────────────── ACTIVITY LOG ─────────────────
    await ActivityLog.create([
      {
        userId,
        username,
        actionType: "create",
        module: "sales",
        description: `Created sale ${invoiceNumber} - QAR ${grandTotal.toFixed(
          2
        )}`,
        outletId,
        timestamp: new Date(),
      },
    ]);

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    console.error("SALE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create sale" },
      { status: 500 }
    );
  }
}