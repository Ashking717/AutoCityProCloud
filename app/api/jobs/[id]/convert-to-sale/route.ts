// app/api/jobs/[id]/convert-to-sale/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Job from "@/lib/models/Job";
import Sale from "@/lib/models/Sale";
import Product from "@/lib/models/ProductEnhanced";
import InventoryMovement from "@/lib/models/InventoryMovement";
import User from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";

import { postSaleToLedger } from "@/lib/services/accountingService";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

// ===================================================================
// POST /api/jobs/[id]/convert-to-sale - CONVERT JOB TO SALE
// ===================================================================
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
    const userId = new mongoose.Types.ObjectId(user.userId);
    const outletId = new mongoose.Types.ObjectId(user.username);


    const job = await Job.findOne({
      _id: params.id,
      outletId: user.outletId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!job.canConvertToSale()) {
      return NextResponse.json(
        { 
          error: "Job cannot be converted to sale. Job must be completed and not already converted." 
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      paymentMethod,
      payments: paymentDetails,
      amountPaid,
      notes,
    } = body;

    // Prepare sale items from job items
    const saleItems: any[] = [];
    let subtotal = 0;
    let totalDiscount = 0;

    for (const item of job.items) {
      const isLabor = item.isLabor === true;
      let product: any = null;

      // Check stock for non-labor items
      if (!isLabor && item.productId) {
        product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        if (product.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      // Use actual price if available, otherwise use estimated
      const unitPrice = item.actualPrice ?? item.estimatedPrice;
      const costPrice = isLabor ? 0 : Number(product?.costPrice || 0);
      const quantity = Number(item.quantity);

      // Calculate discount
      let itemDiscount = 0;
      if (item.discountType === "percentage") {
        itemDiscount = (unitPrice * quantity * Number(item.discount)) / 100;
      } else {
        itemDiscount = Number(item.discount);
      }

      const gross = unitPrice * quantity;
      const net = gross - itemDiscount;

      subtotal += net;
      totalDiscount += itemDiscount;

      saleItems.push({
        productId: isLabor ? undefined : item.productId,
        name: item.productName,
        sku: item.sku,
        quantity,
        unit: item.unit,
        unitPrice,
        costPrice,
        discount: itemDiscount,
        total: net,
        isLabor,
      });
    }

    const grandTotal = Number(subtotal.toFixed(2));
    const paidAmount = Number(amountPaid) || 0;
    const balanceDue = Number((grandTotal - paidAmount).toFixed(2));

    // Process payment details
    let processedPayments: any[] = [];
    let primaryPaymentMethod = paymentMethod?.toUpperCase() || "CASH";

    if (
      paymentDetails &&
      Array.isArray(paymentDetails) &&
      paymentDetails.length > 0
    ) {
      processedPayments = paymentDetails.map((p: any) => ({
        method: p.method?.toUpperCase() || "CASH",
        amount: Number(p.amount) || 0,
        reference: p.reference || undefined,
      }));
      primaryPaymentMethod = processedPayments[0].method;
    } else if (paymentMethod) {
      processedPayments = [
        {
          method: primaryPaymentMethod,
          amount: paidAmount,
          reference: undefined,
        },
      ];
    }

    // Generate invoice number with retry logic
    let sale: any = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    const now = new Date();

    while (!sale && attempts < MAX_ATTEMPTS) {
      attempts++;

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

      const invoiceNumber = `AC-${yearMonth}-${String(nextSeq).padStart(5, "0")}`;

      try {
        const saleDocs = await Sale.create([
          {
            invoiceNumber,
            outletId,
            customerId: job.customerId,
            customerName: job.customerName,
            items: saleItems,
            subtotal,
            totalDiscount,
            totalVAT: 0,
            grandTotal,
            paymentMethod: primaryPaymentMethod,
            payments: processedPayments,
            amountPaid: paidAmount,
            balanceDue,
            status: "COMPLETED",
            notes: notes || `Converted from Job ${job.jobNumber}${job.description ? ` - ${job.description}` : ""}`,
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

    // Create inventory movements for non-labor items
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

    // Post to ledger
    const { voucherId, cogsVoucherId } = await postSaleToLedger(sale, userId);
    sale.voucherId = voucherId;
    sale.cogsVoucherId = cogsVoucherId;
    sale.isPostedToGL = true;
    await sale.save();

    // Update job as converted
    job.convertedToSale = true;
    job.saleId = sale._id;
    job.saleInvoiceNumber = sale.invoiceNumber;
    await job.save();

    // Activity logs
    const userDoc = await User.findById(userId).lean();
    
    await ActivityLog.create({
      userId,
      username: userDoc?.username || user.email,
      actionType: "create",
      module: "sales",
      description: `Created sale ${sale.invoiceNumber} from job ${job.jobNumber} - QAR ${grandTotal.toFixed(2)}`,
      outletId,
      timestamp: new Date(),
    });

    await ActivityLog.create({
      userId,
      username: userDoc?.username || user.email,
      actionType: "update",
      module: "jobs",
      description: `Converted job ${job.jobNumber} to sale ${sale.invoiceNumber}`,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ sale, job }, { status: 201 });
  } catch (error: any) {
    console.error("JOB CONVERSION ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert job to sale" },
      { status: 500 }
    );
  }
}