import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Supplier from '@/lib/models/Supplier';
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
    
    const supplierId = searchParams.get('supplierId');
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    
    if (!supplierId) {
      // Return all suppliers with balances
      const suppliers = await Supplier.find({
        outletId: user.outletId,
        isActive: true,
      }).lean();
      
      const suppliersWithBalance = await Promise.all(
        suppliers.map(async (supplier: any) => {
          // Get purchase vouchers for this supplier
          const vouchers = await Voucher.find({
            outletId: user.outletId,
            voucherType: { $in: ['purchase', 'payment'] },
            status: { $in: ['posted', 'approved'] },
            'entries.accountName': supplier.name,
          }).lean();
          
          let totalPurchases = 0;
          let totalPayments = 0;
          
          vouchers.forEach((voucher: any) => {
            voucher.entries.forEach((entry: any) => {
              if (entry.accountName === supplier.name) {
                if (voucher.voucherType === 'purchase') {
                  totalPurchases += entry.credit || 0;
                } else if (voucher.voucherType === 'payment') {
                  totalPayments += entry.debit || 0;
                }
              }
            });
          });
          
          return {
            ...supplier,
            totalPurchases,
            totalPayments,
            balance: totalPurchases - totalPayments,
            transactionCount: vouchers.length,
          };
        })
      );
      
      return NextResponse.json({ suppliers: suppliersWithBalance });
    }
    
    // Get specific supplier ledger
    const supplier = await Supplier.findById(supplierId).lean();
    
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    
    const vouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
      voucherType: { $in: ['purchase', 'payment'] },
      'entries.accountName': (supplier as any).name,
    })
      .sort({ date: 1 })
      .lean();
    
    // Build ledger entries
    const ledgerEntries: any[] = [];
    let runningBalance = 0;
    
    vouchers.forEach((voucher: any) => {
      voucher.entries.forEach((entry: any) => {
        if (entry.accountName === (supplier as any).name) {
          const debit = entry.debit || 0;
          const credit = entry.credit || 0;
          
          runningBalance += credit - debit;
          
          ledgerEntries.push({
            date: voucher.date,
            type: voucher.voucherType,
            reference: voucher.voucherNumber,
            description: voucher.narration,
            debit,
            credit,
            balance: runningBalance,
          });
        }
      });
    });
    
    const summary = {
      totalDebit: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
      closingBalance: runningBalance,
      transactionCount: ledgerEntries.length,
    };
    
    return NextResponse.json({
      supplier,
      ledgerEntries,
      summary,
    });
  } catch (error: any) {
    console.error('Error generating supplier ledger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
