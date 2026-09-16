import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { connectDB } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';
import Sale from '@/lib/models/Sale';
import { hasPermission } from '@/lib/types/roles';

function round(value: number) {
  return Number(value.toFixed(2));
}

function lineKey(item: any) {
  return item.productId ? `product:${item.productId}` : `sku:${item.sku}`;
}

function getNetSale(sale: any) {
  const returnedByLine = new Map<string, { quantity: number; net: number; vat: number; cost: number }>();
  let returnedGross = 0;
  for (const saleReturn of sale.returns || []) {
    returnedGross += Number(saleReturn.totalAmount || 0);
    for (const item of saleReturn.items || []) {
      const key = lineKey(item);
      const current = returnedByLine.get(key) || { quantity: 0, net: 0, vat: 0, cost: 0 };
      current.quantity += Number(item.quantity || 0);
      current.net += Number(item.netAmount ?? (Number(item.totalAmount || 0) - Number(item.vatAmount || 0)));
      current.vat += Number(item.vatAmount || 0);
      current.cost += Number(item.costPrice || 0) * Number(item.quantity || 0);
      returnedByLine.set(key, current);
    }
  }

  const items = (sale.items || []).map((item: any) => {
    const returned = returnedByLine.get(lineKey(item)) || { quantity: 0, net: 0, vat: 0, cost: 0 };
    const quantity = Math.max(0, Number(item.quantity || 0) - returned.quantity);
    const revenue = Math.max(0, Number(item.total || 0) - returned.net);
    const cost = Math.max(0, Number(item.costPrice || 0) * Number(item.quantity || 0) - returned.cost);
    const vat = Math.max(0, Number(item.vatAmount || 0) - returned.vat);
    const discount = Number(item.quantity || 0) > 0
      ? Number(item.discount || 0) * (quantity / Number(item.quantity))
      : 0;
    return {
      ...item,
      netQuantity: quantity,
      netRevenue: round(revenue),
      netCost: round(cost),
      netVAT: round(vat),
      netDiscount: round(discount),
    };
  });

  return {
    ...sale,
    returnedAmount: round(returnedGross),
    netGrandTotal: round(Math.max(0, Number(sale.grandTotal || 0) - returnedGross)),
    netVAT: round(items.reduce((sum: number, item: any) => sum + item.netVAT, 0)),
    netDiscount: round(items.reduce((sum: number, item: any) => sum + item.netDiscount, 0)),
    netProfit: round(items.reduce((sum: number, item: any) => sum + item.netRevenue - item.netCost, 0)),
    items,
  };
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
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    toDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const rows = await Sale.find({
      outletId: user.outletId,
      saleDate: { $gte: fromDate, $lte: toDate },
      status: { $in: ['COMPLETED', 'REFUNDED'] },
    })
      .populate('customerId', 'name phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ saleDate: -1 })
      .lean();
    const sales = (rows as any[]).map(getNetSale);

    const totalRevenue = round(sales.reduce((sum, sale) => sum + sale.netGrandTotal, 0));
    const summary = {
      totalSales: sales.length,
      totalRevenue,
      totalProfit: round(sales.reduce((sum, sale) => sum + sale.netProfit, 0)),
      totalDiscount: round(sales.reduce((sum, sale) => sum + sale.netDiscount, 0)),
      totalTax: round(sales.reduce((sum, sale) => sum + sale.netVAT, 0)),
      totalReturns: round(sales.reduce((sum, sale) => sum + sale.returnedAmount, 0)),
      averageOrderValue: sales.length ? round(totalRevenue / sales.length) : 0,
    };

    const productSales: Record<string, { quantity: number; revenue: number; profit: number }> = {};
    const customerSales: Record<string, { count: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!productSales[item.name]) productSales[item.name] = { quantity: 0, revenue: 0, profit: 0 };
        productSales[item.name].quantity += item.netQuantity;
        productSales[item.name].revenue = round(productSales[item.name].revenue + item.netRevenue);
        productSales[item.name].profit = round(productSales[item.name].profit + item.netRevenue - item.netCost);
      }
      const customerName = sale.customerName || 'Walk-in Customer';
      if (!customerSales[customerName]) customerSales[customerName] = { count: 0, revenue: 0 };
      customerSales[customerName].count += 1;
      customerSales[customerName].revenue = round(customerSales[customerName].revenue + sale.netGrandTotal);
    }

    return NextResponse.json({ sales, summary, productSales, customerSales });
  } catch (error: any) {
    console.error('Error generating sales report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
