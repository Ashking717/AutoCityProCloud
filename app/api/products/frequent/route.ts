import { connectDB } from "@/lib/db/mongodb";
import { Product, Sale } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import {
  attachLocationDataToProducts,
} from "@/lib/services/locationStockService";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // ───────────────── AUTH ─────────────────
    const cookieStore = cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);

    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json(
        { error: "Invalid token: outletId missing" },
        { status: 401 }
      );
    }

    // ───────────────── AGGREGATE BY OUTLET ─────────────────
    // Aggregate most sold products for this outlet only
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const topProducts = await Sale.aggregate([
      // ✅ Filter by outlet first
      { $match: { outletId, status: { $in: ['COMPLETED', 'REFUNDED'] } } },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: null }, "items.isLabor": { $ne: true } } },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: { $subtract: ["$items.quantity", { $ifNull: ["$items.returnedQuantity", 0] }] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 6 },
    ]);

    const productIds = topProducts.map(p => p._id).filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // ✅ Fetch products and also filter by outlet for extra safety
    const products = await Product.find({ 
      _id: { $in: productIds },
      outletId
    })
      .select("name sku sellingPrice currentStock location isVehicle carMake carModel taxRate vin")
      .lean();

    // ✅ Sort products by the order of topProducts (most sold first)
    const sortedProducts = productIds
      .map(id => products.find((p:any) => p._id.toString() === id.toString()))
      .filter(Boolean);

    const productsWithLocations = await attachLocationDataToProducts(
      sortedProducts,
      outletId
    );

    return NextResponse.json({ products: productsWithLocations });
  } catch (error) {
    console.error("Frequent products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch frequent products" },
      { status: 500 }
    );
  }
}
