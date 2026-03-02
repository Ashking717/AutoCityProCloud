// lib/models/BotConfig.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IBotConfig extends Document {
  name:          string;        // e.g. "AutoCity Gharafa Bot"
  platform:      'telegram';    // extendable later
  botToken:      string;        // Telegram bot token
  authToken:     string;        // JWT for AI Worker
  webhookSecret: string;        // Secret token for Telegram webhook validation
  outletId:      string;        // Outlet this bot belongs to
  isActive:      boolean;
  createdBy:     string;        // userId
  createdAt:     Date;
  updatedAt:     Date;
}

const BotConfigSchema = new Schema<IBotConfig>(
  {
    name:      { type: String, required: true },

    platform:  {
      type: String,
      enum: ['telegram'],
      required: true,
      index: true,
    },

    botToken:  {
      type: String,
      required: true,
      unique: true,   // prevents duplicate bot tokens
      index: true,
    },

    authToken: {
      type: String,
      required: true,
      select: false,  // 🔐 never returned unless explicitly requested
    },

    webhookSecret: {
      type: String,
      required: true,
      select: false,  // 🔐 hidden from normal queries
    },

    outletId: {
      type: String,
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Optional compound index for faster multi-tenant queries
BotConfigSchema.index({ outletId: 1, isActive: 1 });

export default mongoose.models.BotConfig ||
  mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);