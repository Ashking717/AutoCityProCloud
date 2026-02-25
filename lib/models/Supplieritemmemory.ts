/**
 * SupplierItemMemory
 *
 * Stores the relationship between:
 *   - A supplier (by _id)
 *   - A raw item name/part number as it appears on that supplier's invoices
 *   - The inventory product it was manually linked to
 *
 * Used by the OCR pipeline to pre-resolve matches before presenting to the user.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplierItemMemory extends Document {
  outletId:       mongoose.Types.ObjectId;
  supplierId:     mongoose.Types.ObjectId;
  /** Normalised supplier item name (lowercase, trimmed) */
  supplierItemName: string;
  /** Raw supplier item name exactly as it appeared on the invoice */
  rawItemName:    string;
  /** Supplier's own part number for this item (normalised) */
  supplierPartNumber?: string;
  /** The inventory product this was linked to */
  productId:      mongoose.Types.ObjectId;
  /** Cached product name at time of linking (for display / fallback) */
  productName:    string;
  /** Cached product SKU at time of linking */
  productSku:     string;
  /** How many times this link has been confirmed (boosts confidence) */
  confirmCount:   number;
  lastConfirmedAt: Date;
  createdAt:      Date;
  updatedAt:      Date;
}

const SupplierItemMemorySchema = new Schema<ISupplierItemMemory>(
  {
    outletId:           { type: Schema.Types.ObjectId, required: true, index: true },
    supplierId:         { type: Schema.Types.ObjectId, required: true, index: true },
    supplierItemName:   { type: String, required: true },   // normalised
    rawItemName:        { type: String, required: true },   // original
    supplierPartNumber: { type: String, default: '' },      // normalised
    productId:          { type: Schema.Types.ObjectId, required: true },
    productName:        { type: String, required: true },
    productSku:         { type: String, required: true },
    confirmCount:       { type: Number, default: 1 },
    lastConfirmedAt:    { type: Date,   default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index: one memory entry per (outlet + supplier + normalised item name)
// If the same supplier calls the same item two different things, those are separate entries.
SupplierItemMemorySchema.index(
  { outletId: 1, supplierId: 1, supplierItemName: 1 },
  { unique: true }
);

// Secondary index for part-number lookups
SupplierItemMemorySchema.index(
  { outletId: 1, supplierId: 1, supplierPartNumber: 1 },
  { sparse: true }
);

const SupplierItemMemory: Model<ISupplierItemMemory> =
  mongoose.models.SupplierItemMemory ||
  mongoose.model<ISupplierItemMemory>('SupplierItemMemory', SupplierItemMemorySchema);

export default SupplierItemMemory;

// ─── Helper: normalise a name/part-number for lookup ─────────────────────────
export function normaliseKey(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[^\x00-\x7F]+/g, '')   // strip non-ASCII (Arabic etc.)
    .replace(/[\s\-_.,()/\\]+/g, ' ') // collapse punctuation to space
    .trim()
    .replace(/\s{2,}/g, ' ');
}