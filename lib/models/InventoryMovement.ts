import mongoose, { Schema, Document } from 'mongoose';

/**
 * InventoryMovement - STOCK MOVEMENT TRUTH
 * 
 * CRITICAL RULES:
 * 1. Every stock change MUST have a movement record
 * 2. Movements are IMMUTABLE (no updates/deletes)
 * 3. Stock balance = SUM of all movements
 * 4. Must be created in SAME transaction as LedgerEntry
 */

export enum MovementType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
}

export interface IInventoryMovement extends Document {
  // Product info
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  
  // Movement details
  movementType: MovementType;
  quantity: number; // Positive for IN, Negative for OUT
  unitCost: number; // Cost per unit at time of movement
  totalValue: number; // quantity * unitCost
  
  // Reference to source
  referenceType: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
  referenceId: mongoose.Types.ObjectId;
  referenceNumber: string;
  
  // Link to accounting (CRITICAL for atomicity)
  voucherId?: mongoose.Types.ObjectId;
  ledgerEntriesCreated: boolean; // Flag to ensure ledger was posted
  
  // Running balance (calculated, not source of truth)
  balanceAfter: number;
  
  // Transaction details
  date: Date;
  notes?: string;
  
  // Organization
  outletId: mongoose.Types.ObjectId;
  
  // Audit (immutable)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      index: true,
    },
    
    movementType: {
      type: String,
      required: true,
      enum: Object.values(MovementType),
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      // Can be positive (in) or negative (out)
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    
    referenceType: {
      type: String,
      required: true,
      enum: ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN'],
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    referenceNumber: {
      type: String,
      required: true,
    },
    
    voucherId: {
      type: Schema.Types.ObjectId,
      ref: 'Voucher',
    },
    ledgerEntriesCreated: {
      type: Boolean,
      default: false,
      required: true,
    },
    
    balanceAfter: {
      type: Number,
      required: true,
    },
    
    date: {
      type: Date,
      required: true,
      index: true,
    },
    notes: {
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
    timestamps: { createdAt: true, updatedAt: false }, // createdAt only
  }
);

// CRITICAL INDEXES
InventoryMovementSchema.index({ outletId: 1, productId: 1, date: -1 });
InventoryMovementSchema.index({ outletId: 1, date: -1 });
InventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });
InventoryMovementSchema.index({ voucherId: 1 });

// PREVENT UPDATES AND DELETES
InventoryMovementSchema.pre('findOneAndUpdate', function() {
  throw new Error('INVENTORY MOVEMENTS ARE IMMUTABLE - Create adjustment movement for corrections');
});

InventoryMovementSchema.pre('findOneAndDelete', function() {
  throw new Error('INVENTORY MOVEMENTS CANNOT BE DELETED');
});

InventoryMovementSchema.pre('deleteOne', function() {
  throw new Error('INVENTORY MOVEMENTS CANNOT BE DELETED');
});

InventoryMovementSchema.pre('deleteMany', function() {
  throw new Error('INVENTORY MOVEMENTS CANNOT BE DELETED');
});

const InventoryMovement = mongoose.models.InventoryMovement || 
  mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);

export default InventoryMovement;
