import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Use POST /api/sales with jobId so job conversion, stock, vouchers, and ledger entries commit atomically',
    },
    { status: 410 }
  );
}
