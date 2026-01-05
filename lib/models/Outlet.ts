import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOutlet extends Document {
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
    manager: string;
  };
  taxInfo: {
    taxId: string;
    gstNumber?: string;
  };
  settings: {
    currency: string;
    timezone: string;
    fiscalYearStart: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OutletSchema = new Schema<IOutlet>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true, default: 'Qatar' },
      postalCode: { type: String, required: true },
    },
    contact: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
      manager: { type: String, required: true },
    },
    taxInfo: {
      taxId: { type: String, required: true },
      gstNumber: String,
    },
    settings: {
      currency: { type: String, default: 'QAR' },
      timezone: { type: String, default: 'Asia/Qatar' },
      fiscalYearStart: { type: Date, default: () => new Date(new Date().getFullYear(), 0, 1) },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes - removed code as it's already unique in schema
OutletSchema.index({ isActive: 1 });

const Outlet: Model<IOutlet> = mongoose.models.Outlet || mongoose.model<IOutlet>('Outlet', OutletSchema);

export default Outlet;