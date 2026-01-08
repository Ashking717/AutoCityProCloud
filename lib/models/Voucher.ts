// lib/models/Voucher.ts
import mongoose, { Schema, Document } from 'mongoose';

export enum VoucherType {
  PAYMENT = 'payment',
  RECEIPT = 'receipt',
  JOURNAL = 'journal',
  CONTRA = 'contra',
}

export enum ReferenceType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  ADJUSTMENT = 'ADJUSTMENT',
  REVERSAL = 'REVERSAL',
}

export interface IVoucherEntry {
  accountId: mongoose.Types.ObjectId;
  accountNumber?: string; // Added for consistency with ledger entries
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
  
  // Reference to source transaction - CRITICAL FOR CLOSINGS
  referenceType?: ReferenceType;
  referenceId?: mongoose.Types.ObjectId;
  referenceNumber?: string;
  
  attachments?: string[];
  outletId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherEntrySchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    accountNumber: { type: String }, // Added
    accountName: { type: String, required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    narration: { type: String },
  },
  { _id: false }
);

const VoucherSchema = new Schema<IVoucher>(
  {
    voucherNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    voucherType: {
      type: String,
      required: true,
      enum: Object.values(VoucherType),
      index: true,
    },
    date: { 
      type: Date, 
      required: true,
      index: true,
    },
    narration: { type: String, required: true },
    entries: { type: [VoucherEntrySchema], required: true },
    totalDebit: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'posted', 'approved', 'cancelled'],
      index: true,
    },
    
    // Reference fields - CRITICAL for tracking source transactions
    referenceType: {
      type: String,
      enum: Object.values(ReferenceType),
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    referenceNumber: {
      type: String,
    },
    
    attachments: [String],
    outletId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Outlet', 
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for efficient querying
VoucherSchema.index({ outletId: 1, date: -1 });
VoucherSchema.index({ outletId: 1, voucherType: 1, date: -1 });
VoucherSchema.index({ outletId: 1, status: 1 });
VoucherSchema.index({ outletId: 1, referenceType: 1, date: -1 }); // NEW - Critical for closings
VoucherSchema.index({ referenceType: 1, referenceId: 1 }); // NEW - For lookups

// Validation: Ensure debits equal credits
VoucherSchema.pre('save', function(next) {
  const debitTotal = this.entries.reduce((sum, e) => sum + e.debit, 0);
  const creditTotal = this.entries.reduce((sum, e) => sum + e.credit, 0);
  
  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    return next(new Error(`Voucher entries must balance. Debits: ${debitTotal}, Credits: ${creditTotal}`));
  }
  
  this.totalDebit = debitTotal;
  this.totalCredit = creditTotal;
  
  next();
});

const Voucher =
  mongoose.models.Voucher ||
  mongoose.model<IVoucher>('Voucher', VoucherSchema);

export default Voucher;