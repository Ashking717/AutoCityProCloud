// lib/services/inventoryService.ts
import mongoose from 'mongoose';
import Product from '../models/ProductEnhanced';
import InventoryMovement from '../models/InventoryMovement';

/**
 * Calculate Weighted Average Cost
 * 
 * Formula: 
 * New Average Cost = (Current Value + Purchase Value) / (Current Qty + Purchase Qty)
 * 
 * Where:
 * - Current Value = Current Stock × Current Cost Price
 * - Purchase Value = Purchase Qty × Purchase Unit Price
 */
export async function updateWeightedAverageCost(
  productId: mongoose.Types.ObjectId,
  purchaseQuantity: number,
  purchaseUnitPrice: number
) {
  try {
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Current inventory value (cached stock is OK for cost calc)
    const currentStock = (product as any).currentStock || 0;
    const currentCostPrice = (product as any).costPrice || 0;
    const currentValue = currentStock * currentCostPrice;

    // Purchase value
    const purchaseValue = purchaseQuantity * purchaseUnitPrice;

    // New stock (for calculation ONLY)
    const newStock = currentStock + purchaseQuantity;

    let newAverageCost = currentCostPrice;

    if (newStock > 0) {
      newAverageCost = (currentValue + purchaseValue) / newStock;
    }

    console.log('\n📊 Weighted Average Cost Calculation:');
    console.log(`   Product: ${(product as any).name} (${(product as any).sku})`);
    console.log(`   Current Stock (cached): ${currentStock}`);
    console.log(`   Current Cost: QAR ${currentCostPrice.toFixed(2)}`);
    console.log(`   Purchase Qty: ${purchaseQuantity}`);
    console.log(`   Purchase Price: QAR ${purchaseUnitPrice.toFixed(2)}`);
    console.log(`   New Average Cost: QAR ${newAverageCost.toFixed(4)}`);

    // ✅ UPDATE COST ONLY
    await Product.findByIdAndUpdate(productId, {
      $set: {
        costPrice: newAverageCost,
      },
      $inc: {
        totalPurchased: purchaseQuantity,
      },
    });

    return {
      productId,
      productName: (product as any).name,
      sku: (product as any).sku,
      oldCostPrice: currentCostPrice,
      newCostPrice: newAverageCost,
      purchaseQuantity,
      purchaseUnitPrice,
      priceChange: newAverageCost - currentCostPrice,
      priceChangePercent:
        currentCostPrice > 0
          ? ((newAverageCost - currentCostPrice) / currentCostPrice) * 100
          : 0,
    };
  } catch (error) {
    console.error('Error updating weighted average cost:', error);
    throw error;
  }
}

/**
 * Get Product Cost History
 * 
 * Returns a history of cost price changes from inventory movements
 */
export async function getProductCostHistory(
  productId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  try {
    const movements = await InventoryMovement.find({
      productId,
      movementType: 'PURCHASE',
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return movements.map((m: any) => ({
      date: m.createdAt,
      quantity: m.quantity,
      unitCost: m.unitCost || 0,
      supplier: m.supplier || 'Unknown',
      reference: m.referenceNumber,
      totalCost: (m.quantity || 0) * (m.unitCost || 0),
    }));

  } catch (error) {
    console.error('Error fetching cost history:', error);
    throw error;
  }
}

/**
 * Calculate Current Inventory Value
 * 
 * Total value of all products in stock at current average cost
 */
export async function calculateInventoryValue(outletId: mongoose.Types.ObjectId) {
  try {
    const products = await Product.find({
      outletId,
      isActive: true,
    }).lean();

    let totalValue = 0;
    const breakdown: any[] = [];

    products.forEach((product: any) => {
      const stock = product.currentStock || 0;
      const cost = product.costPrice || 0;
      const value = stock * cost;

      totalValue += value;

      if (stock > 0) {
        breakdown.push({
          productId: product._id,
          name: product.name,
          sku: product.sku,
          stock,
          costPrice: cost,
          value,
        });
      }
    });

    // Sort by value descending
    breakdown.sort((a, b) => b.value - a.value);

    return {
      totalValue,
      productCount: products.length,
      inStockCount: breakdown.length,
      breakdown,
    };

  } catch (error) {
    console.error('Error calculating inventory value:', error);
    throw error;
  }
}

export default {
  updateWeightedAverageCost,
  getProductCostHistory,
  calculateInventoryValue,
};