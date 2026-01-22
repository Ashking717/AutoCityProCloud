import mongoose, { Schema, Document, Model } from 'mongoose';

/* =========================================================
   Interfaces
   ========================================================= */

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

  // Cash & Bank Flow
  openingCash: number;
  openingBank: number;

  cashSales: number;
  bankSales: number;

  cashReceipts: number;
  cashPayments: number;
  bankPayments: number;

  closingCash: number;
  closingBank: number;

  // Total Balances (Cash + Bank)
  totalOpeningBalance: number;
  totalClosingBalance: number;

  // Sales Metrics
  salesCount: number;
  totalDiscount: number;
  totalTax: number; // VAT total

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

  // Methods
  canEdit(): boolean;
  lock(): Promise<void>;
  verify(userId: mongoose.Types.ObjectId): Promise<void>;
}

/* =========================================================
   Lean Interface
   ========================================================= */

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
  openingBank: number;

  cashSales: number;
  bankSales: number;

  cashReceipts: number;
  cashPayments: number;
  bankPayments: number;

  closingCash: number;
  closingBank: number;

  totalOpeningBalance: number;
  totalClosingBalance: number;

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

/* =========================================================
   Period Summary
   ========================================================= */

export interface IPeriodSummary {
  totalClosings: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  avgProfit: number;
}

/* =========================================================
   Model Statics
   ========================================================= */

interface IClosingModel extends Model<IClosing> {
  getPeriodSummary(
    outletId: mongoose.Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<IPeriodSummary>;
}

/* =========================================================
   Schema
   ========================================================= */

const ClosingSchema = new Schema<IClosing, IClosingModel>(
  {
    closingType: { type: String, enum: ['day', 'month'], required: true },
    closingDate: { type: Date, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Financial Metrics
    totalSales: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },

    // Cash & Bank Flow
    openingCash: { type: Number, default: 0 },
    openingBank: { type: Number, default: 0 },

    cashSales: { type: Number, default: 0 },
    bankSales: { type: Number, default: 0 },

    cashReceipts: { type: Number, default: 0 },
    cashPayments: { type: Number, default: 0 },
    bankPayments: { type: Number, default: 0 },

    closingCash: { type: Number, default: 0 },
    closingBank: { type: Number, default: 0 },

    // Total Balances
    totalOpeningBalance: { type: Number, default: 0 },
    totalClosingBalance: { type: Number, default: 0 },

    // Sales Metrics
    salesCount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },

    // Inventory
    openingStock: { type: Number, default: 0 },
    closingStock: { type: Number, default: 0 },
    stockValue: { type: Number, default: 0 },

    // Ledger Integration
    ledgerEntriesCount: { type: Number, default: 0 },
    voucherIds: [{ type: String }],
    trialBalanceMatched: { type: Boolean, default: false },
    totalDebits: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ['pending', 'closed', 'locked'],
      default: 'closed',
    },

    // Audit Trail
    closedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    closedAt: { type: Date, required: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    notes: { type: String },

    // Outlet
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  },
  { timestamps: true }
);

/* =========================================================
   Indexes
   ========================================================= */

ClosingSchema.index({ outletId: 1, closingDate: -1 });
ClosingSchema.index({ outletId: 1, closingType: 1, closingDate: -1 });
ClosingSchema.index({ outletId: 1, status: 1 });
ClosingSchema.index({ periodStart: 1, periodEnd: 1 });

/* =========================================================
   Virtuals
   ========================================================= */

ClosingSchema.virtual('formattedDate').get(function (this: IClosing) {
  return this.closingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

ClosingSchema.virtual('profitMargin').get(function (this: IClosing) {
  if (!this.totalRevenue) return 0;
  return (this.netProfit / this.totalRevenue) * 100;
});

ClosingSchema.virtual('trialBalanceDifference').get(function (this: IClosing) {
  return Math.abs((this.totalDebits || 0) - (this.totalCredits || 0));
});

ClosingSchema.virtual('totalLiquidity').get(function (this: IClosing) {
  return (this.closingCash || 0) + (this.closingBank || 0);
});

/* =========================================================
   Methods
   ========================================================= */

ClosingSchema.methods.canEdit = function (): boolean {
  return this.status !== 'locked';
};

ClosingSchema.methods.lock = async function (): Promise<void> {
  this.status = 'locked';
  await this.save();
};

ClosingSchema.methods.verify = async function (
  userId: mongoose.Types.ObjectId
): Promise<void> {
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  await this.save();
};

/* =========================================================
   Statics
   ========================================================= */

ClosingSchema.statics.getPeriodSummary = async function (
  outletId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<IPeriodSummary> {
  const closings = await this.find({
    outletId,
    closingDate: { $gte: startDate, $lte: endDate },
  }).lean<IClosingLean[]>();

  const totalProfit = closings.reduce((s, c) => s + (c.netProfit || 0), 0);

  return {
    totalClosings: closings.length,
    totalRevenue: closings.reduce((s, c) => s + (c.totalRevenue || 0), 0),
    totalExpenses: closings.reduce((s, c) => s + (c.totalExpenses || 0), 0),
    totalProfit,
    avgProfit: closings.length ? totalProfit / closings.length : 0,
  };
};

/* =========================================================
   Export
   ========================================================= */

const ClosingModel =
  (mongoose.models.Closing as IClosingModel) ||
  mongoose.model<IClosing, IClosingModel>('Closing', ClosingSchema);

export default ClosingModel;