// app/api/suppliers/top/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

import Supplier from "@/lib/models/Supplier";
import Purchase from "@/lib/models/Purchase";

/**
 * GET /api/suppliers/top
 * Get top suppliers by total purchase volume
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    const outletId = new mongoose.Types.ObjectId(user.outletId || "");

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    // Aggregate purchases by supplier
    const topSupplierData = await Purchase.aggregate([
      { $match: { outletId } },
      {
        $group: {
          _id: "$supplierId",
          totalPurchases: { $sum: "$grandTotal" },
          pendingAmount: { $sum: "$balanceDue" },
          purchaseCount: { $count: {} },
        },
      },
      { $sort: { totalPurchases: -1 } },
      { $limit: limit },
    ]);

    // Get supplier details and format response
    const suppliers = await Promise.all(
      topSupplierData.map(async (data) => {
        const supplier = await Supplier.findById(data._id).lean() as {
          _id: mongoose.Types.ObjectId;
          name: string;
          code: string;
          phone: string;
          email: string;
        } | null;

        if (!supplier) {
          return null;
        }

        // Calculate a simple rating based on purchase count and payment history
        // More purchases and lower pending balance = higher rating
        const paymentRatio = data.pendingAmount / (data.totalPurchases || 1);
        let rating = 5.0;
        
        if (paymentRatio > 0.5) rating = 3.5;
        else if (paymentRatio > 0.3) rating = 4.0;
        else if (paymentRatio > 0.1) rating = 4.5;
        
        // Boost rating for suppliers with many purchases
        if (data.purchaseCount > 50) rating = Math.min(5.0, rating + 0.3);
        else if (data.purchaseCount > 20) rating = Math.min(5.0, rating + 0.2);

        return {
          id: supplier._id,
          name: supplier.name,
          code: supplier.code,
          phone: supplier.phone,
          email: supplier.email,
          totalPurchases: data.totalPurchases,
          pendingAmount: data.pendingAmount,
          purchaseCount: data.purchaseCount,
          rating: rating.toFixed(1),
        };
      })
    );

    // Filter out null values (in case some suppliers were deleted)
    const validSuppliers = suppliers.filter((s) => s !== null);

    return NextResponse.json({ suppliers: validSuppliers });
  } catch (error: any) {
    console.error("Error fetching top suppliers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch top suppliers" },
      { status: 500 }
    );
  }
}