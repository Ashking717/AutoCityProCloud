import { NextRequest, NextResponse } from "next/server";
import Sale from "@/lib/models/Sale";
import Customer from "@/lib/models/Customer";
import ActivityLog from "@/lib/models/ActivityLog";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import Product from "@/lib/models/ProductEnhanced";

// GET /api/sales
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);

    // Add this to your existing GET function, after verifying token:
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    const query: any = {
      outletId: user.outletId,
    };

    // Add date filter if provided
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    // Add status filter if provided
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

// POST /api/sales - Updated version for new schema
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const body = await request.json();

    const {
      customerId,
      customerName,
      items,
      paymentMethod,
      amountPaid,
      notes,
    } = body;

    console.log("Received sale items:", JSON.stringify(items, null, 2));

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

    // Generate invoice number
    const count = await Sale.countDocuments({ outletId: user.outletId });
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}-${String(count + 1).padStart(5, "0")}`;

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const saleItems: any[] = [];

    // ✅ Process each item
    for (const item of items) {
      console.log("Processing item:", item);

      // Check if it's a labor item
      const isLabor = item.isLabor === true || item.sku === "LABOR";

      if (isLabor) {
        console.log("Item is labor:", item);
        const unitPrice = item.unitPrice || 0;
        const taxRate = item.taxRate || 0;
        const discountRate = item.discount || 0;
        const quantity = item.quantity || 1;

        const itemSubtotal = unitPrice * quantity;
        const itemDiscount = (itemSubtotal * discountRate) / 100;
        const itemAfterDiscount = itemSubtotal - itemDiscount;
        const itemTax = (itemAfterDiscount * taxRate) / 100;
        const itemTotal = itemAfterDiscount + itemTax;

        saleItems.push({
          // Don't include productId for labor items
          name: item.name || "Labor Service",
          sku: item.sku || "LABOR",
          quantity,
          unit: "hour",
          unitPrice,
          taxRate,
          taxAmount: itemTax,
          discount: itemDiscount,
          total: itemTotal,
          isLabor: true,
        });

        subtotal += itemSubtotal;
        totalDiscount += itemDiscount;
        totalTax += itemTax;
        continue;
      }

      // ✅ Regular product validation
      if (!item.productId) {
        console.log("Missing productId for item:", item);
        throw new Error(
          `Invalid sale item: productId is missing for ${
            item.name || "unknown item"
          }`
        );
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new Error(
          `Invalid sale item: quantity must be greater than 0 for ${item.name}`
        );
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const availableStock = product.currentStock ?? 0;

      if (availableStock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${availableStock}`
        );
      }

      const unitPrice = item.unitPrice ?? product.sellingPrice ?? 0;
      const taxRate = item.taxRate ?? product.taxRate ?? 0;
      const discountRate = item.discount ?? 0;

      const itemSubtotal = unitPrice * item.quantity;
      const itemDiscount = (itemSubtotal * discountRate) / 100;
      const itemAfterDiscount = itemSubtotal - itemDiscount;
      const itemTax = (itemAfterDiscount * taxRate) / 100;
      const itemTotal = itemAfterDiscount + itemTax;

      saleItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unit: product.unit || "unit",
        unitPrice,
        taxRate,
        taxAmount: itemTax,
        discount: itemDiscount,
        total: itemTotal,
        isLabor: false,
      });

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    }

    console.log("Processed sale items:", saleItems);

    const grandTotal = subtotal - totalDiscount + totalTax;
    const paidAmount = amountPaid || 0;
    const balanceDue = grandTotal - paidAmount - totalDiscount;

    // ✅ CREATE SALE
    const sale = await Sale.create({
      invoiceNumber,
      outletId: user.outletId,
      customerId,
      customerName,
      items: saleItems,
      subtotal,
      totalTax,
      totalDiscount,
      grandTotal,
      paymentMethod: (paymentMethod || "CASH").toUpperCase(),
      amountPaid: paidAmount,
      balanceDue,
      status: "COMPLETED",
      notes,
      createdBy: user.userId,
      saleDate: new Date(),
    });

    // ✅ UPDATE STOCK (only for non-labor items)
    for (const item of saleItems) {
      if (!item.isLabor && item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { currentStock: -item.quantity },
        });
      }
    }

    // ✅ LOG ACTIVITY
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: "create",
      module: "sales",
      description: `Created sale: ${invoiceNumber} - QAR ${grandTotal.toFixed(
        2
      )}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to create sale" },
      { status: 500 }
    );
  }
}
