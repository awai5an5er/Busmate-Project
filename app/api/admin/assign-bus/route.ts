import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { busFilter } from "@/lib/busFilter";
import { requireAdmin } from "@/lib/requireAdmin";
import { Bus as BusModel, Route as RouteModel, User as UserModel } from "@/models";

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const busId = String(body.busId ?? "").trim();
    const rawDriver = body.driverId;

    if (!busId) {
      return NextResponse.json({ error: "busId is required." }, { status: 400 });
    }

    const driverId =
      rawDriver === null || rawDriver === undefined || rawDriver === ""
        ? null
        : String(rawDriver).trim();

    await dbConnect();

    let driverUser: { name: string } | null = null;
    if (driverId) {
      if (!mongoose.Types.ObjectId.isValid(driverId)) {
        return NextResponse.json({ error: "Invalid driverId." }, { status: 400 });
      }
      const u = await UserModel.findById(driverId).lean();
      if (!u || u.role !== "driver" || !u.isActive) {
        return NextResponse.json({ error: "User is not an active driver." }, { status: 400 });
      }
      driverUser = { name: u.name };
    }

    const updated = await BusModel.findOneAndUpdate(
      busFilter(busId),
      driverId
        ? { $set: { driverId: new mongoose.Types.ObjectId(driverId) } }
        : { $unset: { driverId: 1 } },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
    }

    if (updated.routeId && mongoose.Types.ObjectId.isValid(updated.routeId)) {
      const label = driverUser?.name ?? "Pending Assignment";
      await RouteModel.updateOne(
        { _id: new mongoose.Types.ObjectId(updated.routeId) },
        { $set: { driver: label } },
      );
    }

    return NextResponse.json({
      ok: true,
      bus: {
        id: updated.shortId ? String(updated.shortId) : String(updated._id),
        routeId: updated.routeId ?? null,
        driverId: driverId,
        driverName: driverUser?.name ?? null,
      },
    });
  } catch (e) {
    console.error("PUT /api/admin/assign-bus:", e);
    return NextResponse.json({ error: "Unable to assign driver." }, { status: 500 });
  }
}
