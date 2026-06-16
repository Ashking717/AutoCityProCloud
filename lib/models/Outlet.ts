import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOutletBrandingAsset {
  data?: Buffer;
  contentType?: string;
  filename?: string;
  size?: number;
  updatedAt?: Date;
}

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
  branding?: {
    logo?: IOutletBrandingAsset;
    seal?: IOutletBrandingAsset;
    logoUrl?: string;
    sealUrl?: string;
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
      manager: { type: String,  },
    },
    taxInfo: {
      taxId: { type: String, },
      gstNumber: String,
    },
    branding: {
      logo: {
        data: { type: Buffer, select: false },
        contentType: { type: String, trim: true },
        filename: { type: String, trim: true },
        size: { type: Number },
        updatedAt: { type: Date },
      },
      seal: {
        data: { type: Buffer, select: false },
        contentType: { type: String, trim: true },
        filename: { type: String, trim: true },
        size: { type: Number },
        updatedAt: { type: Date },
      },
      logoUrl: { type: String, trim: true },
      sealUrl: { type: String, trim: true },
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
