import mongoose, { Schema, Document } from 'mongoose';

export interface IClosing extends Document {
  closingType: 'day' | 'month';
  closingDate: Date;
  periodStart: Date;
  periodEnd: Date;
  
  // Financial Summary
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  
  // Cash Summary
  openingCash: number;
  cashSales: number;
  cashReceipts: number;
  cashPayments: number;
  closingCash: number;
  
  // Sales Summary
  salesCount: number;
  totalDiscount: number;
  totalTax: number;
  
  // Inventory Summary
  openingStock: number;
  closingStock: number;
  stockValue: number;
  
  // Status
  status: 'open' | 'closed' | 'locked';
  closedBy: mongoose.Types.ObjectId;
  closedAt: Date;
  
  // Verification
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  
  // Notes
  notes?: string;
  discrepancies?: string;
  
  outletId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClosingSchema = new Schema<IClosing>(
  {
    closingType: { 
      type: String, 
      required: true, 
      enum: ['day', 'month'] 
    },
    closingDate: { type: Date, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    
    totalSales: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    
    openingCash: { type: Number, default: 0 },
    cashSales: { type: Number, default: 0 },
    cashReceipts: { type: Number, default: 0 },
    cashPayments: { type: Number, default: 0 },
    closingCash: { type: Number, default: 0 },
    
    salesCount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    
    openingStock: { type: Number, default: 0 },
    closingStock: { type: Number, default: 0 },
    stockValue: { type: Number, default: 0 },
    
    status: { 
      type: String, 
      default: 'open', 
      enum: ['open', 'closed', 'locked'] 
    },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    closedAt: { type: Date, default: Date.now },
    
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    
    notes: { type: String },
    discrepancies: { type: String },
    
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  },
  { timestamps: true }
);

ClosingSchema.index({ outletId: 1, closingDate: -1 });
ClosingSchema.index({ outletId: 1, closingType: 1, status: 1 });
ClosingSchema.index({ closingDate: -1 });

const Closing = mongoose.models.Closing || mongoose.model<IClosing>('Closing', ClosingSchema);

export default Closing;
