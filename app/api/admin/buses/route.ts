import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import {
  getCachedDriverLocations,
  isDriverLocationCacheFresh,
} from "@/lib/driverLocationRedis";
import { requireAdmin } from "@/lib/requireAdmin";
import { Bus as BusModel } from "@/models";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const list = await BusModel.find({})
      .populate("driverId", "name email role")
      .sort({ updatedAt: -1 })
      .lean();

    const busIds = list.map((b) =>
      b.shortId ? String(b.shortId) : String(b._id),
    );
    const locMap = await getCachedDriverLocations(busIds);

    return NextResponse.json({
      buses: list.map((b) => {
        const pop = b.driverId as
          | { _id?: unknown; name?: string; role?: string }
          | null;
        const assignedDriverId =
          pop && typeof pop === "object" && pop._id != null
            ? String(pop._id)
            : null;
        const driverName =
          pop && typeof pop === "object" && typeof pop.name === "string"
            ? pop.name
            : null;

        const id = b.shortId ? String(b.shortId) : String(b._id);
        const gpsActive = Boolean(b.gpsActive);
        const cached = locMap.get(id);
        const redisConfigured = Boolean(process.env.REDIS_URL?.trim());
        const locationFresh = isDriverLocationCacheFresh(cached);
        const driverGpsLive =
          gpsActive && (!redisConfigured || locationFresh);

        const tripStatus =
          b.status === "active" || b.isLive ? "active" : "idle";

        return {
          id,
          mongoId: String(b._id),
          routeId: b.routeId ?? null,
          assignedDriverId,
          driverName,
          gpsActive,
          isLive: Boolean(b.isLive),
          tripStatus,
          driverGpsLive,
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/admin/buses:", e);
    return NextResponse.json({ error: "Unable to load buses." }, { status: 500 });
  }
}
