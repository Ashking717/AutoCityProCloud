import { NextRequest, NextResponse } from 'next/server';
import Category from '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const categories = await Category.find({ outletId: user.outletId })
      .sort({ name: 1 })
      .lean();
    
    // Get product count for each category - Fixed TypeScript issue
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          category: cat._id,
          outletId: user.outletId,
        });
        return {
          _id: cat._id,
          name: cat.name,
          code: cat.code,
          description: cat.description,
          outletId: cat.outletId,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt,
          productCount,
        };
      })
    );
    
    return NextResponse.json({ categories: categoriesWithCount });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    
    const { name, description } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    // Generate code from name (uppercase, replace spaces with underscores)
    const code = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    
    // Check if category already exists
    const existing = await Category.findOne({
      code,
      outletId: user.outletId,
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      );
    }
    
    const category = await Category.create({
      name,
      code,
      description,
      outletId: user.outletId,
    });
    
    // Log activity
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'products',
      description: `Created category: ${name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
