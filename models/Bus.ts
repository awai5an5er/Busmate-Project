import mongoose, { Document, Schema } from "mongoose";

export interface IBus extends Document {
  name: string;
  route: string;
  eta: number;
  seatsAvailable: number;
  totalSeats: number;
  isLive: boolean;
  /** Trip lifecycle state */
  status?: "active" | "idle";
  /** Whether GPS is currently transmitting */
  gpsActive?: boolean;
  position: {
    lat: number;
    lng: number;
  };
  /** Generated start coordinate for the current simulated trip */
  startCoord?: { lat: number; lng: number };
  /** Generated destination coordinate for the current simulated trip */
  endCoord?: { lat: number; lng: number };
  /** Latest GPS coordinate synced from the client every 5 s */
  currentCoord?: { lat: number; lng: number };
  /** Stable id used by the client / mock data (e.g. bus-101) when it is not a MongoDB ObjectId */
  shortId?: string;
  driverId?: mongoose.Types.ObjectId;
  routeId?: string;
  /** Set when the driver starts a trip (isLive → true) */
  tripStartedAt?: Date;
  /** seatsAvailable snapshot at trip start (for passenger count on end) */
  seatsAvailableAtTripStart?: number;
  /** Students who reserved a seat for the current trip */
  bookedStudentIds?: mongoose.Types.ObjectId[];
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
    status: {
      type: String,
      enum: ["active", "idle"],
      default: "idle",
    },
    gpsActive: {
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
    startCoord: {
      lat: { type: Number },
      lng: { type: Number },
    },
    endCoord: {
      lat: { type: Number },
      lng: { type: Number },
    },
    currentCoord: {
      lat: { type: Number },
      lng: { type: Number },
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
    tripStartedAt: {
      type: Date,
    },
    seatsAvailableAtTripStart: {
      type: Number,
      min: 0,
    },
    bookedStudentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for geospatial queries
BusSchema.index({ position: "2dsphere" });

export default mongoose.models.Bus || mongoose.model<IBus>("Bus", BusSchema);
