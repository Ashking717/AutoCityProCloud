import { connectDB } from "@/lib/db/mongodb";
import { Product, Sale } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    // Aggregate most sold products
    const topProducts = await Sale.aggregate([
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

    const productIds = topProducts.map(p => p._id);

    const products = await Product.find({ _id: { $in: productIds } })
      .select("name sku sellingPrice currentStock isVehicle carMake carModel taxRate vin")
      .lean();

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Frequent products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch frequent products" },
      { status: 500 }
    );
  }
}
