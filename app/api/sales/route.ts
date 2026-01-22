// app/api/sales/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Sale from "@/lib/models/Sale";
import Product from "@/lib/models/ProductEnhanced";
import Outlet from "@/lib/models/Outlet";
import ActivityLog from "@/lib/models/ActivityLog";
import User from "@/lib/models/User";
import InventoryMovement from "@/lib/models/InventoryMovement";

import { postSaleToLedger } from "@/lib/services/accountingService";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

// ─────────────────────────────────────────────────────────────
// HELPER: Generate next invoice number (NO COUNTER)
// ─────────────────────────────────────────────────────────────
async function generateInvoiceNumber(outletId: mongoose.Types.ObjectId) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const lastSale = await Sale.findOne(
    {
      outletId,
      invoiceNumber: { $regex: `^AC-${yearMonth}-` },
    },
    { invoiceNumber: 1 }
  )
    .sort({ invoiceNumber: -1 })
    .lean();

  let nextSeq = 1;

  if (lastSale?.invoiceNumber) {
    const parts = lastSale.invoiceNumber.split("-");
    nextSeq = parseInt(parts[2], 10) + 1;
  }

  return `AC-${yearMonth}-${String(nextSeq).padStart(5, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Parse and validate date string
// ─────────────────────────────────────────────────────────────
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Create start and end of day in local timezone
// ─────────────────────────────────────────────────────────────
function getDateRange(startDateStr: string | null, endDateStr: string | null) {
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  
  if (!startDate || !endDate) {
    return null;
  }
  
  // Set start date to beginning of day (00:00:00.000)
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Set end date to end of day (23:59:59.999)
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    $gte: startOfDay,
    $lte: endOfDay,
  };
}

// ===================================================================
// GET /api/sales - FIXED VERSION WITH TOTALS
// ===================================================================
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    // Build query
    const query: any = { outletId: user.outletId };

    // Handle date range with proper timezone handling
    if (startDate && endDate) {
      const dateRange = getDateRange(startDate, endDate);
      if (dateRange) {
        query.saleDate = dateRange;
      } else {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Fetch sales with pagination
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

    // Calculate totals for the filtered date range (all records, not just current page)
    const totalsAggregation = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalDiscount: { $sum: "$totalDiscount" },
          totalPaid: { $sum: "$amountPaid" },
          totalBalance: { $sum: "$balanceDue" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totals = totalsAggregation[0] || {
      totalSales: 0,
      totalDiscount: 0,
      totalPaid: 0,
      totalBalance: 0,
      count: 0,
    };

    return NextResponse.json({
      sales,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      totals: {
        totalSales: Number(totals.totalSales?.toFixed(2) || 0),
        totalDiscount: Number(totals.totalDiscount?.toFixed(2) || 0),
        totalPaid: Number(totals.totalPaid?.toFixed(2) || 0),
        totalBalance: Number(totals.totalBalance?.toFixed(2) || 0),
        count: totals.count || 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===================================================================
// POST /api/sales - CREATE NEW SALE
// ===================================================================
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user.outletId) {
      return NextResponse.json(
        { error: "Invalid user: missing outletId" },
        { status: 400 }
      );
    }
    const userId = new mongoose.Types.ObjectId(user.userId);
    const outletId = new mongoose.Types.ObjectId(user.outletId);

    const body = await request.json();
    const {
      customerId,
      customerName,
      items,
      paymentMethod, // Keep for backward compatibility
      payments: paymentDetails, // NEW: array of payment methods
      amountPaid,
      notes,
      overallDiscountAmount = 0,
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

    const outlet = await Outlet.findById(outletId);
    if (!outlet) {
      return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
    }

    // ───────── CALCULATIONS ─────────
    let itemsSubtotal = 0;
    let totalItemDiscount = 0;
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
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const costPrice = isLabor ? 0 : Number(product.costPrice || 0);

      let itemDiscount = 0;
      if (item.discountType === "percentage") {
        itemDiscount =
          (unitPrice * quantity * (Number(item.discount) || 0)) / 100;
      } else {
        itemDiscount = Number(item.discountAmount || item.discount || 0);
      }

      const gross = unitPrice * quantity;
      const net = gross - itemDiscount;

      itemsSubtotal += net;
      totalItemDiscount += itemDiscount;

      saleItems.push({
        productId: isLabor ? undefined : product._id,
        name: item.name || product?.name || "Labor",
        sku: item.sku || product?.sku || "LABOR",
        quantity,
        unit: item.unit || "pcs",
        unitPrice,
        costPrice,
        discount: itemDiscount,
        total: net,
        isLabor,
      });
    }

    const subtotal = Number(itemsSubtotal.toFixed(2));
    const overallDiscount = Number(overallDiscountAmount) || 0;
    const totalDiscount = totalItemDiscount + overallDiscount;
    const grandTotal = Number((subtotal - overallDiscount).toFixed(2));
    const paidAmount = Number(amountPaid) || 0;
    const balanceDue = Number((grandTotal - paidAmount).toFixed(2));

    // ───────── PROCESS PAYMENT DETAILS ─────────
    // Support both old single payment and new multiple payments
    let processedPayments: any[] = [];
    let primaryPaymentMethod = paymentMethod?.toUpperCase() || "CASH";

    if (
      paymentDetails &&
      Array.isArray(paymentDetails) &&
      paymentDetails.length > 0
    ) {
      // New format: multiple payments
      processedPayments = paymentDetails.map((p: any) => ({
        method: p.method?.toUpperCase() || "CASH",
        amount: Number(p.amount) || 0,
        reference: p.reference || undefined,
      }));
      primaryPaymentMethod = processedPayments[0].method;
    } else if (paymentMethod) {
      // Old format: single payment
      processedPayments = [
        {
          method: primaryPaymentMethod,
          amount: paidAmount,
          reference: undefined,
        },
      ];
    }

    // ───────── CREATE SALE (RETRY LOOP) ─────────
    let sale: any = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    const now = new Date();

    while (!sale && attempts < MAX_ATTEMPTS) {
      attempts++;

      const invoiceNumber = await generateInvoiceNumber(outletId);

      try {
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
            paymentMethod: primaryPaymentMethod, // For backward compatibility
            payments: processedPayments, // NEW: Multiple payments
            amountPaid: paidAmount,
            balanceDue,
            status: "COMPLETED",
            notes,
            createdBy: userId,
            saleDate: now,
            isPostedToGL: false,
          },
        ]);

        sale = saleDocs[0];
      } catch (err: any) {
        if (err.code === 11000) {
          console.warn("Invoice collision, retrying...");
          continue;
        }
        throw err;
      }
    }

    if (!sale) {
      throw new Error("Failed to generate unique invoice number");
    }

    // ───────── INVENTORY MOVEMENTS ─────────
    for (const item of saleItems) {
      if (item.isLabor || !item.productId) continue;

      const productId = new mongoose.Types.ObjectId(item.productId);
      const qty = Number(item.quantity);

      const lastMovement = await InventoryMovement.findOne({
        productId,
        outletId,
      }).sort({ date: -1 });

      const prevBalance = lastMovement?.balanceAfter || 0;
      const newBalance = prevBalance - qty;

      if (newBalance < 0) {
        throw new Error(`Negative stock for ${item.name}`);
      }

      await InventoryMovement.create({
        productId,
        productName: item.name,
        sku: item.sku,
        movementType: "SALE",
        quantity: -qty,
        unitCost: item.costPrice || 0,
        totalValue: qty * (item.costPrice || 0),
        referenceType: "SALE",
        referenceId: sale._id,
        referenceNumber: sale.invoiceNumber,
        outletId,
        balanceAfter: newBalance,
        date: new Date(),
        createdBy: userId,
        ledgerEntriesCreated: true,
      });

      await Product.findByIdAndUpdate(productId, {
        currentStock: newBalance,
      });
    }

    // ───────── ACCOUNTING ─────────
    const { voucherId, cogsVoucherId } = await postSaleToLedger(sale, userId);
    sale.voucherId = voucherId;
    sale.cogsVoucherId = cogsVoucherId;
    sale.isPostedToGL = true;
    await sale.save();

    // ───────── ACTIVITY LOG ─────────
    const userDoc = await User.findById(userId).lean();
    await ActivityLog.create({
      userId,
      username: userDoc?.username || user.email,
      actionType: "create",
      module: "sales",
      description: `Created sale ${sale.invoiceNumber} - QAR ${grandTotal.toFixed(
        2
      )}`,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    console.error("SALE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create sale" },
      { status: 500 }
    );
  }
}