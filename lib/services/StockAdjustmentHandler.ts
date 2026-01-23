// StockAdjustmentHandler.ts - SMART VERSION
// Automatically chooses the right adjustment method based on product history
// Version: 1.2 - Handles products with sales/purchases correctly
// Date: 2026-01-23

import mongoose from 'mongoose';
import { postInventoryAdjustmentToLedger } from './accountingService';
import InventoryMovement from '../models/InventoryMovement';
import Voucher from '../models/Voucher';
import LedgerEntry from '../models/LedgerEntry';
import { applyVoucherBalances } from './balanceEngine';

interface StockAdjustmentParams {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  oldStock: number;
  newStock: number;
  costPrice: number;
  outletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reason?: string;
}

/**
 * SMART STOCK ADJUSTMENT
 * 
 * Automatically determines the best method:
 * - If product has ONLY opening stock (no sales/purchases): Use reversal method
 * - If product has sales/purchases: Use difference-only method
 * 
 * This prevents double-accounting when products have transaction history.
 */
export async function handleStockEdit(params: StockAdjustmentParams) {
  const {
    productId,
    productName,
    sku,
    oldStock,
    newStock,
    costPrice,
    outletId,
    userId,
    reason = 'Stock correction',
  } = params;

  console.log(`\n📦 Handling stock edit for ${productName} (${sku})`);
  console.log(`   Old stock: ${oldStock} → New stock: ${newStock}`);
  console.log(`   Cost price: QAR ${costPrice}`);
  console.log(`   Difference: ${newStock - oldStock} units (QAR ${((newStock - oldStock) * costPrice).toFixed(2)})`);

  const stockDifference = newStock - oldStock;

  if (stockDifference === 0) {
    console.log('   ℹ️  No stock change detected, skipping adjustment');
    return { success: true, message: 'No adjustment needed' };
  }

  try {
    // Check if product has any sales/purchases (movements other than adjustments)
    const hasSalesOrPurchases = await checkForSalesOrPurchases(productId, outletId);
    
    if (hasSalesOrPurchases) {
      console.log('   ⚠️  Product has sales/purchases - using DIFFERENCE-ONLY method');
      console.log('      This prevents double-accounting of already-sold/purchased items');
      
      return await handleStockEditWithDifferenceOnly({
        productId,
        productName,
        sku,
        oldStock,
        newStock,
        costPrice,
        outletId,
        userId,
        reason,
      });
    } else {
      console.log('   ℹ️  Product has ONLY opening stock - using REVERSAL method');
      
      return await handleStockEditWithReversal({
        productId,
        productName,
        sku,
        oldStock,
        newStock,
        costPrice,
        outletId,
        userId,
        reason,
      });
    }
  } catch (error) {
    console.error('❌ Error handling stock edit:', error);
    throw error;
  }
}

/**
 * Check if product has any sales or purchases
 * Returns true if there are movements other than ADJUSTMENT
 */
async function checkForSalesOrPurchases(
  productId: mongoose.Types.ObjectId,
  outletId: mongoose.Types.ObjectId
): Promise<boolean> {
  const salesOrPurchases = await InventoryMovement.countDocuments({
    productId,
    outletId,
    movementType: { $in: ['SALE', 'PURCHASE', 'RETURN', 'TRANSFER'] },
  });

  console.log(`   🔍 Checking transaction history: ${salesOrPurchases} sales/purchases found`);
  
  return salesOrPurchases > 0;
}

/**
 * METHOD 1: Reversal & Recreation
 * Use ONLY for products with no sales/purchases (opening stock only)
 */
async function handleStockEditWithReversal(params: StockAdjustmentParams) {
  const {
    productId,
    productName,
    sku,
    oldStock,
    newStock,
    costPrice,
    outletId,
    userId,
    reason,
  } = params;

  console.log(`   📝 Using REVERSAL method (clean opening stock edit)`);

  // Find original opening stock voucher
  const originalVoucher = await Voucher.findOne({
    referenceId: productId,
    referenceType: 'ADJUSTMENT',
    outletId,
    status: 'posted',
    narration: { $not: { $regex: /^REVERSAL:/i } },
  })
    .sort({ createdAt: 1 })
    .lean();

  if (!originalVoucher) {
    console.log('   ⚠️  No original voucher found - falling back to difference method');
    return await handleStockEditWithDifferenceOnly(params);
  }

  console.log(`   🔄 Found original voucher: ${(originalVoucher as any).voucherNumber}`);
  console.log(`      Original amount: DR=${(originalVoucher as any).totalDebit}, CR=${(originalVoucher as any).totalCredit}`);

  // Create reversal entries (swap DR/CR)
  const reversedEntries = (originalVoucher as any).entries.map((e: any) => ({
    accountId: e.accountId,
    accountNumber: e.accountNumber,
    accountName: e.accountName,
    debit: e.credit,
    credit: e.debit,
  }));

  // Generate reversal voucher number
  const reversalVoucherNumber = await generateVoucherNumber('journal', outletId);

  // Create reversal voucher
  const reversalVoucher = await Voucher.create([
    {
      voucherNumber: reversalVoucherNumber,
      voucherType: 'journal',
      date: new Date(),
      narration: `REVERSAL: ${(originalVoucher as any).narration} - Stock correction from ${oldStock} to ${newStock}`,
      entries: reversedEntries,
      totalDebit: (originalVoucher as any).totalCredit,
      totalCredit: (originalVoucher as any).totalDebit,
      status: 'posted',
      referenceType: 'ADJUSTMENT',
      referenceId: productId,
      outletId,
      createdBy: userId,
      metadata: {
        isReversal: true,
        originalVoucherId: (originalVoucher as any)._id,
        reversalReason: reason,
      },
    },
  ]);

  console.log(`   ✓ Created reversal voucher: ${reversalVoucher[0].voucherNumber}`);

  await applyVoucherBalances(reversalVoucher[0]);

  // Create reversal ledger entries
  const reversalLedgerDocs = reversedEntries.map((e: any) => ({
    voucherId: reversalVoucher[0]._id,
    voucherNumber: reversalVoucher[0].voucherNumber,
    voucherType: 'journal',
    accountId: e.accountId,
    accountNumber: e.accountNumber,
    accountName: e.accountName,
    debit: e.debit,
    credit: e.credit,
    narration: reversalVoucher[0].narration,
    date: new Date(),
    referenceType: 'REVERSAL',
    referenceId: productId,
    referenceNumber: sku,
    isReversal: true,
    reversalReason: reason,
    outletId,
    createdBy: userId,
  }));

  await LedgerEntry.insertMany(reversalLedgerDocs);
  console.log(`   ✓ Created ${reversalLedgerDocs.length} reversal ledger entries`);

  // Create reversal inventory movement
  await InventoryMovement.create({
    productId,
    productName,
    sku,
    movementType: 'ADJUSTMENT',
    quantity: -oldStock,
    unitCost: costPrice,
    totalValue: -oldStock * costPrice,
    balanceAfter: 0,
    referenceType: 'ADJUSTMENT',
    referenceId: reversalVoucher[0]._id,
    referenceNumber: reversalVoucher[0].voucherNumber,
    notes: `Reversal of original stock entry: ${reason}`,
    date: new Date(),
    ledgerEntriesCreated: true,
    outletId,
    createdBy: userId,
  });

  console.log(`   ✓ Created reversal inventory movement`);

  // Create new adjustment for correct stock
  if (newStock !== 0) {
    const newAdjustment = {
      _id: new mongoose.Types.ObjectId(),
      productId,
      productName,
      sku,
      quantity: newStock,
      costPrice,
      adjustmentType: 'OPENING_STOCK',
      reason: reason || 'Stock correction',
      date: new Date(),
      outletId,
    };

    const { voucherId, voucherNumber } = await postInventoryAdjustmentToLedger(
      newAdjustment,
      userId
    );

    console.log(`   ✓ Created new adjustment voucher: ${voucherNumber}`);

    await InventoryMovement.create({
      productId,
      productName,
      sku,
      movementType: 'ADJUSTMENT',
      quantity: newStock,
      unitCost: costPrice,
      totalValue: newStock * costPrice,
      balanceAfter: newStock,
      referenceType: 'ADJUSTMENT',
      referenceId: voucherId,
      referenceNumber: voucherNumber,
      notes: reason || 'Stock correction',
      date: new Date(),
      ledgerEntriesCreated: true,
      outletId,
      createdBy: userId,
    });

    console.log(`   ✓ Created new inventory movement`);
  }

  await recalculateInventoryBalances(productId, outletId);

  console.log(`✅ Stock adjustment completed (REVERSAL method)\n`);

  return {
    success: true,
    method: 'reversal',
    message: `Stock adjusted from ${oldStock} to ${newStock}`,
    stockDifference: newStock - oldStock,
    valueChange: (newStock - oldStock) * costPrice,
  };
}

/**
 * METHOD 2: Difference Only
 * Use for products with sales/purchases (recommended for most cases)
 * 
 * This is SAFE because it only adjusts the difference,
 * without touching already-processed sales/purchases.
 */
export async function handleStockEditWithDifferenceOnly(params: StockAdjustmentParams) {
  const {
    productId,
    productName,
    sku,
    oldStock,
    newStock,
    costPrice,
    outletId,
    userId,
    reason = 'Stock correction',
  } = params;

  const stockDifference = newStock - oldStock;

  if (stockDifference === 0) {
    return { success: true, message: 'No adjustment needed' };
  }

  console.log(`   📝 Using DIFFERENCE-ONLY method`);
  console.log(`   Adjusting by: ${stockDifference > 0 ? '+' : ''}${stockDifference} units`);
  console.log(`   Value change: QAR ${(stockDifference * costPrice).toFixed(2)}`);

  const adjustment = {
    _id: new mongoose.Types.ObjectId(),
    productId,
    productName,
    sku,
    quantity: stockDifference,
    costPrice,
    adjustmentType: stockDifference > 0 ? 'STOCK_INCREASE' : 'STOCK_DECREASE',
    reason: `${reason}: Adjusted from ${oldStock} to ${newStock}`,
    date: new Date(),
    outletId,
  };

  const { voucherId, voucherNumber } = await postInventoryAdjustmentToLedger(
    adjustment,
    userId
  );

  console.log(`   ✓ Created adjustment voucher: ${voucherNumber}`);

  // Create inventory movement for the difference
  await InventoryMovement.create({
    productId,
    productName,
    sku,
    movementType: 'ADJUSTMENT',
    quantity: stockDifference,
    unitCost: costPrice,
    totalValue: stockDifference * costPrice,
    balanceAfter: newStock,
    referenceType: 'ADJUSTMENT',
    referenceId: voucherId,
    referenceNumber: voucherNumber,
    notes: adjustment.reason,
    date: new Date(),
    ledgerEntriesCreated: true,
    outletId,
    createdBy: userId,
  });

  console.log(`   ✓ Created inventory movement`);

  await recalculateInventoryBalances(productId, outletId);

  console.log(`✅ Stock adjustment completed (DIFFERENCE-ONLY method)`);
  console.log(`   Effect: Inventory ${stockDifference > 0 ? 'increased' : 'decreased'} by QAR ${Math.abs(stockDifference * costPrice).toFixed(2)}\n`);

  return {
    success: true,
    method: 'difference-only',
    message: `Stock adjusted by ${stockDifference > 0 ? '+' : ''}${stockDifference}`,
    voucherId,
    voucherNumber,
    stockDifference,
    valueChange: stockDifference * costPrice,
  };
}

/**
 * Recalculate inventory balances after adjustments
 */
async function recalculateInventoryBalances(
  productId: mongoose.Types.ObjectId,
  outletId: mongoose.Types.ObjectId
) {
  const movements = await InventoryMovement.find({
    productId,
    outletId,
  }).sort({ date: 1, createdAt: 1 });

  let runningBalance = 0;

  console.log(`   🔄 Recalculating balances for ${movements.length} movements...`);

  for (const movement of movements) {
    runningBalance += movement.quantity;
    movement.balanceAfter = runningBalance;
    await movement.save();
  }

  console.log(`   ✓ Final balance: ${runningBalance} units`);
}

/**
 * Helper to generate voucher numbers
 */
async function generateVoucherNumber(
  voucherType: 'receipt' | 'journal' | 'payment',
  outletId: mongoose.Types.ObjectId
): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  const prefix =
    voucherType === 'receipt' ? 'RE' : voucherType === 'payment' ? 'PY' : 'JO';
  const yearMonth = `${year}${month}`;

  const latestVoucherDoc = await Voucher.findOne({
    outletId,
    voucherType,
    voucherNumber: { $regex: `^${prefix}-${yearMonth}-` },
  })
    .sort({ voucherNumber: -1 })
    .select('voucherNumber')
    .lean();

  const latestVoucher = latestVoucherDoc as any;

  let nextNumber = 1;

  if (latestVoucher && latestVoucher.voucherNumber) {
    const match = latestVoucher.voucherNumber.match(/-(\d{5})$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const voucherNumber = `${prefix}-${yearMonth}-${String(nextNumber).padStart(5, '0')}`;

    const exists = await Voucher.exists({ voucherNumber });

    if (!exists) {
      return voucherNumber;
    }

    nextNumber++;
  }

  const timestamp = Date.now().toString().slice(-5);
  return `${prefix}-${yearMonth}-${timestamp}`;
}

export default {
  handleStockEdit,
  handleStockEditWithDifferenceOnly,
};