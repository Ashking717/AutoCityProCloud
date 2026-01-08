import { connectDB } from "@/lib/db/mongodb";
import { Product, Sale } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

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

    if (!user.outletId) {
      return NextResponse.json(
        { error: "Invalid token: outletId missing" },
        { status: 401 }
      );
    }

    // ───────────────── AGGREGATE BY OUTLET ─────────────────
    // Aggregate most sold products for this outlet only
    const topProducts = await Sale.aggregate([
      // ✅ Filter by outlet first
      { $match: { outletId: user.outletId } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
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
      outletId: user.outletId 
    })
      .select("name sku sellingPrice currentStock isVehicle carMake carModel taxRate vin")
      .lean();

    // ✅ Sort products by the order of topProducts (most sold first)
    const sortedProducts = productIds
      .map(id => products.find((p:any) => p._id.toString() === id.toString()))
      .filter(Boolean);

    return NextResponse.json({ products: sortedProducts });
  } catch (error) {
    console.error("Frequent products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch frequent products" },
      { status: 500 }
    );
  }
}