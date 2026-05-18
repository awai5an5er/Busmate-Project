import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { busFilter } from "@/lib/busFilter";
import { cacheDriverLocation } from "@/lib/driverLocationRedis";
import { Bus as BusModel } from "@/models";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ busId: string }> },
) {
  try {
    const { busId } = await context.params;
    if (!busId) {
      return NextResponse.json({ error: "Missing bus id." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const $set: Record<string, unknown> = {};
    let wroteCurrentCoord = false;

    // Seat count
    const seatRaw = body.seatCount ?? body.seatsAvailable;
    if (typeof seatRaw === "number" && !Number.isNaN(seatRaw) && seatRaw >= 0) {
      $set.seatsAvailable = Math.floor(seatRaw);
    }

    // Live flag
    if (typeof body.isLive === "boolean") {
      $set.isLive = body.isLive;
    }

    // ETA in minutes
    if (
      typeof body.eta === "number" &&
      !Number.isNaN(body.eta) &&
      body.eta >= 0
    ) {
      $set.eta = Math.round(body.eta);
    }

    // Trip status
    if (body.status === "active" || body.status === "idle") {
      $set.status = body.status;
    }

    // GPS active flag
    if (typeof body.gpsActive === "boolean") {
      $set.gpsActive = body.gpsActive;
    }

    // Current GPS coordinate (pushed every 5 s from client)
    if (body.currentCoord) {
      const coord = body.currentCoord as Record<string, unknown>;
      if (typeof coord.lat === "number" && typeof coord.lng === "number") {
        $set["currentCoord.lat"] = coord.lat;
        $set["currentCoord.lng"] = coord.lng;
        wroteCurrentCoord = true;
      }
    }

    // Start / end coords (set once when trip begins)
    if (body.startCoord) {
      const coord = body.startCoord as Record<string, unknown>;
      if (typeof coord.lat === "number" && typeof coord.lng === "number") {
        $set["startCoord.lat"] = coord.lat;
        $set["startCoord.lng"] = coord.lng;
      }
    }

    if (body.endCoord) {
      const coord = body.endCoord as Record<string, unknown>;
      if (typeof coord.lat === "number" && typeof coord.lng === "number") {
        $set["endCoord.lat"] = coord.lat;
        $set["endCoord.lng"] = coord.lng;
      }
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    await dbConnect();
    const updated = await BusModel.findOneAndUpdate(
      busFilter(busId),
      { $set },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
    }

    if (
      wroteCurrentCoord &&
      typeof updated.currentCoord?.lat === "number" &&
      typeof updated.currentCoord?.lng === "number"
    ) {
      const redisBusId = updated.shortId
        ? String(updated.shortId)
        : String(updated._id);
      void cacheDriverLocation(redisBusId, {
        lat: updated.currentCoord.lat,
        lng: updated.currentCoord.lng,
        updatedAt: Date.now(),
      });
    }

    return NextResponse.json({ bus: updated });
  } catch (error: unknown) {
    console.error("Bus PATCH error:", error);
    return NextResponse.json(
      { error: "Unable to update bus." },
      { status: 500 },
    );
  }
}
