// lib/models/Voucher.ts
import mongoose, { Schema, Document } from 'mongoose';

export enum VoucherType {
  PAYMENT = 'payment',
  RECEIPT = 'receipt',
  JOURNAL = 'journal',
  CONTRA = 'contra',
}

export enum ReferenceType {
  OPENING_BALANCE = 'OPENING_BALANCE',
  SALE = 'SALE',
  RETURN = 'RETURN',
  PURCHASE = 'PURCHASE',
  PURCHASE_PAYMENT = 'PURCHASE_PAYMENT',  // ← ADDED THIS LINE
  EXPENSE = 'EXPENSE',
  EXPENSE_PAYMENT = 'EXPENSE_PAYMENT',
  SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  ADJUSTMENT = 'ADJUSTMENT',
  REVERSAL = 'REVERSAL',
  MANUAL = 'MANUAL',
  TRANSFER = 'TRANSFER',
}

export interface IVoucherEntry {
  accountId: mongoose.Types.ObjectId;
  accountNumber?: string;
  accountName: string;
  debit: number;
  credit: number;
  narration?: string;
}

export interface IVoucher extends Document {
  voucherNumber: string;
  voucherType: VoucherType;
  date: Date;
  narration: string;
  entries: IVoucherEntry[];
  totalDebit: number;
  totalCredit: number;
  status: 'draft' | 'posted' | 'approved' | 'cancelled';
  referenceType?: ReferenceType;
  referenceId?: mongoose.Types.ObjectId;
  referenceNumber?: string;
  outletId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  metadata?: any; // Add metadata field for storing payment details
  postingKey?: string;
}

const VoucherEntrySchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountNumber: String,
    accountName: { type: String, required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    narration: String,
  },
  { _id: false }
);

const VoucherSchema = new Schema<IVoucher>(
  {
    voucherNumber: { type: String, required: true, trim: true },
    voucherType: { type: String, required: true, enum: Object.values(VoucherType), index: true },
    date: { type: Date, required: true, index: true },
    narration: { type: String, required: true, trim: true },
    entries: { type: [VoucherEntrySchema], required: true },
    totalDebit: { type: Number, required: true, default: 0, min: 0 },
    totalCredit: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'posted', 'approved', 'cancelled'],
      default: 'draft',
      index: true,
    },
    referenceType: {
      type: String,
      enum: Object.values(ReferenceType),
      index: true,
    },
    referenceId: { type: Schema.Types.ObjectId, index: true },
    referenceNumber: String,
    metadata: { type: Schema.Types.Mixed }, // Added metadata field
    postingKey: { type: String, trim: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

// Compound indexes for common queries
VoucherSchema.index({ outletId: 1, voucherType: 1, date: -1 });
VoucherSchema.index({ outletId: 1, voucherNumber: 1 }, { unique: true });
VoucherSchema.index({ outletId: 1, status: 1 });
VoucherSchema.index({ outletId: 1, referenceType: 1, referenceId: 1 });
VoucherSchema.index(
  { outletId: 1, postingKey: 1 },
  { unique: true, partialFilterExpression: { postingKey: { $type: 'string' } } }
);

// Pre-save validation: ensure voucher is balanced
VoucherSchema.pre('save', function (next) {
  if (!this.entries.length) {
    return next(new Error('Voucher must contain at least one entry'));
  }
  for (const entry of this.entries) {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      return next(new Error('Voucher entries must contain non-negative finite amounts'));
    }
    if ((debit > 0) === (credit > 0)) {
      return next(new Error('Each voucher entry must contain exactly one positive debit or credit'));
    }
  }
  const dr = this.entries.reduce((s, e) => s + (e.debit || 0), 0);
  const cr = this.entries.reduce((s, e) => s + (e.credit || 0), 0);
  
  if (Math.abs(dr - cr) > 0.01) {
    return next(new Error(`Voucher not balanced: DR=${dr.toFixed(2)}, CR=${cr.toFixed(2)}`));
  }
  
  this.totalDebit = dr;
  this.totalCredit = cr;
  next();
});

// ⚠️ IMPORTANT: Delete cached model to force re-registration with updated enum
// This is needed because Mongoose caches models and won't pick up enum changes
if (mongoose.models.Voucher) {
  delete mongoose.models.Voucher;
}

const Voucher = mongoose.model<IVoucher>('Voucher', VoucherSchema);

export default Voucher;
