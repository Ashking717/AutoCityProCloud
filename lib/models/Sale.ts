import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

export interface ISaleItem {
  productId?: mongoose.Types.ObjectId; // Make optional
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  isLabor?: boolean; // Add this field
}

export interface ISale extends Document {
  outletId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  items: ISaleItem[];
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  balanceDue: number;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  saleDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>({
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: function() {
      // Only required if it's not a labor item
      return !this.isLabor;
    }
  },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }, // Changed min from 0 to 1
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, required: true, min: 0, max: 100 },
  taxAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  isLabor: { type: Boolean, default: false }, // Add this field
}, { _id: false });

const SaleSchema = new Schema<ISale>(
  {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    items: [SaleItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
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
      enum: ['DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
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
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique invoice number per outlet
SaleSchema.index({ outletId: 1, invoiceNumber: 1 }, { unique: true });
SaleSchema.index({ outletId: 1, saleDate: -1 });
SaleSchema.index({ outletId: 1, status: 1 });
SaleSchema.index({ outletId: 1, customerId: 1, saleDate: -1 });

const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);

export default Sale;