import { NextRequest, NextResponse } from 'next/server';
import Sale from '@/lib/models/Sale';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { Parser } from 'json2csv';
import mongoose from 'mongoose';

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
      outletId: new mongoose.Types.ObjectId(user.outletId as string),
    };
    
    // Add date filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    if (status) {
      query.status = status;
    }
    
    // Fetch sales with proper population
    const sales = await Sale.find(query)
      .populate({
        path: 'customerId',
        select: 'name phone',
        model: 'Customer'
      })
      .sort({ saleDate: -1 })
      .lean();
    
    // Convert to CSV
    const fields = [
      'invoiceNumber',
      'saleDate',
      'customerName',
      'customerPhone',
      'itemsCount',
      'subtotal',
      'totalTax',
      'totalDiscount',
      'grandTotal',
      'amountPaid',
      'balanceDue',
      'paymentMethod',
      'status',
      'notes'
    ];
    
    const data = sales.map(sale => {
      // Handle customer data - it might be populated or just an ObjectId
      let customerName = '';
      let customerPhone = '';
      
      if (sale.customerId) {
        if (typeof sale.customerId === 'object' && sale.customerId !== null) {
          // Customer is populated
          customerName = (sale.customerId as any).name || sale.customerName || '';
          customerPhone = (sale.customerId as any).phone || '';
        } else {
          // Customer is just an ObjectId, use the stored customerName
          customerName = sale.customerName || '';
        }
      } else {
        customerName = sale.customerName || '';
      }
      
      return {
        invoiceNumber: sale.invoiceNumber,
        saleDate: new Date(sale.saleDate).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        customerName,
        customerPhone,
        itemsCount: sale.items?.length || 0,
        subtotal: sale.subtotal,
        totalTax: sale.totalTax,
        totalDiscount: sale.totalDiscount,
        grandTotal: sale.grandTotal,
        amountPaid: sale.amountPaid,
        balanceDue: sale.balanceDue,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        notes: sale.notes || ''
      };
    });
    
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(data);
    
    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sales-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
    
  } catch (error: any) {
    console.error('Error exporting sales:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to export sales' 
    }, { status: 500 });
  }
}