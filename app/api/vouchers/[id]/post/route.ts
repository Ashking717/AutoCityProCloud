import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import ActivityLog from '@/lib/models/ActivityLog';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/types/roles';
import { connectDB } from '@/lib/db/mongodb';
import { postDraftVoucher } from '@/lib/services/voucherPostingService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);
    if (!hasPermission(user.role, 'canManageAccounting')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.outletId) return NextResponse.json({ error: 'Outlet is required' }, { status: 400 });

    const result = await postDraftVoucher(params.id, user.outletId);
    ActivityLog.create({
      userId: user.userId,
      username: user.email,
      actionType: 'update',
      module: 'vouchers',
      description: `Posted voucher: ${result.voucher.voucherNumber}`,
      outletId: user.outletId,
      timestamp: new Date(),
    }).catch((error) => console.error('Voucher activity log failed:', error));
    return NextResponse.json({ voucher: result.voucher, idempotent: !result.posted });
  } catch (error: any) {
    console.error('Error posting voucher:', error);
    const status = /not found|only draft|incomplete|requires reconciliation/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
