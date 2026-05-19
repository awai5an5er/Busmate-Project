import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { busFilter } from "@/lib/busFilter";
import {
  cacheDriverLocation,
  deleteCachedDriverLocation,
} from "@/lib/driverLocationRedis";
import { recordTripLogOnEnd } from "@/lib/recordTripLogOnEnd";
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
    const $unset: Record<string, 1> = {};
    let wroteCurrentCoord = false;
    let gpsTurnedOff = false;

    // Seat count
    const seatRaw = body.seatCount ?? body.seatsAvailable;
    if (typeof seatRaw === "number" && !Number.isNaN(seatRaw) && seatRaw >= 0) {
      $set.seatsAvailable = Math.floor(seatRaw);
    }

    await dbConnect();
    const existing = await BusModel.findOne(busFilter(busId)).lean();
    if (!existing) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
    }

    const endingTrip =
      body.isLive === false && Boolean(existing.isLive);
    const startingTrip =
      body.isLive === true && !existing.isLive;

    // Live flag + trip lifecycle fields
    if (typeof body.isLive === "boolean") {
      $set.isLive = body.isLive;
      if (startingTrip) {
        $set.tripStartedAt = new Date();
        $set.seatsAvailableAtTripStart = existing.seatsAvailable;
        $set.status = "active";
      }
      if (endingTrip) {
        $set.status = "idle";
        $unset.tripStartedAt = 1;
        $unset.seatsAvailableAtTripStart = 1;
      }
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
      if (body.gpsActive === false) {
        gpsTurnedOff = true;
      }
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

    const updateOps: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0) {
      updateOps.$unset = $unset;
    }

    const updated = await BusModel.findOneAndUpdate(
      busFilter(busId),
      updateOps,
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
    }

    if (endingTrip) {
      try {
        await recordTripLogOnEnd({
          name: existing.name,
          route: existing.route,
          routeId: existing.routeId,
          driverId: existing.driverId,
          seatsAvailable: existing.seatsAvailable,
          seatsAvailableAtTripStart: existing.seatsAvailableAtTripStart,
          tripStartedAt: existing.tripStartedAt,
          updatedAt: existing.updatedAt,
        });
      } catch (logErr) {
        console.error("TripLog create error:", logErr);
      }
    }

    const redisBusId = updated.shortId
      ? String(updated.shortId)
      : String(updated._id);

    if (gpsTurnedOff) {
      void deleteCachedDriverLocation(redisBusId);
    } else if (
      wroteCurrentCoord &&
      typeof updated.currentCoord?.lat === "number" &&
      typeof updated.currentCoord?.lng === "number"
    ) {
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
