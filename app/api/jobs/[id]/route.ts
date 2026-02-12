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
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);

    const job = await Job.findOne({ _id: params.id, outletId: user.outletId })
      .populate("customerId", "name phone email vehicleRegistrationNumber vehicleMake vehicleModel")
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy",  "firstName lastName email")
      .lean();

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    return NextResponse.json({ job });
  } catch (error: any) {
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
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user   = verifyToken(token);
    const userId = new mongoose.Types.ObjectId(user.userId);

    const job = await Job.findOne({ _id: params.id, outletId: user.outletId });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const body = await request.json();

    // ── Quick conversion (from sales page) ──────────────────────────
    if (body.convertedToSale === true) {
      job.convertedToSale      = true;
      job.status               = "COMPLETED" as any;
      job.actualCompletionDate = new Date();
      if (body.saleId) job.saleId = body.saleId;
      await job.save();

      const userDoc = await User.findById(userId).lean();
      await ActivityLog.create({
        userId, username: userDoc?.username || user.email,
        actionType: "update", module: "jobs",
        description: `Converted job ${job.jobNumber} to sale`,
        outletId: user.outletId, timestamp: new Date(),
      });

      return NextResponse.json({ job });
    }

    // ── Block editing converted jobs ─────────────────────────────────
    if (job.convertedToSale)
      return NextResponse.json({ error: "Job already converted to sale" }, { status: 400 });

    // ── Normal update ────────────────────────────────────────────────
    const {
      title, description, items,
      priority, status, assignedTo,
      internalNotes, customerNotes,
      voiceNotes, // array of { url, recordedByName, recordedAt }
    } = body;

    if (title       !== undefined) job.title       = title;
    if (description !== undefined) job.description = description;
    if (priority    !== undefined) job.priority    = priority;
    if (internalNotes !== undefined) job.internalNotes = internalNotes;
    if (customerNotes !== undefined) job.customerNotes = customerNotes;

    // Voice notes — replace the whole array; validate each entry first
    if (Array.isArray(voiceNotes)) {
      job.voiceNotes = voiceNotes
        .filter((v: any) => v?.url && v?.recordedByName)
        .map((v: any) => ({
          url:            v.url,
          recordedByName: v.recordedByName,
          recordedAt:     v.recordedAt ? new Date(v.recordedAt) : new Date(),
        }));
    }

    // Items
    if (Array.isArray(items)) {
      job.items = items.map((item: any) => ({
        productId:      item.productId || undefined,
        productName:    item.productName || item.name || "Item",
        sku:            item.sku,
        quantity:       Number(item.quantity) || 1,
        unit:           item.unit || "pcs",
        estimatedPrice: Number(item.estimatedPrice || item.unitPrice) || 0,
        actualPrice:    item.actualPrice ? Number(item.actualPrice) : undefined,
        discount:       Number(item.discount) || 0,
        discountType:   item.discountType || "percentage",
        taxRate:        Number(item.taxRate) || 0,
        isLabor:        item.isLabor || false,
        notes:          item.notes || undefined,
      }));
    }

    // Assignment
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const u = await User.findById(assignedTo).lean();
        job.assignedTo     = assignedTo;
        job.assignedToName = u ? `${u.firstName} ${u.lastName}` : undefined;
      } else {
        job.assignedTo     = undefined;
        job.assignedToName = undefined;
      }
    }

    // Status
    if (status !== undefined && status !== job.status) {
      job.status = status;
      if (status === "IN_PROGRESS" && !job.actualStartDate)      job.actualStartDate      = new Date();
      if (status === "COMPLETED"   && !job.actualCompletionDate) job.actualCompletionDate = new Date();
    }

    await job.save();

    const userDoc = await User.findById(userId).lean();
    await ActivityLog.create({
      userId, username: userDoc?.username || user.email,
      actionType: "update", module: "jobs",
      description: `Updated job ${job.jobNumber}`,
      outletId: user.outletId, timestamp: new Date(),
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
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = verifyToken(token);
    const job  = await Job.findOne({ _id: params.id, outletId: user.outletId });

    if (!job)                return NextResponse.json({ error: "Job not found" },          { status: 404 });
    if (job.convertedToSale) return NextResponse.json({ error: "Cannot delete converted job" }, { status: 400 });

    job.status = "CANCELLED" as any;
    await job.save();

    return NextResponse.json({ message: "Job cancelled" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}