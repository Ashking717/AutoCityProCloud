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
  unit: string;
  unitCost: number; // Cost per unit at time of movement
  totalValue: number; // quantity * unitCost
  
  // Reference to source
  referenceType: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';
  referenceId: mongoose.Types.ObjectId;
  referenceNumber: string;

  // Location details
  locationId?: mongoose.Types.ObjectId;
  locationName?: string;
  fromLocationId?: mongoose.Types.ObjectId;
  fromLocationName?: string;
  toLocationId?: mongoose.Types.ObjectId;
  toLocationName?: string;
  locationBalanceAfter?: number;
  
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
  operationKey?: string;
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
    unit: { type: String, required: true, default: 'pcs', trim: true },
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
      enum: ['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'],
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

    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'StockLocation',
      index: true,
    },
    locationName: {
      type: String,
      trim: true,
    },
    fromLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'StockLocation',
    },
    fromLocationName: {
      type: String,
      trim: true,
    },
    toLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'StockLocation',
    },
    toLocationName: {
      type: String,
      trim: true,
    },
    locationBalanceAfter: {
      type: Number,
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
    operationKey: { type: String, trim: true },
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
InventoryMovementSchema.index({ outletId: 1, productId: 1, locationId: 1, date: -1 });
InventoryMovementSchema.index(
  { outletId: 1, operationKey: 1 },
  { unique: true, partialFilterExpression: { operationKey: { $type: 'string' } } }
);

function validateMovementValues(movement: Partial<IInventoryMovement>) {
  const quantity = Number(movement.quantity);
  const unitCost = Number(movement.unitCost);
  const totalValue = Number(movement.totalValue);
  const balanceAfter = Number(movement.balanceAfter);
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new Error('Inventory movement quantity must be a finite non-zero number');
  }
  if (!Number.isFinite(unitCost) || unitCost < 0 || !Number.isFinite(totalValue)) {
    throw new Error('Inventory movement values must be finite and unit cost cannot be negative');
  }
  if (Math.abs(totalValue - quantity * unitCost) > 0.01) {
    throw new Error('Inventory movement totalValue must equal signed quantity × unitCost');
  }
  if (!Number.isFinite(balanceAfter)) {
    throw new Error('Inventory movement balanceAfter must be finite');
  }
  if (movement.ledgerEntriesCreated && !movement.voucherId) {
    throw new Error('Inventory movements marked as posted must reference a voucher');
  }
}

InventoryMovementSchema.pre('validate', function(next) {
  try {
    validateMovementValues(this);
    next();
  } catch (error: any) {
    next(error);
  }
});

InventoryMovementSchema.pre('insertMany', function(next, docs: IInventoryMovement[]) {
  try {
    docs.forEach(validateMovementValues);
    next();
  } catch (error: any) {
    next(error);
  }
});

InventoryMovementSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('INVENTORY MOVEMENTS ARE IMMUTABLE - Create an adjustment movement for corrections'));
  }
  next();
});

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

InventoryMovementSchema.pre('updateMany', function() {
  throw new Error('INVENTORY MOVEMENTS ARE IMMUTABLE - Create adjustment movement for corrections');
});

InventoryMovementSchema.pre('updateOne', function() {
  throw new Error('INVENTORY MOVEMENTS ARE IMMUTABLE - Create adjustment movement for corrections');
});

InventoryMovementSchema.pre('replaceOne', function() {
  throw new Error('INVENTORY MOVEMENTS ARE IMMUTABLE - Create adjustment movement for corrections');
});

InventoryMovementSchema.pre('findOneAndReplace', function() {
  throw new Error('INVENTORY MOVEMENTS ARE IMMUTABLE - Create adjustment movement for corrections');
});

const InventoryMovement = mongoose.models.InventoryMovement || 
  mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);

export default InventoryMovement;
