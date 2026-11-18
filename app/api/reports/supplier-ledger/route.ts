import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType } from '@/lib/models/Account';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Purchase from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import Voucher from '@/lib/models/Voucher';
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
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    if (supplierId && !mongoose.Types.ObjectId.isValid(supplierId)) {
      return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
    }
    const [apAccount, suppliers, purchases] = await Promise.all([
      Account.findOne({ outletId, subType: AccountSubType.ACCOUNTS_PAYABLE }).lean(),
      Supplier.find({ outletId, ...(supplierId ? { _id: supplierId } : {}) }).sort({ name: 1 }).lean(),
      Purchase.find({ outletId, ...(supplierId ? { supplierId } : {}) }).select('_id supplierId grandTotal amountPaid returnedTotal settlementDiscountTotal status purchaseNumber supplierBillNumber purchaseDate payments').lean(),
    ]);
    if (!apAccount) throw new Error('Accounts Payable system account is missing');
    const entries: any[] = await LedgerEntry.find({ outletId, accountId: (apAccount as any)._id, ...(supplierId ? { referenceId: { $in: [new mongoose.Types.ObjectId(supplierId), ...purchases.map(p => p._id)] } } : {}) })
      .select('date createdAt lineNumber referenceId referenceNumber referenceType voucherNumber narration debit credit')
      .sort({ date: 1, createdAt: 1, lineNumber: 1 })
      .allowDiskUse(true)
      .lean();
    const supplierIds = new Set((suppliers as any[]).map((supplier) => String(supplier._id)));
    const purchaseToSupplier = new Map((purchases as any[]).map((purchase) => [String(purchase._id), String(purchase.supplierId)]));
    const supplierForEntry = (entry: any) => {
      const ref = String(entry.referenceId || '');
      return purchaseToSupplier.get(ref) || (supplierIds.has(ref) ? ref : undefined);
    };

    if (!supplierId) {
      const balanceMap = new Map<string, number>();
      for (const entry of entries) {
        const id = supplierForEntry(entry);
        if (!id) continue;
        balanceMap.set(id, (balanceMap.get(id) || 0) + Number(entry.credit || 0) - Number(entry.debit || 0));
      }
      return NextResponse.json({
        suppliers: (suppliers as any[]).map((supplier) => {
          const docs = (purchases as any[]).filter((purchase) => String(purchase.supplierId) === String(supplier._id) && purchase.status !== 'CANCELLED');
          return {
            ...supplier,
            totalPurchases: round(docs.reduce((sum, purchase) => sum + Number(purchase.grandTotal || 0) - Number(purchase.returnedTotal || 0) - Number(purchase.settlementDiscountTotal || 0), 0)),
            totalPaid: round(docs.reduce((sum, purchase) => sum + Number(purchase.amountPaid || 0), 0)),
            balance: round(balanceMap.get(String(supplier._id)) || 0),
            purchasesCount: docs.length,
          };
        }),
      });
    }

    const supplier: any = await Supplier.findOne({ _id: supplierId, outletId }).lean();
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    const fromDate = new Date(searchParams.get('fromDate') || new Date(new Date().getFullYear(), 0, 1));
    const toDate = new Date(searchParams.get('toDate') || new Date());
    toDate.setHours(23, 59, 59, 999);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }
    const supplierEntries = entries.filter((entry) => supplierForEntry(entry) === supplierId);
    let runningBalance = supplierEntries
      .filter((entry) => new Date(entry.date) < fromDate)
      .reduce((sum, entry) => sum + Number(entry.credit || 0) - Number(entry.debit || 0), 0);
    const openingBalance = round(runningBalance);
    const ledgerEntries = supplierEntries
      .filter((entry) => new Date(entry.date) >= fromDate && new Date(entry.date) <= toDate)
      .map((entry) => {
        runningBalance += Number(entry.credit || 0) - Number(entry.debit || 0);
        return {
          date: entry.date,
          type: entry.referenceType,
          reference: entry.referenceNumber || entry.voucherNumber,
          description: entry.narration,
          debit: Number(entry.debit || 0),
          credit: Number(entry.credit || 0),
          balance: round(runningBalance),
        };
      });
    const supplierPurchases = (purchases as any[]).filter((purchase) => String(purchase.supplierId) === supplierId && purchase.status !== 'CANCELLED');
    const directPayments: any[] = await Voucher.find({ outletId, referenceId: supplier._id, referenceType: { $in: ['SUPPLIER_PAYMENT', 'PAYMENT'] }, status: { $in: ['posted', 'approved'] }, date: { $lte: toDate } }).select('_id').lean();
    const directPaymentIds = new Set(directPayments.map(voucher => String(voucher._id)));
    const bills = supplierPurchases.filter(purchase => new Date(purchase.purchaseDate) <= toDate).map(purchase => {
      const billEntries = supplierEntries.filter(entry => String(entry.referenceId) === String(purchase._id) && new Date(entry.date) <= toDate);
      const allocated = (purchase.payments || []).filter((payment: any) => directPaymentIds.has(String(payment.voucherId)) && (!payment.supplierReassignedAt || new Date(payment.supplierReassignedAt) > toDate)).reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
      return { purchaseId: purchase._id, purchaseNumber: purchase.purchaseNumber, supplierBillNumber: purchase.supplierBillNumber, date: purchase.purchaseDate,
        balance: round(billEntries.reduce((sum, entry) => sum + Number(entry.credit || 0) - Number(entry.debit || 0), 0) - allocated),
        hasLedgerEntries: billEntries.length > 0 };
    });
    const unallocatedBalance = round(runningBalance - bills.reduce((sum, bill) => sum + bill.balance, 0));
    return NextResponse.json({
      supplier,
      ledgerEntries,
      bills,
      unallocatedBalance,
      summary: {
        openingBalance,
        totalDebit: round(ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0)),
        totalCredit: round(ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0)),
        closingBalance: round(runningBalance),
        purchasesCount: supplierPurchases.length,
        transactionsCount: ledgerEntries.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
