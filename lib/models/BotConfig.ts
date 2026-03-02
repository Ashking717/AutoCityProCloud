// lib/models/BotConfig.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IBotConfig extends Document {
  name:        string;         // e.g. "Telegram Bot"
  platform:    'telegram';     // extendable for WhatsApp, etc. later
  botToken:    string;         // Telegram bot token from BotFather
  authToken:   string;         // JWT for AI Worker auth
  outletId:    string;         // which outlet this bot serves
  isActive:    boolean;
  createdBy:   string;         // userId
  createdAt:   Date;
  updatedAt:   Date;
}

const BotConfigSchema = new Schema<IBotConfig>(
  {
    name:      { type: String, required: true },
    platform:  { type: String, enum: ['telegram'], required: true },
    botToken:  { type: String, required: true },
    authToken: { type: String, required: true },
    outletId:  { type: String, required: true },
    isActive:  { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.BotConfig ||
  mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);