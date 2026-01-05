import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import User from '@/lib/models/User';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';

// GET /api/closings
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
    };
    
    const closingType = searchParams.get('closingType');
    if (closingType) {
      query.closingType = closingType;
    }
    
    const status = searchParams.get('status');
    if (status) {
      query.status = status;
    }
    
    const closings = await Closing.find(query)
      .populate('closedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ closingDate: -1 })
      .limit(50)
      .lean();
    
    return NextResponse.json({ closings });
  } catch (error: any) {
    console.error('Error fetching closings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/closings
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    const body = await request.json();
    
    const { closingType, closingDate, notes } = body;
    
    if (!closingType || !closingDate) {
      return NextResponse.json(
        { error: 'Closing type and date are required' },
        { status: 400 }
      );
    }
    
    // Determine period
    const date = new Date(closingDate);
    let periodStart: Date;
    let periodEnd: Date;
    
    if (closingType === 'day') {
      periodStart = new Date(date.setHours(0, 0, 0, 0));
      periodEnd = new Date(date.setHours(23, 59, 59, 999));
    } else {
      // Month closing
      periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
      periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    
    // Check if already closed
    const existingClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: {
        $gte: periodStart,
        $lte: periodEnd,
      },
    });
    
    if (existingClosing) {
      return NextResponse.json(
        { error: `This ${closingType} has already been closed` },
        { status: 400 }
      );
    }
    
    // Calculate sales summary
    const sales = await Sale.find({
      outletId: user.outletId,
      saleDate: { $gte: periodStart, $lte: periodEnd },
      status: 'COMPLETED',
    }).lean();
    
    const totalSales = sales.reduce((sum, s: any) => sum + (s.grandTotal || 0), 0);
    const salesCount = sales.length;
    const totalDiscount = sales.reduce((sum, s: any) => sum + (s.totalDiscount || 0), 0);
    const totalTax = sales.reduce((sum, s: any) => sum + (s.totalTax || 0), 0);
    const cashSales = sales
      .filter((s: any) => s.paymentMethod === 'CASH')
      .reduce((sum, s: any) => sum + (s.grandTotal || 0), 0);
    
    // Calculate expenses (payment vouchers)
    const expenses = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'payment',
      date: { $gte: periodStart, $lte: periodEnd },
      status: { $in: ['posted', 'approved'] },
    }).lean();
    
    const totalExpenses = expenses.reduce((sum, v: any) => sum + (v.totalDebit || 0), 0);
    
    // Calculate receipts (receipt vouchers)
    const receipts = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'receipt',
      date: { $gte: periodStart, $lte: periodEnd },
      status: { $in: ['posted', 'approved'] },
    }).lean();
    
    const cashReceipts = receipts.reduce((sum, v: any) => sum + (v.totalCredit || 0), 0);
    
    // Calculate stock value
    const products = await Product.find({
      outletId: user.outletId,
      isActive: true,
    }).lean();
    
    const stockValue = products.reduce(
      (sum, p: any) => sum + (p.currentStock || 0) * (p.costPrice || 0),
      0
    );
    
    const closingStock = products.reduce((sum, p: any) => sum + (p.currentStock || 0), 0);
    
    // Get opening cash (from previous closing or default)
    const previousClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: { $lt: periodStart },
    })
      .sort({ closingDate: -1 })
      .lean();
    
    const openingCash = (previousClosing as any)?.closingCash || 0;
    const closingCash = openingCash + cashSales + cashReceipts - totalExpenses;
    
    // Calculate profit
    const totalRevenue = totalSales;
    const netProfit = totalRevenue - totalExpenses;
    
    // Create closing
    const closing = await Closing.create({
      closingType,
      closingDate: date,
      periodStart,
      periodEnd,
      totalSales,
      totalPurchases: 0,
      totalExpenses,
      totalRevenue,
      netProfit,
      openingCash,
      cashSales,
      cashReceipts,
      cashPayments: totalExpenses,
      closingCash,
      salesCount,
      totalDiscount,
      totalTax,
      openingStock: (previousClosing as any)?.closingStock || 0,
      closingStock,
      stockValue,
      status: 'closed',
      closedBy: user.userId,
      closedAt: new Date(),
      notes,
      outletId: user.outletId,
    });
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'closings',
      description: `Closed ${closingType} for ${date.toDateString()}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ closing }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating closing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
