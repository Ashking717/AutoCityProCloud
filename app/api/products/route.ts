import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Category from '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const { searchParams } = new URL(request.url);
    
    const query: any = {
      outletId: user.outletId,
      isActive: true,
    };
    
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      query.category = categoryId;
    }
    
    const isVehicle = searchParams.get('isVehicle');
    if (isVehicle !== null) {
      query.isVehicle = isVehicle === 'true';
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);
    
    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/products
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
    
    const {
      name,
      description,
      categoryId,
      sku,
      barcode,
      partNumber,
      isVehicle,
      carMake,
      carModel,
      year,
      color,
      vin,
      unit,
      costPrice,
      sellingPrice,
      taxRate,
      currentStock,
      minStock,
      maxStock,
    } = body;
    
    if (!name || !categoryId || !sku || costPrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, sku, costPrice, sellingPrice' },
        { status: 400 }
      );
    }
    
    // Check if SKU already exists
    const existingProduct = await Product.findOne({
      sku,
      outletId: user.outletId,
    });
    
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      );
    }
    
    const product = await Product.create({
      name,
      description,
      category: categoryId,
      sku,
      barcode,
      partNumber,
      isVehicle: isVehicle || false,
      carMake,
      carModel,
      year: year ? parseInt(year) : undefined,
      color,
      vin,
      costPrice,
      sellingPrice,
      taxRate: taxRate || 0,
      currentStock: currentStock || 0,
      minStock: minStock || 0,
      maxStock: maxStock || 1000,
      unit: unit || 'pcs',
      outletId: user.outletId,
    });
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'products',
      description: `Created product: ${name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
