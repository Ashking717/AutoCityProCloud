import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface IPurchase extends Document {
  outletId: mongoose.Types.ObjectId;
  purchaseNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  items: IPurchaseItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT';
  amountPaid: number;
  balanceDue: number;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, required: true, min: 0, max: 100 },
  taxAmount: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const PurchaseSchema = new Schema<IPurchase>(
  {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    purchaseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    items: [PurchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalTax: {
      type: Number,
      
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'],
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PurchaseSchema.index({ outletId: 1, purchaseNumber: 1 }, { unique: true });
PurchaseSchema.index({ outletId: 1, purchaseDate: -1 });
PurchaseSchema.index({ outletId: 1, status: 1 });
PurchaseSchema.index({ outletId: 1, supplierId: 1, purchaseDate: -1 });

const Purchase: Model<IPurchase> = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);

export default Purchase;
