// app/api/purchases/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";

import Purchase from "@/lib/models/Purchase";
import Expense from "@/lib/models/Expense";
import Category from "@/lib/models/Category";
import Supplier from "@/lib/models/Supplier";

/**
 * GET /api/purchases/stats
 * Returns dashboard statistics for purchases, expenses, categories, and suppliers
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all queries in parallel for better performance
    const [
      totalPurchases,
      totalExpensesResult,
      pendingBills,
      todayPurchases,
      totalCategories,
      totalSuppliers,
      activeSuppliers,
    ] = await Promise.all([
      // Total number of purchases
      Purchase.countDocuments({ outletId }),

      // Total expenses amount
      Expense.aggregate([
        { $match: { outletId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Number of pending bills (purchases with balance due > 0)
      Purchase.countDocuments({
        outletId,
        balanceDue: { $gt: 0 },
      }),

      // Purchases made today
      Purchase.countDocuments({
        outletId,
        purchaseDate: {
          $gte: today,
          $lt: tomorrow,
        },
      }),

      // Total categories
      Category.countDocuments({ outletId }),

      // Total suppliers
      Supplier.countDocuments({ outletId }),

      // Active suppliers
      Supplier.countDocuments({ outletId, isActive: true }),
    ]);

    const totalExpenses = totalExpensesResult[0]?.total || 0;

    const stats = {
      totalPurchases,
      totalExpenses,
      pendingBills,
      todayPurchases,
      totalCategories,
      totalSuppliers,
      activeSuppliers,
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("Error fetching purchase stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}