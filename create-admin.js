const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI environment variable is not set");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", UserSchema);

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    
    const existingAdmin = await User.findOne({ email: "admin@gmail.com" });
    if (existingAdmin) {
      console.log("✗ Admin user already exists");
      process.exit(0);
    }

    
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    
    const admin = new User({
      email: "admin@gmail.com",
      password: hashedPassword,
      name: "Administrator",
      role: "admin",
      isActive: true,
    });

    await admin.save();
    console.log("✓ Admin account created successfully!");
    console.log("  Email: admin@gmail.com");
    console.log("  Password: admin123");
    console.log("  Role: admin");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error creating admin account:", error.message);
    process.exit(1);
  }
}

createAdmin();
