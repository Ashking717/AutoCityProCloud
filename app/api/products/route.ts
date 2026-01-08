import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';
import { postInventoryAdjustmentToLedger } from '@/lib/services/accountingService';
import mongoose from 'mongoose';

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
    
    // Add filters for vehicle-specific fields
    const carMake = searchParams.get('carMake');
    if (carMake) {
      query.carMake = carMake;
    }
    
    const color = searchParams.get('color');
    if (color) {
      query.color = color;
    }
    
    const variant = searchParams.get('variant');
    if (variant) {
      query.variant = variant;
    }
    
    const year = searchParams.get('year');
    if (year) {
      query.year = parseInt(year);
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
    const userId = new mongoose.Types.ObjectId(user.userId);
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
      variant,
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
    
    const stockQty = Number(currentStock) || 0;
    const cost = Number(costPrice);
    
    // Validate vehicle-specific fields if it's a vehicle
    if (isVehicle) {
      if (!carMake) {
        return NextResponse.json(
          { error: 'Car make is required for vehicle products' },
          { status: 400 }
        );
      }
    }
    
    // Create product
    const product = await Product.create({
      name,
      description,
      category: categoryId,
      sku,
      barcode,
      partNumber,
      isVehicle: isVehicle || false,
      carMake: isVehicle ? carMake : undefined,
      carModel: isVehicle ? carModel : undefined,
      variant: isVehicle ? variant : undefined,
      year: isVehicle && year ? parseInt(year) : undefined,
      color: isVehicle ? color : undefined,
      vin: isVehicle ? vin : undefined,
      costPrice: cost,
      sellingPrice: Number(sellingPrice),
      taxRate: Number(taxRate) || 0,
      currentStock: stockQty,
      minStock: Number(minStock) || 0,
      maxStock: Number(maxStock) || 1000,
      unit: unit || 'pcs',
      outletId: user.outletId,
    });
    
    console.log(`✓ Product created: ${name} (SKU: ${sku})`);
    if (isVehicle) {
      console.log(`   Type: Vehicle`);
      console.log(`   Make: ${carMake}${carModel ? ` ${carModel}` : ''}${variant ? ` ${variant}` : ''}`);
      if (color) console.log(`   Color: ${color}`);
      if (year) console.log(`   Year: ${year}`);
    }
    
    // ═══════════════════════════════════════════════════════════
    // ACCOUNTING: Post initial inventory value to ledger
    // 
    // When product is created with opening stock, we need to:
    // DR: Inventory (Asset) - Increase inventory value
    // CR: Owner's Equity/Capital - Source of the inventory
    // ═══════════════════════════════════════════════════════════
    
    let voucherId = null;
    
    if (stockQty > 0 && cost > 0) {
      try {
        const inventoryValue = stockQty * cost;
        
        console.log('\n📦 Posting Opening Stock to Ledger:');
        console.log(`   Product: ${name}`);
        console.log(`   Quantity: ${stockQty} ${unit || 'pcs'}`);
        console.log(`   Cost Price: QAR ${cost.toFixed(2)}`);
        console.log(`   Total Value: QAR ${inventoryValue.toFixed(2)}`);
        
        const inventoryAdjustment = {
          _id: product._id,
          productId: product._id,
          productName: name,
          sku,
          adjustmentType: 'OPENING_STOCK',
          quantity: stockQty,
          costPrice: cost,
          totalValue: inventoryValue,
          date: new Date(),
          reason: `Opening stock for new product: ${name}`,
          outletId: user.outletId,
        };
        
        const result = await postInventoryAdjustmentToLedger(
          inventoryAdjustment,
          userId
        );
        
        voucherId = result.voucherId;
        
        console.log(`✓ Inventory value posted: QAR ${inventoryValue.toFixed(2)}`);
        console.log(`✓ Journal Entry: ${result.voucherNumber}`);
        console.log(`   DR Inventory (Asset): ${inventoryValue.toFixed(2)}`);
        console.log(`   CR Owner's Equity: ${inventoryValue.toFixed(2)}`);
        
      } catch (ledgerError: any) {
        console.error('⚠️ Failed to post inventory to ledger:', ledgerError.message);
        // Don't fail the whole operation, but log the error
        // The product is still created, just without the accounting entry
        // You might want to flag this for manual reconciliation
      }
    } else if (stockQty > 0) {
      console.warn(`⚠️ Product has opening stock (${stockQty}) but no cost price set. Skipping ledger entry.`);
    }
    
    // Activity log
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'products',
      description: `Created product: ${name} (${sku})${
        isVehicle ? ` [Vehicle: ${carMake}${carModel ? ` ${carModel}` : ''}${variant ? ` ${variant}` : ''}${color ? `, ${color}` : ''}${year ? `, ${year}` : ''}]` : ''
      }${
        stockQty > 0 ? ` with opening stock: ${stockQty} ${unit || 'pcs'} @ QAR ${cost.toFixed(2)} = QAR ${(stockQty * cost).toFixed(2)}` : ''
      }`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ 
      product,
      voucherId,
      inventoryPosted: stockQty > 0 && cost > 0,
      message: 'Product created successfully',
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}