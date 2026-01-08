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

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */

const UserSchema = new Schema<IUser>(
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
/* Methods                                                            */
/* ------------------------------------------------------------------ */

UserSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ------------------------------------------------------------------ */
/* Model                                                              */
/* ------------------------------------------------------------------ */

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
