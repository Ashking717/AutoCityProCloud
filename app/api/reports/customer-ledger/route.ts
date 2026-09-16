import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import Account, { AccountSubType } from '@/lib/models/Account';
import Customer from '@/lib/models/Customer';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Sale from '@/lib/models/Sale';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const arAccount: any = await Account.findOne({
      outletId: user.outletId,
      subType: AccountSubType.ACCOUNTS_RECEIVABLE,
    }).lean();
    if (!arAccount) throw new Error('Accounts Receivable system account is missing');

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      const [customers, sales] = await Promise.all([
        Customer.find({ outletId: user.outletId }).lean(),
        Sale.find({ outletId: user.outletId }).select('_id customerId').lean(),
      ]);
      const customerBySale = new Map(sales.map((sale: any) => [String(sale._id), String(sale.customerId)]));
      const saleTotals = await Sale.find({ outletId: user.outletId, status: { $ne: 'CANCELLED' } })
        .select('customerId grandTotal amountPaid returns')
        .lean();
      const metrics = new Map<string, { totalSales: number; totalPaid: number; salesCount: number }>();
      for (const sale of saleTotals as any[]) {
        const key = String(sale.customerId);
        const current = metrics.get(key) || { totalSales: 0, totalPaid: 0, salesCount: 0 };
        const returned = (sale.returns || []).reduce((sum: number, entry: any) => sum + Number(entry.totalAmount || 0), 0);
        current.totalSales += Number(sale.grandTotal || 0) - returned;
        current.totalPaid += Number(sale.amountPaid || 0);
        current.salesCount += 1;
        metrics.set(key, current);
      }
      const entries = await LedgerEntry.find({
        outletId: user.outletId,
        accountId: arAccount._id,
        referenceId: { $in: sales.map((sale: any) => sale._id) },
      }).select('referenceId debit credit').lean();
      const balanceByCustomer = new Map<string, number>();
      for (const entry of entries) {
        const customer = customerBySale.get(String(entry.referenceId));
        if (!customer) continue;
        balanceByCustomer.set(
          customer,
          (balanceByCustomer.get(customer) || 0) + Number(entry.debit || 0) - Number(entry.credit || 0)
        );
      }
      return NextResponse.json({
        customers: customers.map((customer: any) => ({
          ...customer,
          totalSales: Number((metrics.get(String(customer._id))?.totalSales || 0).toFixed(2)),
          totalPaid: Number((metrics.get(String(customer._id))?.totalPaid || 0).toFixed(2)),
          salesCount: metrics.get(String(customer._id))?.salesCount || 0,
          balance: Number((balanceByCustomer.get(String(customer._id)) || 0).toFixed(2)),
        })),
      });
    }

    const customer = await Customer.findOne({ _id: customerId, outletId: user.outletId }).lean();
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    const sales = await Sale.find({ outletId: user.outletId, customerId }).select('_id').lean();
    const saleIds = sales.map((sale: any) => sale._id);
    const fromDate = new Date(searchParams.get('fromDate') || new Date(0));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    toDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    const [openingRows, periodRows] = await Promise.all([
      LedgerEntry.find({
        outletId: user.outletId,
        accountId: arAccount._id,
        referenceId: { $in: saleIds },
        date: { $lt: fromDate },
      }).select('debit credit').lean(),
      LedgerEntry.find({
        outletId: user.outletId,
        accountId: arAccount._id,
        referenceId: { $in: saleIds },
        date: { $gte: fromDate, $lte: toDate },
      }).sort({ date: 1, createdAt: 1 }).lean(),
    ]);
    let runningBalance = openingRows.reduce(
      (sum, entry) => sum + Number(entry.debit || 0) - Number(entry.credit || 0),
      0
    );
    const openingBalance = Number(runningBalance.toFixed(2));
    const ledgerEntries = periodRows.map((entry: any) => {
      runningBalance += Number(entry.debit || 0) - Number(entry.credit || 0);
      return {
        date: entry.date,
        type: entry.referenceType,
        reference: entry.referenceNumber || entry.voucherNumber,
        description: entry.narration,
        debit: entry.debit,
        credit: entry.credit,
        balance: Number(runningBalance.toFixed(2)),
      };
    });
    return NextResponse.json({
      customer,
      ledgerEntries,
      summary: {
        openingBalance,
        totalDebit: ledgerEntries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0),
        totalCredit: ledgerEntries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0),
        closingBalance: Number(runningBalance.toFixed(2)),
        transactionCount: ledgerEntries.length,
        salesCount: sales.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
