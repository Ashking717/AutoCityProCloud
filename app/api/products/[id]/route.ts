import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';
import Category from '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const product = await Product.findOne({
      _id: params.id,
      outletId: user.outletId,
    }).populate('category', 'name');
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    
    // Handle both nested and flat structure
    const updateData: any = {};
    
    // Basic fields
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryId) updateData.category = body.categoryId;
    if (body.category && typeof body.category === 'string') updateData.category = body.category;
    if (body.sku) updateData.sku = body.sku;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.partNumber !== undefined) updateData.partNumber = body.partNumber;
    if (body.unit) updateData.unit = body.unit;
    if (body.variant !== undefined) updateData.variant = body.variant;
    
    // Vehicle fields
    if (body.make !== undefined) {
      updateData.make = body.make;
      updateData.isVehicle = !!body.make;
    }
    if (body.carModel !== undefined) updateData.carModel = body.carModel;
    if (body.year !== undefined) updateData.year = body.year ? parseInt(body.year) : undefined;
    
    // Pricing fields (nested or flat)
    if (body.pricing) {
      if (body.pricing.costPrice !== undefined) updateData.costPrice = body.pricing.costPrice;
      if (body.pricing.sellingPrice !== undefined) updateData.sellingPrice = body.pricing.sellingPrice;
      if (body.pricing.taxRate !== undefined) updateData.taxRate = body.pricing.taxRate;
    } else {
      if (body.costPrice !== undefined) updateData.costPrice = body.costPrice;
      if (body.sellingPrice !== undefined) updateData.sellingPrice = body.sellingPrice;
      if (body.taxRate !== undefined) updateData.taxRate = body.taxRate;
    }
    
    // Stock fields (nested or flat)
    if (body.stock) {
      if (body.stock.currentStock !== undefined) updateData.currentStock = body.stock.currentStock;
      if (body.stock.minStock !== undefined) updateData.minStock = body.stock.minStock;
      if (body.stock.maxStock !== undefined) updateData.maxStock = body.stock.maxStock;
    } else {
      if (body.currentStock !== undefined) updateData.currentStock = body.currentStock;
      if (body.minStock !== undefined) updateData.minStock = body.minStock;
      if (body.maxStock !== undefined) updateData.maxStock = body.maxStock;
    }
    
    const product = await Product.findOneAndUpdate(
      { _id: params.id, outletId: user.outletId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('category', 'name');
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'products',
      description: `Updated product: ${product.name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const product = await Product.findOneAndUpdate(
      { _id: params.id, outletId: user.outletId },
      { isActive: false },
      { new: true }
    );
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'products',
      description: `Deleted product: ${product.name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}