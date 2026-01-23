// app/api/inventory-movements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import InventoryMovement from "@/lib/models/InventoryMovement";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

// GET /api/inventory-movements ✅ LIST
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const sku = searchParams.get('sku');
    const movementType = searchParams.get('movementType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Build query
    const query: any = {
      outletId: user.outletId,
    };
    
    if (productId) query.productId = productId;
    if (sku) query.sku = sku;
    if (movementType) query.movementType = movementType;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Fetch movements
    const movements = await InventoryMovement.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .populate('productId', 'name sku')
      .populate('createdBy', 'name email')
      .lean();
    
    // Get summary statistics
    const stats = await InventoryMovement.aggregate([
      { $match: { outletId: user.outletId } },
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
        }
      }
    ]);
    
    return NextResponse.json({ 
      movements,
      stats,
      total: movements.length 
    });
    
  } catch (error: any) {
    console.error("Error fetching inventory movements:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory movements" },
      { status: 500 }
    );
  }
}

// POST /api/inventory-movements ✅ CREATE
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    
    const {
      productId,
      productName,
      sku,
      movementType,
      quantity,
      unitCost,
      referenceType,
      referenceId,
      referenceNumber,
      voucherId,
      notes,
    } = body;
    
    // Validation
    if (!productId || !productName || !sku || !movementType || !quantity || !referenceType || !referenceId || !referenceNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get current balance
    const lastMovement = await InventoryMovement.findOne({
      outletId: user.outletId,
      productId,
    }).sort({ date: -1, createdAt: -1 });
    
    const balanceBefore = lastMovement?.balanceAfter || 0;
    const balanceAfter = balanceBefore + quantity;
    
    // Create movement
    const movement = await InventoryMovement.create({
      productId,
      productName,
      sku,
      movementType,
      quantity,
      unitCost: unitCost || 0,
      totalValue: quantity * (unitCost || 0),
      referenceType,
      referenceId,
      referenceNumber,
      voucherId,
      ledgerEntriesCreated: !!voucherId,
      balanceAfter,
      date: new Date(),
      notes,
      outletId: user.outletId,
      createdBy: user.userId,
    });
    
    return NextResponse.json({ movement }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating inventory movement:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}