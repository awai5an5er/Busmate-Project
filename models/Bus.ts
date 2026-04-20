import mongoose, { Document, Schema } from "mongoose";

export interface IBus extends Document {
  name: string;
  route: string;
  eta: number;
  seatsAvailable: number;
  totalSeats: number;
  isLive: boolean;
  position: {
    lat: number;
    lng: number;
  };
  /** Stable id used by the client / mock data (e.g. bus-101) when it is not a MongoDB ObjectId */
  shortId?: string;
  driverId?: mongoose.Types.ObjectId;
  routeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      required: true,
      trim: true,
    },
    eta: {
      type: Number,
      required: true,
      min: 0,
    },
    seatsAvailable: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
      default: 50,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    position: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    shortId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    routeId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for geospatial queries
BusSchema.index({ position: "2dsphere" });

export default mongoose.models.Bus || mongoose.model<IBus>("Bus", BusSchema);
