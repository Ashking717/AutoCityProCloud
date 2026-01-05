import { NextRequest, NextResponse } from 'next/server';
import Sale from '@/lib/models/Sale';
import Customer from '@/lib/models/Customer';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const now = new Date();
    
    // Get today's sales
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySales = await Sale.aggregate([
      {
        $match: {
          outletId: new mongoose.Types.ObjectId(user.outletId as string),
          createdAt: { $gte: todayStart },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    // Get month sales
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSales = await Sale.aggregate([
      {
        $match: {
          outletId: new mongoose.Types.ObjectId(user.outletId as string),
          createdAt: { $gte: monthStart },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          profit: { $sum: { $subtract: ['$total', 0] } }
        }
      }
    ]);
    
    // Get low stock count
    const lowStockCount = await Product.countDocuments({
      outletId: user.outletId,
      $expr: { $lte: ['$currentStock', '$reorderPoint'] },
      isActive: true
    });
    
    // Get customer count
    const customerCount = await Customer.countDocuments({
      outletId: user.outletId
    });
    
    // Sales trend (last 7 days)
    const salesTrend = await Sale.aggregate([
      {
        $match: {
          outletId: new mongoose.Types.ObjectId(user.outletId as string),
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sales: { $sum: '$total' },
          profit: { $sum: 0 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Top products (last 30 days)
    const topProducts = await Sale.aggregate([
      {
        $match: {
          outletId: new mongoose.Types.ObjectId(user.outletId as string),
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: '$_id',
          quantity: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);
    
    // Recent activity
    const recentActivity = await ActivityLog.find({
      outletId: user.outletId
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
    
    // Format sales trend
    const labels: string[] = [];
    const data: number[] = [];
    const profits: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = salesTrend.find((d: any) => d._id === dateStr);
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      data.push(dayData?.sales || 0);
      profits.push(dayData?.profit || 0);
    }
    
    const totalSales = monthSales[0]?.total || 0;
    const totalProfit = monthSales[0]?.profit || 0;
    
    const stats = {
      todaySales: todaySales[0]?.total || 0,
      monthSales: totalSales,
      totalProfit: totalProfit,
      profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      totalCustomers: customerCount,
      lowStockItems: lowStockCount,
      pendingPayments: 0
    };
    
    const formattedActivity = recentActivity.map((a: any) => ({
      id: String(a._id),
      type: String(a.actionType || 'unknown'),
      description: String(a.description || 'No description'),
      timestamp: new Date(a.timestamp).toLocaleString(),
      user: String(a.username || 'Unknown')
    }));
    
    return NextResponse.json({
      stats,
      salesTrend: { labels, data, profits },
      topProducts,
      recentActivity: formattedActivity
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
