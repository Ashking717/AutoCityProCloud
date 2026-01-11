// app/api/products/[id]/sales-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Sale from '@/lib/models/Sale';
import Product from '@/lib/models/ProductEnhanced';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/products/[id]/sales-history
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
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId');
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {
      outletId: user.outletId,
      status: 'COMPLETED',
      'items.productId': params.id,
    };
    
    // Add date range filter
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) {
        query.saleDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.saleDate.$lte = new Date(endDate);
      }
    }
    
    // Add customer filter
    if (customerId) {
      query.customerId = customerId;
    }
    
    // Get sales that include this product
    const sales = await Sale.find(query)
      .select('invoiceNumber customerName saleDate items grandTotal status')
      .populate('customerId', 'name phone email')
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Extract relevant data for this specific product
    const productSales = sales
      .map(sale => {
        // Find the specific item for this product
        const productItem = sale.items.find(item => 
          item.productId && item.productId.toString() === params.id
        );
        
        if (!productItem) return null;
        
        // Calculate return quantity if any
        const returnedQuantity = sale.returns?.reduce((total, ret) => {
          const returnItem = ret.items.find(item => 
            item.productId && item.productId.toString() === params.id
          );
          return total + (returnItem?.quantity || 0);
        }, 0) || 0;
        
        // Calculate net quantity (sold minus returned)
        const netQuantity = productItem.quantity - returnedQuantity;
        
        return {
          _id: sale._id,
          invoiceNumber: sale.invoiceNumber,
          saleDate: sale.saleDate,
          customerName: sale.customerName,
          customerId: sale.customerId,
          quantity: productItem.quantity,
          returnedQuantity,
          netQuantity,
          unitPrice: productItem.unitPrice,
          discount: productItem.discount,
          totalAmount: productItem.total,
          netAmount: productItem.total * (netQuantity / productItem.quantity),
          unit: productItem.unit,
          status: sale.status,
        };
      })
      .filter(sale => sale !== null);
    
    // Get total count for pagination
    const totalCount = await Sale.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get sales summary for this product
    const summary = await Sale.aggregate([
      {
        $match: {
          outletId: user.outletId,
          status: 'COMPLETED',
          'items.productId': params.id,
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': params.id
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          avgUnitPrice: { $avg: '$items.unitPrice' },
          maxUnitPrice: { $max: '$items.unitPrice' },
          minUnitPrice: { $min: '$items.unitPrice' },
          totalDiscount: { $sum: '$items.discount' },
        }
      }
    ]);
    
    // Get returns summary
    const returnsSummary = await Sale.aggregate([
      {
        $match: {
          outletId: user.outletId,
          status: 'COMPLETED',
          'items.productId': params.id,
          returns: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$returns' },
      { $unwind: '$returns.items' },
      {
        $match: {
          'returns.items.productId': params.id
        }
      },
      {
        $group: {
          _id: null,
          totalReturns: { $sum: 1 },
          totalReturnedQuantity: { $sum: '$returns.items.quantity' },
          totalReturnedAmount: { $sum: '$returns.items.totalAmount' },
        }
      }
    ]);
    
    // Get monthly trend
    const monthlyTrend = await Sale.aggregate([
      {
        $match: {
          outletId: user.outletId,
          status: 'COMPLETED',
          saleDate: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          },
          'items.productId': params.id,
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': params.id
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$saleDate' },
            month: { $month: '$saleDate' }
          },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);
    
    // Get top customers for this product
    const topCustomers = await Sale.aggregate([
      {
        $match: {
          outletId: user.outletId,
          status: 'COMPLETED',
          'items.productId': params.id,
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.productId': params.id
        }
      },
      {
        $group: {
          _id: '$customerId',
          customerName: { $first: '$customerName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          purchaseCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
    
    return NextResponse.json({
      sales: productSales,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      summary: {
        totalSales: summary[0]?.totalSales || 0,
        totalQuantity: summary[0]?.totalQuantity || 0,
        totalRevenue: summary[0]?.totalRevenue || 0,
        avgUnitPrice: summary[0]?.avgUnitPrice || 0,
        maxUnitPrice: summary[0]?.maxUnitPrice || 0,
        minUnitPrice: summary[0]?.minUnitPrice || 0,
        totalDiscount: summary[0]?.totalDiscount || 0,
        totalReturns: returnsSummary[0]?.totalReturns || 0,
        totalReturnedQuantity: returnsSummary[0]?.totalReturnedQuantity || 0,
        totalReturnedAmount: returnsSummary[0]?.totalReturnedAmount || 0,
        netSales: (summary[0]?.totalRevenue || 0) - (returnsSummary[0]?.totalReturnedAmount || 0),
        netQuantity: (summary[0]?.totalQuantity || 0) - (returnsSummary[0]?.totalReturnedQuantity || 0),
      },
      monthlyTrend: monthlyTrend.map(item => ({
        year: item._id.year,
        month: item._id.month,
        quantity: item.quantity,
        revenue: item.revenue,
        count: item.count,
      })),
      topCustomers: topCustomers.map(customer => ({
        customerId: customer._id,
        customerName: customer.customerName,
        totalQuantity: customer.totalQuantity,
        totalRevenue: customer.totalRevenue,
        purchaseCount: customer.purchaseCount,
      })),
    });
    
  } catch (error: any) {
    console.error('Error fetching sales history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales history', details: error.message },
      { status: 500 }
    );
  }
}