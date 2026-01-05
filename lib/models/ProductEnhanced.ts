import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  sku: string;
  barcode?: string;
  
  isVehicle: boolean;
  vin?: string;
  carMake?: string;
  carModel?: string;
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
    description: String,
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    barcode: String,
    
    isVehicle: { type: Boolean, default: false },
    vin: { type: String, trim: true, uppercase: true },
    carMake: String,
    carModel: String,
    year: Number,
    color: String,
    
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0 },
    
    currentStock: { type: Number, required: true, default: 0 },
    minStock: { type: Number, default: 0 },
    maxStock: { type: Number, default: 1000 },
    reorderPoint: { type: Number, default: 10 },
    unit: { type: String, default: 'unit' },
    
    images: [String],
    primaryImage: String,
    
    isActive: { type: Boolean, default: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
  },
  { timestamps: true }
);

ProductSchema.index({ outletId: 1, isActive: 1 });

const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
