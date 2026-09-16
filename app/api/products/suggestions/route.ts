import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Product from "@/lib/models/ProductEnhanced";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ suggestions: [] });
    }

    const user = verifyToken(token);
    const outletIdObj =
      typeof user.outletId === "string"
        ? new mongoose.Types.ObjectId(user.outletId)
        : user.outletId;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    // 🔥 CHANGE STARTS HERE
    const words = q
      .trim()
      .split(/\s+/)
      .map((word) => escapeRegex(word))
      .filter(Boolean);

    const suggestions = await Product.aggregate([
      {
        $match: {
          outletId: outletIdObj,
          isActive: true,
          $and: words.map((word) => ({
            name: { $regex: word, $options: "i" },
          })),
        },
      },
      {
        $project: {
          name: { $trim: { input: "$name" } },
        },
      },
      {
        $match: {
          name: { $ne: "" },
        },
      },
      {
        $group: {
          _id: { $toLower: "$name" },
          name: { $first: "$name" },
        },
      },
      {
        $sort: { name: 1 },
      },
      {
        $limit: 15,
      },
    ]);

    return NextResponse.json({
      suggestions: suggestions.map((p) => p.name),
    });
  } catch (err) {
    console.error("Suggestions error:", err);
    return NextResponse.json({ suggestions: [] });
  }
}
