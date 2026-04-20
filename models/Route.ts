import mongoose, { Document, Schema } from "mongoose";

export interface IRoute extends Document {
  name: string;
  driver: string;
  description?: string;
  stops: Array<{
    name: string;
    lat: number;
    lng: number;
    order: number;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    driver: {
      type: String,
      trim: true,
      default: "Pending Assignment",
    },
    description: {
      type: String,
      trim: true,
    },
    stops: [
      {
        name: {
          type: String,
          required: true,
        },
        lat: {
          type: Number,
          required: true,
        },
        lng: {
          type: Number,
          required: true,
        },
        order: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
RouteSchema.index({ isActive: 1 });

export default mongoose.models.Route ||
  mongoose.model<IRoute>("Route", RouteSchema);
