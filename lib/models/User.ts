import mongoose, { Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types/roles';

/* ------------------------------------------------------------------ */
/* Interface                                                          */
/* ------------------------------------------------------------------ */
export interface IUser {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  outletId: Types.ObjectId | null; // null for SUPERADMIN
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  
  // ✨ NEW: Online status tracking
  lastActiveAt?: Date;
  isOnline?: boolean;
  
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  // ✨ NEW: Check if user is currently online
  isCurrentlyOnline(): boolean;
}

/* ------------------------------------------------------------------ */
/* Static Methods Interface                                           */
/* ------------------------------------------------------------------ */
export interface IUserModel extends Model<IUser> {
  getOnlineUsers(outletId?: string | Types.ObjectId): Promise<IUser[]>;
}

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */
const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.VIEWER,
      required: true,
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      default: null,
      validate: {
        validator(this: IUser, value: Types.ObjectId | null) {
          if (this.role === UserRole.SUPERADMIN) {
            return value === null;
          }
          return value !== null;
        },
        message:
          'SUPERADMIN must have null outletId; other roles must have an outlet assigned',
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpiry: {
      type: Date,
      select: false,
    },
    
    // ✨ NEW: Online status tracking fields
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/* ------------------------------------------------------------------ */
/* Indexes                                                            */
/* ------------------------------------------------------------------ */
UserSchema.index({ outletId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// ✨ NEW: Index for efficient online user queries
UserSchema.index({ lastActiveAt: 1 });
UserSchema.index({ isOnline: 1 });
// Compound index for common queries
UserSchema.index({ isActive: 1, lastActiveAt: 1 });

/* ------------------------------------------------------------------ */
/* Hooks                                                              */
/* ------------------------------------------------------------------ */
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/* ------------------------------------------------------------------ */
/* Instance Methods                                                   */
/* ------------------------------------------------------------------ */
UserSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ✨ NEW: Check if user is currently online (active in last 5 minutes)
UserSchema.methods.isCurrentlyOnline = function (this: IUser): boolean {
  if (!this.lastActiveAt) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastActiveAt >= fiveMinutesAgo;
};

/* ------------------------------------------------------------------ */
/* Static Methods                                                     */
/* ------------------------------------------------------------------ */
// ✨ NEW: Get all currently online users
UserSchema.statics.getOnlineUsers = async function (
  outletId?: string | Types.ObjectId
): Promise<IUser[]> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const query: any = {
    lastActiveAt: { $gte: fiveMinutesAgo },
    isActive: true,
  };

  if (outletId) {
    query.outletId = outletId;
  }

  return this.find(query)
    .select('-password')
    .populate('outletId', 'name code')
    .lean();
};

/* ------------------------------------------------------------------ */
/* Model                                                              */
/* ------------------------------------------------------------------ */
const User: IUserModel =
  (mongoose.models.User as IUserModel) || 
  mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;