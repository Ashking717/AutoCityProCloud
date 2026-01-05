import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Customer from '@/lib/models/Customer';
import Sale from '@/lib/models/Sale';
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
    
    const customerId = searchParams.get('customerId');
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    
    if (!customerId) {
      // Return all customers with balances
      const customers = await Customer.find({
        outletId: user.outletId,
        isActive: true,
      }).lean();
      
      const customersWithBalance = await Promise.all(
        customers.map(async (customer: any) => {
          const sales = await Sale.find({
            outletId: user.outletId,
            customerId: customer._id,
            status: { $in: ['COMPLETED', 'REFUNDED'] },
          }).lean();
          
          const totalSales = sales.reduce((sum, s: any) => sum + (s.grandTotal || 0), 0);
          const totalPaid = sales.reduce((sum, s: any) => sum + (s.amountPaid || 0), 0);
          const balance = sales.reduce((sum, s: any) => sum + (s.balanceDue || 0), 0);
          
          return {
            ...customer,
            totalSales,
            totalPaid,
            balance,
            salesCount: sales.length,
          };
        })
      );
      
      return NextResponse.json({ customers: customersWithBalance });
    }
    
    // Get specific customer ledger
    const customer = await Customer.findById(customerId).lean();
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    const sales = await Sale.find({
      outletId: user.outletId,
      customerId,
      saleDate: { $gte: fromDate, $lte: toDate },
      status: { $in: ['COMPLETED', 'REFUNDED'] },
    })
      .sort({ saleDate: 1 })
      .lean();
    
    // Build ledger entries
    const ledgerEntries = sales.map((sale: any) => ({
      date: sale.saleDate,
      type: 'sale',
      reference: sale.invoiceNumber || 'N/A',
      description: `Sale - ${sale.items?.length || 0} items`,
      debit: sale.grandTotal || 0,
      credit: sale.amountPaid || 0,
      balance: 0,
    }));
    
    // Calculate running balance
    let runningBalance = 0;
    ledgerEntries.forEach((entry) => {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    });
    
    const summary = {
      totalDebit: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
      closingBalance: runningBalance,
      salesCount: sales.length,
    };
    
    return NextResponse.json({
      customer,
      ledgerEntries,
      summary,
    });
  } catch (error: any) {
    console.error('Error generating customer ledger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
