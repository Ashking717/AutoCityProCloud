import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Product from "@/lib/models/ProductEnhanced";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ suggestions: [] });
    }

    const user = verifyToken(token);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    // 🔥 CHANGE STARTS HERE
    const words = q.trim().split(/\s+/);

    const suggestions = await Product.find(
      {
        outletId: user.outletId,
        isActive: true,
        $and: words.map((word) => ({
          name: { $regex: word, $options: "i" }, // CONTAINS, not startsWith
        })),
      },
      { name: 1 }
    )
      .limit(15)
      .sort({ name: 1 })
      .lean();
    // 🔥 CHANGE ENDS HERE

    return NextResponse.json({
      suggestions: suggestions.map((p) => p.name),
    });
  } catch (err) {
    console.error("Suggestions error:", err);
    return NextResponse.json({ suggestions: [] });
  }
}
