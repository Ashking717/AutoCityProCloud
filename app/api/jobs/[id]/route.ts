// app/api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Job from "@/lib/models/Job";
import User from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";

import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

// ===================================================================
// GET /api/jobs/[id]
// ===================================================================
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

    const job = await Job.findOne({
      _id: params.id,
      outletId: user.outletId,
    })
      .populate(
        "customerId",
        "name phone email vehicleRegistrationNumber vehicleMake vehicleModel"
      )
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName email")
      .lean();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("Error fetching job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===================================================================
// PUT /api/jobs/[id]
// ===================================================================
export async function PUT(
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

    const job = await Job.findOne({
      _id: params.id,
      outletId: user.outletId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await request.json();

    // ================================================================
    // ✅ QUICK CONVERSION MODE (FROM SALES PAGE)
    // ================================================================
    if (body.convertedToSale === true) {
      job.convertedToSale = true;
      job.status = "COMPLETED" as any;
      job.actualCompletionDate = new Date();

      if (body.saleId) {
        job.saleId = body.saleId;
      }

      await job.save();

      const userDoc = await User.findById(userId).lean();
      await ActivityLog.create({
        userId,
        username: userDoc?.username || user.email,
        actionType: "update",
        module: "jobs",
        description: `Converted job ${job.jobNumber} to sale`,
        outletId: user.outletId,
        timestamp: new Date(),
      });

      return NextResponse.json({ job });
    }

    // ================================================================
    // ❌ BLOCK EDITING IF CONVERTED
    // ================================================================
    if (job.convertedToSale) {
      return NextResponse.json(
        { error: "Job already converted to sale" },
        { status: 400 }
      );
    }

    // ================================================================
    // NORMAL UPDATE MODE
    // ================================================================
    const {
      title,
      description,
      items,
      priority,
      status,
      assignedTo,
      vehicleInfo,
      internalNotes,
      customerNotes,
    } = body;

    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (priority !== undefined) job.priority = priority;
    if (internalNotes !== undefined) job.internalNotes = internalNotes;
    if (customerNotes !== undefined) job.customerNotes = customerNotes;

    // -------------------------
    // Items update
    // -------------------------
    if (Array.isArray(items)) {
      job.items = items.map((item: any) => ({
        productId: item.productId || undefined,
        productName: item.productName || item.name || "Item",
        sku: item.sku,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "pcs",
        estimatedPrice: Number(item.estimatedPrice || item.unitPrice) || 0,
        actualPrice: item.actualPrice
          ? Number(item.actualPrice)
          : undefined,
        discount: Number(item.discount) || 0,
        discountType: item.discountType || "percentage",
        taxRate: Number(item.taxRate) || 0,
        isLabor: item.isLabor || false,
      }));
    }

    // -------------------------
    // Assignment
    // -------------------------
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const u = await User.findById(assignedTo).lean();
        job.assignedTo = assignedTo;
        job.assignedToName = u
          ? `${u.firstName} ${u.lastName}`
          : undefined;
      } else {
        job.assignedTo = undefined;
        job.assignedToName = undefined;
      }
    }

    // -------------------------
    // Status handling
    // -------------------------
    const oldStatus = job.status;

    if (status !== undefined && status !== oldStatus) {
      job.status = status;

      if (status === "IN_PROGRESS" && !job.actualStartDate) {
        job.actualStartDate = new Date();
      }

      if (status === "COMPLETED" && !job.actualCompletionDate) {
        job.actualCompletionDate = new Date();
      }
    }

    await job.save();

    const userDoc = await User.findById(userId).lean();
    await ActivityLog.create({
      userId,
      username: userDoc?.username || user.email,
      actionType: "update",
      module: "jobs",
      description: `Updated job ${job.jobNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===================================================================
// DELETE /api/jobs/[id]
// ===================================================================
export async function DELETE(
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

    const job = await Job.findOne({
      _id: params.id,
      outletId: user.outletId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.convertedToSale) {
      return NextResponse.json(
        { error: "Cannot delete converted job" },
        { status: 400 }
      );
    }

    job.status = "CANCELLED" as any;
    await job.save();

    return NextResponse.json({ message: "Job cancelled" });
  } catch (error: any) {
    console.error("Error deleting job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
