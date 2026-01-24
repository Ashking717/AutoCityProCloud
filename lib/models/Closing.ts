import mongoose, { Schema, Document, Model } from 'mongoose';

/* =========================================================
   Interfaces
   ========================================================= */

export interface IClosing extends Document {
  closingType: 'day' | 'month';
  closingDate: Date;
  periodStart: Date;
  periodEnd: Date;

  // Financial Metrics (LEDGER-DRIVEN)
  totalRevenue: number;         // From ledger: Credits to SALES_REVENUE
  totalCOGS: number;            // From ledger: Debits to COST_OF_GOODS_SOLD
  totalPurchases: number;       // From ledger: Debits to INVENTORY
  totalExpenses: number;        // From ledger: Debits to EXPENSE accounts (excluding COGS)
  
  // Profit Metrics
  grossProfit: number;          // Revenue - COGS
  netProfit: number;            // Revenue - (COGS + Purchases + Expenses)

  // Cash & Bank (LEDGER-DRIVEN)
  openingCash: number;
  openingBank: number;
  closingCash: number;
  closingBank: number;

  // Informational sales split (not used for balances)
  cashSales: number;
  bankSales: number;

  // Ledger-derived cash/bank movements (for analysis only)
  cashReceipts?: number;    // Total debits to cash accounts (from ledger)
  cashPayments?: number;    // Total credits from cash accounts (from ledger)
  bankReceipts?: number;    // Total debits to bank accounts (from ledger)
  bankPayments?: number;    // Total credits from bank accounts (from ledger)

  // Total Balances
  totalOpeningBalance: number;
  totalClosingBalance: number;

  // Sales Metrics
  salesCount: number;
  totalDiscount: number;
  totalTax: number;

  // Purchase & Expense Counts
  purchasesCount: number;
  expensesCount: number;

  // Inventory (SNAPSHOT-DRIVEN)
  openingStock: number;
  closingStock: number;
  stockValue: number;

  // Ledger Integration & Statistics
  ledgerEntriesCount?: number;      // Total ledger entries in period
  voucherIds?: string[];            // Reference to source vouchers
  trialBalanceMatched?: boolean;    // Whether debits = credits
  totalDebits?: number;             // Total debits in period
  totalCredits?: number;            // Total credits in period

  // Accounts Payable (from ledger)
  accountsPayable?: number;

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

  totalRevenue: number;
  totalCOGS: number;
  totalPurchases: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;

  openingCash: number;
  openingBank: number;
  closingCash: number;
  closingBank: number;

  cashSales: number;
  bankSales: number;

  cashReceipts?: number;
  cashPayments?: number;
  bankReceipts?: number;
  bankPayments?: number;

  totalOpeningBalance: number;
  totalClosingBalance: number;

  salesCount: number;
  totalDiscount: number;
  totalTax: number;

  purchasesCount: number;
  expensesCount: number;

  openingStock: number;
  closingStock: number;
  stockValue: number;

  ledgerEntriesCount?: number;
  voucherIds?: string[];
  trialBalanceMatched?: boolean;
  totalDebits?: number;
  totalCredits?: number;

  accountsPayable?: number;

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
  totalCOGS: number;
  totalPurchases: number;
  totalExpenses: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  avgGrossProfit: number;
  avgNetProfit: number;
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

    // Financial Metrics (LEDGER-DRIVEN)
    totalRevenue: { type: Number, default: 0 },
    totalCOGS: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    
    // Profit Metrics
    grossProfit: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },

    // Cash & Bank (Ledger-driven balances)
    openingCash: { type: Number, default: 0 },
    openingBank: { type: Number, default: 0 },
    closingCash: { type: Number, default: 0 },
    closingBank: { type: Number, default: 0 },

    // Informational (sales breakdown for reference)
    cashSales: { type: Number, default: 0 },
    bankSales: { type: Number, default: 0 },

    // Ledger-derived movements (for analysis and transparency)
    cashReceipts: { type: Number, default: 0 },   // Sum of debits to cash accounts
    cashPayments: { type: Number, default: 0 },   // Sum of credits from cash accounts
    bankReceipts: { type: Number, default: 0 },   // Sum of debits to bank accounts
    bankPayments: { type: Number, default: 0 },   // Sum of credits from bank accounts

    // Total Balances
    totalOpeningBalance: { type: Number, default: 0 },
    totalClosingBalance: { type: Number, default: 0 },

    // Sales Metrics
    salesCount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },

    // Purchase & Expense Counts
    purchasesCount: { type: Number, default: 0 },
    expensesCount: { type: Number, default: 0 },

    // Inventory
    openingStock: { type: Number, default: 0 },
    closingStock: { type: Number, default: 0 },
    stockValue: { type: Number, default: 0 },

    // Ledger Integration & Statistics
    ledgerEntriesCount: { type: Number, default: 0 },
    voucherIds: [{ type: String }],
    trialBalanceMatched: { type: Boolean, default: false },
    totalDebits: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },

    // Accounts Payable
    accountsPayable: { type: Number, default: 0 },

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
ClosingSchema.index({ outletId: 1, trialBalanceMatched: 1 }); // For finding unbalanced closings

/* =========================================================
   Virtuals
   ========================================================= */

ClosingSchema.virtual('formattedDate').get(function () {
  return this.closingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

ClosingSchema.virtual('grossProfitMargin').get(function () {
  if (!this.totalRevenue) return 0;
  return ((this.grossProfit || 0) / this.totalRevenue) * 100;
});

ClosingSchema.virtual('netProfitMargin').get(function () {
  if (!this.totalRevenue) return 0;
  return (this.netProfit / this.totalRevenue) * 100;
});

// Legacy support - maps to netProfitMargin
ClosingSchema.virtual('profitMargin').get(function () {
  if (!this.totalRevenue) return 0;
  return (this.netProfit / this.totalRevenue) * 100;
});

ClosingSchema.virtual('trialBalanceDifference').get(function () {
  return Math.abs((this.totalDebits || 0) - (this.totalCredits || 0));
});

ClosingSchema.virtual('totalLiquidity').get(function () {
  return (this.closingCash || 0) + (this.closingBank || 0);
});

ClosingSchema.virtual('cashMovement').get(function () {
  return (this.closingCash || 0) - (this.openingCash || 0);
});

ClosingSchema.virtual('bankMovement').get(function () {
  return (this.closingBank || 0) - (this.openingBank || 0);
});

ClosingSchema.virtual('netMovement').get(function () {
  return (this.totalClosingBalance || 0) - (this.totalOpeningBalance || 0);
});

ClosingSchema.virtual('totalCosts').get(function () {
  return (this.totalCOGS || 0) + (this.totalPurchases || 0) + (this.totalExpenses || 0);
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

  const totalGrossProfit = closings.reduce((s, c) => s + (c.grossProfit || 0), 0);
  const totalNetProfit = closings.reduce((s, c) => s + (c.netProfit || 0), 0);

  return {
    totalClosings: closings.length,
    totalRevenue: closings.reduce((s, c) => s + (c.totalRevenue || 0), 0),
    totalCOGS: closings.reduce((s, c) => s + (c.totalCOGS || 0), 0),
    totalPurchases: closings.reduce((s, c) => s + (c.totalPurchases || 0), 0),
    totalExpenses: closings.reduce((s, c) => s + (c.totalExpenses || 0), 0),
    totalGrossProfit,
    totalNetProfit,
    avgGrossProfit: closings.length ? totalGrossProfit / closings.length : 0,
    avgNetProfit: closings.length ? totalNetProfit / closings.length : 0,
  };
};

/* =========================================================
   Pre-save Hook: Validation & Auto-calculation
   ========================================================= */

ClosingSchema.pre('save', function (next) {
  // Validate that trial balance difference is within acceptable range
  if (this.trialBalanceMatched === false) {
    const difference = Math.abs((this.totalDebits || 0) - (this.totalCredits || 0));
    if (difference > 0.01) {
      console.warn(`Trial balance mismatch detected: ${difference.toFixed(2)} difference`);
    }
  }

  // Ensure total balances are correctly calculated
  this.totalOpeningBalance = (this.openingCash || 0) + (this.openingBank || 0);
  this.totalClosingBalance = (this.closingCash || 0) + (this.closingBank || 0);

  // Auto-calculate profit if not set (for backwards compatibility)
  if (this.totalRevenue > 0) {
    // Calculate gross profit if COGS exists
    if (this.totalCOGS !== undefined && this.grossProfit === 0) {
      this.grossProfit = this.totalRevenue - this.totalCOGS;
    }
    
    // Calculate net profit
    if (this.netProfit === 0) {
      const cogs = this.totalCOGS || 0;
      const purchases = this.totalPurchases || 0;
      const expenses = this.totalExpenses || 0;
      this.netProfit = this.totalRevenue - (cogs + purchases + expenses);
    }
  }

  next();
});

/* =========================================================
   Export
   ========================================================= */

const ClosingModel =
  (mongoose.models.Closing as IClosingModel) ||
  mongoose.model<IClosing, IClosingModel>('Closing', ClosingSchema);

export default ClosingModel;