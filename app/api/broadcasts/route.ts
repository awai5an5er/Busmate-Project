import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Broadcast as BroadcastModel } from "@/models";
import type { NotificationType } from "@/types/busmate";

export async function GET() {
  try {
    await dbConnect();
    const rows = await BroadcastModel.find({})
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    return NextResponse.json({
      items: rows.map((r) => ({
        id: String(r._id),
        message: r.message,
        type: r.type as NotificationType,
        createdAt: new Date(r.createdAt).getTime(),
      })),
    });
  } catch (e) {
    console.error("GET /api/broadcasts:", e);
    return NextResponse.json(
      { error: "Unable to load broadcasts." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await dbConnect();
    await BroadcastModel.deleteMany({});
    return NextResponse.json({
      success: true,
      message: "All broadcasts cleared.",
    });
  } catch (e) {
    console.error("DELETE /api/broadcasts:", e);
    return NextResponse.json(
      { error: "Unable to clear broadcasts." },
      { status: 500 },
    );
  }
}
