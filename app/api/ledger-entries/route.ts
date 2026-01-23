// app/api/ledger-entries/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import LedgerEntry from "@/lib/models/LedgerEntry";
import { requireAuth } from "@/lib/auth/session";
import { UserRole } from "@/lib/types/roles";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const accountId = searchParams.get("accountId");
    const voucherType = searchParams.get("voucherType");
    const referenceType = searchParams.get("referenceType");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const search = searchParams.get("search");

    

    // Build query
    const query: any = {};

    // Outlet filter - handle both regular users and superadmins
    if (user.role !== UserRole.SUPERADMIN) {
      // Regular users: must use their outlet
      if (!user.outletId) {
        return NextResponse.json(
          { error: "Outlet ID is required" },
          { status: 400 }
        );
      }
      query.outletId = new mongoose.Types.ObjectId(user.outletId);
    } else {
      // Superadmin: optional outlet filter
      const outletId = searchParams.get("outletId");
      if (outletId) {
        query.outletId = new mongoose.Types.ObjectId(outletId);
      }
      // If no outletId specified for superadmin, show all entries
    }

    if (accountId) {
      query.accountId = new mongoose.Types.ObjectId(accountId);
    }

    if (voucherType && voucherType !== "all") {
      query.voucherType = voucherType;
    }

    if (referenceType && referenceType !== "all") {
      query.referenceType = referenceType;
    }

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        query.date.$gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    if (search) {
      query.$or = [
        { voucherNumber: { $regex: search, $options: "i" } },
        { accountName: { $regex: search, $options: "i" } },
        { accountNumber: { $regex: search, $options: "i" } },
        { narration: { $regex: search, $options: "i" } },
        { referenceNumber: { $regex: search, $options: "i" } },
      ];
    }


    // Count total documents
    const total = await LedgerEntry.countDocuments(query);

    // Fetch paginated entries
    const entries = await LedgerEntry.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("accountId", "accountName accountNumber accountType")
      .populate("createdBy", "name email")
      .lean();

    // Calculate statistics - build aggregation pipeline
    const aggregationPipeline: any[] = [];
    
    // Match stage with proper type conversions
    const matchStage: any = {};
    
    if (query.outletId) {
      matchStage.outletId = query.outletId;
    }
    
    if (query.accountId) {
      matchStage.accountId = query.accountId;
    }
    
    if (query.voucherType) {
      matchStage.voucherType = query.voucherType;
    }
    
    if (query.referenceType) {
      matchStage.referenceType = query.referenceType;
    }
    
    if (query.date) {
      matchStage.date = query.date;
    }
    
    if (query.$or) {
      matchStage.$or = query.$or;
    }
    
    aggregationPipeline.push({ $match: matchStage });
    
    aggregationPipeline.push({
      $group: {
        _id: null,
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
        entriesCount: { $sum: 1 },
      },
    });

    const stats = await LedgerEntry.aggregate(aggregationPipeline);


    const statistics = stats[0] || {
      totalDebit: 0,
      totalCredit: 0,
      entriesCount: 0,
    };

   

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      statistics: {
        totalDebit: statistics.totalDebit,
        totalCredit: statistics.totalCredit,
        entriesCount: statistics.entriesCount,
        difference: statistics.totalDebit - statistics.totalCredit,
      },
    });
  } catch (error: any) {
    console.error("Error fetching ledger entries:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ledger entries" },
      { status: 500 }
    );
  }
}