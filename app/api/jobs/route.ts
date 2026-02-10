// app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Job from "@/lib/models/Job";
import Customer from "@/lib/models/Customer";
import Product from "@/lib/models/ProductEnhanced";
import User from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";

import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

// ===================================================================
// GET /api/jobs - LIST JOBS
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

    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const assignedTo = searchParams.get("assignedTo");
    const priority = searchParams.get("priority");
    const convertedToSale = searchParams.get("convertedToSale");

    // Build query
    const query: any = { outletId: user.outletId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (customerId) {
      query.customerId = new mongoose.Types.ObjectId(customerId);
    }

    if (assignedTo && assignedTo !== "all") {
      query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (priority && priority !== "all") {
      query.priority = priority;
    }

    if (convertedToSale === "false") {
      query.convertedToSale = false;
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Fetch jobs with pagination
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate("customerId", "name phone vehicleRegistrationNumber vehicleMake vehicleModel")
        .populate("assignedTo", "firstName lastName")
        .populate("createdBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===================================================================
// POST /api/jobs - CREATE NEW JOB
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
      vehicleInfo,
      title,
      description,
      items,
      priority,
      status,
      assignedTo,
      estimatedStartDate,
      estimatedCompletionDate,
      internalNotes,
      customerNotes,
    } = body;

    // Validation
    if (!customerId || !customerName || !title || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user info
    const userDoc = await User.findById(userId).lean();
    const createdByName = userDoc 
      ? `${userDoc.firstName} ${userDoc.lastName}` 
      : user.email;

    // Get assigned user info if provided
    let assignedToName;
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo).lean();
      assignedToName = assignedUser
        ? `${assignedUser.firstName} ${assignedUser.lastName}`
        : undefined;
    }

    // Process items
    const jobItems = [];
    for (const item of items) {
      const isLabor = item.isLabor === true;
      let product: any = null;

      if (!isLabor && item.productId) {
        product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
      }

      jobItems.push({
        productId: isLabor ? undefined : item.productId,
        productName: item.name || product?.name || "Labor",
        sku: item.sku || product?.sku || "LABOR",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || product?.unit || "pcs",
        estimatedPrice: Number(item.estimatedPrice || item.price) || 0,
        actualPrice: item.actualPrice ? Number(item.actualPrice) : undefined,
        discount: Number(item.discount) || 0,
        discountType: item.discountType || "percentage",
        taxRate: Number(item.taxRate) || 0,
        isLabor,
        notes: item.notes || undefined,
      });
    }

    // Generate job number with retry logic
    let job: any = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (!job && attempts < MAX_ATTEMPTS) {
      attempts++;

      const jobNumber = await Job.generateJobNumber(outletId);

      try {
        const jobDocs = await Job.create([
          {
            outletId,
            jobNumber,
            customerId,
            customerName,
            vehicleRegistrationNumber: vehicleInfo?.registrationNumber,
            vehicleMake: vehicleInfo?.make,
            vehicleModel: vehicleInfo?.model,
            vehicleYear: vehicleInfo?.year,
            vehicleColor: vehicleInfo?.color,
            vehicleVIN: vehicleInfo?.vin,
            vehicleMileage: vehicleInfo?.mileage,
            title,
            description,
            items: jobItems,
            priority: priority || "MEDIUM",
            status: status || "DRAFT",
            assignedTo: assignedTo || undefined,
            assignedToName,
            createdBy: userId,
            createdByName,
            estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : undefined,
            estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate) : undefined,
            internalNotes,
            customerNotes,
          },
        ]);

        job = jobDocs[0];
      } catch (err: any) {
        if (err.code === 11000) {
          console.warn("Job number collision, retrying...");
          continue;
        }
        throw err;
      }
    }

    if (!job) {
      throw new Error("Failed to generate unique job number");
    }

    // Activity log
    await ActivityLog.create({
      userId,
      username: userDoc?.username || user.email,
      actionType: "create",
      module: "jobs",
      description: `Created job ${job.jobNumber} - ${title}`,
      outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error: any) {
    console.error("JOB CREATION ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create job" },
      { status: 500 }
    );
  }
}