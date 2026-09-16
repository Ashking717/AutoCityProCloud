import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';

import Account from '@/lib/models/Account';
import ActivityLog from '@/lib/models/ActivityLog';
import Voucher, { VoucherType } from '@/lib/models/Voucher';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import {
  createCollisionResistantVoucherNumber,
  createPostedVoucher,
  postDraftVoucher,
  reversePostedVoucher,
} from '@/lib/services/voucherPostingService';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canViewFinancials')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const query: any = { outletId: user.outletId };
    if (searchParams.get('voucherType')) query.voucherType = searchParams.get('voucherType');
    if (searchParams.get('status')) query.status = searchParams.get('status');
    if (searchParams.get('fromDate') && searchParams.get('toDate')) {
      query.date = {
        $gte: new Date(searchParams.get('fromDate')!),
        $lte: new Date(searchParams.get('toDate')!),
      };
    }
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const [vouchers, total] = await Promise.all([
      Voucher.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Voucher.countDocuments(query),
    ]);
    return NextResponse.json({
      vouchers,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageAccounting')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const body = await request.json();
    if (!Object.values(VoucherType).includes(body.voucherType) || !body.date || !Array.isArray(body.entries) || !body.entries.length) {
      return NextResponse.json({ error: 'Voucher type, date, and entries are required' }, { status: 400 });
    }
    const operationKey = String(
      request.headers.get('idempotency-key') || body.idempotencyKey || ''
    ).trim();
    if (body.status === 'posted' && !operationKey) {
      return NextResponse.json({ error: 'A valid idempotencyKey is required for posted vouchers' }, { status: 400 });
    }

    let voucher: any;
    if (body.status === 'posted') {
      const result = await createPostedVoucher({
        voucherType: body.voucherType,
        date: new Date(body.date),
        narration: body.narration || 'Manual voucher',
        entries: body.entries,
        referenceType: body.referenceType || 'MANUAL',
        referenceId: body.referenceId,
        referenceNumber: body.referenceNumber,
        postingKey: `manual:${operationKey}`,
        outletId: user.outletId,
        createdBy: user.userId,
      });
      voucher = result.voucher;
    } else {
      const accountIds = [...new Set(body.entries.map((entry: any) => String(entry.accountId)))];
      const accounts = await Account.find({
        _id: { $in: accountIds },
        outletId: user.outletId,
        isActive: true,
      });
      if (accounts.length !== accountIds.length) {
        return NextResponse.json({ error: 'Every account must belong to this outlet' }, { status: 400 });
      }
      const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
      voucher = await Voucher.create({
        voucherNumber: createCollisionResistantVoucherNumber(body.voucherType, new Date(body.date)),
        voucherType: body.voucherType,
        date: new Date(body.date),
        narration: body.narration || 'Manual voucher',
        entries: body.entries.map((entry: any) => ({
          accountId: entry.accountId,
          accountNumber: accountMap.get(String(entry.accountId))!.code,
          accountName: accountMap.get(String(entry.accountId))!.name,
          debit: Number(entry.debit || 0),
          credit: Number(entry.credit || 0),
          narration: entry.narration,
        })),
        status: 'draft',
        referenceType: body.referenceType || 'MANUAL',
        referenceId: body.referenceId,
        referenceNumber: body.referenceNumber,
        postingKey: operationKey ? `draft:${operationKey}` : undefined,
        outletId: user.outletId,
        createdBy: user.userId,
      });
    }
    ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'create',
      module: 'vouchers',
      description: `Created ${body.voucherType} voucher: ${voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    }).catch((error) => console.error('Voucher activity log failed:', error));
    return NextResponse.json({ voucher }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating voucher:', error);
    const status = /required|account|balanced|entry|voucher/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageAccounting')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });
    const body = await request.json();
    if (!body.voucherId) return NextResponse.json({ error: 'Voucher ID is required' }, { status: 400 });

    let voucher: any;
    let message: string;
    if (body.action === 'post') {
      const result = await postDraftVoucher(body.voucherId, user.outletId);
      voucher = result.voucher;
      message = 'Voucher posted successfully';
    } else if (body.action === 'cancel') {
      const existing = await Voucher.findOne({ _id: body.voucherId, outletId: user.outletId });
      if (!existing) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
      if (existing.status === 'draft') {
        existing.status = 'cancelled';
        await existing.save();
        voucher = existing;
      } else {
        const result = await reversePostedVoucher(
          body.voucherId,
          user.outletId,
          user.userId,
          body.reason || 'Voucher cancelled'
        );
        voucher = result.voucher;
      }
      message = 'Voucher cancelled with an immutable reversal';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'vouchers',
      description: `${body.action} voucher: ${voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    }).catch((error) => console.error('Voucher activity log failed:', error));
    return NextResponse.json({ success: true, message, voucher });
  } catch (error: any) {
    console.error('Error updating voucher:', error);
    const status = /not found|only draft|incomplete|invalid|requires reconciliation/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
