// lib/models/Purchase.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
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
  paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';
  amountPaid: number;
  balanceDue: number;
  status: 'DRAFT' | 'COMPLETED' | 'PAID' | 'CANCELLED';  // ← ADDED 'PAID'
  notes?: string;
  voucherId?: mongoose.Types.ObjectId;  // Link to accounting voucher
  isPostedToGL?: boolean;  // Track if posted to general ledger
  createdBy: mongoose.Types.ObjectId;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  operationKey?: string;
  payments?: Array<{
    paymentKey: string;
    amount: number;
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';
    reference?: string;
    voucherId: mongoose.Types.ObjectId;
    paidAt: Date;
  }>;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'StockLocation' },
  locationName: { type: String, trim: true },
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
      enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'],
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
      enum: ['DRAFT', 'COMPLETED', 'PAID', 'CANCELLED'],  // ← ADDED 'PAID'
      default: 'COMPLETED',
    },
    notes: {
      type: String,
      trim: true,
    },
    voucherId: {
      type: Schema.Types.ObjectId,
      ref: 'Voucher',
    },
    isPostedToGL: {
      type: Boolean,
      default: false,
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
    operationKey: { type: String, trim: true },
    payments: [{
      paymentKey: { type: String, required: true },
      amount: { type: Number, required: true, min: 0 },
      method: { type: String, enum: ['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE'], required: true },
      reference: { type: String, trim: true },
      voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
      paidAt: { type: Date, default: Date.now },
    }],
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
PurchaseSchema.index(
  { outletId: 1, operationKey: 1 },
  { unique: true, partialFilterExpression: { operationKey: { $type: 'string' } } }
);

PurchaseSchema.pre('save', function(next) {
  const expectedTotal = Number((Number(this.subtotal || 0) + Number(this.totalTax || 0)).toFixed(2));
  const expectedBalance = Number((Number(this.grandTotal || 0) - Number(this.amountPaid || 0)).toFixed(2));
  if (Math.abs(expectedTotal - Number(this.grandTotal || 0)) > 0.01) {
    return next(new Error('Purchase subtotal plus tax must equal grand total'));
  }
  if (Math.abs(expectedBalance - Number(this.balanceDue || 0)) > 0.01) {
    return next(new Error('Purchase amount paid plus balance due must equal grand total'));
  }
  if (this.balanceDue < -0.01) return next(new Error('Purchase cannot be overpaid'));
  next();
});
PurchaseSchema.index(
  { outletId: 1, 'payments.paymentKey': 1 },
  { unique: true, partialFilterExpression: { 'payments.paymentKey': { $type: 'string' } } }
);

// Virtual for checking if purchase is fully paid
PurchaseSchema.virtual('isFullyPaid').get(function() {
  return this.balanceDue <= 0.01;
});

// Virtual for checking if purchase has outstanding balance
PurchaseSchema.virtual('hasBalance').get(function() {
  return this.balanceDue > 0.01;
});

// Delete cached model to ensure updates are picked up
if (mongoose.models.Purchase) {
  delete mongoose.models.Purchase;
}

const Purchase: Model<IPurchase> = mongoose.model<IPurchase>('Purchase', PurchaseSchema);

export default Purchase;
