import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import {
  mapMongoBusToClient,
  type MongoBusLean,
} from "@/lib/mapMongoBusToClient";
import { Bus as BusModel } from "@/models";

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser(request);
    if (error || !user) {
      return NextResponse.json(
        { error: error || "Authentication required." },
        { status: 401 },
      );
    }
    if (user.role !== "student") {
      return NextResponse.json({ error: "Students only" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const routeId = String(body.routeId ?? "").trim();
    if (!routeId) {
      return NextResponse.json({ error: "routeId is required." }, { status: 400 });
    }

    await dbConnect();

    const bus = await BusModel.findOne({ routeId }).lean();
    if (!bus) {
      return NextResponse.json(
        { error: "No bus is linked to this route." },
        { status: 404 },
      );
    }

    const cap = Math.max(1, bus.totalSeats ?? 50);
    const available = bus.seatsAvailable ?? 0;
    if (available <= 0) {
      return NextResponse.json(
        { error: "This bus is full. No seats available." },
        { status: 400 },
      );
    }

    const updated = await BusModel.findOneAndUpdate(
      { routeId, seatsAvailable: { $gt: 0 } },
      { $inc: { seatsAvailable: -1 } },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { error: "Could not reserve a seat. The bus may be full." },
        { status: 409 },
      );
    }

    const clientBus = mapMongoBusToClient(updated as MongoBusLean);
    const occupied = Math.min(cap, cap - (updated.seatsAvailable ?? 0));

    return NextResponse.json({
      ok: true,
      routeId,
      busId: clientBus.id,
      seatsAvailable: updated.seatsAvailable,
      totalSeats: cap,
      occupied,
      bus: clientBus,
    });
  } catch (e) {
    console.error("POST /api/student/board:", e);
    return NextResponse.json(
      { error: "Unable to record boarding." },
      { status: 500 },
    );
  }
}
