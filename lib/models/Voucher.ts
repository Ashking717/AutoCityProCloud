import mongoose, { Schema, Document } from 'mongoose';

export enum VoucherType {
  PAYMENT = 'payment',
  RECEIPT = 'receipt',
  JOURNAL = 'journal',
  CONTRA = 'contra',
}

export interface IVoucherEntry {
  accountId: mongoose.Types.ObjectId;
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
    },
    voucherType: {
      type: String,
      required: true,
      enum: Object.values(VoucherType),
    },
    date: { type: Date, required: true },
    narration: { type: String, required: true },
    entries: { type: [VoucherEntrySchema], required: true },
    totalDebit: { type: Number, required: true, min: 0 },
    totalCredit: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'posted', 'approved', 'cancelled'],
    },
    attachments: [String],
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
VoucherSchema.index({ outletId: 1, date: -1 });
VoucherSchema.index({ outletId: 1, voucherType: 1 });
VoucherSchema.index({ status: 1 });

const Voucher =
  mongoose.models.Voucher ||
  mongoose.model<IVoucher>('Voucher', VoucherSchema);

export default Voucher;
