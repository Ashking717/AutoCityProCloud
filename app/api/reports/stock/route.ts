import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';
import Category from '@/lib/models/Category';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    const products = await Product.find({ 
      outletId: user.outletId,
      isActive: true 
    })
      .populate('category', 'name')
      .lean();
    
    let totalStockValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let overStockItems = 0;
    
    products.forEach((p: any) => {
      const stockValue = (p.currentStock || 0) * (p.costPrice || 0);
      totalStockValue += stockValue;
      
      if ((p.currentStock || 0) <= 0) {
        outOfStockItems++;
      } else if ((p.currentStock || 0) <= (p.minStock || 0)) {
        lowStockItems++;
      }
      
      if (p.maxStock && (p.currentStock || 0) > p.maxStock) {
        overStockItems++;
      }
    });
    
    const totalProducts = products.length;
    
    const stockByCategory: { [key: string]: { count: number; value: number; quantity: number } } = {};
    
    products.forEach((product: any) => {
      const categoryName = product.category?.name || 'Uncategorized';
      
      if (!stockByCategory[categoryName]) {
        stockByCategory[categoryName] = { count: 0, value: 0, quantity: 0 };
      }
      stockByCategory[categoryName].count += 1;
      stockByCategory[categoryName].value += (product.currentStock || 0) * (product.costPrice || 0);
      stockByCategory[categoryName].quantity += (product.currentStock || 0);
    });
    
    const deadStock = products.filter((p: any) => 
      p.maxStock && (p.currentStock || 0) > 0 && (p.currentStock || 0) >= p.maxStock
    );
    
    return NextResponse.json({
      summary: {
        totalStockValue,
        totalProducts,
        lowStockItems,
        outOfStockItems,
        overStockItems,
        deadStockItems: deadStock.length,
      },
      products,
      stockByCategory,
      deadStock,
    });
  } catch (error: any) {
    console.error('Error generating stock report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
