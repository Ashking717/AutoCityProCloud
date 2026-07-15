import mongoose, { Schema, Document } from 'mongoose';
import './ProductEnhanced';
import './StockLocation';

export interface IProductLocationStock extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  locationId: mongoose.Types.ObjectId;
  locationName: string;
  quantity: number;
  outletId: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductLocationStockSchema = new Schema<IProductLocationStock>(
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
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'StockLocation',
      required: true,
      index: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

ProductLocationStockSchema.index(
  { outletId: 1, productId: 1, locationId: 1 },
  { unique: true }
);
ProductLocationStockSchema.index({ outletId: 1, locationId: 1, quantity: -1 });

const ProductLocationStock =
  mongoose.models.ProductLocationStock ||
  mongoose.model<IProductLocationStock>(
    'ProductLocationStock',
    ProductLocationStockSchema
  );

export default ProductLocationStock;
