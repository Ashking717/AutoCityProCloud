// lib/models/Supplier.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  code: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  creditLimit: number;
  paymentTerms?: string;
  currentBalance: number;
  isActive: boolean;
  outletId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  operationKey?: string;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, default: '' },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String },
    taxNumber: { type: String },
    creditLimit: { type: Number, default: 0, min: 0 },
    paymentTerms: { type: String },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    operationKey: { type: String, trim: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ outletId: 1, isActive: 1 });
SupplierSchema.index({ outletId: 1, code: 1 }, { unique: true });
SupplierSchema.index({ outletId: 1, name: 1 });
SupplierSchema.index(
  { outletId: 1, operationKey: 1 },
  { unique: true, partialFilterExpression: { operationKey: { $type: 'string' } } }
);

const Supplier = mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

export default Supplier;
