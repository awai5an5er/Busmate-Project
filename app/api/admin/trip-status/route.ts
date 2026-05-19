import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { busFilter } from "@/lib/busFilter";
import { requireAdmin } from "@/lib/requireAdmin";
import { Bus as BusModel } from "@/models";

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const busId = String(body.busId ?? "").trim();
    const statusRaw = String(body.status ?? "").toLowerCase();

    if (!busId) {
      return NextResponse.json({ error: "busId is required." }, { status: 400 });
    }

    if (statusRaw !== "active" && statusRaw !== "idle") {
      return NextResponse.json(
        { error: "status must be active or idle." },
        { status: 400 },
      );
    }

    await dbConnect();

    const bus = await BusModel.findOne(busFilter(busId)).lean();
    if (!bus) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
    }

    if (statusRaw === "active" && !bus.driverId) {
      return NextResponse.json(
        { error: "Assign a driver before setting trip to active." },
        { status: 400 },
      );
    }

    const isActive = statusRaw === "active";
    const updated = await BusModel.findOneAndUpdate(
      busFilter(busId),
      { $set: { status: statusRaw, isLive: isActive } },
      { new: true, runValidators: true },
    ).lean();

    return NextResponse.json({
      ok: true,
      bus: {
        id: updated?.shortId ? String(updated.shortId) : String(updated?._id),
        status: statusRaw,
        isLive: isActive,
      },
    });
  } catch (e) {
    console.error("PUT /api/admin/trip-status:", e);
    return NextResponse.json(
      { error: "Unable to update trip status." },
      { status: 500 },
    );
  }
}
