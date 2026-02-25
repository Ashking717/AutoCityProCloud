/**
 * /api/supplier-item-memory
 *
 * GET  ?supplierId=&itemName=&partNumber=   → look up memory for one item
 * POST { entries: [...] }                   → upsert one or many memory entries
 * GET  ?supplierId=&bulk=true               → return ALL memory for a supplier (used by OCR pre-resolve)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import SupplierItemMemory, { normaliseKey } from '@/lib/models/Supplieritemmemory';
import mongoose from 'mongoose';

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);

    if (!user.outletId) {
      return NextResponse.json({ error: 'outletId is required' }, { status: 400 });
    }
    const outletId    = new mongoose.Types.ObjectId(user.outletId);
    const { searchParams } = new URL(request.url);
    const supplierId  = searchParams.get('supplierId');
    const bulk        = searchParams.get('bulk') === 'true';

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required' }, { status: 400 });
    }

    const supplierObjId = new mongoose.Types.ObjectId(supplierId);

    // ── Bulk fetch: return the entire memory for this supplier ────────────────
    if (bulk) {
      const entries = await SupplierItemMemory.find({
        outletId,
        supplierId: supplierObjId,
      })
        .sort({ confirmCount: -1, lastConfirmedAt: -1 })
        .lean();

      return NextResponse.json({ entries });
    }

    // ── Single lookup ─────────────────────────────────────────────────────────
    const itemName   = searchParams.get('itemName')   || '';
    const partNumber = searchParams.get('partNumber') || '';

    const normName = normaliseKey(itemName);
    const normPN   = normaliseKey(partNumber);

    const orClauses: any[] = [];
    if (normName) orClauses.push({ supplierItemName: normName });
    if (normPN)   orClauses.push({ supplierPartNumber: normPN });

    if (!orClauses.length) {
      return NextResponse.json({ entry: null });
    }

    const entry = await SupplierItemMemory.findOne({
      outletId,
      supplierId: supplierObjId,
      $or: orClauses,
    })
      .sort({ confirmCount: -1 })
      .lean();

    return NextResponse.json({ entry: entry || null });
  } catch (err: any) {
    console.error('SupplierItemMemory GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyToken(token);

    if (!user.outletId) {
      return NextResponse.json({ error: 'outletId is required' }, { status: 400 });
    }
    const outletId = new mongoose.Types.ObjectId(user.outletId);
    const body     = await request.json();

    // Accept either a single entry or an array
    const raw: any[] = Array.isArray(body.entries) ? body.entries : [body.entry ?? body];

    const results = [];

    for (const entry of raw) {
      const {
        supplierId,
        itemName,
        partNumber,
        productId,
        productName,
        productSku,
      } = entry;

      if (!supplierId || !productId || (!itemName && !partNumber)) continue;

      const normName = normaliseKey(itemName || '');
      const normPN   = normaliseKey(partNumber || '');

      // Use itemName as the primary key (fall back to partNumber if no name)
      const primaryKey = normName || normPN;
      if (!primaryKey) continue;

      const result = await SupplierItemMemory.findOneAndUpdate(
        {
          outletId,
          supplierId: new mongoose.Types.ObjectId(supplierId),
          supplierItemName: primaryKey,
        },
        {
          $set: {
            rawItemName:        (itemName || partNumber || '').trim(),
            supplierPartNumber: normPN,
            productId:          new mongoose.Types.ObjectId(productId),
            productName:        productName || '',
            productSku:         productSku  || '',
            lastConfirmedAt:    new Date(),
          },
          $inc: { confirmCount: 1 },
          $setOnInsert: {
            outletId,
            supplierId: new mongoose.Types.ObjectId(supplierId),
            supplierItemName: primaryKey,
          },
        },
        { upsert: true, new: true }
      );

      results.push(result);
    }

    return NextResponse.json({ saved: results.length, entries: results });
  } catch (err: any) {
    console.error('SupplierItemMemory POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}