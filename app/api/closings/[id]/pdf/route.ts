// app/api/closings/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
import Product from '@/lib/models/ProductEnhanced';
import Outlet from '@/lib/models/Outlet';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

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
    const closingId = params.id;

    // Fetch closing data
    const closing = await Closing.findOne({
      _id: closingId,
      outletId: user.outletId,
    })
      .populate('closedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .lean();

    if (!closing) {
      return NextResponse.json({ error: 'Closing not found' }, { status: 404 });
    }

    // Fetch outlet information
    const outlet = await Outlet.findById(user.outletId).lean();

    // Fetch sales data (only for daily closings)
    let sales: any[] = [];
    if (closing.closingType === 'day') {
      sales = await Sale.find({
        outletId: user.outletId,
        saleDate: {
          $gte: new Date(closing.periodStart),
          $lte: new Date(closing.periodEnd),
        },
        status: 'COMPLETED',
      })
        .select('invoiceNumber saleDate customerName grandTotal paymentMethod items')
        .lean();
    }

    // Fetch expense vouchers
    const expenseVouchers = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'payment',
      date: {
        $gte: new Date(closing.periodStart),
        $lte: new Date(closing.periodEnd),
      },
      status: { $in: ['posted', 'approved'] },
      referenceType: 'PAYMENT',
    })
      .select('voucherNumber date description totalDebit category')
      .lean();

    const expenses = expenseVouchers.map((v: any) => ({
      voucherNumber: v.voucherNumber,
      date: v.date,
      description: v.description || 'Expense',
      amount: v.totalDebit || 0,
      category: v.category || 'General',
    }));

    // Fetch purchase vouchers
    const purchaseVouchers = await Voucher.find({
      outletId: user.outletId,
      voucherType: 'payment',
      date: {
        $gte: new Date(closing.periodStart),
        $lte: new Date(closing.periodEnd),
      },
      status: { $in: ['posted', 'approved'] },
      referenceType: 'PURCHASE',
    })
      .select('voucherNumber date supplierName totalDebit')
      .lean();

    const purchases = purchaseVouchers.map((v: any) => ({
      voucherNumber: v.voucherNumber,
      date: v.date,
      supplierName: v.supplierName || 'Unknown',
      amount: v.totalDebit || 0,
    }));

    // Fetch inventory data
    const products = await Product.find({
      outletId: user.outletId,
      isActive: true,
      currentStock: { $gt: 0 },
    })
      .select('name currentStock costPrice')
      .lean();

    const inventory = products.map((p: any) => ({
      productName: p.name,
      currentStock: p.currentStock || 0,
      costPrice: p.costPrice || 0,
      value: (p.currentStock || 0) * (p.costPrice || 0),
    }));

    // Prepare PDF data with all fields
    const pdfData = {
      closing: {
        _id: closing._id.toString(),
        closingType: closing.closingType,
        closingDate: closing.closingDate,
        periodStart: closing.periodStart,
        periodEnd: closing.periodEnd,
        status: closing.status,
        totalSales: closing.totalSales,
        totalPurchases: closing.totalPurchases,
        totalExpenses: closing.totalExpenses,
        totalRevenue: closing.totalRevenue,
        netProfit: closing.netProfit,
        openingCash: closing.openingCash,
        openingBank: closing.openingBank || 0,
        cashSales: closing.cashSales,
        cashReceipts: closing.cashReceipts,
        cashPayments: closing.cashPayments,
        closingCash: closing.closingCash,
        closingBank: closing.closingBank || 0,
        bankSales: closing.bankSales || 0,
        bankPayments: closing.bankPayments || 0,
        totalOpeningBalance: closing.totalOpeningBalance || 0,
        totalClosingBalance: closing.totalClosingBalance || 0,
        salesCount: closing.salesCount,
        totalDiscount: closing.totalDiscount,
        totalTax: closing.totalTax,
        openingStock: closing.openingStock,
        closingStock: closing.closingStock,
        stockValue: closing.stockValue,
        ledgerEntriesCount: closing.ledgerEntriesCount,
        trialBalanceMatched: closing.trialBalanceMatched,
        totalDebits: closing.totalDebits,
        totalCredits: closing.totalCredits,
        closedBy: closing.closedBy,
        closedAt: closing.closedAt,
        notes: closing.notes,
      },
      sales: sales.map((s: any) => ({
        invoiceNumber: s.invoiceNumber,
        saleDate: s.saleDate,
        customerName: s.customerName,
        grandTotal: s.grandTotal,
        paymentMethod: s.paymentMethod,
        items: s.items,
      })),
      expenses,
      purchases,
      inventory,
      outletName: outlet?.name || 'AutoCity',
      outletAddress: outlet?.address || '',
    };

    return NextResponse.json({ data: pdfData });
  } catch (error: any) {
    console.error('Error generating PDF data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}