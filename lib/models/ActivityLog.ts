import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  actionType: string;
  module: string;
  description: string;
  outletId: mongoose.Types.ObjectId;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    actionType: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, required: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ outletId: 1, timestamp: -1 });

const ActivityLog = mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
export default ActivityLog;
