// lib/models/Job.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum JobStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum JobPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface IJobItem {
  productId?: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  actualPrice?: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number;
  isLabor?: boolean;
  notes?: string;
}

// Each voice note carries the Cloudinary URL plus who recorded it and when
export interface IVoiceNoteEntry {
  url: string;
  recordedByName: string;
  recordedAt: Date;
}

export interface IJob extends Document {
  outletId: mongoose.Types.ObjectId;
  jobNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;

  vehicleRegistrationNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleVIN?: string;
  vehicleMileage?: number;

  title: string;
  description?: string;
  items: IJobItem[];
  priority: JobPriority;
  status: JobStatus;

  estimatedTotal: number;
  estimatedDiscount: number;
  estimatedTax: number;
  estimatedGrandTotal: number;

  actualTotal?: number;
  actualDiscount?: number;
  actualTax?: number;
  actualGrandTotal?: number;

  assignedTo?: mongoose.Types.ObjectId;
  assignedToName?: string;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;

  estimatedStartDate?: Date;
  estimatedCompletionDate?: Date;
  actualStartDate?: Date;
  actualCompletionDate?: Date;

  internalNotes?: string;
  customerNotes?: string;

  // ── Voice notes — stored as objects so we know who recorded each one ──
  voiceNotes: IVoiceNoteEntry[];

  convertedToSale: boolean;
  saleId?: mongoose.Types.ObjectId;
  saleInvoiceNumber?: string;

  createdAt: Date;
  updatedAt: Date;

  canEdit(): boolean;
  canConvertToSale(): boolean;
  calculateEstimatedTotals(): void;
  calculateActualTotals(): void;
}

export interface IJobModel extends Model<IJob> {
  generateJobNumber(outletId: mongoose.Types.ObjectId): Promise<string>;
  findActiveJobs(outletId: mongoose.Types.ObjectId): Promise<IJob[]>;
  findCompletedJobs(outletId: mongoose.Types.ObjectId): Promise<IJob[]>;
}

// ── Sub-schemas ──────────────────────────────────────────────────────
const JobItemSchema = new Schema<IJobItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    estimatedPrice: { type: Number, required: true, min: 0 },
    actualPrice: { type: Number, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    taxRate: { type: Number, default: 0, min: 0 },
    isLabor: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: false }
);

const VoiceNoteEntrySchema = new Schema<IVoiceNoteEntry>(
  {
    url: { type: String, required: true },
    recordedByName: { type: String, required: true },
    recordedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

// ── Main schema ──────────────────────────────────────────────────────
const JobSchema = new Schema<IJob, IJobModel>(
  {
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    jobNumber: { type: String, required: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerName: { type: String, required: true },

    vehicleRegistrationNumber: { type: String, trim: true, uppercase: true },
    vehicleMake: { type: String },
    vehicleModel: { type: String },
    vehicleYear: { type: Number },
    vehicleColor: { type: String },
    vehicleVIN: { type: String, uppercase: true },
    vehicleMileage: { type: Number, min: 0 },

    title: { type: String, required: true },
    description: { type: String },
    items: [JobItemSchema],
    priority: { type: String, enum: Object.values(JobPriority), default: JobPriority.MEDIUM },
    status: { type: String, enum: Object.values(JobStatus), default: JobStatus.DRAFT, index: true },

    estimatedTotal: { type: Number, required: true, default: 0, min: 0 },
    estimatedDiscount: { type: Number, default: 0, min: 0 },
    estimatedTax: { type: Number, default: 0, min: 0 },
    estimatedGrandTotal: { type: Number, required: true, default: 0, min: 0 },

    actualTotal: { type: Number, min: 0 },
    actualDiscount: { type: Number, min: 0 },
    actualTax: { type: Number, min: 0 },
    actualGrandTotal: { type: Number, min: 0 },

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },

    estimatedStartDate: { type: Date },
    estimatedCompletionDate: { type: Date },
    actualStartDate: { type: Date },
    actualCompletionDate: { type: Date },

    internalNotes: { type: String },
    customerNotes: { type: String },

    // Each entry knows who recorded it and when
    voiceNotes: { type: [VoiceNoteEntrySchema], default: [] },

    convertedToSale: { type: Boolean, default: false, index: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale' },
    saleInvoiceNumber: { type: String },
  },
  {
    timestamps: true,
    minimize: false,   // prevent Mongoose from stripping empty arrays like voiceNotes: []
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────
JobSchema.index({ outletId: 1, jobNumber: 1 }, { unique: true });
JobSchema.index({ outletId: 1, status: 1, createdAt: -1 });
JobSchema.index({ outletId: 1, customerId: 1 });
JobSchema.index({ outletId: 1, assignedTo: 1, status: 1 });
JobSchema.index({ outletId: 1, convertedToSale: 1 });

// ── Statics ──────────────────────────────────────────────────────────
JobSchema.statics.generateJobNumber = async function (
  outletId: mongoose.Types.ObjectId
): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const lastJob = await this.findOne(
    { outletId, jobNumber: { $regex: `^JOB-${yearMonth}-` } },
    { jobNumber: 1 }
  )
    .sort({ jobNumber: -1 })
    .lean();

  let nextSeq = 1;
  if (lastJob?.jobNumber) {
    const parts = (lastJob.jobNumber as string).split('-');
    nextSeq = parseInt(parts[2], 10) + 1;
  }

  return `JOB-${yearMonth}-${String(nextSeq).padStart(5, '0')}`;
};

JobSchema.statics.findActiveJobs = function (outletId: mongoose.Types.ObjectId) {
  return this.find({ outletId, status: { $in: [JobStatus.PENDING, JobStatus.IN_PROGRESS] } })
    .populate('customerId', 'name phone vehicleRegistrationNumber')
    .populate('assignedTo', 'firstName lastName')
    .sort({ priority: -1, createdAt: -1 });
};

JobSchema.statics.findCompletedJobs = function (outletId: mongoose.Types.ObjectId) {
  return this.find({ outletId, status: JobStatus.COMPLETED, convertedToSale: false })
    .populate('customerId', 'name phone vehicleRegistrationNumber')
    .sort({ actualCompletionDate: -1 })
    .limit(50);
};

// ── Instance methods ─────────────────────────────────────────────────
JobSchema.methods.canEdit = function (): boolean {
  return this.status !== JobStatus.CANCELLED && !this.convertedToSale;
};

JobSchema.methods.canConvertToSale = function (): boolean {
  return this.status === JobStatus.COMPLETED && !this.convertedToSale;
};

JobSchema.methods.calculateEstimatedTotals = function (): void {
  let subtotal = 0, totalDiscount = 0, totalTax = 0;
  for (const item of this.items) {
    const itemTotal = item.estimatedPrice * item.quantity;
    subtotal += itemTotal;
    const itemDiscount =
      item.discountType === 'percentage'
        ? (itemTotal * item.discount) / 100
        : item.discount;
    totalDiscount += itemDiscount;
    totalTax += ((itemTotal - itemDiscount) * item.taxRate) / 100;
  }
  this.estimatedTotal      = subtotal;
  this.estimatedDiscount   = totalDiscount;
  this.estimatedTax        = totalTax;
  this.estimatedGrandTotal = subtotal - totalDiscount + totalTax;
};

JobSchema.methods.calculateActualTotals = function (): void {
  let subtotal = 0, totalDiscount = 0, totalTax = 0;
  for (const item of this.items) {
    const price = item.actualPrice ?? item.estimatedPrice;
    const itemTotal = price * item.quantity;
    subtotal += itemTotal;
    const itemDiscount =
      item.discountType === 'percentage'
        ? (itemTotal * item.discount) / 100
        : item.discount;
    totalDiscount += itemDiscount;
    totalTax += ((itemTotal - itemDiscount) * item.taxRate) / 100;
  }
  this.actualTotal      = subtotal;
  this.actualDiscount   = totalDiscount;
  this.actualTax        = totalTax;
  this.actualGrandTotal = subtotal - totalDiscount + totalTax;
};

// ── Pre-save hook ─────────────────────────────────────────────────────
JobSchema.pre('save', function (next) {
  if (this.isModified('items')) {
    this.calculateEstimatedTotals();
    const hasActualPrices = this.items.some((item) => item.actualPrice !== undefined);
    if (hasActualPrices || this.status === JobStatus.COMPLETED) {
      this.calculateActualTotals();
    }
  }
  next();
});

const Job =
  (mongoose.models.Job as IJobModel) ||
  mongoose.model<IJob, IJobModel>('Job', JobSchema);

export default Job;