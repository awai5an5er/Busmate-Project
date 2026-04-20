import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { mapMongoBusToClient, type MongoBusLean } from "@/lib/mapMongoBusToClient";
import { Bus as BusModel, Route as RouteModel } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "driver") {
      return NextResponse.json({ error: "Drivers only" }, { status: 403 });
    }

    await dbConnect();
    const busDoc = await BusModel.findOne({ driverId: user._id }).lean();

    if (!busDoc) {
      return NextResponse.json({
        bus: null,
        routeName: null,
        routeId: null,
      });
    }

    let routeName: string | null = busDoc.route;
    if (busDoc.routeId) {
      const routeDoc = await RouteModel.findById(busDoc.routeId).select("name").lean();
      if (routeDoc && typeof routeDoc === "object" && "name" in routeDoc) {
        routeName = String((routeDoc as { name?: string }).name ?? busDoc.route);
      }
    }

    const bus = mapMongoBusToClient(busDoc as MongoBusLean);

    return NextResponse.json({
      bus,
      routeName,
      routeId: busDoc.routeId ?? null,
      userId: String(user._id),
    });
  } catch (e) {
    console.error("Driver assignment error:", e);
    return NextResponse.json({ error: "Unable to load assignment." }, { status: 500 });
  }
}
