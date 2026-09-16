// lib/models/Expense.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseItem {
  description: string;
  accountId: mongoose.Types.ObjectId;
  accountName: string;
  accountCode: string;
  amount: number;
  notes?: string;
}

export interface IExpense extends Document {
  expenseNumber: string;
  outletId: mongoose.Types.ObjectId;
  expenseDate: Date;
  
  // Expense Details
  category: 'UTILITY' | 'RENT' | 'SALARY' | 'MAINTENANCE' | 'MARKETING' | 'OFFICE_SUPPLIES' | 'TRANSPORTATION' | 'PROFESSIONAL_FEES' | 'OTHER';
  items: IExpenseItem[];
  
  // Amounts
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  
  // Payment
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE' | 'CREDIT';
  paymentAccount?: mongoose.Types.ObjectId; // Cash or Bank account used
  amountPaid: number;
  balanceDue: number;
  
  // Vendor (if applicable)
  vendorName?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  
  // References
  referenceNumber?: string; // Bill number, invoice number
  dueDate?: Date;
  
  // Notes & Attachments
  notes?: string;
  attachments?: string[]; // URLs to uploaded documents
  
  // Status
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';
  
  // Accounting
  voucherId?: mongoose.Types.ObjectId;
  isPostedToGL: boolean;
  
  // Audit
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  
  // Recurring
  isRecurring: boolean;
  recurringFrequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  nextDueDate?: Date;
  operationKey?: string;
  payments?: Array<{
    paymentKey: string;
    amount: number;
    method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE';
    accountId?: mongoose.Types.ObjectId;
    voucherId: mongoose.Types.ObjectId;
    date: Date;
    reference?: string;
  }>;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
}

const ExpenseItemSchema = new Schema({
  description: { type: String, required: true },
  accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  accountName: { type: String, required: true },
  accountCode: { type: String, required: true },
  amount: { type: Number, required: true },
  notes: { type: String },
});

const ExpenseSchema = new Schema<IExpense>(
  {
    expenseNumber: { type: String, required: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    expenseDate: { type: Date, required: true, default: Date.now },
    
    category: {
      type: String,
      enum: ['UTILITY', 'RENT', 'SALARY', 'MAINTENANCE', 'MARKETING', 'OFFICE_SUPPLIES', 'TRANSPORTATION', 'PROFESSIONAL_FEES', 'OTHER'],
      required: true,
    },
    
    items: [ExpenseItemSchema],
    
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'CREDIT'],
      required: true,
    },
    paymentAccount: { type: Schema.Types.ObjectId, ref: 'Account' },
    amountPaid: { type: Number, required: true, default: 0 },
    balanceDue: { type: Number, required: true, default: 0 },
    
    vendorName: { type: String },
    vendorPhone: { type: String },
    vendorEmail: { type: String },
    
    referenceNumber: { type: String },
    dueDate: { type: Date },
    
    notes: { type: String },
    attachments: [{ type: String }],
    
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED'],
      default: 'PAID',
    },
    
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
    isPostedToGL: { type: Boolean, default: false },
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
    },
    nextDueDate: { type: Date },
    operationKey: { type: String, trim: true },
    payments: [{
      _id: false,
      paymentKey: { type: String, required: true },
      amount: { type: Number, required: true, min: 0.01 },
      method: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE'], required: true },
      accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
      voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
      date: { type: Date, required: true },
      reference: { type: String, trim: true },
    }],
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes
ExpenseSchema.index({ outletId: 1, expenseDate: -1 });
ExpenseSchema.index({ outletId: 1, category: 1 });
ExpenseSchema.index({ outletId: 1, status: 1 });
ExpenseSchema.index({ outletId: 1, expenseNumber: 1 }, { unique: true });
ExpenseSchema.index(
  { outletId: 1, operationKey: 1 },
  { unique: true, partialFilterExpression: { operationKey: { $type: 'string' } } }
);
ExpenseSchema.index(
  { outletId: 1, 'payments.paymentKey': 1 },
  { unique: true, partialFilterExpression: { 'payments.paymentKey': { $type: 'string' } } }
);

ExpenseSchema.pre('save', function(next) {
  const subtotal = Number(this.subtotal || 0);
  const tax = Number(this.taxAmount || 0);
  const total = Number(this.grandTotal || 0);
  const paid = Number(this.amountPaid || 0);
  const due = Number(this.balanceDue || 0);
  if (![subtotal, tax, total, paid, due].every(Number.isFinite) || subtotal < 0 || tax < 0 || paid < 0 || due < 0) {
    return next(new Error('Expense totals must be non-negative finite amounts'));
  }
  if (Math.abs(subtotal + tax - total) > 0.01 || Math.abs(paid + due - total) > 0.01) {
    return next(new Error('Expense totals are inconsistent'));
  }
  next();
});

export default mongoose.models.Expense || 
  mongoose.model<IExpense>('Expense', ExpenseSchema);
