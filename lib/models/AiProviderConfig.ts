import mongoose, { Schema, Document } from 'mongoose';

export type AIProvider = 'openai' | 'anthropic';

export interface IAIProviderConfig extends Document {
  provider:      AIProvider;
  apiKey:        string;        // select: false — never returned in normal queries
  label:         string;        // e.g. "Production OpenAI Key"
  outletId:      string;
  isActive:      boolean;
  widgetEnabled: boolean;       // controls whether the AI widget FAB is visible to all users
  createdBy:     string;
  createdAt:     Date;
  updatedAt:     Date;
}

const AIProviderConfigSchema = new Schema<IAIProviderConfig>(
  {
    provider: {
      type:     String,
      enum:     ['openai', 'anthropic'],
      required: true,
    },
    apiKey: {
      type:     String,
      required: true,
      select:   false,   // 🔐 never leaked in normal queries
    },
    label: {
      type:    String,
      default: '',
    },
    outletId: {
      type:     String,
      required: true,
      index:    true,
    },
    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
    widgetEnabled: {
      type:    Boolean,
      default: true,   // widget shown by default once a key is added
    },
    createdBy: {
      type:     String,
      required: true,
    },
  },
  { timestamps: true },
);

// Only one active config per outlet
AIProviderConfigSchema.index({ outletId: 1, isActive: 1 });

export default mongoose.models.AIProviderConfig ||
  mongoose.model<IAIProviderConfig>('AIProviderConfig', AIProviderConfigSchema);