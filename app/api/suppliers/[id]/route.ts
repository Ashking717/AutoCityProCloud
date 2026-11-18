import { NextRequest, NextResponse } from 'next/server';
import { signedSupplierOpening } from '@/lib/utils/supplierOpening';
import { connectDB } from '@/lib/db/mongodb';
import Supplier from '@/lib/models/Supplier';
import ActivityLog from '@/lib/models/ActivityLog';
import Account, { AccountSubType, AccountType } from '@/lib/models/Account';
import Voucher, { ReferenceType, VoucherType } from '@/lib/models/Voucher';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import mongoose from 'mongoose';
import { createPostedVoucher } from '@/lib/services/voucherPostingService';
import { supplierLedgerBalance, supplierOpeningLedgerBalance } from '@/lib/services/supplierLedgerBalance';

function round(value: number) {
  return Number(value.toFixed(2));
}

// GET /api/suppliers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    if (!hasPermission(user.role, 'canProcessPurchases') && !hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
    
    const supplier = await Supplier.findOne({
      _id: params.id,
      outletId: user.outletId,
    });
    
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    
    const opening = await supplierOpeningLedgerBalance(new mongoose.Types.ObjectId(user.outletId), supplier._id);
    const supplierData = supplier.toObject();
    return NextResponse.json({
      supplier: {
        ...supplierData,
        openingBalance: opening.amount,
        openingBalanceDate: supplierData.openingBalanceDate || opening.date,
      },
    });
  } catch (error: any) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/suppliers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId || !mongoose.Types.ObjectId.isValid(user.outletId)) {
      return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
    const body = await request.json();
    const changesOpeningBalance = body.openingBalance !== undefined;
    const operationKey = String(
      request.headers.get('idempotency-key') || body.operationKey || ''
    ).trim();
    if (changesOpeningBalance && (!operationKey || operationKey.length > 160)) {
      return NextResponse.json({ error: 'A valid Idempotency-Key is required' }, { status: 400 });
    }
    const {
      code,
      name,
      contactPerson,
      phone,
      email,
      address,
      taxNumber,
      creditLimit,
      paymentTerms,
      isActive,
    } = body;
    
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const userId = new mongoose.Types.ObjectId(user.userId);
    session = await mongoose.startSession();
    let responseData: any;
    await session.withTransaction(async () => {
      const supplier: any = await Supplier.findOne({ _id: params.id, outletId }).session(session!);
      if (!supplier) throw new Error('Supplier not found');
      if (changesOpeningBalance && supplier.lastOpeningBalanceKey === operationKey) {
        responseData = { supplier, idempotent: true };
        return;
      }

      let openingDelta = 0;
      let newOpeningBalance = Number(supplier.openingBalance || 0);
      let openingDate = supplier.openingBalanceDate || new Date();
      if (changesOpeningBalance) {
        newOpeningBalance = signedSupplierOpening(body.openingBalance, body.openingBalanceType);
        openingDate = body.openingBalanceDate ? new Date(body.openingBalanceDate) : openingDate;
        if (Number.isNaN(openingDate.getTime())) throw new Error('Invalid opening balance date');

        const previousOpeningBalance = (await supplierOpeningLedgerBalance(outletId, supplier._id, session!)).amount;
        openingDelta = round(newOpeningBalance - Number(previousOpeningBalance || 0));
        supplier.currentBalance = await supplierLedgerBalance(outletId, supplier._id, session!);

        if (Math.abs(openingDelta) > 0.001) {
          const payable: any = await Account.findOne({
            outletId,
            subType: AccountSubType.ACCOUNTS_PAYABLE,
            isActive: true,
          }).session(session!);
          if (!payable) throw new Error('Accounts Payable system account is missing');
          let openingEquity: any = await Account.findOne({
            outletId,
            code: 'OB-EQUITY',
            isActive: true,
          }).session(session!);
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
          const amount = Math.abs(openingDelta);
          await createPostedVoucher({
            voucherType: VoucherType.JOURNAL,
            date: openingDate,
            narration: `Supplier opening balance correction - ${supplier.name}`,
            entries: openingDelta > 0
              ? [{ accountId: openingEquity._id, debit: amount }, { accountId: payable._id, credit: amount }]
              : [{ accountId: payable._id, debit: amount }, { accountId: openingEquity._id, credit: amount }],
            referenceType: ReferenceType.OPENING_BALANCE,
            referenceId: supplier._id,
            referenceNumber: supplier.code,
            postingKey: `supplier:${supplier._id}:opening-correction:${operationKey}`,
            outletId,
            createdBy: userId,
            metadata: {
              source: 'SUPPLIER_OPENING_BALANCE_CORRECTION',
              supplierId: String(supplier._id),
              previousOpeningBalance: Number(previousOpeningBalance || 0),
              newOpeningBalance,
              adjustment: openingDelta,
            },
          }, session!);
        }
        supplier.openingBalance = newOpeningBalance;
        supplier.openingBalanceDate = openingDate;
        supplier.lastOpeningBalanceKey = operationKey;
        supplier.currentBalance = round(Number(supplier.currentBalance || 0) + openingDelta);
      }

      for (const field of ['code', 'name', 'contactPerson', 'phone', 'email', 'address', 'taxNumber', 'creditLimit', 'paymentTerms']) {
        if (body[field] !== undefined) supplier[field] = body[field];
      }
      if (typeof isActive === 'boolean') supplier.isActive = isActive;
      await supplier.save({ session });

      await ActivityLog.create([{
        userId,
        username: user.email,
        actionType: 'update',
        module: 'suppliers',
        description: Math.abs(openingDelta) > 0.001
          ? `Updated supplier ${supplier.name}; opening payable adjusted by QAR ${openingDelta.toFixed(2)}`
          : `Updated supplier: ${supplier.name}`,
        outletId,
        timestamp: new Date(),
      }], { session });
      responseData = { supplier, openingBalanceAdjustment: openingDelta };
    });
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    const status = /required|invalid|not found|non-negative|cannot be reduced|missing/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  } finally {
    if (session) await session.endSession();
  }
}

// DELETE /api/suppliers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canProcessPurchases')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Invalid supplier ID' }, { status: 400 });
    
    const supplier = await Supplier.findOneAndUpdate({
      _id: params.id,
      outletId: user.outletId,
    }, { $set: { isActive: false } }, { new: true });
    
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    
    await ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'delete',
      module: 'suppliers',
      description: `Deactivated supplier: ${supplier.name}`,
      outletId: user.outletId,
      timestamp: new Date(),
    });
    
    return NextResponse.json({ message: 'Supplier deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
