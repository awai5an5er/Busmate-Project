import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Emergency as EmergencyModel } from "@/models";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const rows = await EmergencyModel.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      emergencies: rows.map((r) => ({
        id: String(r._id),
        driverId: r.driverId,
        driverName: r.driverName,
        busId: r.busId,
        busName: r.busName,
        coordinates: r.coordinates,
        createdAt: new Date(r.createdAt).getTime(),
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/emergencies:", e);
    return NextResponse.json(
      { error: "Unable to load emergencies." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    await EmergencyModel.deleteMany({});
    return NextResponse.json({
      success: true,
      message: "All emergency alerts cleared.",
    });
  } catch (e) {
    console.error("DELETE /api/admin/emergencies:", e);
    return NextResponse.json(
      { error: "Unable to clear emergencies." },
      { status: 500 },
    );
  }
}
