import mongoose, { Schema, Document } from 'mongoose';
import './Category';

export interface IProduct extends Document {
  name: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  sku: string;
  barcode?: string;
  partNumber?: string;
  isVehicle: boolean;
  vin?: string;
  carMake?: string;
  carModel?: string;
  variant?: string;
  yearFrom?: number;
  yearTo?: number;
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
  yearRange?: string; // Virtual property
}

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    sku: { type: String, required: true, uppercase: true },
    barcode: { type: String, default: '' },
    partNumber: { type: String, default: '' },
    isVehicle: { type: Boolean, default: false },
    vin: { type: String, trim: true, uppercase: true },
    carMake: { type: String, default: '' },
    carModel: { type: String, default: '' },
    variant: { type: String, default: '' },
    yearFrom: { 
      type: Number, 
      default: null,
      min: 1900,
      max: 2100,
      validate: {
        validator: function(this: IProduct, value: number) {
          if (!value) return true;
          if (this.yearTo) {
            return value <= this.yearTo;
          }
          return true;
        },
        message: 'yearFrom must be less than or equal to yearTo'
      }
    },
    yearTo: { 
      type: Number, 
      default: null,
      min: 1900,
      max: 2100,
      validate: {
        validator: function(this: IProduct, value: number) {
          if (!value) return true;
          if (this.yearFrom) {
            return value >= this.yearFrom;
          }
          return true;
        },
        message: 'yearTo must be greater than or equal to yearFrom'
      }
    },
    color: { type: String, default: '' },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0 },
    currentStock: { type: Number, required: true, default: 0 },
    minStock: { type: Number, default: 0 },
    maxStock: { type: Number, default: 1000 },
    reorderPoint: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' },
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
ProductSchema.index({ outletId: 1, yearFrom: 1, yearTo: 1 }); // Index for year range queries

// Virtual property to get year range as a string
ProductSchema.virtual('yearRange').get(function() {
  if (!this.yearFrom && !this.yearTo) return '';
  if (this.yearFrom && !this.yearTo) return `${this.yearFrom}+`;
  if (!this.yearFrom && this.yearTo) return `Up to ${this.yearTo}`;
  if (this.yearFrom === this.yearTo) return `${this.yearFrom}`;
  return `${this.yearFrom}-${this.yearTo}`;
});

const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;