import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  sku: string;
  barcode?: string;
  partNumber?: string; // Added
  
  isVehicle: boolean;
  vin?: string;
  carMake?: string;
  carModel?: string;
  variant?: string; // NEW: Vehicle variant field (e.g., "LX", "EX", "Sport")
  year?: number;
  color?: string;
  
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  discount?: number;
  
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  unit: string;
  
  images: string[];
  primaryImage?: string;
  
  isActive: boolean;
  outletId: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    sku: { type: String, required: true, uppercase: true },
    barcode: { type: String, default: '' },
    partNumber: { type: String, default: '' }, // Added
    
    isVehicle: { type: Boolean, default: false },
    vin: { type: String, trim: true, uppercase: true },
    carMake: { type: String, default: '' },
    carModel: { type: String, default: '' },
    variant: { type: String, default: '' }, // NEW: Vehicle variant field
    year: { type: Number, default: null },
    color: { type: String, default: '' },
    
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0 },
    
    currentStock: { type: Number, required: true, default: 0 },
    minStock: { type: Number, default: 0 },
    maxStock: { type: Number, default: 1000 },
    reorderPoint: { type: Number, default: 10 },
    unit: { type: String, default: 'pcs' }, // Changed from 'unit' to 'pcs' to match your frontend
    
    images: { type: [String], default: [] },
    primaryImage: { type: String, default: '' },
    
    isActive: { type: Boolean, default: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  },
  { timestamps: true }
);

// Add compound index for SKU uniqueness per outlet
ProductSchema.index({ outletId: 1, sku: 1 }, { unique: true });

// Add other indexes for better performance
ProductSchema.index({ outletId: 1, isActive: 1 });
ProductSchema.index({ outletId: 1, isVehicle: 1 });
ProductSchema.index({ outletId: 1, category: 1 });
ProductSchema.index({ outletId: 1, carMake: 1 });

const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export default Product;