// app/api/purchases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { cookies } from "next/headers";

import Purchase from "@/lib/models/Purchase";
import { verifyToken } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db/mongodb";
import { hasPermission } from "@/lib/types/roles";
import { correctPurchase } from '@/lib/services/purchaseCorrectionService';
import '@/lib/models/Supplier';
import '@/lib/models/User';
import Product from '@/lib/models/ProductEnhanced';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId) || !mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid purchase or outlet' }, { status: 400 });
    const body = await request.json();
    const key = String(request.headers.get('idempotency-key') || body.idempotencyKey || '').trim();
    if (!key || key.length > 160) return NextResponse.json({ error: 'A valid idempotencyKey is required' }, { status: 400 });
    await connectDB();
    return NextResponse.json(await correctPurchase(params.id, new mongoose.Types.ObjectId(user.outletId), new mongoose.Types.ObjectId(user.userId), body, key));
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Purchase correction failed' }, { status: 400 }); }
}

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

    const products = await Product.find({ outletId, _id: { $in: purchase.items.map(item => item.productId) } }).select('carMake carModel variant yearFrom yearTo').lean();
    const byId = new Map(products.map(product => [String(product._id), product]));
    const items = purchase.items.map(item => {
      const product: any = byId.get(String(item.productId));
      return { ...item, vehicle: item.vehicle || [product?.carMake, product?.carModel, product?.variant, product?.yearFrom, product?.yearTo].filter(Boolean).join(' ') };
    });
    return NextResponse.json({ purchase: { ...purchase, items } });
  } catch (error: any) {
    console.error("Error fetching purchase:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase" },
      { status: 500 }
    );
  }
}
