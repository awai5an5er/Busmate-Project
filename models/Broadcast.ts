import mongoose, { Document, Schema } from "mongoose";

export type BroadcastTone = "info" | "success" | "warning" | "error";

export interface IBroadcast extends Document {
  message: string;
  type: BroadcastTone;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema: Schema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
  },
  { timestamps: true },
);

BroadcastSchema.index({ createdAt: -1 });

export default mongoose.models.Broadcast ||
  mongoose.model<IBroadcast>("Broadcast", BroadcastSchema);
