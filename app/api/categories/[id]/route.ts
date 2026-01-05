import { NextRequest, NextResponse } from 'next/server';
import Category from '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';

// PUT /api/categories/[id]
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
    
    const category = await Category.findOne({
      _id: params.id,
      outletId: user.outletId,
    });
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    // Update fields
    if (body.name) {
      category.name = body.name;
      // Regenerate code from new name
      category.code = body.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    }
    
    if (body.description !== undefined) {
      category.description = body.description;
    }
    
    await category.save();
    
    // Log activity
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'products',
      description: `Updated category: ${category.name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
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
    
    const category = await Category.findOne({
      _id: params.id,
      outletId: user.outletId,
    });
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    // Check if category has products
    const productCount = await Product.countDocuments({
      category: params.id,
      outletId: user.outletId,
    });
    
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. It has ${productCount} products assigned to it.` },
        { status: 400 }
      );
    }
    
    await category.deleteOne();
    
    // Log activity
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'products',
      description: `Deleted category: ${category.name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}