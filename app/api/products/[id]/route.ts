import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';
import Category from '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { handleStockEdit, handleStockEditWithDifferenceOnly } from '@/lib/services/StockAdjustmentHandler';
import mongoose  from 'mongoose';

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
      description: `Deleted product: ${product.name} (${product.sku})`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
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
    
    // Get existing product first to compare stock changes
    const existingProduct = await Product.findById(params.id);
    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
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
    if (body.color !== undefined) updateData.color = body.color;
    
    // Vehicle fields
    if (body.make !== undefined) {
      updateData.make = body.make;
      updateData.isVehicle = !!body.make;
    }
    
    if (body.carMake !== undefined) {
      updateData.carMake = body.carMake;
      updateData.isVehicle = !!body.carMake;
    }
    
    if (body.isVehicle !== undefined) {
      updateData.isVehicle = body.isVehicle;
    }
    
    if (body.carModel !== undefined) updateData.carModel = body.carModel;
    
    // Handle year range
    if (body.yearFrom !== undefined) {
      updateData.yearFrom = body.yearFrom ? parseInt(body.yearFrom) : undefined;
    }
    if (body.yearTo !== undefined) {
      updateData.yearTo = body.yearTo ? parseInt(body.yearTo) : undefined;
    }
    
    // If isVehicle is false, clear vehicle-specific fields
    if (body.isVehicle === false || (!body.carMake && !body.make && body.isVehicle !== undefined)) {
      updateData.carMake = undefined;
      updateData.carModel = undefined;
      updateData.variant = undefined;
      updateData.yearFrom = undefined;
      updateData.yearTo = undefined;
      updateData.color = undefined;
      updateData.vin = undefined;
      updateData.isVehicle = false;
    }
    
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
    
    // 🔥 CRITICAL: Track stock changes BEFORE updating
    let stockChanged = false;
    let oldStock = existingProduct.currentStock || 0;
    let newStock = oldStock;
    
    // Stock fields (nested or flat)
    if (body.stock) {
      if (body.stock.currentStock !== undefined) {
        newStock = body.stock.currentStock;
        updateData.currentStock = newStock;
        stockChanged = newStock !== oldStock;
      }
      if (body.stock.minStock !== undefined) updateData.minStock = body.stock.minStock;
      if (body.stock.maxStock !== undefined) updateData.maxStock = body.stock.maxStock;
    } else {
      if (body.currentStock !== undefined) {
        newStock = body.currentStock;
        updateData.currentStock = newStock;
        stockChanged = newStock !== oldStock;
      }
      if (body.minStock !== undefined) updateData.minStock = body.minStock;
      if (body.maxStock !== undefined) updateData.maxStock = body.maxStock;
    }
    
    // Validate required fields
    if (!updateData.name || !updateData.sku || updateData.costPrice === undefined || updateData.sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sku, costPrice, sellingPrice' },
        { status: 400 }
      );
    }
    
    // Check if SKU already exists for another product
    const skuExists = await Product.findOne({
      sku: updateData.sku,
      outletId: user.outletId,
      _id: { $ne: params.id },
    });
    
    if (skuExists) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 400 }
      );
    }
    
    // Validate vehicle-specific fields if it's a vehicle
    if (updateData.isVehicle || body.isVehicle) {
      if (!updateData.carMake && !body.carMake) {
        return NextResponse.json(
          { error: 'Car make is required for vehicle products' },
          { status: 400 }
        );
      }
    }
    
    // Update the product
    const product = await Product.findOneAndUpdate(
      { _id: params.id, outletId: user.outletId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('category', 'name');
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // 🔥 HANDLE STOCK ADJUSTMENTS
    let stockAdjustmentResult = null;
    
    if (stockChanged) {
      console.log(`\n🔄 Stock change detected for ${product.name} (${product.sku})`);
      console.log(`   Old stock: ${oldStock} → New stock: ${newStock}`);
      
      try {
        // Choose one of the two methods:
        
        // METHOD 1: Reverse original entry and create new one (keeps clean history)
        stockAdjustmentResult = await handleStockEdit({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          oldStock,
          newStock,
          costPrice: product.costPrice,
          outletId: user.outletId || product.outletId,
          userId: new mongoose.Types.ObjectId(user.userId),
          reason: body.adjustmentReason || 'Stock correction via product edit',
        });
        
        // METHOD 2: Just create adjustment for the difference (simpler, shows all adjustments)
        // Uncomment this and comment out METHOD 1 if you prefer this approach
        /*
        stockAdjustmentResult = await handleStockEditWithDifferenceOnly({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          oldStock,
          newStock,
          costPrice: product.costPrice,
          outletId: user.outletId,
          userId: user.userId,
          reason: body.adjustmentReason || 'Stock correction via product edit',
        });
        */
        
        console.log('✅ Stock adjustment completed successfully');
      } catch (adjustmentError) {
        console.error('❌ Error handling stock adjustment:', adjustmentError);
        // Don't fail the entire update, just log the error
        return NextResponse.json({
          product,
          warning: 'Product updated but stock adjustment failed',
          error: adjustmentError instanceof Error ? adjustmentError.message : 'Unknown error',
        }, { status: 207 }); // 207 Multi-Status
      }
    }
    
    // Create activity log
    const yearRangeStr = product.yearFrom && product.yearTo ? `, ${product.yearFrom}-${product.yearTo}` : 
                        product.yearFrom ? `, ${product.yearFrom}+` : 
                        product.yearTo ? `, Up to ${product.yearTo}` : '';
    
    let logDescription = `Updated product: ${product.name} (${product.sku})`;
    
    if (product.isVehicle) {
      logDescription += ` [Vehicle: ${product.carMake || ''}${product.carModel ? ` ${product.carModel}` : ''}${product.variant ? ` ${product.variant}` : ''}${product.color ? `, ${product.color}` : ''}${yearRangeStr}]`;
    }
    
    if (stockChanged) {
      logDescription += ` | Stock: ${oldStock} → ${newStock} (${newStock - oldStock > 0 ? '+' : ''}${newStock - oldStock})`;
    }
    
    if (updateData.costPrice !== undefined) {
      logDescription += ` | Cost: QAR ${product.costPrice}`;
    }
    
    if (updateData.sellingPrice !== undefined) {
      logDescription += ` | Price: QAR ${product.sellingPrice}`;
    }
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'products',
      description: logDescription,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    // Console logging
    console.log(`\n✓ Product updated: ${product.name} (SKU: ${product.sku})`);
    if (product.isVehicle) {
      console.log(`   Type: Vehicle`);
      console.log(`   Make: ${product.carMake || ''}${product.carModel ? ` ${product.carModel}` : ''}${product.variant ? ` ${product.variant}` : ''}`);
      if (product.color) console.log(`   Color: ${product.color}`);
      if (product.yearFrom || product.yearTo) {
        const yearRange = product.yearFrom && product.yearTo ? `${product.yearFrom}-${product.yearTo}` : 
                         product.yearFrom ? `${product.yearFrom}+` : 
                         product.yearTo ? `Up to ${product.yearTo}` : '';
        console.log(`   Year Range: ${yearRange}`);
      }
    }
    
    if (stockChanged) {
      console.log(`   Stock adjusted: ${oldStock} → ${newStock}`);
    }
    
    return NextResponse.json({ 
      product,
      message: 'Product updated successfully',
      stockAdjustment: stockAdjustmentResult,
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}