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
  },
  { timestamps: true }
);

AccountSchema.index({ outletId: 1, code: 1 }, { unique: true });

export default mongoose.models.Account ||
  mongoose.model<IAccount>('Account', AccountSchema);
