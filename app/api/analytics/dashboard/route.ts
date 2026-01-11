// app/api/analytics/dashboard/route.ts - WITH FIXED PROFIT CALCULATION
import { NextRequest, NextResponse } from 'next/server';
import Sale from '@/lib/models/Sale';
import Customer from '@/lib/models/Customer';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/ProductEnhanced';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  subMonths,
  subWeeks,
  format,
  eachDayOfInterval
} from 'date-fns';

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
    const outletId = user.outletId;
    const outletObjectId = new mongoose.Types.ObjectId(outletId as string);
    
    // Get period from query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    
    // Get all analytics data
    const [
      stats,
      salesTrend,
      topProductsData,
      recentActivityData,
      percentageChanges
    ] = await Promise.all([
      getDashboardStats(outletObjectId, period, now),
      getSalesTrend(outletObjectId, period, now),
      getTopProducts(outletObjectId, period, now),
      getRecentActivity(outletObjectId),
      getPercentageChanges(outletObjectId, period, now)
    ]);
    
    // Format recent activity
    const formattedActivity = recentActivityData.map((activity: any) => ({
      id: activity._id.toString(),
      description: activity.description || 'No description',
      user: activity.username || 'Unknown',
      timestamp: format(activity.timestamp, 'MMM d, h:mm a'),
      type: activity.actionType || 'info'
    }));
    
    // Format top products
    const formattedTopProducts = topProductsData.map((product: any) => ({
      ...product,
      revenue: Math.round(product.revenue)
    }));
    
    return NextResponse.json({
      stats,
      salesTrend,
      topProducts: formattedTopProducts,
      recentActivity: formattedActivity,
      percentageChanges,
      period
    });
    
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch dashboard data' 
    }, { status: 500 });
  }
}
// Helper function to get dashboard statistics with FIXED profit calculation
async function getDashboardStats(outletId: mongoose.Types.ObjectId, period: string, now: Date) {
  const { startDate, endDate } = getDateRange(period, now);
  
  // Today's sales
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  
  const todaySalesAgg = await Sale.aggregate([
    {
      $match: {
        outletId,
        saleDate: { $gte: todayStart, $lte: todayEnd },
        status: 'COMPLETED'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$grandTotal' }
      }
    }
  ]);
  
  const todaySales = todaySalesAgg[0]?.total || 0;

  // Period sales - Get all sales with items to calculate profit properly
  const periodSalesData = await Sale.find({
    outletId,
    saleDate: { $gte: startDate, $lte: endDate },
    status: 'COMPLETED'
  }).populate({
    path: 'items.productId',
    select: 'costPrice'
  }).lean();

  let periodSales = 0;
  let periodProfit = 0;
  let periodOrders = periodSalesData.length;

  // Calculate sales and profit manually
  for (const sale of periodSalesData) {
    periodSales += sale.grandTotal;
    
    // Calculate profit for this sale
    let saleCost = 0;
    
    for (const item of sale.items) {
      // Skip labor items
      if (item.isLabor) continue;
      
      // Get product cost
      let itemCost = 0;
      if (item.productId && typeof item.productId === 'object' && 'costPrice' in item.productId) {
        itemCost = (item.productId as any).costPrice || 0;
      }
      
      saleCost += itemCost * item.quantity;
    }
    
    const saleProfit = sale.grandTotal - saleCost;
    periodProfit += saleProfit;
  }

  const profitMargin = periodSales > 0 ? (periodProfit / periodSales) * 100 : 0;

  // Low stock items
  const lowStockItems = await Product.countDocuments({
    outletId,
    $expr: { 
      $and: [
        { $lte: ['$currentStock', '$reorderPoint'] },
        { $gt: ['$currentStock', 0] }
      ]
    },
    isActive: true
  });

  // Total customers
  const totalCustomers = await Customer.countDocuments({ outletId });

  // Pending payments
  const pendingPaymentsAgg = await Sale.aggregate([
    {
      $match: {
        outletId,
        balanceDue: { $gt: 0 },
        status: 'COMPLETED'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$balanceDue' }
      }
    }
  ]);

  const pendingPayments = pendingPaymentsAgg[0]?.total || 0;

  // Average order value
  const avgOrderValue = periodOrders > 0 ? periodSales / periodOrders : 0;

  return {
    todaySales: Math.round(todaySales),
    monthSales: Math.round(periodSales),
    totalProfit: Math.round(periodProfit),
    profitMargin: parseFloat(profitMargin.toFixed(1)),
    lowStockItems,
    totalCustomers,
    totalOrders: periodOrders,
    averageOrderValue: Math.round(avgOrderValue),
    pendingPayments: Math.round(pendingPayments)
  };
}

// Helper function to get sales trend with profit
async function getSalesTrend(
  outletId: mongoose.Types.ObjectId,
  period: string,
  now: Date
) {
  let labels: string[] = [];
  let data: number[] = [];
  let profits: number[] = [];

  /* ───────────────── TODAY (hourly – profit skipped) ───────────────── */
  if (period === 'today') {
    const hourlySales = await Sale.aggregate([
      {
        $match: {
          outletId,
          saleDate: { $gte: startOfDay(now), $lte: endOfDay(now) },
          status: 'COMPLETED',
        },
      },
      {
        $group: {
          _id: { $hour: '$saleDate' },
          sales: { $sum: '$grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    labels = Array.from({ length: 24 }, (_, i) =>
      `${i.toString().padStart(2, '0')}:00`
    );

    data = labels.map((_, hour) => {
      const sale = hourlySales.find((s) => s._id === hour);
      return sale?.sales || 0;
    });

    profits = Array(24).fill(0);
  }

  /* ───────────────── WEEK (daily with profit) ───────────────── */
  else if (period === 'week') {
    const days = eachDayOfInterval({
      start: subDays(now, 6),
      end: now,
    });

    labels = days.map((d) => format(d, 'EEE'));

    const sales = await Sale.find({
      outletId,
      saleDate: {
        $gte: startOfDay(subDays(now, 6)),
        $lte: endOfDay(now),
      },
      status: 'COMPLETED',
    }).lean();

    data = days.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return sales
        .filter(
          (s) => format(new Date(s.saleDate), 'yyyy-MM-dd') === dateKey
        )
        .reduce((sum, s) => sum + s.grandTotal, 0);
    });

    profits = days.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      let profit = 0;

      for (const sale of sales) {
        if (format(new Date(sale.saleDate), 'yyyy-MM-dd') !== dateKey) continue;

        for (const item of sale.items) {
          if (item.isLabor) continue;
          const cost = item.costPrice || 0;
          profit += (item.unitPrice - cost) * item.quantity;
        }
      }

      return profit;
    });
  }

  /* ───────────────── MONTH (last 30 days with profit) ───────────────── */
  else if (period === 'month') {
    const days = eachDayOfInterval({
      start: subDays(now, 29),
      end: now,
    });

    labels = days.map((d) => format(d, 'MMM d'));

    const sales = await Sale.find({
      outletId,
      saleDate: {
        $gte: startOfDay(subDays(now, 29)),
        $lte: endOfDay(now),
      },
      status: 'COMPLETED',
    }).lean();

    data = days.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return sales
        .filter(
          (s) => format(new Date(s.saleDate), 'yyyy-MM-dd') === dateKey
        )
        .reduce((sum, s) => sum + s.grandTotal, 0);
    });

    profits = days.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      let profit = 0;

      for (const sale of sales) {
        if (format(new Date(sale.saleDate), 'yyyy-MM-dd') !== dateKey) continue;

        for (const item of sale.items) {
          if (item.isLabor) continue;
          const cost = item.costPrice || 0;
          profit += (item.unitPrice - cost) * item.quantity;
        }
      }

      return profit;
    });
  }

  /* ───────────────── YEAR (monthly with profit) ───────────────── */
  else if (period === 'year') {
    labels = Array.from({ length: 12 }, (_, i) =>
      format(new Date(now.getFullYear(), i, 1), 'MMM')
    );

    const sales = await Sale.find({
      outletId,
      saleDate: {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      },
      status: 'COMPLETED',
    }).lean();

    data = Array(12).fill(0);
    profits = Array(12).fill(0);

    for (const sale of sales) {
      const month = new Date(sale.saleDate).getMonth();
      data[month] += sale.grandTotal;

      for (const item of sale.items) {
        if (item.isLabor) continue;
        const cost = item.costPrice || 0;
        profits[month] += (item.unitPrice - cost) * item.quantity;
      }
    }
  }

  return {
    labels,
    data: data.map((v) => Math.round(v)),
    profits: profits.map((v) => Math.round(v)),
  };
}

// Helper function to get top products - SIMPLIFIED VERSION
async function getTopProducts(outletId: mongoose.Types.ObjectId, period: string, now: Date) {
  const { startDate, endDate } = getDateRange(period, now);
  
  // Simplified aggregation that should work
  const topProducts = await Sale.aggregate([
    {
      $match: {
        outletId,
        saleDate: { $gte: startDate, $lte: endDate },
        status: 'COMPLETED'
      }
    },
    { $unwind: '$items' },
    // Filter out labor items
    {
      $match: {
        'items.isLabor': { $ne: true }
      }
    },
    // Group by product name
    {
      $group: {
        _id: '$items.name',
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' }
      }
    },
    // Sort by revenue descending
    { $sort: { revenue: -1 } },
    // Limit to top 5
    { $limit: 5 },
    // Format the output
    {
      $project: {
        id: '$_id',
        name: '$_id',
        quantity: 1,
        revenue: 1,
        _id: 0
      }
    }
  ]);

  return topProducts;
}

// Helper function to get recent activity
async function getRecentActivity(outletId: mongoose.Types.ObjectId) {
  const activity = await ActivityLog.find({
    outletId
  })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

  return activity;
}

// Helper function to get date range based on period
function getDateRange(period: string, now: Date) {
  let startDate: Date;
  let endDate: Date = now;

  switch (period) {
    case 'today':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 0 });
      endDate = endOfWeek(now, { weekStartsOn: 0 });
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    case 'month':
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
  }

  return { startDate, endDate };
}

// Add this helper function to calculate percentage changes
async function getPercentageChanges(outletId: mongoose.Types.ObjectId, period: string, now: Date) {
  const { startDate: currentStart, endDate: currentEnd } = getDateRange(period, now);
  
  // Calculate previous period
  let previousStart: Date, previousEnd: Date;
  
  switch (period) {
    case 'today':
      previousStart = startOfDay(subDays(now, 1));
      previousEnd = endOfDay(subDays(now, 1));
      break;
    case 'week':
      previousStart = startOfWeek(subWeeks(now, 1));
      previousEnd = endOfWeek(subWeeks(now, 1));
      break;
    case 'month':
      previousStart = startOfMonth(subMonths(now, 1));
      previousEnd = endOfMonth(subMonths(now, 1));
      break;
    case 'year':
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      previousStart = startOfMonth(subMonths(now, 1));
      previousEnd = endOfMonth(subMonths(now, 1));
  }

  // Get current period sales
  const currentPeriodSales = await Sale.aggregate([
    {
      $match: {
        outletId,
        saleDate: { $gte: currentStart, $lte: currentEnd },
        status: 'COMPLETED'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$grandTotal' }
      }
    }
  ]);

  // Get previous period sales
  const previousPeriodSales = await Sale.aggregate([
    {
      $match: {
        outletId,
        saleDate: { $gte: previousStart, $lte: previousEnd },
        status: 'COMPLETED'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$grandTotal' }
      }
    }
  ]);

  const currentSales = currentPeriodSales[0]?.total || 0;
  const previousSales = previousPeriodSales[0]?.total || 0;

  // Calculate percentage change
  const salesChange = previousSales > 0 
    ? ((currentSales - previousSales) / previousSales) * 100 
    : currentSales > 0 ? 100 : 0;

  // For today vs yesterday
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));
  
  const todaySalesAgg = await Sale.aggregate([
    {
      $match: {
        outletId,
        saleDate: { $gte: todayStart, $lte: todayEnd },
        status: 'COMPLETED'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$grandTotal' }
      }
    }
  ]);
  
  const yesterdaySalesAgg = await Sale.aggregate([
    {
      $match: {
        outletId,
        saleDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
        status: 'COMPLETED'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$grandTotal' }
      }
    }
  ]);
  
  const todaySales = todaySalesAgg[0]?.total || 0;
  const yesterdaySales = yesterdaySalesAgg[0]?.total || 0;
  
  const todayVsYesterday = yesterdaySales > 0 
    ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 
    : todaySales > 0 ? 100 : 0;

  // Get customer count changes
  const currentCustomers = await Customer.countDocuments({
    outletId,
    createdAt: { $gte: currentStart, $lte: currentEnd }
  });

  const previousCustomers = await Customer.countDocuments({
    outletId,
    createdAt: { $gte: previousStart, $lte: previousEnd }
  });

  const customerChange = previousCustomers > 0 
    ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 
    : currentCustomers > 0 ? 100 : 0;

  return {
    salesChange: parseFloat(salesChange.toFixed(1)),
    profitChange: 0, // We'll calculate this if needed
    customerChange: parseFloat(customerChange.toFixed(1)),
    lowStockChange: 0,
    todayVsYesterday: {
      sales: parseFloat(todayVsYesterday.toFixed(1)),
      profit: 0
    }
  };
}