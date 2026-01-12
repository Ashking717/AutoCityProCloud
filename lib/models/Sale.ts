import mongoose, { Schema, Document, Model, HydratedDocument } from 'mongoose';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

export interface IReturnItem {
  productId?: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  reason?: string;
  returnDate: Date;
}

export interface IReturn {
  returnNumber: string;
  returnDate: Date;
  reason?: string;
  items: IReturnItem[];
  totalAmount: number;
  voucherId?: mongoose.Types.ObjectId;
  processedBy: mongoose.Types.ObjectId;
  processedByName: string;
}

export interface ISaleItem {
  productId?: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
  costPrice: number;
  
  // VAT fields (optional - calculated based on outlet settings)
  taxRate?: number;
  vatAmount?: number;
  
  isLabor?: boolean;
  returnedQuantity?: number;
}

export interface ISale extends Document {
  outletId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  items: ISaleItem[];
  
  subtotal: number;
  totalDiscount: number;
  totalVAT: number;  // NEW: 0 when VAT disabled
  grandTotal: number;
  
  paymentMethod: PaymentMethod;
  amountPaid: number;
  balanceDue: number;
  
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  saleDate: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  returns?: IReturn[];
  
  // GL Integration
  voucherId?: mongoose.Types.ObjectId;
  cogsVoucherId?: mongoose.Types.ObjectId;
  isPostedToGL: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  totalReturnedAmount: number;
  netSaleAmount: number;
  totalCOGS: number;
  
  // Methods
  canReturn(): boolean;
  getRemainingReturnableAmount(): number;
}

export interface ISaleModel extends Model<ISale> {
  findWithReturns(query?: any): Promise<HydratedDocument<ISale>[]>;
}

const ReturnItemSchema = new Schema<IReturnItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  reason: { type: String },
  returnDate: { type: Date, default: Date.now }
}, { _id: false });

const ReturnSchema = new Schema<IReturn>({
  returnNumber: { type: String, required: true },
  returnDate: { type: Date, default: Date.now },
  reason: { type: String },
  items: [ReturnItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  processedByName: { type: String, required: true }
}, { _id: false });

const SaleItemSchema = new Schema<ISaleItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: function() { return !(this as any).isLabor; }
  },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  vatAmount: { type: Number, default: 0, min: 0 },
  isLabor: { type: Boolean, default: false },
  returnedQuantity: { type: Number, default: 0, min: 0 }
}, { _id: false });

const SaleSchema = new Schema<ISale, ISaleModel>(
  {
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerName: { type: String, required: true },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    totalVAT: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true
    },
    amountPaid: { type: Number, required: true, min: 0 },
    balanceDue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
      default: 'COMPLETED'
    },
    saleDate: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    returns: [ReturnSchema],
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
    cogsVoucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
    isPostedToGL: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
SaleSchema.index({ outletId: 1, invoiceNumber: 1 }, { unique: true });
SaleSchema.index({ outletId: 1, saleDate: -1 });
SaleSchema.index({ outletId: 1, status: 1 });
SaleSchema.index({ outletId: 1, customerId: 1, saleDate: -1 });
SaleSchema.index({ outletId: 1, isPostedToGL: 1 });

// Virtuals
SaleSchema.virtual('totalReturnedAmount').get(function (this: ISale) {
  if (!this.returns || this.returns.length === 0) return 0;

  const total = this.returns.reduce(
    (sum, ret) => sum + (ret.totalAmount || 0),
    0
  );

  return Number(total.toFixed(2));
});


SaleSchema.virtual('netSaleAmount').get(function(this: ISale) {
  return this.grandTotal - this.totalReturnedAmount;
});

SaleSchema.virtual('totalCOGS').get(function(this: ISale) {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((sum, item) => {
    if (item.isLabor) return sum;
    return sum + (item.costPrice * item.quantity);
  }, 0);
});

// Methods
SaleSchema.methods.canReturn = function(this: ISale): boolean {
  return this.status === 'COMPLETED' && this.grandTotal > 0;
};

SaleSchema.methods.getRemainingReturnableAmount = function (
  this: ISale
): number {
  if (!this.canReturn()) return 0;

  const remaining =
    Number(this.grandTotal.toFixed(2)) -
    Number(this.totalReturnedAmount.toFixed(2));

  // Guard against floating-point drift
  return remaining > 0 ? Number(remaining.toFixed(2)) : 0;
};


// Pre-save validation
SaleSchema.pre('save', function(next) {
  const totalReturned = this.totalReturnedAmount;
  if (totalReturned > this.grandTotal) {
    return next(new Error('Total returned amount cannot exceed sale grand total'));
  }
  next();
});

// Static methods
SaleSchema.statics.findWithReturns = function(query = {}) {
  return this.find({
    ...query,
    returns: { $exists: true, $ne: [] }
  });
};

const Sale = mongoose.models.Sale as ISaleModel || 
  mongoose.model<ISale, ISaleModel>('Sale', SaleSchema);

export default Sale;
