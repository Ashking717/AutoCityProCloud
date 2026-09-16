// app/api/purchases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Purchase from "@/lib/models/Purchase";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import { hasPermission } from "@/lib/types/roles";

/**
 * GET - Fetch a single purchase by ID
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
    if (!hasPermission(user.role, "canProcessPurchases") && !hasPermission(user.role, "canViewFinancials")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId) || !mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid outlet or purchase ID" }, { status: 400 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId || "");

    const purchase = await Purchase.findOne({
      _id: params.id,
      outletId,
    })
      .populate("supplierId", "name code phone email address")
      .populate("createdBy", "name email username")
      .lean();

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ purchase });
  } catch (error: any) {
    console.error("Error fetching purchase:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase" },
      { status: 500 }
    );
  }
}
