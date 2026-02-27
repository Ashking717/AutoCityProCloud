import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  outletId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  // Vehicle Information
  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVIN?: string;
  
  gstNumber?: string;
  creditLimit: number;
  currentBalance: number; // Positive = customer owes, Negative = advance payment
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Qatar' },
      postalCode: { type: String, trim: true },
    },
    // Vehicle Information
    vehicleRegistrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    vehicleMake: {
      type: String,
      trim: true,
    },
    vehicleModel: {
      type: String,
      trim: true,
    },
    vehicleYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
    vehicleColor: {
      type: String,
      trim: true,
    },
    vehicleVIN: {
      type: String,
      trim: true,
      uppercase: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique customer code per outlet
CustomerSchema.index({ outletId: 1, code: 1 }, { unique: true });
CustomerSchema.index({ outletId: 1, isActive: 1 });
CustomerSchema.index({ outletId: 1, email: 1 }, { sparse: true });
CustomerSchema.index({ name: 'text', email: 'text', phone: 'text', vehicleRegistrationNumber: 'text' });

const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;