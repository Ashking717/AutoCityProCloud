// app/api/closings/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Closing from '@/lib/models/Closing';
import Sale from '@/lib/models/Sale';
import Purchase from '@/lib/models/Purchase';
import Expense from '@/lib/models/Expense';
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

    // Fetch purchases
    const purchasesData = await Purchase.find({
      outletId: user.outletId,
      purchaseDate: {
        $gte: new Date(closing.periodStart),
        $lte: new Date(closing.periodEnd),
      },
      status: { $in: ['PAID', 'COMPLETED'] },
    })
      .select('purchaseNumber purchaseDate supplierName amountPaid totalAmount')
      .lean();

    const purchases = purchasesData.map((p: any) => ({
      voucherNumber: p.purchaseNumber || 'N/A',
      date: p.purchaseDate,
      supplierName: p.supplierName || 'Unknown',
      amount: p.amountPaid || p.totalAmount || 0,
    }));

    // Fetch expenses
    const expensesData = await Expense.find({
      outletId: user.outletId,
      expenseDate: {
        $gte: new Date(closing.periodStart),
        $lte: new Date(closing.periodEnd),
      },
      status: { $in: ['PAID', 'PARTIALLY_PAID'] },
    })
      .select('expenseNumber expenseDate description category amountPaid totalAmount')
      .lean();

    const expenses = expensesData.map((e: any) => ({
      voucherNumber: e.expenseNumber || 'N/A',
      date: e.expenseDate,
      description: e.description || 'Expense',
      amount: e.amountPaid || e.totalAmount || 0,
      category: e.category || 'General',
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
        totalPurchases: closing.totalPurchases || 0,
        totalExpenses: closing.totalExpenses || 0,
        totalRevenue: closing.totalRevenue || 0,
        netProfit: closing.netProfit || 0,
        openingCash: closing.openingCash || 0,
        openingBank: closing.openingBank || 0,
        cashSales: closing.cashSales || 0,
        cashReceipts: closing.cashReceipts || 0,
        cashPayments: closing.cashPayments || 0,
        closingCash: closing.closingCash || 0,
        closingBank: closing.closingBank || 0,
        bankSales: closing.bankSales || 0,
        bankPayments: closing.bankPayments || 0,
        totalOpeningBalance: closing.totalOpeningBalance || 0,
        totalClosingBalance: closing.totalClosingBalance || 0,
        salesCount: closing.salesCount || 0,
        purchasesCount: closing.purchasesCount || 0,
        expensesCount: closing.expensesCount || 0,
        totalDiscount: closing.totalDiscount || 0,
        totalTax: closing.totalTax || 0,
        openingStock: closing.openingStock || 0,
        closingStock: closing.closingStock || 0,
        stockValue: closing.stockValue || 0,
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