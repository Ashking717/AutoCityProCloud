// app/api/reports/purchases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Voucher from '@/lib/models/Voucher';
import Purchase from '@/lib/models/Purchase';
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
    
    const fromDate = new Date(
      searchParams.get('fromDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const toDate = new Date(searchParams.get('toDate') || new Date());
    
    // Set time boundaries
    toDate.setHours(23, 59, 59, 999);
    fromDate.setHours(0, 0, 0, 0);

    console.log('='.repeat(60));
    console.log('PURCHASES REPORT GENERATION');
    console.log('='.repeat(60));
    console.log('From:', fromDate.toISOString());
    console.log('To:', toDate.toISOString());
    console.log('Outlet ID:', user.outletId);
    
    // ==== STEP 1: Try to get Purchase documents ====
    let purchases: any[] = [];
    let hasPurchaseModel = false;
    
    try {
      purchases = await Purchase.find({
        outletId: user.outletId,
        purchaseDate: { $gte: fromDate, $lte: toDate },
        status: { $in: ['COMPLETED', 'PARTIAL'] },
      })
        .sort({ purchaseDate: -1 })
        .lean();
      
      hasPurchaseModel = true;
      console.log(`\n📦 Found ${purchases.length} purchase documents`);
    } catch (err) {
      console.log('⚠️ Purchase model not available or no purchases found');
    }
    
    // ==== STEP 2: Get ALL vouchers that might be purchases ====
    // Look for payment vouchers with PURCHASE reference OR inventory debits
    const allVouchers = await Voucher.find({
      outletId: user.outletId,
      date: { $gte: fromDate, $lte: toDate },
      status: { $in: ['posted', 'approved'] },
    })
      .sort({ date: -1 })
      .lean();
    
    console.log(`📝 Found ${allVouchers.length} total vouchers in period`);
    
    // Filter for purchase-related vouchers
    const purchaseVouchers = allVouchers.filter(voucher => {
      // Check if it has PURCHASE reference
      if (voucher.referenceType === 'PURCHASE') {
        return true;
      }
      
      // Check if it's a payment voucher with inventory debit
      if (voucher.voucherType === 'payment') {
        const hasInventoryDebit = (voucher.entries || []).some((e: any) => 
          e.debit > 0 && (
            e.accountName?.toLowerCase().includes('inventory') ||
            e.accountNumber?.includes('INV')
          )
        );
        
        if (hasInventoryDebit) {
          return true;
        }
      }
      
      return false;
    });
    
    console.log(`🛒 Identified ${purchaseVouchers.length} purchase vouchers`);
    
    // ==== STEP 3: Calculate totals ====
    let totalPurchaseAmount = 0;
    let totalPaymentAmount = 0;
    const supplierPurchases: { [key: string]: { count: number; amount: number; payments: number } } = {};
    const categoryPurchases: { [key: string]: { count: number; amount: number } } = {};
    
    if (hasPurchaseModel && purchases.length > 0) {
      // Use Purchase documents
      console.log('\n💰 Calculating from Purchase documents...');
      
      purchases.forEach(purchase => {
        const grandTotal = purchase.grandTotal || 0;
        const amountPaid = purchase.amountPaid || 0;
        
        totalPurchaseAmount += grandTotal;
        totalPaymentAmount += amountPaid;
        
        // Group by supplier
        const supplier = purchase.supplierName || 'Unknown Supplier';
        if (!supplierPurchases[supplier]) {
          supplierPurchases[supplier] = { count: 0, amount: 0, payments: 0 };
        }
        supplierPurchases[supplier].count += 1;
        supplierPurchases[supplier].amount += grandTotal;
        supplierPurchases[supplier].payments += amountPaid;
        
        // Group by category (from items)
        (purchase.items || []).forEach((item: any) => {
          const category = item.category || item.name || 'Uncategorized';
          if (!categoryPurchases[category]) {
            categoryPurchases[category] = { count: 0, amount: 0 };
          }
          categoryPurchases[category].count += item.quantity || 1;
          categoryPurchases[category].amount += item.total || 0;
        });
        
        console.log(`  ✓ ${purchase.purchaseNumber}: ${grandTotal.toFixed(2)} from ${supplier}`);
      });
      
    } else if (purchaseVouchers.length > 0) {
      // Use vouchers
      console.log('\n💰 Calculating from Vouchers...');
      
      purchaseVouchers.forEach(voucher => {
        let purchaseAmount = 0;
        let paymentAmount = 0;
        let supplier = 'Unknown';
        
        (voucher.entries || []).forEach((entry: any) => {
          // Inventory debit = purchase amount
          if (entry.debit > 0 && (
            entry.accountName?.toLowerCase().includes('inventory') ||
            entry.accountNumber?.includes('INV')
          )) {
            purchaseAmount += entry.debit;
            
            // Track by category
            const category = entry.accountName || 'Inventory';
            if (!categoryPurchases[category]) {
              categoryPurchases[category] = { count: 0, amount: 0 };
            }
            categoryPurchases[category].count += 1;
            categoryPurchases[category].amount += entry.debit;
          }
          
          // Cash/Bank credit = payment amount
          if (entry.credit > 0 && (
            entry.accountName?.toLowerCase().includes('cash') ||
            entry.accountName?.toLowerCase().includes('bank')
          )) {
            paymentAmount += entry.credit;
          }
          
          // AP credit might indicate supplier
          if (entry.credit > 0 && (
            entry.accountName?.toLowerCase().includes('payable')
          )) {
            // Try to extract supplier from narration
            const narrationParts = voucher.narration?.split('from') || [];
            if (narrationParts.length > 1) {
              supplier = narrationParts[1].trim();
            }
          }
        });
        
        if (purchaseAmount > 0) {
          totalPurchaseAmount += purchaseAmount;
          totalPaymentAmount += paymentAmount;
          
          // Group by supplier
          if (!supplierPurchases[supplier]) {
            supplierPurchases[supplier] = { count: 0, amount: 0, payments: 0 };
          }
          supplierPurchases[supplier].count += 1;
          supplierPurchases[supplier].amount += purchaseAmount;
          supplierPurchases[supplier].payments += paymentAmount;
          
          console.log(`  ✓ ${voucher.voucherNumber}: ${purchaseAmount.toFixed(2)} from ${supplier}`);
        }
      });
    }
    
    const summary = {
      totalPurchases: purchases.length || purchaseVouchers.length,
      totalPurchaseAmount,
      totalPaymentAmount,
      totalPayments: purchaseVouchers.length,
      averagePurchaseValue: 0,
      outstandingPayables: totalPurchaseAmount - totalPaymentAmount,
    };
    
    if (summary.totalPurchases > 0) {
      summary.averagePurchaseValue = totalPurchaseAmount / summary.totalPurchases;
    }
    
    console.log('\n📊 Summary:');
    console.log('  Total Purchases:', summary.totalPurchases);
    console.log('  Purchase Amount:', totalPurchaseAmount.toFixed(2));
    console.log('  Payment Amount:', totalPaymentAmount.toFixed(2));
    console.log('  Outstanding:', summary.outstandingPayables.toFixed(2));
    console.log('  Suppliers:', Object.keys(supplierPurchases).length);
    console.log('  Categories:', Object.keys(categoryPurchases).length);
    
    // ==== STEP 4: Format for display ====
    let displayData: any[] = [];
    
    if (purchases.length > 0) {
      displayData = purchases.map(p => ({
        _id: p._id,
        date: p.purchaseDate,
        voucherNumber: p.purchaseNumber || 'N/A',
        narration: `Purchase from ${p.supplierName}`,
        totalDebit: p.grandTotal || 0,
        status: p.status?.toLowerCase() || 'completed',
        supplier: p.supplierName,
        items: p.items?.length || 0,
      }));
    } else {
      displayData = purchaseVouchers.map(v => {
        const inventoryEntry = (v.entries || []).find((e: any) => 
          e.debit > 0 && (
            e.accountName?.toLowerCase().includes('inventory') ||
            e.accountNumber?.includes('INV')
          )
        );
        
        return {
          _id: v._id,
          date: v.date,
          voucherNumber: v.voucherNumber,
          narration: v.narration,
          totalDebit: inventoryEntry?.debit || v.totalDebit || 0,
          status: v.status,
          supplier: v.narration?.split('from')[1]?.trim() || 'Unknown',
        };
      });
    }
    
    console.log('\n✅ Report generated successfully');
    console.log('='.repeat(60) + '\n');
    
    return NextResponse.json({
      purchases: displayData,
      payments: purchaseVouchers.map(v => ({
        _id: v._id,
        date: v.date,
        voucherNumber: v.voucherNumber,
        narration: v.narration,
        totalDebit: v.totalDebit || 0,
        status: v.status,
      })),
      summary,
      supplierPurchases,
      categoryPurchases,
      metadata: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        generatedAt: new Date().toISOString(),
        dataSource: purchases.length > 0 ? 'Purchase Documents' : 'Vouchers',
        totalVouchersScanned: allVouchers.length,
        purchaseVouchersFound: purchaseVouchers.length,
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error generating purchases report:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}