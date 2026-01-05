import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Sale from '@/lib/models/Sale';
import Voucher from '@/lib/models/Voucher';
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
    
    const date = new Date(searchParams.get('date') || new Date());
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    // Get all sales for the day
    const sales = await Sale.find({
      outletId: user.outletId,
      saleDate: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('customerId', 'name')
      .sort({ saleDate: 1 })
      .lean();
    
    // Get all vouchers for the day
    const vouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['posted', 'approved'] },
    })
      .sort({ date: 1 })
      .lean();
    
    // Combine and create daybook entries
    const entries: any[] = [];
    
    // Add sales
    sales.forEach(sale => {
      entries.push({
        time: sale.saleDate,
        type: 'Sale',
        reference: sale.invoiceNumber,
        description: `Sale to ${sale.customerName}`,
        debit: sale.grandTotal,
        credit: 0,
        balance: 0,
      });
    });
    
    // Add vouchers
    vouchers.forEach(voucher => {
      entries.push({
        time: voucher.date,
        type: voucher.voucherType.charAt(0).toUpperCase() + voucher.voucherType.slice(1),
        reference: voucher.voucherNumber,
        description: voucher.narration,
        debit: voucher.totalDebit,
        credit: voucher.totalCredit,
        balance: 0,
      });
    });
    
    // Sort by time
    entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    // Calculate running balance
    let runningBalance = 0;
    entries.forEach(entry => {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    });
    
    const summary = {
      totalDebit: entries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: entries.reduce((sum, e) => sum + e.credit, 0),
      netBalance: runningBalance,
      totalTransactions: entries.length,
      salesCount: sales.length,
      vouchersCount: vouchers.length,
    };
    
    return NextResponse.json({
      entries,
      summary,
      date: startOfDay,
    });
  } catch (error: any) {
    console.error('Error generating daybook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
