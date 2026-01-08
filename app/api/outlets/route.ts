import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Outlet from "@/lib/models/Outlet";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { UserRole } from "@/lib/types/roles";
import { seedSystemAccounts } from "@/lib/accounting/seedSystemAccounts";

// GET /api/outlets - List outlets
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    await connectDB();

    let query: any = { isActive: true };

    // Non-superadmin users can only see their outlet
    if (user.role !== UserRole.SUPERADMIN) {
      if (!user.outletId) {
        return NextResponse.json(
          { error: "User has no assigned outlet" },
          { status: 403 }
        );
      }
      query._id = user.outletId;
    }

    const outlets = await Outlet.find(query).sort({ name: 1 });

    return NextResponse.json({ outlets });
  } catch (error: any) {
    console.error("Get outlets error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

// POST /api/outlets - Create outlet (SUPERADMIN only)
export async function POST(request: Request) {
  try {
    await requireRole([UserRole.SUPERADMIN]);
    const body = await request.json();

    const { name, code, address, contact, taxInfo, settings } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if code already exists
    const existingOutlet = await Outlet.findOne({
      code: code.toUpperCase(),
    });

    if (existingOutlet) {
      return NextResponse.json(
        { error: "Outlet code already exists" },
        { status: 409 }
      );
    }

    const outlet = await Outlet.create({
      name,
      code: code.toUpperCase(),
      address: address || {},
      contact: contact || {},
      taxInfo: taxInfo || {},
      settings: settings || {},
      isActive: true,
    });

    // ✅ AUTO-SEED SYSTEM ACCOUNTS (SAFE ON VERCEL)
    await seedSystemAccounts(outlet._id.toString());

    return NextResponse.json({ outlet }, { status: 201 });
  } catch (error: any) {
    console.error("Create outlet error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
