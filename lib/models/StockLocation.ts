import mongoose, { Schema, Document } from 'mongoose';

export interface IStockLocation extends Document {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  outletId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockLocationSchema = new Schema<IStockLocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
    },
  },
  { timestamps: true }
);

StockLocationSchema.index({ outletId: 1, name: 1 }, { unique: true });
StockLocationSchema.index({ outletId: 1, code: 1 }, { unique: true });

const StockLocation =
  mongoose.models.StockLocation ||
  mongoose.model<IStockLocation>('StockLocation', StockLocationSchema);

export default StockLocation;
