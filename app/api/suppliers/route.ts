import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import LedgerEntry from '@/lib/models/LedgerEntry';
import Purchase from '@/lib/models/Purchase';
import Supplier from '@/lib/models/Supplier';
import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongodb';
import { createPostedVoucher } from '@/lib/services/voucherPostingService';
import { ReferenceType, VoucherType } from '@/lib/models/Voucher';
import { hasPermission } from '@/lib/types/roles';

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function GET() {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases') && !hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const [suppliers, purchases, apAccount] = await Promise.all([
      Supplier.find({ outletId, isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      Purchase.find({ outletId }).select('_id supplierId grandTotal status').lean(),
      Account.findOne({ outletId, subType: AccountSubType.ACCOUNTS_PAYABLE, isActive: true }).lean(),
    ]);
    const purchaseToSupplier = new Map((purchases as any[]).map((purchase) => [String(purchase._id), String(purchase.supplierId)]));
    const supplierIds = new Set((suppliers as any[]).map((supplier) => String(supplier._id)));
    const balanceBySupplier = new Map<string, number>();
    if (apAccount) {
      const entries = await LedgerEntry.find({ outletId, accountId: (apAccount as any)._id })
        .select('referenceId debit credit')
        .lean();
      for (const entry of entries as any[]) {
        const reference = String(entry.referenceId || '');
        const supplierId = purchaseToSupplier.get(reference) || (supplierIds.has(reference) ? reference : undefined);
        if (!supplierId) continue;
        balanceBySupplier.set(
          supplierId,
          (balanceBySupplier.get(supplierId) || 0) + Number(entry.credit || 0) - Number(entry.debit || 0)
        );
      }
    }
    const metrics = new Map<string, { totalPurchases: number; count: number }>();
    for (const purchase of purchases as any[]) {
      if (purchase.status === 'CANCELLED') continue;
      const key = String(purchase.supplierId);
      const current = metrics.get(key) || { totalPurchases: 0, count: 0 };
      current.totalPurchases += Number(purchase.grandTotal || 0);
      current.count += 1;
      metrics.set(key, current);
    }
    return NextResponse.json({
      suppliers: (suppliers as any[]).map((supplier) => ({
        ...supplier,
        totalPurchases: round(metrics.get(String(supplier._id))?.totalPurchases || 0),
        purchasesCount: metrics.get(String(supplier._id))?.count || 0,
        currentBalance: round(balanceBySupplier.get(String(supplier._id)) || 0),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    const body = await request.json();
    const key = String(request.headers.get('idempotency-key') || body.operationKey || '').trim();
    if (!key) return NextResponse.json({ error: 'Idempotency-Key is required' }, { status: 400 });
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }
    const openingPayable = round(Number(body.openingBalance || 0));
    if (!Number.isFinite(openingPayable) || openingPayable < 0) {
      return NextResponse.json({ error: 'Opening payable must be a non-negative amount' }, { status: 400 });
    }
    const openingDate = body.openingBalanceDate ? new Date(body.openingBalanceDate) : new Date();
    if (Number.isNaN(openingDate.getTime())) {
      return NextResponse.json({ error: 'Invalid opening balance date' }, { status: 400 });
    }

    session = await mongoose.startSession();
    let responseData: any;
    await session.withTransaction(async () => {
      const outletId = new mongoose.Types.ObjectId(user.outletId!);
      const userId = new mongoose.Types.ObjectId(user.userId);
      const prior: any = await Supplier.findOne({ outletId, operationKey: key }).session(session!);
      if (prior) {
        responseData = { supplier: prior, openingVoucher: null, idempotent: true };
        return;
      }
      if (await Supplier.exists({ outletId, code }).session(session!)) {
        throw new Error('Supplier code already exists');
      }
      let openingEquity: any;
      let payable: any;
      if (openingPayable > 0) {
        payable = await Account.findOne({ outletId, subType: AccountSubType.ACCOUNTS_PAYABLE, isActive: true }).session(session!);
        if (!payable) throw new Error('Accounts Payable system account is missing');
        openingEquity = await Account.findOne({ outletId, code: 'OB-EQUITY', isActive: true }).session(session!);
        if (!openingEquity) {
          [openingEquity] = await Account.create([{
            code: 'OB-EQUITY',
            name: 'Opening Balance Equity',
            type: AccountType.EQUITY,
            subType: AccountSubType.OWNER_EQUITY,
            accountGroup: 'Owner Equity',
            isSystem: true,
            isActive: true,
            outletId,
          }], { session });
        }
      }

      const [supplier] = await Supplier.create([{
        code,
        name,
        contactPerson: body.contactPerson,
        phone,
        email: body.email,
        address: body.address,
        taxNumber: body.taxNumber,
        creditLimit: Number(body.creditLimit || 0),
        paymentTerms: body.paymentTerms,
        currentBalance: openingPayable,
        outletId,
        operationKey: key,
      }], { session });
      let openingVoucher: any = null;
      if (openingPayable > 0) {
        const result = await createPostedVoucher({
          voucherType: VoucherType.JOURNAL,
          date: openingDate,
          narration: `Supplier opening balance - ${supplier.name}`,
          entries: [
            { accountId: openingEquity._id, debit: openingPayable },
            { accountId: payable._id, credit: openingPayable },
          ],
          referenceType: ReferenceType.OPENING_BALANCE,
          referenceId: supplier._id,
          referenceNumber: supplier.code,
          postingKey: `supplier:${supplier._id}:opening`,
          outletId,
          createdBy: userId,
          metadata: {
            source: 'SUPPLIER_OPENING_BALANCE',
            supplierId: String(supplier._id),
            supplierCode: supplier.code,
            supplierName: supplier.name,
          },
        }, session);
        openingVoucher = result.voucher;
      }
      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'create',
        module: 'suppliers',
        description: openingPayable > 0
          ? `Created supplier ${name} with opening payable QAR ${openingPayable.toFixed(2)}`
          : `Created supplier: ${name}`,
        outletId,
        timestamp: new Date(),
      }], { session });
      responseData = { supplier, openingVoucher };
    });
    return NextResponse.json(responseData, { status: responseData?.idempotent ? 200 : 201 });
  } catch (error: any) {
    const status = error?.code === 11000 || /already exists/i.test(error.message) ? 409 : (/required|invalid|missing/i.test(error.message) ? 400 : 500);
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}
