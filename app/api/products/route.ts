import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import '@/lib/models/Category';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';
import { postInventoryAdjustmentToLedger } from '@/lib/services/accountingService';
import mongoose from 'mongoose';
import InventoryMovement from '@/lib/models/InventoryMovement';
import type { SortOrder } from 'mongoose';


// ============================================================================
// GET /api/products - Fetch products with pagination, search, and filters
// ============================================================================
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
    
    const { searchParams } = new URL(request.url);
    
    const query: any = {
      outletId: outletIdObj,
      isActive: true,
    };
    
    // ─────────────────────────────────────────────────────────────
    // SEARCH FUNCTIONALITY - Server-side search for performance
    // ─────────────────────────────────────────────────────────────
    const searchTerm = searchParams.get('search');
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { sku: { $regex: searchTerm, $options: 'i' } },
        { barcode: { $regex: searchTerm, $options: 'i' } },
        { carMake: { $regex: searchTerm, $options: 'i' } },
        { carModel: { $regex: searchTerm, $options: 'i' } },
        { variant: { $regex: searchTerm, $options: 'i' } },
        { color: { $regex: searchTerm, $options: 'i' } },
        { partNumber: { $regex: searchTerm, $options: 'i' } },
      ];
    }
    
    // ─────────────────────────────────────────────────────────────
    // FILTERS
    // ─────────────────────────────────────────────────────────────
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      query.category = new mongoose.Types.ObjectId(categoryId);
    }
    
    const isVehicle = searchParams.get('isVehicle');
    if (isVehicle !== null && isVehicle !== 'all') {
      query.isVehicle = isVehicle === 'true';
    }
    
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
      const yearNum = parseInt(year);
      query.$and = [
        { $or: [{ yearFrom: { $lte: yearNum } }, { yearFrom: null }] },
        { $or: [{ yearTo: { $gte: yearNum } }, { yearTo: null }] }
      ];
    }
    
    // ─────────────────────────────────────────────────────────────
    // PAGINATION
    // ─────────────────────────────────────────────────────────────
    const isExport = searchParams.get('export') === 'true';

const page = isExport ? 1 : parseInt(searchParams.get('page') || '1');

// Hard cap export size (safe for 2k–5k products)
const limit = isExport
  ? 10000
  : Math.min(parseInt(searchParams.get('limit') || '50'), 100);

const skip = isExport ? 0 : (page - 1) * limit;

    
    // ─────────────────────────────────────────────────────────────
    // SORTING
    // ─────────────────────────────────────────────────────────────
    const sortBy = searchParams.get('sortBy') || 'sku';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
   const sort: Record<string, SortOrder> = isExport
  ? { carMake: 'asc', carModel: 'asc', name: 'asc' }
  : { [sortBy]: sortOrder as SortOrder };


    
    // ─────────────────────────────────────────────────────────────
    // EXECUTE QUERY - Use lean() for performance
    // ─────────────────────────────────────────────────────────────
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .select('-__v') // Exclude version key for smaller payload
        .sort(sort)
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
        hasMore: page < Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST /api/products - Create a new product
// ============================================================================
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
    
    // Ensure outletId is properly typed as ObjectId
    const outletIdObj = typeof user.outletId === 'string' 
      ? new mongoose.Types.ObjectId(user.outletId)
      : user.outletId;
    
    console.log('🔍 Creating product for user:', {
      userId: user.userId,
      outletId: outletIdObj ? outletIdObj.toString() : '',
      email: user.email
    });
    
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
      yearFrom,
      yearTo,
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
    
    console.log('🔍 Checking for existing SKU:', sku);
    
    // Check if SKU already exists
    const existingProduct = await Product.findOne({
      sku,
      outletId: outletIdObj,
    });
    
    if (existingProduct) {
      console.log('❌ SKU already exists:', sku);
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
    
    // Ensure categoryId is also an ObjectId
    const categoryIdObj = typeof categoryId === 'string'
      ? new mongoose.Types.ObjectId(categoryId)
      : categoryId;
    
    console.log('🔍 Creating product with data:', {
      sku,
      name,
      outletId: outletIdObj?.toString() ?? '',
      category: categoryIdObj.toString(),
      isActive: true,
    });
    
    // Create product
    const product = await Product.create({
      name,
      description,
      category: categoryIdObj,
      sku,
      barcode,
      partNumber,
      isVehicle: isVehicle || false,
      carMake: isVehicle ? carMake : undefined,
      carModel: isVehicle ? carModel : undefined,
      variant: isVehicle ? variant : undefined,
      yearFrom: isVehicle && yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: isVehicle && yearTo ? parseInt(yearTo) : undefined,
      color: isVehicle ? color : undefined,
      vin: isVehicle ? vin : undefined,
      costPrice: cost,
      sellingPrice: Number(sellingPrice),
      taxRate: Number(taxRate) || 0,
      currentStock: stockQty,
      minStock: Number(minStock) || 0,
      maxStock: Number(maxStock) || 1000,
      reorderPoint: Number(minStock) || 0,
      unit: unit || 'pcs',
      outletId: outletIdObj,
      isActive: true, // Explicitly set to true
    });
    
    console.log(`✅ Product created successfully:`, {
      _id: product._id.toString(),
      sku: product.sku,
      name: product.name,
      outletId: product.outletId.toString(),
      isActive: product.isActive,
    });
    
    // Verify it can be found immediately
    const verifyProduct = await Product.findOne({
      sku: product.sku,
      outletId: outletIdObj,
      isActive: true,
    }).lean();
    
    console.log('🔍 Verification - Product findable:', verifyProduct ? 'YES ✅' : 'NO ❌');
    if (!verifyProduct) {
      console.error('⚠️ WARNING: Product was created but cannot be found with query!');
    }
    
    if (isVehicle) {
      console.log(`   Type: Vehicle`);
      console.log(`   Make: ${carMake}${carModel ? ` ${carModel}` : ''}${variant ? ` ${variant}` : ''}`);
      if (color) console.log(`   Color: ${color}`);
      if (yearFrom || yearTo) {
        const yearRange = yearFrom && yearTo ? `${yearFrom}-${yearTo}` : 
                         yearFrom ? `${yearFrom}+` : 
                         yearTo ? `Up to ${yearTo}` : '';
        console.log(`   Year Range: ${yearRange}`);
      }
    }
    
    // ─────────────────── INVENTORY OPENING MOVEMENT ─────────────────
    if (stockQty > 0 && cost > 0) {
      await InventoryMovement.create({
        productId: product._id,
        productName: name,
        sku,
        movementType: 'ADJUSTMENT',
        quantity: stockQty,
        unitCost: cost,
        totalValue: stockQty * cost,
        referenceType: 'ADJUSTMENT',
        referenceId: product._id,
        referenceNumber: `OPEN-${sku}`,
        outletId: outletIdObj,
        balanceAfter: stockQty,
        date: new Date(),
        notes: 'Opening stock on product creation',
        createdBy: userId,
        ledgerEntriesCreated: true,
      });
    }
    
    // ═══════════════════════════════════════════════════════════
    // ACCOUNTING: Post initial inventory value to ledger
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
          outletId: outletIdObj,
        };
        
        const result = await postInventoryAdjustmentToLedger(
          inventoryAdjustment,
          userId
        );
        
        voucherId = result.voucherId;
        
        console.log(`✓ Inventory value posted: QAR ${inventoryValue.toFixed(2)}`);
        console.log(`✓ Journal Entry: ${result.voucherNumber}`);
        
      } catch (ledgerError: any) {
        console.error('⚠️ Failed to post inventory to ledger:', ledgerError.message);
      }
    } else if (stockQty > 0) {
      console.warn(`⚠️ Product has opening stock (${stockQty}) but no cost price set.`);
    }
    
    // Activity log
    const yearRangeStr = yearFrom && yearTo ? `, ${yearFrom}-${yearTo}` : 
                        yearFrom ? `, ${yearFrom}+` : 
                        yearTo ? `, Up to ${yearTo}` : '';
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'products',
      description: `Created product: ${name} (${sku})${
        isVehicle ? ` [Vehicle: ${carMake}${carModel ? ` ${carModel}` : ''}${variant ? ` ${variant}` : ''}${color ? `, ${color}` : ''}${yearRangeStr}]` : ''
      }${
        stockQty > 0 ? ` with opening stock: ${stockQty} ${unit || 'pcs'} @ QAR ${cost.toFixed(2)} = QAR ${(stockQty * cost).toFixed(2)}` : ''
      }`,
      outletId: outletIdObj,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ 
      product,
      voucherId,
      inventoryPosted: stockQty > 0 && cost > 0,
      message: 'Product created successfully',
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Error creating product:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}