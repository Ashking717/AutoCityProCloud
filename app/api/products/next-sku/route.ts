import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';
import mongoose from 'mongoose';

/**
 * GET /api/products/next-sku
 * 
 * Generates the next available SKU for the current outlet.
 * This is essential for systems with 5000+ products where loading
 * all products to calculate next SKU would be inefficient.
 * 
 * Place this file at: app/api/products/next-sku/route.ts
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    // Ensure outletId is properly typed as ObjectId
    const outletIdObj = typeof user.outletId === 'string' 
      ? new mongoose.Types.ObjectId(user.outletId)
      : user.outletId;
    
    console.log('🔍 Generating next SKU for outlet:', outletIdObj ? outletIdObj.toString() : 'null');
    
    // Find all numeric SKUs for this outlet and get the maximum
    const allNumericProducts = await Product.find({
      outletId: outletIdObj,
      sku: { $regex: /^\d+$/ } // Only numeric SKUs
    })
      .select('sku')
      .lean();
    
    let nextSKU = '10001'; // Default starting SKU
    
    if (allNumericProducts.length > 0) {
      const numericSKUs = allNumericProducts
        .map(p => parseInt(p.sku, 10))
        .filter(sku => !isNaN(sku));
      
      if (numericSKUs.length > 0) {
        const maxSKU = Math.max(...numericSKUs);
        nextSKU = Math.max(maxSKU + 1, 10001).toString();
      }
    }
    
    console.log('✅ Generated next SKU:', nextSKU);
    
    return NextResponse.json({ 
      nextSKU,
      message: 'Next SKU generated successfully'
    });
  } catch (error: any) {
    console.error('❌ Error generating next SKU:', error);
    return NextResponse.json({ 
      error: error.message,
      nextSKU: '10001' // Fallback
    }, { status: 500 });
  }
}