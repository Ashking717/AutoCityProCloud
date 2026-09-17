import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';
import { previewNextProductSku } from '@/lib/services/productSkuService';

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
    
    if (!outletIdObj || !mongoose.Types.ObjectId.isValid(String(outletIdObj))) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }

    const nextSKU = await previewNextProductSku(
      new mongoose.Types.ObjectId(String(outletIdObj))
    );
    
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
