// lib/models/Message.ts
import mongoose, { Schema, Model, Types } from 'mongoose';

/* ------------------------------------------------------------------ */
/* Interface                                                          */
/* ------------------------------------------------------------------ */
export interface IMessage {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId | null; // null for broadcast messages
  outletId: Types.ObjectId | null; // null for cross-outlet messages
  type: 'text' | 'voice' | 'file';
  content: string; // Text content or file URL
  voiceUrl?: string; // For voice messages
  voiceDuration?: number; // Duration in seconds
  imageUrl?: string; // For image messages
  fileName?: string; // Original filename for files
  fileSize?: number; // File size in bytes
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedBy?: Types.ObjectId[];
  replyTo?: Types.ObjectId; // Reference to another message
  createdAt: Date;
  updatedAt: Date;
}

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */
const MessageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for broadcast/group messages
      index: true,
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'voice', 'file', 'image'],
      required: true,
      default: 'text',
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000, // Max 5000 characters for text
    },
    voiceUrl: {
      type: String,
    },
    voiceDuration: {
      type: Number, // in seconds
    },
    // Image message fields
    imageUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number, // in bytes
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

/* ------------------------------------------------------------------ */
/* Indexes                                                            */
/* ------------------------------------------------------------------ */
// Compound index for efficient conversation queries
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, isRead: 1 });
MessageSchema.index({ outletId: 1, createdAt: -1 });

/* ------------------------------------------------------------------ */
/* Static Methods                                                     */
/* ------------------------------------------------------------------ */
MessageSchema.statics.getUnreadCount = async function (userId: Types.ObjectId) {
  return this.countDocuments({
    recipientId: userId,
    isRead: false,
    isDeleted: false,
  });
};

MessageSchema.statics.getConversationWith = async function (
  userId: Types.ObjectId,
  otherUserId: Types.ObjectId,
  limit: number = 50
) {
  return this.find({
    $or: [
      { senderId: userId, recipientId: otherUserId },
      { senderId: otherUserId, recipientId: userId },
    ],
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'firstName lastName email role')
    .populate('recipientId', 'firstName lastName email role')
    .populate('replyTo')
    .lean();
};

MessageSchema.statics.markAsRead = async function (
  messageIds: Types.ObjectId[],
  userId: Types.ObjectId
) {
  return this.updateMany(
    {
      _id: { $in: messageIds },
      recipientId: userId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

/* ------------------------------------------------------------------ */
/* Model                                                              */
/* ------------------------------------------------------------------ */
const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;