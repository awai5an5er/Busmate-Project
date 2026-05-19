import mongoose, { Document, Schema } from "mongoose";

export interface IChatClear extends Document {
  userId: string;
  clearedAt: Date;
}

const ChatClearSchema = new Schema<IChatClear>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    clearedAt: { type: Date, required: true },
  },
  {
    timestamps: false,
  },
);

export default mongoose.models.ChatClear ||
  mongoose.model<IChatClear>("ChatClear", ChatClearSchema);
