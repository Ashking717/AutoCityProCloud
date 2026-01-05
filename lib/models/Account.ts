import mongoose, { Schema, Document } from 'mongoose';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountSubType {
  // Assets
  CASH = 'cash',
  BANK = 'bank',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  INVENTORY = 'inventory',
  FIXED_ASSET = 'fixed_asset',

  // Liabilities
  ACCOUNTS_PAYABLE = 'accounts_payable',
  LOAN = 'loan',

  // Equity
  OWNER_EQUITY = 'owner_equity',
  RETAINED_EARNINGS = 'retained_earnings',

  // Revenue
  SALES_REVENUE = 'sales_revenue',
  SERVICE_REVENUE = 'service_revenue',

  // Expenses
  COST_OF_GOODS_SOLD = 'cogs',
  OPERATING_EXPENSE = 'operating_expense',
  ADMINISTRATIVE_EXPENSE = 'administrative_expense',
}

export interface IAccount extends Document {
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountSubType: AccountSubType;
  accountGroup: string;
  openingBalance: number;
  currentBalance: number;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  outletId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    accountNumber: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },

    accountType: {
      type: String,
      required: true,
      enum: Object.values(AccountType),
    },

    accountSubType: {
      type: String,
      required: true,
      enum: Object.values(AccountSubType),
    },

    accountGroup: { type: String, required: true },

    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },

    description: { type: String },

    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  },
  { timestamps: true }
);

// Indexes
AccountSchema.index({ outletId: 1, accountNumber: 1 });
AccountSchema.index({ outletId: 1, accountName: 1 });
AccountSchema.index({ accountType: 1 });
AccountSchema.index({ accountSubType: 1 });

const Account =
  mongoose.models.Account ||
  mongoose.model<IAccount>('Account', AccountSchema);

export default Account;
