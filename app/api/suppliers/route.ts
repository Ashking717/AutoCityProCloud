// app/api/suppliers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Supplier from "@/lib/models/Supplier";
import ActivityLog from "@/lib/models/ActivityLog";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

// GET /api/suppliers  ✅ LIST
export async function GET() {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);

    const suppliers = await Supplier.find({
      outletId: user.outletId,
      isActive: { $ne: false },
    })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ suppliers });
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

// POST /api/suppliers ✅ CREATE
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const body = await request.json();

    const {
      code,
      name,
      contactPerson,
      phone,
      email,
      address,
      taxNumber,
      creditLimit,
      paymentTerms,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    const supplier = await Supplier.create({
      code,
      name,
      contactPerson,
      phone,
      email,
      address,
      taxNumber,
      creditLimit: creditLimit || 0,
      paymentTerms,
      outletId: user.outletId,
    });

    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: "create",
      module: "suppliers",
      description: `Created supplier: ${name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
