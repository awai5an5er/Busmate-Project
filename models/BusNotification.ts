import mongoose, { Document, Schema } from "mongoose";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface IBusNotification extends Document {
  message: string;
  type: NotificationType;
  busId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // for targeted notifications
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BusNotificationSchema: Schema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    busId: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
BusNotificationSchema.index({ createdAt: -1 });
BusNotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.models.BusNotification ||
  mongoose.model<IBusNotification>("BusNotification", BusNotificationSchema);
