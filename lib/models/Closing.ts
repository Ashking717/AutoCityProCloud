// lib/models/Closing.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClosing extends Document {
  closingType: 'day' | 'month';
  closingDate: Date;
  periodStart: Date;
  periodEnd: Date;
  
  // Financial Metrics
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  
  // Cash Flow
  openingCash: number;
  cashSales: number;
  cashReceipts: number;
  cashPayments: number;
  closingCash: number;
  
  // Sales Metrics
  salesCount: number;
  totalDiscount: number;
  totalTax: number;
  
  // Inventory
  openingStock: number;
  closingStock: number;
  stockValue: number;
  
  // Ledger Integration
  ledgerEntriesCount?: number;
  voucherIds?: string[];
  trialBalanceMatched?: boolean;
  totalDebits?: number;
  totalCredits?: number;
  
  // Status
  status: 'pending' | 'closed' | 'locked';
  
  // Audit Trail
  closedBy: mongoose.Types.ObjectId;
  closedAt: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  notes?: string;
  
  // Outlet
  outletId: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  canEdit(): boolean;
  lock(): Promise<void>;
  verify(userId: mongoose.Types.ObjectId): Promise<void>;
}

// Lean version type for queries
export interface IClosingLean {
  _id: mongoose.Types.ObjectId;
  closingType: 'day' | 'month';
  closingDate: Date;
  periodStart: Date;
  periodEnd: Date;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  openingCash: number;
  cashSales: number;
  cashReceipts: number;
  cashPayments: number;
  closingCash: number;
  salesCount: number;
  totalDiscount: number;
  totalTax: number;
  openingStock: number;
  closingStock: number;
  stockValue: number;
  ledgerEntriesCount?: number;
  voucherIds?: string[];
  trialBalanceMatched?: boolean;
  totalDebits?: number;
  totalCredits?: number;
  status: 'pending' | 'closed' | 'locked';
  closedBy: mongoose.Types.ObjectId;
  closedAt: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  notes?: string;
  outletId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Period summary interface
export interface IPeriodSummary {
  totalClosings: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  avgProfit: number;
}

// Model statics interface
interface IClosingModel extends Model<IClosing> {
  getPeriodSummary(
    outletId: mongoose.Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<IPeriodSummary>;
}

const ClosingSchema = new Schema<IClosing, IClosingModel>(
  {
    closingType: {
      type: String,
      enum: ['day', 'month'],
      required: true,
    },
    closingDate: {
      type: Date,
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    
    // Financial Metrics
    totalSales: {
      type: Number,
      default: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    netProfit: {
      type: Number,
      default: 0,
    },
    
    // Cash Flow
    openingCash: {
      type: Number,
      default: 0,
    },
    cashSales: {
      type: Number,
      default: 0,
    },
    cashReceipts: {
      type: Number,
      default: 0,
    },
    cashPayments: {
      type: Number,
      default: 0,
    },
    closingCash: {
      type: Number,
      default: 0,
    },
    
    // Sales Metrics
    salesCount: {
      type: Number,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    
    // Inventory
    openingStock: {
      type: Number,
      default: 0,
    },
    closingStock: {
      type: Number,
      default: 0,
    },
    stockValue: {
      type: Number,
      default: 0,
    },
    
    // Ledger Integration
    ledgerEntriesCount: {
      type: Number,
      default: 0,
    },
    voucherIds: [{
      type: String,
    }],
    trialBalanceMatched: {
      type: Boolean,
      default: false,
    },
    totalDebits: {
      type: Number,
      default: 0,
    },
    totalCredits: {
      type: Number,
      default: 0,
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'closed', 'locked'],
      default: 'closed',
    },
    
    // Audit Trail
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closedAt: {
      type: Date,
      required: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
    
    // Outlet
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
ClosingSchema.index({ outletId: 1, closingDate: -1 });
ClosingSchema.index({ outletId: 1, closingType: 1, closingDate: -1 });
ClosingSchema.index({ outletId: 1, status: 1 });
ClosingSchema.index({ periodStart: 1, periodEnd: 1 });

// Virtual for formatted closing date
ClosingSchema.virtual('formattedDate').get(function(this: IClosing) {
  return this.closingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Virtual for profit margin
ClosingSchema.virtual('profitMargin').get(function(this: IClosing) {
  if (this.totalRevenue === 0) return 0;
  return (this.netProfit / this.totalRevenue) * 100;
});

// Virtual for trial balance difference
ClosingSchema.virtual('trialBalanceDifference').get(function(this: IClosing) {
  return Math.abs((this.totalDebits || 0) - (this.totalCredits || 0));
});

// Method to check if closing can be edited
ClosingSchema.methods.canEdit = function(this: IClosing): boolean {
  return this.status !== 'locked';
};

// Method to lock closing
ClosingSchema.methods.lock = async function(this: IClosing): Promise<void> {
  this.status = 'locked';
  await this.save();
};

// Method to verify closing
ClosingSchema.methods.verify = async function(
  this: IClosing,
  userId: mongoose.Types.ObjectId
): Promise<void> {
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  await this.save();
};

// Static method to get period summary
ClosingSchema.statics.getPeriodSummary = async function(
  this: IClosingModel,
  outletId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<IPeriodSummary> {
  const closings = await this.find({
    outletId,
    closingDate: { $gte: startDate, $lte: endDate },
  }).lean<IClosingLean[]>();
  
  return {
    totalClosings: closings.length,
    totalRevenue: closings.reduce((sum, c) => sum + (c.totalRevenue || 0), 0),
    totalExpenses: closings.reduce((sum, c) => sum + (c.totalExpenses || 0), 0),
    totalProfit: closings.reduce((sum, c) => sum + (c.netProfit || 0), 0),
    avgProfit: closings.length > 0 
      ? closings.reduce((sum, c) => sum + (c.netProfit || 0), 0) / closings.length 
      : 0,
  };
};

// Export the model
const ClosingModel = (mongoose.models.Closing as IClosingModel) || 
  mongoose.model<IClosing, IClosingModel>('Closing', ClosingSchema);

export default ClosingModel;