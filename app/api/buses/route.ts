import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Bus as BusModel } from "@/models";

/**
 * GET /api/buses
 * Returns all bus documents so the frontend can hydrate initial state on mount.
 */
export async function GET() {
  try {
    await dbConnect();
    const buses = await BusModel.find({}).lean();
    return NextResponse.json({ buses });
  } catch (error: unknown) {
    console.error("GET /api/buses error:", error);
    return NextResponse.json(
      { error: "Unable to fetch buses." },
      { status: 500 },
    );
  }
}
