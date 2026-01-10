// app/api/reports/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Sale from '@/lib/models/Sale';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import Product from '@/lib/models/ProductEnhanced';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

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
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    
    // Set toDate to end of day
    toDate.setHours(23, 59, 59, 999);
    
    const sales = await Sale.find({
      outletId: user.outletId,
      saleDate: { $gte: fromDate, $lte: toDate },
      status: { $in: ['COMPLETED', 'REFUNDED'] },
    })
      .populate('customerId', 'name phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ saleDate: -1 })
      .lean();
    
    // Get all unique product IDs from sales
    const productIds = new Set<string>();
    sales.forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (item.productId) {
            productIds.add(item.productId.toString());
          }
        });
      }
    });
    
    // Fetch products to get cost prices
    const products = await Product.find({
      _id: { $in: Array.from(productIds) },
      outletId: user.outletId,
    }).select('_id name costPrice').lean();
    
    // Create a map of product ID to cost price
    const productCostMap = new Map();
    products.forEach((product: any) => {
      productCostMap.set(product._id.toString(), product.costPrice || 0);
    });
    
    // Calculate summary with actual profit
    let totalProfit = 0;
    
    sales.forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const costPrice = item.productId 
            ? productCostMap.get(item.productId.toString()) || 0 
            : 0;
          const sellingPrice = item.unitPrice || 0;
          const quantity = item.quantity || 0;
          
          // Profit = (Selling Price - Cost Price) * Quantity
          const itemProfit = (sellingPrice - costPrice) * quantity;
          totalProfit += itemProfit;
        });
      }
    });
    
    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s: any) => sum + (s.grandTotal || 0), 0),
      totalProfit: totalProfit,
      totalDiscount: sales.reduce((sum, s: any) => sum + (s.totalDiscount || 0), 0),
      totalTax: sales.reduce((sum, s: any) => sum + (s.totalTax || 0), 0),
      averageOrderValue: 0,
    };
    
    if (sales.length > 0) {
      summary.averageOrderValue = summary.totalRevenue / sales.length;
    }
    
    // Sales by product with actual profit
    const productSales: { [key: string]: { quantity: number; revenue: number; profit: number } } = {};
    
    sales.forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const productName = item.name || 'Unknown Product';
          const costPrice = item.productId 
            ? productCostMap.get(item.productId.toString()) || 0 
            : 0;
          const sellingPrice = item.unitPrice || 0;
          const quantity = item.quantity || 0;
          const itemProfit = (sellingPrice - costPrice) * quantity;
          
          if (!productSales[productName]) {
            productSales[productName] = { quantity: 0, revenue: 0, profit: 0 };
          }
          
          productSales[productName].quantity += quantity;
          productSales[productName].revenue += item.total || 0;
          productSales[productName].profit += itemProfit;
        });
      }
    });
    
    // Sales by customer
    const customerSales: { [key: string]: { count: number; revenue: number } } = {};
    
    sales.forEach((sale: any) => {
      const customerName = sale.customerName || 'Walk-in Customer';
      
      if (!customerSales[customerName]) {
        customerSales[customerName] = { count: 0, revenue: 0 };
      }
      
      customerSales[customerName].count += 1;
      customerSales[customerName].revenue += sale.grandTotal || 0;
    });
    
    return NextResponse.json({
      sales,
      summary,
      productSales,
      customerSales,
    });
  } catch (error: any) {
    console.error('Error generating sales report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}