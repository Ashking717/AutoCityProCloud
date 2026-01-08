import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import LedgerEntry from '@/lib/models/LedgerEntry';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import Product from '@/lib/models/ProductEnhanced';

// Import User model to ensure it's registered for populate
import User from '@/lib/models/User';

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
    
    console.log('📊 Starting period closing process...');
    
    // ═══════════════════════════════════════════════════════════
    // LEDGER VERIFICATION - Verify Trial Balance
    // ═══════════════════════════════════════════════════════════
    
    const ledgerEntries = await LedgerEntry.find({
      outletId: user.outletId,
      date: { $gte: periodStart, $lte: periodEnd },
    }).lean();
    
    const totalDebits = ledgerEntries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0);
    const totalCredits = ledgerEntries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0);
    const ledgerEntriesCount = ledgerEntries.length;
    
    // Check if trial balance is matched (within 0.01 tolerance for rounding)
    const trialBalanceMatched = Math.abs(totalDebits - totalCredits) < 0.01;
    
    if (!trialBalanceMatched) {
      console.warn(`⚠️ Trial balance mismatch: DR=${totalDebits}, CR=${totalCredits}`);
    }
    
    console.log(`📖 Ledger entries verified: ${ledgerEntriesCount} entries`);
    console.log(`✓ Total Debits: QAR ${totalDebits.toFixed(2)}`);
    console.log(`✓ Total Credits: QAR ${totalCredits.toFixed(2)}`);
    console.log(`✓ Trial Balance: ${trialBalanceMatched ? 'MATCHED ✓' : 'MISMATCH ⚠️'}`);
    
    // ═══════════════════════════════════════════════════════════
    // SALES SUMMARY
    // ═══════════════════════════════════════════════════════════
    
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
    
    console.log(`💰 Sales Summary: ${salesCount} sales, Total: QAR ${totalSales.toFixed(2)}`);
    
    // ═══════════════════════════════════════════════════════════
    // EXPENSES (from Payment Vouchers)
    // ═══════════════════════════════════════════════════════════
    
    const expenseVouchers = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'payment',
      date: { $gte: periodStart, $lte: periodEnd },
      status: { $in: ['posted', 'approved'] },
      referenceType: 'PAYMENT', // Only expense payments
    }).lean();
    
    const totalExpenses = expenseVouchers.reduce((sum, v: any) => sum + (v.totalDebit || 0), 0);
    
    console.log(`💸 Expenses: QAR ${totalExpenses.toFixed(2)}`);
    
    // ═══════════════════════════════════════════════════════════
    // CASH RECEIPTS (from Receipt Vouchers)
    // ═══════════════════════════════════════════════════════════
    
    const receiptVouchers = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'receipt',
      date: { $gte: periodStart, $lte: periodEnd },
      status: { $in: ['posted', 'approved'] },
    }).lean();
    
    const cashReceipts = receiptVouchers.reduce((sum, v: any) => sum + (v.totalCredit || 0), 0);
    
    console.log(`📥 Cash Receipts: QAR ${cashReceipts.toFixed(2)}`);
    
    // ═══════════════════════════════════════════════════════════
    // INVENTORY VALUATION
    // ═══════════════════════════════════════════════════════════
    
    const products = await Product.find({
      outletId: user.outletId,
      isActive: true,
    }).lean();
    
    const stockValue = products.reduce(
      (sum, p: any) => sum + (p.currentStock || 0) * (p.costPrice || 0),
      0
    );
    
    const closingStock = products.reduce((sum, p: any) => sum + (p.currentStock || 0), 0);
    
    console.log(`📦 Inventory: ${closingStock} units, Value: QAR ${stockValue.toFixed(2)}`);
    
    // ═══════════════════════════════════════════════════════════
    // CASH FLOW CALCULATION
    // ═══════════════════════════════════════════════════════════
    
    // Get opening cash from previous closing
    const previousClosing = await Closing.findOne({
      outletId: user.outletId,
      closingType,
      closingDate: { $lt: periodStart },
    })
      .sort({ closingDate: -1 })
      .lean();
    
    const openingCash = (previousClosing as any)?.closingCash || 0;
    
    // Calculate closing cash
    // Opening Cash + Cash Sales + Cash Receipts - Cash Payments (Expenses)
    const closingCash = openingCash + cashSales + cashReceipts - totalExpenses;
    
    console.log(`💵 Cash Flow:`);
    console.log(`   Opening: QAR ${openingCash.toFixed(2)}`);
    console.log(`   + Sales: QAR ${cashSales.toFixed(2)}`);
    console.log(`   + Receipts: QAR ${cashReceipts.toFixed(2)}`);
    console.log(`   - Payments: QAR ${totalExpenses.toFixed(2)}`);
    console.log(`   = Closing: QAR ${closingCash.toFixed(2)}`);
    
    // ═══════════════════════════════════════════════════════════
    // PROFIT CALCULATION
    // ═══════════════════════════════════════════════════════════
    
    const totalRevenue = totalSales;
    const netProfit = totalRevenue - totalExpenses;
    
    console.log(`📊 Profit/Loss: QAR ${netProfit.toFixed(2)}`);
    
    // ═══════════════════════════════════════════════════════════
    // VOUCHER IDS COLLECTION
    // ═══════════════════════════════════════════════════════════
    
    const allVouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: periodStart, $lte: periodEnd },
      status: { $in: ['posted', 'approved'] },
    })
      .select('_id')
      .lean();
    
    const voucherIds = allVouchers.map((v: any) => v._id.toString());
    
    // ═══════════════════════════════════════════════════════════
    // CREATE CLOSING RECORD
    // ═══════════════════════════════════════════════════════════
    
    const closing = await Closing.create({
      closingType,
      closingDate: date,
      periodStart,
      periodEnd,
      
      // Financial Metrics
      totalSales,
      totalPurchases: 0, // Can be calculated if needed
      totalExpenses,
      totalRevenue,
      netProfit,
      
      // Cash Flow
      openingCash,
      cashSales,
      cashReceipts,
      cashPayments: totalExpenses,
      closingCash,
      
      // Sales Metrics
      salesCount,
      totalDiscount,
      totalTax,
      
      // Inventory
      openingStock: (previousClosing as any)?.closingStock || 0,
      closingStock,
      stockValue,
      
      // Ledger Integration
      ledgerEntriesCount,
      voucherIds,
      trialBalanceMatched,
      totalDebits,
      totalCredits,
      
      // Status
      status: 'closed',
      
      // Audit Trail
      closedBy: user.userId,
      closedAt: new Date(),
      notes,
      
      // Outlet
      outletId: user.outletId,
    });
    
    // ═══════════════════════════════════════════════════════════
    // ACTIVITY LOG
    // ═══════════════════════════════════════════════════════════
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'closings',
      description: `Closed ${closingType} for ${date.toDateString()} - ${ledgerEntriesCount} ledger entries verified`,
      metadata: {
        closingId: closing._id.toString(),
        totalRevenue,
        netProfit,
        trialBalanceMatched,
        ledgerEntriesCount,
      },
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    console.log('✅ Closing completed successfully!');
    console.log(`📋 Closing ID: ${closing._id}`);
    
    return NextResponse.json({ 
      closing,
      summary: {
        ledgerEntriesCount,
        trialBalanceMatched,
        totalDebits,
        totalCredits,
        netProfit,
        closingCash,
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Error creating closing:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}