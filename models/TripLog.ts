import mongoose, { Document, Schema } from "mongoose";

export interface ITripLog extends Document {
  busName: string;
  driver: string;
  routeName: string;
  startTime: Date;
  endTime: Date;
  totalDuration: string;
  totalPassengers: number;
  createdAt: Date;
  updatedAt: Date;
}

const TripLogSchema: Schema = new Schema(
  {
    busName: {
      type: String,
      required: true,
      trim: true,
    },
    driver: {
      type: String,
      required: true,
      trim: true,
    },
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalDuration: {
      type: String,
      required: true,
      trim: true,
    },
    totalPassengers: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
);

TripLogSchema.index({ endTime: -1 });

export default mongoose.models.TripLog ||
  mongoose.model<ITripLog>("TripLog", TripLogSchema, "triplogs");
