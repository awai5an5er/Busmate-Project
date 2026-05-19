import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Bus as BusModel, Emergency as EmergencyModel } from "@/models";
import { busFilter } from "@/lib/busFilter";

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "driver") {
      return NextResponse.json({ error: "Drivers only" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const busId = String(body.busId ?? "").trim();
    const busName = String(body.busName ?? "").trim();

    if (!busId || !busName) {
      return NextResponse.json(
        { error: "busId and busName are required." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "Valid GPS coordinates are required." },
        { status: 400 },
      );
    }

    await dbConnect();

    const bus = await BusModel.findOne(busFilter(busId)).lean();
    if (!bus) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
    }

    const assignedDriverId = bus.driverId ? String(bus.driverId) : null;
    if (assignedDriverId !== user._id.toString()) {
      return NextResponse.json(
        { error: "You are not assigned to this bus." },
        { status: 403 },
      );
    }

    const created = await EmergencyModel.create({
      driverId: user._id.toString(),
      driverName: user.name || "Driver",
      busId,
      busName,
      coordinates: { lat, lng },
    });

    return NextResponse.json(
      {
        ok: true,
        emergency: {
          id: String(created._id),
          driverName: created.driverName,
          busName: created.busName,
          coordinates: created.coordinates,
          createdAt: created.createdAt.getTime(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("POST /api/driver/emergency:", e);
    return NextResponse.json(
      { error: "Unable to send emergency alert." },
      { status: 500 },
    );
  }
}
