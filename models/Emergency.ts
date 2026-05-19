import mongoose, { Document, Schema } from "mongoose";

export interface IEmergency extends Document {
  driverId: string;
  driverName: string;
  busId: string;
  busName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmergencySchema: Schema = new Schema(
  {
    driverId: {
      type: String,
      required: true,
      trim: true,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    busId: {
      type: String,
      required: true,
      trim: true,
    },
    busName: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { timestamps: true },
);

EmergencySchema.index({ createdAt: -1 });

export default mongoose.models.Emergency ||
  mongoose.model<IEmergency>("Emergency", EmergencySchema, "emergencies");
