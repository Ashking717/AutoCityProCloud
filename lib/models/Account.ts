// lib/models/Account.ts
import mongoose, { Schema, Document } from 'mongoose';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountSubType {
  CASH = 'cash',
  BANK = 'bank',
  INVENTORY = 'inventory',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  OWNER_EQUITY = 'owner_equity',
  RETAINED_EARNINGS = 'retained_earnings',
  SALES_REVENUE = 'sales_revenue',
  SERVICE_REVENUE = 'service_revenue',
  COGS = 'cogs',
  OPERATING_EXPENSE = 'operating_expense',
  ADMIN_EXPENSE = 'administrative_expense',
  VAT_PAYABLE = 'vat_payable',
  VAT_RECEIVABLE = 'vat_receivable',
  SALES_RETURNS = 'sales_returns',
  FIXED_ASSET = 'fixed_asset',
  LOAN = 'loan',
  OTHER_INCOME = 'other_income',
  FINANCIAL_EXPENSE = 'financial_expense',
  INVENTORY_ADJUSTMENT = 'inventory_adjustment',
}

export interface IAccount extends Document {
  code: string;              // CASH-001
  name: string;              // Cash in Hand
  type: AccountType;
  subType?: AccountSubType;
  parentId?: mongoose.Types.ObjectId;
  isSystem: boolean;
  isActive: boolean;
  outletId: mongoose.Types.ObjectId;
  accountGroup?: string;
  openingBalance: number;
  currentBalance: number;
  description?: string;
}

const AccountSchema = new Schema<IAccount>(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },

    type: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },

    subType: {
      type: String,
      enum: Object.values(AccountSubType),
    },

    parentId: { type: Schema.Types.ObjectId, ref: 'Account' },

    isSystem: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },

    outletId: { type: Schema.Types.ObjectId, required: true },
    accountGroup: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

AccountSchema.index({ outletId: 1, code: 1 }, { unique: true });

export default mongoose.models.Account ||
  mongoose.model<IAccount>('Account', AccountSchema);
