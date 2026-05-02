import mongoose, { Document, Schema } from "mongoose";

export interface IComplaint extends Document {
  message: string;
  studentId: string;
  studentName: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema: Schema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    studentId: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

ComplaintSchema.index({ createdAt: -1 });

export default mongoose.models.Complaint ||
  mongoose.model<IComplaint>("Complaint", ComplaintSchema);
