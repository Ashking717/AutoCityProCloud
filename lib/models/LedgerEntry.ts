//app/lib/models/LedgerEntry.ts
import mongoose, { Schema, Document } from 'mongoose';

/**
 * LedgerEntry - THE SINGLE SOURCE OF ACCOUNTING TRUTH
 * 
 * CRITICAL RULES:
 * 1. This is the ONLY place accounting data lives
 * 2. Voucher is just a header - ledger entries are the facts
 * 3. ALL reports MUST read from LedgerEntry ONLY
 * 4. Once created, entries are IMMUTABLE (no updates/deletes)
 * 5. Corrections done via reversal entries only
 */

// Reference types - keep in sync with Voucher.ts
export enum ReferenceType {
  OPENING_BALANCE = 'OPENING_BALANCE',
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  PURCHASE_PAYMENT = 'PURCHASE_PAYMENT',  // ← ADDED THIS LINE
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  ADJUSTMENT = 'ADJUSTMENT',
  REVERSAL = 'REVERSAL',
  MANUAL = 'MANUAL',
  TRANSFER = 'TRANSFER',
}

export interface ILedgerEntry extends Document {
  // Link to voucher header (for grouping only)
  voucherId: mongoose.Types.ObjectId;
  voucherNumber: string;
  voucherType: 'payment' | 'receipt' | 'journal' | 'contra';
  
  // The actual accounting entry
  accountId: mongoose.Types.ObjectId;
  accountNumber: string;
  accountName: string;
  
  // Debit or Credit (never both)
  debit: number;
  credit: number;
  
  // Transaction details
  date: Date;
  narration: string;
  
  // Reference to source document
  referenceType?: ReferenceType;
  referenceId?: mongoose.Types.ObjectId;
  referenceNumber?: string;
  
  // Reversal tracking
  isReversal: boolean;
  reversedEntryId?: mongoose.Types.ObjectId;
  reversalReason?: string;
  
  // Organization
  outletId: mongoose.Types.ObjectId;
  
  // Audit fields (immutable)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    voucherId: {
      type: Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
      index: true,
    },
    voucherNumber: {
      type: String,
      required: true,
      index: true,
    },
    voucherType: {
      type: String,
      required: true,
      enum: ['payment', 'receipt', 'journal', 'contra'],
    },
    
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      index: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    
    debit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    credit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    
    date: {
      type: Date,
      required: true,
      index: true,
    },
    narration: {
      type: String,
      required: true,
    },
    
    referenceType: {
      type: String,
      enum: Object.values(ReferenceType),
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    referenceNumber: {
      type: String,
    },
    
    isReversal: {
      type: Boolean,
      default: false,
      index: true,
    },
    reversedEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'LedgerEntry',
    },
    reversalReason: {
      type: String,
    },
    
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // createdAt only, no updates
  }
);

// CRITICAL INDEXES for performance
LedgerEntrySchema.index({ outletId: 1, date: -1 });
LedgerEntrySchema.index({ outletId: 1, accountId: 1, date: -1 });
LedgerEntrySchema.index({ outletId: 1, voucherId: 1 });
LedgerEntrySchema.index({ referenceType: 1, referenceId: 1 });

// PREVENT UPDATES AND DELETES
LedgerEntrySchema.pre('findOneAndUpdate', function() {
  throw new Error('LEDGER ENTRIES ARE IMMUTABLE - Use reversal entries for corrections');
});

LedgerEntrySchema.pre('findOneAndDelete', function() {
  throw new Error('LEDGER ENTRIES CANNOT BE DELETED - Use reversal entries for corrections');
});

LedgerEntrySchema.pre('deleteOne', function() {
  throw new Error('LEDGER ENTRIES CANNOT BE DELETED - Use reversal entries for corrections');
});

LedgerEntrySchema.pre('deleteMany', function() {
  throw new Error('LEDGER ENTRIES CANNOT BE DELETED - Use reversal entries for corrections');
});

// Validation: Debit and Credit cannot both be non-zero
LedgerEntrySchema.pre('save', function(next) {
  if (this.debit > 0 && this.credit > 0) {
    return next(new Error('An entry cannot have both debit and credit'));
  }
  if (this.debit === 0 && this.credit === 0) {
    return next(new Error('An entry must have either debit or credit'));
  }
  next();
});

// Delete cached model to force re-registration with updated enum
if (mongoose.models.LedgerEntry) {
  delete mongoose.models.LedgerEntry;
}

const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);

export default LedgerEntry;