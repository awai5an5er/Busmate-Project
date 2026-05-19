import mongoose, { Document, Schema } from "mongoose";

export interface IChatMessage extends Document {
  senderId: string;
  senderName: string;
  senderRole: "admin" | "driver";
  driverId?: string | null;
  target: "admin" | "all" | "driver";
  targetDriverId?: string | null;
  message: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true, enum: ["admin", "driver"] },
    driverId: { type: String, default: null },
    target: {
      type: String,
      required: true,
      enum: ["admin", "all", "driver"],
      default: "admin",
    },
    targetDriverId: { type: String, default: null },
    message: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

ChatMessageSchema.index({ createdAt: 1 });

export default mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
