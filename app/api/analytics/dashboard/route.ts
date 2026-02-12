// app/api/analytics/dashboard/route.ts - OPTIMIZED FOR VERCEL HOBBY
import { NextRequest, NextResponse } from 'next/server';

// ✅ Cache analytics data for 60 seconds to reduce CPU usage
export const revalidate = 60;
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
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    
    // ✅ OPTIMIZATION 1: Single unified query for all sales data
    const allData = await getUnifiedDashboardData(outletObjectId, period, now);
    
    return NextResponse.json({
      stats: allData.stats,
      salesTrend: allData.salesTrend,
      topProducts: allData.topProducts,
      recentActivity: allData.recentActivity,
      percentageChanges: allData.percentageChanges,
      period
    });
    
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch dashboard data' 
    }, { status: 500 });
  }
}

// ✅ OPTIMIZATION: Unified function that fetches all data in minimal queries
async function getUnifiedDashboardData(
  outletId: mongoose.Types.ObjectId,
  period: string,
  now: Date
) {
  const { startDate, endDate } = getDateRange(period, now);
  const { previousStart, previousEnd } = getPreviousDateRange(period, now);
  
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));
  
  // ✅ OPTIMIZATION 2: Parallel execution of independent queries
  const [
    salesData,
    lowStockCount,
    totalCustomers,
    currentCustomers,
    previousCustomers,
    recentActivity
  ] = await Promise.all([
    // Single comprehensive sales query covering ALL time periods
    Sale.find({
      outletId,
      saleDate: { 
        $gte: Math.min(previousStart.getTime(), todayStart.getTime()),
        $lte: endDate
      },
      status: 'COMPLETED'
    })
    .select('saleDate grandTotal balanceDue items')
    .lean(),
    
    // Low stock items
    Product.countDocuments({
      outletId,
      $expr: { 
        $and: [
          { $lte: ['$currentStock', '$reorderPoint'] },
          { $gt: ['$currentStock', 0] }
        ]
      },
      isActive: true
    }),
    
    // Total customers (no date filter)
    Customer.countDocuments({ outletId }),
    
    // Current period customers
    Customer.countDocuments({
      outletId,
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    
    // Previous period customers
    Customer.countDocuments({
      outletId,
      createdAt: { $gte: previousStart, $lte: previousEnd }
    }),
    
    // Recent activity
    ActivityLog.find({ outletId })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('description username timestamp actionType')
      .lean()
  ]);

  // ✅ OPTIMIZATION 3: Process all data in-memory (single pass)
  const analytics = processSalesData(
    salesData,
    {
      period,
      now,
      startDate,
      endDate,
      previousStart,
      previousEnd,
      todayStart,
      todayEnd,
      yesterdayStart,
      yesterdayEnd
    }
  );

  // Calculate stats
  const stats = {
    todaySales: Math.round(analytics.todaySales),
    monthSales: Math.round(analytics.periodSales),
    totalProfit: Math.round(analytics.periodProfit),
    profitMargin: parseFloat(analytics.profitMargin.toFixed(1)),
    lowStockItems: lowStockCount,
    totalCustomers,
    totalOrders: analytics.periodOrders,
    averageOrderValue: Math.round(analytics.avgOrderValue),
    pendingPayments: Math.round(analytics.pendingPayments)
  };

  // Calculate percentage changes
  const percentageChanges = {
    salesChange: parseFloat(analytics.salesChange.toFixed(1)),
    profitChange: 0,
    customerChange: calculatePercentageChange(currentCustomers, previousCustomers),
    lowStockChange: 0,
    todayVsYesterday: {
      sales: parseFloat(analytics.todayVsYesterday.toFixed(1)),
      profit: 0
    }
  };

  // Format recent activity
  const formattedActivity = recentActivity.map((activity: any) => ({
    id: activity._id.toString(),
    description: activity.description || 'No description',
    user: activity.username || 'Unknown',
    timestamp: activity.timestamp instanceof Date 
      ? activity.timestamp.toISOString() 
      : new Date(activity.timestamp).toISOString(),
    type: activity.actionType || 'info'
  }));

  return {
    stats,
    salesTrend: analytics.salesTrend,
    topProducts: analytics.topProducts,
    recentActivity: formattedActivity,
    percentageChanges
  };
}

// ✅ OPTIMIZATION 4: Single-pass data processing
function processSalesData(salesData: any[], config: any) {
  const {
    period,
    now,
    startDate,
    endDate,
    previousStart,
    previousEnd,
    todayStart,
    todayEnd,
    yesterdayStart,
    yesterdayEnd
  } = config;

  // Initialize accumulators
  let todaySales = 0;
  let yesterdaySales = 0;
  let periodSales = 0;
  let periodProfit = 0;
  let periodOrders = 0;
  let previousPeriodSales = 0;
  let pendingPayments = 0;
  
  // For sales trend
  const trendMap = new Map<string, { sales: number; profit: number }>();
  
  // For top products
  const productMap = new Map<string, { quantity: number; revenue: number }>();

  // ✅ Single loop through all sales
  for (const sale of salesData) {
    const saleDate = new Date(sale.saleDate);
    const saleTime = saleDate.getTime();
    
    // Calculate profit for this sale
    let saleCost = 0;
    let saleProfit = 0;
    
    for (const item of sale.items) {
      if (item.isLabor) continue;
      
      const itemCost = item.costPrice || 0;
      const itemProfit = (item.unitPrice - itemCost) * item.quantity;
      
      saleCost += itemCost * item.quantity;
      saleProfit += itemProfit;
      
      // Track top products (current period only)
      if (saleTime >= startDate.getTime() && saleTime <= endDate.getTime()) {
        const productKey = item.name;
        const existing = productMap.get(productKey) || { quantity: 0, revenue: 0 };
        productMap.set(productKey, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.total
        });
      }
    }
    
    // Today's sales
    if (saleTime >= todayStart.getTime() && saleTime <= todayEnd.getTime()) {
      todaySales += sale.grandTotal;
    }
    
    // Yesterday's sales
    if (saleTime >= yesterdayStart.getTime() && saleTime <= yesterdayEnd.getTime()) {
      yesterdaySales += sale.grandTotal;
    }
    
    // Current period
    if (saleTime >= startDate.getTime() && saleTime <= endDate.getTime()) {
      periodSales += sale.grandTotal;
      periodProfit += saleProfit;
      periodOrders++;
      
      // Pending payments
      if (sale.balanceDue > 0) {
        pendingPayments += sale.balanceDue;
      }
      
      // Sales trend data
      const trendKey = getTrendKey(saleDate, period, now);
      const existing = trendMap.get(trendKey) || { sales: 0, profit: 0 };
      trendMap.set(trendKey, {
        sales: existing.sales + sale.grandTotal,
        profit: existing.profit + saleProfit
      });
    }
    
    // Previous period
    if (saleTime >= previousStart.getTime() && saleTime <= previousEnd.getTime()) {
      previousPeriodSales += sale.grandTotal;
    }
  }

  // Build sales trend
  const salesTrend = buildSalesTrend(period, now, trendMap);
  
  // Build top products
  const topProducts = Array.from(productMap.entries())
    .map(([name, data]) => ({
      id: name,
      name,
      quantity: data.quantity,
      revenue: Math.round(data.revenue)
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calculate metrics
  const profitMargin = periodSales > 0 ? (periodProfit / periodSales) * 100 : 0;
  const avgOrderValue = periodOrders > 0 ? periodSales / periodOrders : 0;
  const salesChange = calculatePercentageChange(periodSales, previousPeriodSales);
  const todayVsYesterday = calculatePercentageChange(todaySales, yesterdaySales);

  return {
    todaySales,
    yesterdaySales,
    periodSales,
    periodProfit,
    periodOrders,
    previousPeriodSales,
    pendingPayments,
    profitMargin,
    avgOrderValue,
    salesChange,
    todayVsYesterday,
    salesTrend,
    topProducts
  };
}

// ✅ Helper: Get trend key for grouping
function getTrendKey(date: Date, period: string, now: Date): string {
  switch (period) {
    case 'today':
      return date.getHours().toString().padStart(2, '0');
    case 'week':
    case 'month':
      return format(date, 'yyyy-MM-dd');
    case 'year':
      return date.getMonth().toString();
    default:
      return format(date, 'yyyy-MM-dd');
  }
}

// ✅ Helper: Build sales trend from map
function buildSalesTrend(period: string, now: Date, trendMap: Map<string, { sales: number; profit: number }>) {
  let labels: string[] = [];
  let data: number[] = [];
  let profits: number[] = [];

  if (period === 'today') {
    labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    data = labels.map((_, hour) => {
      const key = hour.toString().padStart(2, '0');
      return Math.round(trendMap.get(key)?.sales || 0);
    });
    profits = Array(24).fill(0);
  }
  else if (period === 'week') {
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    labels = days.map(d => format(d, 'EEE'));
    data = days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return Math.round(trendMap.get(key)?.sales || 0);
    });
    profits = days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return Math.round(trendMap.get(key)?.profit || 0);
    });
  }
  else if (period === 'month') {
    const days = eachDayOfInterval({ start: subDays(now, 29), end: now });
    labels = days.map(d => format(d, 'MMM d'));
    data = days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return Math.round(trendMap.get(key)?.sales || 0);
    });
    profits = days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return Math.round(trendMap.get(key)?.profit || 0);
    });
  }
  else if (period === 'year') {
    labels = Array.from({ length: 12 }, (_, i) => format(new Date(now.getFullYear(), i, 1), 'MMM'));
    data = Array.from({ length: 12 }, (_, i) => Math.round(trendMap.get(i.toString())?.sales || 0));
    profits = Array.from({ length: 12 }, (_, i) => Math.round(trendMap.get(i.toString())?.profit || 0));
  }

  return { labels, data, profits };
}

// ✅ Helper: Calculate percentage change
function calculatePercentageChange(current: number, previous: number): number {
  if (previous > 0) {
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  }
  return current > 0 ? 100 : 0;
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

// Helper function to get previous date range
function getPreviousDateRange(period: string, now: Date) {
  let previousStart: Date;
  let previousEnd: Date;
  
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

  return { previousStart, previousEnd };
}