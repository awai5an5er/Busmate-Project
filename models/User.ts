import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: "student" | "driver" | "admin";
  studentId?: string; 
  driverId?: string; 
  
  boardedRouteId?: string;
  boardedBusName?: string;
  boardedBusId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["student", "driver", "admin"],
      required: true,
    },
    studentId: {
      type: String,
      sparse: true, 
    },
    driverId: {
      type: String,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    boardedRouteId: {
      type: String,
      trim: true,
    },
    boardedBusName: {
      type: String,
      trim: true,
    },
    boardedBusId: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
    },
  },
  {
    timestamps: true,
  },
);




UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};


UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
