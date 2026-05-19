import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Bus as BusModel } from "@/models";



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
