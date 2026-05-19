import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { TripLog as TripLogModel } from "@/models";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const rows = await TripLogModel.find({})
      .sort({ endTime: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      trips: rows.map((r) => ({
        id: String(r._id),
        busName: r.busName,
        driver: r.driver,
        routeName: r.routeName,
        startTime: new Date(r.startTime).getTime(),
        endTime: new Date(r.endTime).getTime(),
        totalDuration: r.totalDuration,
        totalPassengers: r.totalPassengers,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/trip-logs:", e);
    return NextResponse.json(
      { error: "Unable to load trip history." },
      { status: 500 },
    );
  }
}
