import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models";
import { generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email, password, name, role, studentId, driverId } =
      await request.json();

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate role
    if (!["student", "driver", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    // Validate role-specific fields
    if (role === "student" && !studentId) {
      return NextResponse.json(
        { error: "Student ID is required for students" },
        { status: 400 },
      );
    }

    if (role === "driver" && !driverId) {
      return NextResponse.json(
        { error: "Driver ID is required for drivers" },
        { status: 400 },
      );
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user (hash here — Mongoose save middleware is unreliable in this runtime)
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      studentId: role === "student" ? studentId : undefined,
      driverId: role === "driver" ? driverId : undefined,
    });

    await user.save();

    const token = generateToken(user._id.toString(), user.email, user.role);

    // Return user without password and set auth cookie
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      driverId: user.driverId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    return NextResponse.json(
      {
        message: "User created successfully",
        token,
        user: userResponse,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);

    const isDuplicateKey =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000;

    if (isDuplicateKey) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
