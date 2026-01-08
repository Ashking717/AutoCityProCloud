// app/api/admin/migrate-vouchers/route.ts
// TEMPORARY ENDPOINT - Remove after migration is complete

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Voucher from '@/lib/models/Voucher';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST() {
  try {
    await connectDB();
    
    // Optional: Add authentication check
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = verifyToken(token);
    
    // Optional: Check if user is admin
    // if (user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }
    
    console.log('🔧 Starting Voucher Migration...\n');
    
    // Get all vouchers without referenceType
    const vouchers = await Voucher.find({
      $or: [
        { referenceType: { $exists: false } },
        { referenceType: null },
      ]
    });
    
    console.log(`Found ${vouchers.length} vouchers to migrate\n`);
    
    let updated = 0;
    let skipped = 0;
    const results: any[] = [];
    
    for (const voucher of vouchers) {
      const narration = voucher.narration.toLowerCase();
      let referenceType = null;
      
      // Detect reference type from narration
      if (narration.includes('sale ') || narration.includes('invoice')) {
        referenceType = 'SALE';
      } else if (narration.includes('purchase ') || narration.includes('from ')) {
        referenceType = 'PURCHASE';
      } else if (narration.includes('expense') || narration.includes('payment to')) {
        referenceType = 'PAYMENT';
      } else if (narration.includes('cogs for')) {
        referenceType = 'SALE'; // COGS entries are part of sales
      } else if (narration.includes('reversal')) {
        referenceType = 'REVERSAL';
      }
      
      if (referenceType) {
        await Voucher.updateOne(
          { _id: voucher._id },
          { 
            $set: { 
              referenceType: referenceType 
            } 
          }
        );
        
        results.push({
          voucherNumber: voucher.voucherNumber,
          referenceType,
          narration: voucher.narration.substring(0, 80),
          status: 'updated',
        });
        
        updated++;
      } else {
        results.push({
          voucherNumber: voucher.voucherNumber,
          referenceType: 'UNKNOWN',
          narration: voucher.narration,
          status: 'skipped',
        });
        
        skipped++;
      }
    }
    
    console.log('\n📊 Migration Complete');
    console.log(`✓ Updated: ${updated}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    
    return NextResponse.json({
      success: true,
      updated,
      skipped,
      total: vouchers.length,
      results,
    });
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  try {
    await connectDB();
    
    const stats = await Voucher.aggregate([
      {
        $group: {
          _id: '$referenceType',
          count: { $sum: 1 },
        }
      }
    ]);
    
    const total = await Voucher.countDocuments();
    const withoutType = await Voucher.countDocuments({
      $or: [
        { referenceType: { $exists: false } },
        { referenceType: null },
      ]
    });
    
    return NextResponse.json({
      total,
      withoutReferenceType: withoutType,
      breakdown: stats,
      needsMigration: withoutType > 0,
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}