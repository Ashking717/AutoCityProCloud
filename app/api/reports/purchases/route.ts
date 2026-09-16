import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import Purchase from '@/lib/models/Purchase';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { hasPermission } from '@/lib/types/roles';

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewAllReports')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    const purchases: any[] = await Purchase.find({
      outletId: user.outletId,
      purchaseDate: { $gte: fromDate, $lte: toDate },
      status: { $in: ['COMPLETED', 'PAID'] },
    }).sort({ purchaseDate: -1 }).lean();

    const supplierPurchases: Record<string, { count: number; amount: number; payments: number }> = {};
    const categoryPurchases: Record<string, { count: number; amount: number }> = {};
    for (const purchase of purchases) {
      const supplier = purchase.supplierName || 'Unknown Supplier';
      if (!supplierPurchases[supplier]) supplierPurchases[supplier] = { count: 0, amount: 0, payments: 0 };
      supplierPurchases[supplier].count += 1;
      supplierPurchases[supplier].amount = round(supplierPurchases[supplier].amount + Number(purchase.grandTotal || 0));
      supplierPurchases[supplier].payments = round(supplierPurchases[supplier].payments + Number(purchase.amountPaid || 0));
      for (const item of purchase.items || []) {
        const category = item.category || item.name || 'Uncategorized';
        if (!categoryPurchases[category]) categoryPurchases[category] = { count: 0, amount: 0 };
        categoryPurchases[category].count += Number(item.quantity || 0);
        categoryPurchases[category].amount = round(categoryPurchases[category].amount + Number(item.total || 0) + Number(item.taxAmount || 0));
      }
    }
    const totalPurchaseAmount = round(purchases.reduce((sum, purchase) => sum + Number(purchase.grandTotal || 0), 0));
    const totalPaymentAmount = round(purchases.reduce((sum, purchase) => sum + Number(purchase.amountPaid || 0), 0));
    const paymentCount = purchases.reduce((sum, purchase) => {
      const laterPayments = Array.isArray(purchase.payments) ? purchase.payments.length : 0;
      const laterAmount = (purchase.payments || []).reduce((value: number, payment: any) => value + Number(payment.amount || 0), 0);
      const initialPayment = Number(purchase.amountPaid || 0) - laterAmount > 0.01 ? 1 : 0;
      return sum + laterPayments + initialPayment;
    }, 0);
    return NextResponse.json({
      purchases: purchases.map((purchase) => ({
        _id: purchase._id,
        date: purchase.purchaseDate,
        voucherNumber: purchase.purchaseNumber,
        narration: `Purchase from ${purchase.supplierName}`,
        totalDebit: Number(purchase.grandTotal || 0),
        status: purchase.status.toLowerCase(),
        supplier: purchase.supplierName,
        items: purchase.items?.length || 0,
      })),
      summary: {
        totalPurchases: purchases.length,
        totalPurchaseAmount,
        totalPaymentAmount,
        totalPayments: paymentCount,
        averagePurchaseValue: purchases.length ? round(totalPurchaseAmount / purchases.length) : 0,
        outstandingPayables: round(purchases.reduce((sum, purchase) => sum + Number(purchase.balanceDue || 0), 0)),
      },
      supplierPurchases,
      categoryPurchases,
      metadata: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        generatedAt: new Date().toISOString(),
        dataSource: 'Purchase Documents',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
