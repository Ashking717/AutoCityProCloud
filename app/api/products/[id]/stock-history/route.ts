// app/api/products/[id]/stock-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';
import InventoryMovement, { MovementType } from '@/lib/models/InventoryMovement';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';

const mapUiType = (movementType: MovementType, quantity: number) => {
  if (movementType === MovementType.ADJUSTMENT) {
    return quantity >= 0 ? 'in' : 'out';
  }
  return quantity > 0 ? 'in' : 'out';
};
// GET /api/products/[id]/stock-history
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
    
    // Verify product exists and belongs to outlet
    const product = await Product.findOne({
      _id: params.id,
      outletId: user.outletId,
      isActive: true,
    });
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // Filter by movement type
    const referenceNumber = searchParams.get('referenceNumber');
    const referenceType = searchParams.get('referenceType');
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {
      outletId: user.outletId,
      productId: params.id,
    };
    
    // Add date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    // Add type filter
    if (type && Object.values(MovementType).includes(type as MovementType)) {
      query.movementType = type;
    }
    
    // Add reference type filter
    if (referenceType && ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN'].includes(referenceType)) {
      query.referenceType = referenceType;
    }
    
    // Add reference number filter
    if (referenceNumber) {
      query.referenceNumber = { $regex: referenceNumber, $options: 'i' };
    }
    
    // Get total count for pagination
    const totalCount = await InventoryMovement.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get stock movements with pagination
    const movements = await InventoryMovement.find(query)
      .select('movementType quantity unitCost totalValue referenceType referenceNumber referenceId balanceAfter date notes ledgerEntriesCreated createdBy')
      .populate('createdBy', 'name email') // Populate createdBy user info
      .populate('referenceId') // Populate reference document if available
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Transform movements for frontend
const history = movements.map((movement: any) => {
  const uiType = mapUiType(movement.movementType, movement.quantity);

  return {
    _id: movement._id,
    type: uiType,                       // in | out
    quantity: Math.abs(movement.quantity), // always positive
    previousStock: movement.balanceAfter - movement.quantity,
    newStock: movement.balanceAfter,
    unitCost: movement.unitCost,
    totalValue: movement.totalValue,
    reference: movement.referenceNumber,
    referenceType: movement.referenceType,
    reason: movement.notes,
    performedBy:
      movement.createdBy
        ? `${movement.createdBy.firstName || ''} ${movement.createdBy.lastName || ''}`.trim()
        : 'System',
    timestamp: movement.date,
  };
});
    
    // Calculate summary statistics using aggregation
    const summaryAggregation = await InventoryMovement.aggregate([
      {
        $match: {
          outletId: user.outletId,
          productId: params.id,
          ...(startDate || endDate ? {
            date: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {}),
            }
          } : {}),
        }
      },
      {
        $group: {
          _id: null,
          totalMovements: { $sum: 1 },
          totalInQuantity: {
            $sum: {
              $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0]
            }
          },
          totalOutQuantity: {
            $sum: {
              $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0]
            }
          },
          netQuantityChange: { $sum: '$quantity' },
          totalInValue: {
            $sum: {
              $cond: [{ $gt: ['$quantity', 0] }, '$totalValue', 0]
            }
          },
          totalOutValue: {
            $sum: {
              $cond: [{ $lt: ['$quantity', 0] }, '$totalValue', 0]
            }
          },
          avgUnitCost: { $avg: '$unitCost' },
          maxUnitCost: { $max: '$unitCost' },
          minUnitCost: { $min: '$unitCost' },
        }
      }
    ]);
    
    const summary = summaryAggregation[0] || {
      totalMovements: 0,
      totalInQuantity: 0,
      totalOutQuantity: 0,
      netQuantityChange: 0,
      totalInValue: 0,
      totalOutValue: 0,
      avgUnitCost: 0,
      maxUnitCost: 0,
      minUnitCost: 0,
    };
    
    // Get movement type distribution
    const typeDistribution = await InventoryMovement.aggregate([
      {
        $match: {
          outletId: user.outletId,
          productId: params.id,
          ...(startDate || endDate ? {
            date: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {}),
            }
          } : {}),
        }
      },
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' },
          avgUnitCost: { $avg: '$unitCost' },
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get monthly trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyTrend = await InventoryMovement.aggregate([
      {
        $match: {
          outletId: user.outletId,
          productId: params.id,
          date: { $gte: twelveMonthsAgo },
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$movementType'
          },
          quantity: { $sum: '$quantity' },
          value: { $sum: '$totalValue' },
          count: { $sum: 1 },
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          movements: {
            $push: {
              type: '$_id.type',
              quantity: '$quantity',
              value: '$value',
              count: '$count'
            }
          },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$value' },
          totalCount: { $sum: '$count' },
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 12
      }
    ]);
    
    // Get latest stock balance (from product or calculate from movements)
    let currentStock = product.currentStock;
    let calculatedStock = 0;
    
    const stockCalculation = await InventoryMovement.aggregate([
      {
        $match: {
          outletId: user.outletId,
          productId: params.id,
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    if (stockCalculation.length > 0) {
      calculatedStock = stockCalculation[0].totalQuantity;
    }
    
    // Get reorder status
    const stockStatus = product.currentStock <= product.minStock ? 'LOW' :
                      product.currentStock >= product.maxStock * 0.9 ? 'HIGH' :
                      'NORMAL';
    
    return NextResponse.json({
      history,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: {
        ...summary,
        stockAccuracy: Math.abs(currentStock - calculatedStock) < 0.01 ? 'ACCURATE' : 'MISMATCH',
        calculatedStock,
        currentStock,
      },
      typeDistribution: typeDistribution.map(dist => ({
        type: dist._id,
        count: dist.count,
        totalQuantity: dist.totalQuantity,
        totalValue: dist.totalValue,
        avgUnitCost: dist.avgUnitCost,
      })),
      monthlyTrend: monthlyTrend.map(month => ({
        year: month._id.year,
        month: month._id.month,
        movements: month.movements,
        totalQuantity: month.totalQuantity,
        totalValue: month.totalValue,
        totalCount: month.totalCount,
      })),
      productInfo: {
        name: product.name,
        sku: product.sku,
        currentStock: product.currentStock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        stockStatus,
        unit: product.unit,
        category: product.category?.name || 'Uncategorized',
        reorderPoint: product.minStock,
        safetyStock: Math.max(0, product.minStock - (product.currentStock || 0)),
      },
      filters: {
        applied: {
          startDate,
          endDate,
          type,
          referenceType,
          referenceNumber,
        },
        availableTypes: Object.values(MovementType),
      },
    });
    
  } catch (error: any) {
    console.error('Error fetching stock history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock history', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/products/[id]/stock-history (Create adjustment)
export async function POST(
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
    
    // Verify product exists and belongs to outlet
    const product = await Product.findOne({
      _id: params.id,
      outletId: user.outletId,
      isActive: true,
    });
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const body = await request.json();
    
    // Validate adjustment data
    const { type, quantity, reason, date } = body;
    
    if (!type || !Object.values(MovementType).includes(type)) {
      return NextResponse.json(
        { error: 'Valid movement type is required' },
        { status: 400 }
      );
    }
    
    if (!quantity || typeof quantity !== 'number') {
      return NextResponse.json(
        { error: 'Valid quantity is required' },
        { status: 400 }
      );
    }
    
    if (type === MovementType.ADJUSTMENT && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for adjustments' },
        { status: 400 }
      );
    }
    
    // Get current stock from movements (source of truth)
    const stockAggregation = await InventoryMovement.aggregate([
      {
        $match: {
          outletId: user.outletId,
          productId: params.id,
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    const currentStock = stockAggregation.length > 0 ? stockAggregation[0].totalQuantity : 0;
    const newStock = currentStock + quantity;
    
    // Generate reference number for adjustment
    const timestamp = Date.now();
    const referenceNumber = `ADJ-${timestamp}`;
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create inventory movement
      const movement = new InventoryMovement({
        productId: params.id,
        productName: product.name,
        sku: product.sku,
        movementType: MovementType.ADJUSTMENT,
        quantity,
        unitCost: product.costPrice,
        totalValue: Math.abs(quantity * product.costPrice),
        referenceType: 'ADJUSTMENT',
        referenceId: new mongoose.Types.ObjectId(),
        referenceNumber,
        balanceAfter: newStock,
        date: date ? new Date(date) : new Date(),
        notes: reason || `Manual stock adjustment`,
        outletId: user.outletId,
        createdBy: user.userId,
        ledgerEntriesCreated: false, // Set to true after creating ledger entries
      });
      
      await movement.save({ session });
      
      // Update product stock (derived data, not source of truth)
      await Product.findOneAndUpdate(
        { _id: params.id, outletId: user.outletId },
        { currentStock: newStock },
        { session, new: true }
      );
      
      // TODO: Create ledger entries here if needed
      // const voucher = await createStockAdjustmentVoucher(movement, user);
      // movement.voucherId = voucher._id;
      // movement.ledgerEntriesCreated = true;
      // await movement.save({ session });
      
      await session.commitTransaction();
      
      // Create activity log
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          username: user.email,
          actionType: 'adjustment',
          module: 'inventory',
          description: `Stock adjustment for ${product.name} (${product.sku}): ${quantity > 0 ? '+' : ''}${quantity} units. Reason: ${reason}`,
          outletId: user.outletId,
        }),
      }).catch(err => console.error('Failed to create activity log:', err));
      
      return NextResponse.json({
        success: true,
        message: 'Stock adjusted successfully',
        movement: {
          _id: movement._id,
          type: movement.movementType,
          quantity: movement.quantity,
          previousStock: currentStock,
          newStock,
          reference: movement.referenceNumber,
          reason: movement.notes,
          timestamp: movement.date,
        },
        product: {
          name: product.name,
          sku: product.sku,
          previousStock: currentStock,
          newStock,
        },
      });
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error: any) {
    console.error('Error creating stock adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to adjust stock', details: error.message },
      { status: 500 }
    );
  }
}