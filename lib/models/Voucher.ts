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
  PURCHASE = 'PURCHASE',
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
}

const VoucherEntrySchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountNumber: String,
    accountName: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: String,
  },
  { _id: false }
);

const VoucherSchema = new Schema<IVoucher>(
  {
    voucherNumber: { type: String, unique: true, index: true },
    voucherType: { type: String, enum: Object.values(VoucherType), index: true },
    date: { type: Date, index: true },
    narration: String,
    entries: [VoucherEntrySchema],
    totalDebit: Number,
    totalCredit: Number,
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
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

// Compound indexes for common queries
VoucherSchema.index({ outletId: 1, voucherType: 1, date: -1 });
VoucherSchema.index({ outletId: 1, status: 1 });
VoucherSchema.index({ outletId: 1, referenceType: 1, referenceId: 1 });

// Pre-save validation: ensure voucher is balanced
VoucherSchema.pre('save', function (next) {
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