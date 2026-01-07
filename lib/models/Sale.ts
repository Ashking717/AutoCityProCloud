import mongoose, { Schema, Document, Model, HydratedDocument } from 'mongoose';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

// Return Item Interface
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

// Return Interface
export interface IReturn {
  returnNumber: string;
  returnDate: Date;
  reason?: string;
  items: IReturnItem[];
  totalAmount: number;
  processedBy: mongoose.Types.ObjectId;
  processedByName: string;
}

// Sale Item Interface
export interface ISaleItem {
  productId?: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  isLabor?: boolean;
  returnedQuantity?: number;
}

// Sale Document Interface with virtuals
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
  returns?: IReturn[];
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  totalReturnedAmount: number;
  netSaleAmount: number;
  
  // Methods
  canReturn(): boolean;
  getRemainingReturnableAmount(): number;
  getItemsAvailableForReturn(): Array<{
    productId?: mongoose.Types.ObjectId;
    name: string;
    sku: string;
    quantity: number;
    returnedQuantity: number;
    availableForReturn: number;
    unitPrice: number;
    totalValue: number;
    remainingValue: number;
  }>;
}

// Sale Model Interface with statics
export interface ISaleModel extends Model<ISale> {
  findWithReturns(query?: any): Promise<HydratedDocument<ISale>[]>;
}

// Return Item Schema
const ReturnItemSchema = new Schema<IReturnItem>({
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product' 
  },
  productName: { 
    type: String, 
    required: true 
  },
  sku: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  unitPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  reason: { 
    type: String 
  },
  returnDate: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

// Return Schema
const ReturnSchema = new Schema<IReturn>({
  returnNumber: { 
    type: String, 
    required: true 
  },
  returnDate: { 
    type: Date, 
    default: Date.now 
  },
  reason: { 
    type: String 
  },
  items: [ReturnItemSchema],
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  processedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  processedByName: { 
    type: String, 
    required: true 
  }
}, { _id: false });

// Sale Item Schema
const SaleItemSchema = new Schema<ISaleItem>({
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: function() {
      return !(this as any).isLabor;
    }
  },
  name: { 
    type: String, 
    required: true 
  },
  sku: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  unit: { 
    type: String, 
    required: true 
  },
  unitPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  taxRate: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  },
  taxAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  discount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  total: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  isLabor: { 
    type: Boolean, 
    default: false 
  },
  returnedQuantity: { 
    type: Number, 
    default: 0, 
    min: 0 
  }
}, { _id: false });

// Sale Schema
const SaleSchema = new Schema<ISale, ISaleModel>(
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
    returns: [ReturnSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for unique invoice number per outlet
SaleSchema.index({ outletId: 1, invoiceNumber: 1 }, { unique: true });
SaleSchema.index({ outletId: 1, saleDate: -1 });
SaleSchema.index({ outletId: 1, status: 1 });
SaleSchema.index({ outletId: 1, customerId: 1, saleDate: -1 });
SaleSchema.index({ outletId: 1, 'returns.returnDate': -1 });
SaleSchema.index({ 'returns.returnNumber': 1 }, { sparse: true });

// Virtual for total returned amount
SaleSchema.virtual('totalReturnedAmount').get(function(this: ISale) {
  if (!this.returns || this.returns.length === 0) {
    return 0;
  }
  return this.returns.reduce((sum, ret) => sum + ret.totalAmount, 0);
});

// Virtual for net sale amount (after returns)
SaleSchema.virtual('netSaleAmount').get(function(this: ISale) {
  return this.grandTotal - this.totalReturnedAmount;
});

// Method to check if sale can be returned - FIX: Use proper string comparison
SaleSchema.methods.canReturn = function(this: ISale): boolean {
  return this.status === 'COMPLETED' && this.grandTotal > 0;
};
// Method to get remaining returnable amount
SaleSchema.methods.getRemainingReturnableAmount = function(this: ISale): number {
  if (!this.canReturn()) {
    return 0;
  }
  return Math.max(0, this.grandTotal - this.totalReturnedAmount);
};

// Method to get items available for return
SaleSchema.methods.getItemsAvailableForReturn = function(this: ISale) {
  return this.items
    .filter((item: ISaleItem) => !item.isLabor)
    .map((item: ISaleItem) => ({
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity || 0,
      availableForReturn: item.quantity - (item.returnedQuantity || 0),
      unitPrice: item.unitPrice,
      totalValue: item.unitPrice * item.quantity,
      remainingValue: item.unitPrice * (item.quantity - (item.returnedQuantity || 0))
    }));
};

// Pre-save middleware to validate returns
SaleSchema.pre('save', function(this: ISale, next) {
  // Calculate total returned amount
  const totalReturned = this.totalReturnedAmount;
  
  if (totalReturned > this.grandTotal) {
    return next(new Error('Total returned amount cannot exceed sale grand total'));
  }
  
  // Validate that item returned quantities don't exceed original quantities
  for (const item of this.items) {
    const returnedQty = item.returnedQuantity || 0;
    if (returnedQty > item.quantity) {
      return next(new Error(`Returned quantity for "${item.name}" exceeds original quantity`));
    }
  }
  
  next();
});

// Static method to find sales with returns
SaleSchema.statics.findWithReturns = function(query = {}) {
  return this.find({
    ...query,
    returns: { $exists: true, $ne: [] }
  });
};

// Fix the TypeScript casting issue
const Sale = mongoose.models.Sale as ISaleModel || 
  mongoose.model<ISale, ISaleModel>('Sale', SaleSchema);

export default Sale;