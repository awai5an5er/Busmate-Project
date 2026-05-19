import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import {
  mapMongoBusToClient,
  type MongoBusLean,
} from "@/lib/mapMongoBusToClient";
import {
  pullStaleBusBookings,
} from "@/lib/studentBoarding";
import { Bus as BusModel, User } from "@/models";

const DEFAULT_SEAT_CAP = 50;

const SAME_BUS_MESSAGE = "You have already boarded this bus.";

function alreadyBoardedOtherBusMessage(busName: string) {
  return `You have already boarded bus ${busName}.`;
}

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

    const studentId = user._id as mongoose.Types.ObjectId;
    const freshUser = await User.findById(studentId);
    if (!freshUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const bus = await BusModel.findOne({ routeId }).lean();
    if (!bus) {
      return NextResponse.json(
        { error: "No bus is linked to this route." },
        { status: 404 },
      );
    }

    let activeRouteId = freshUser.boardedRouteId?.trim();
    let activeBusName = freshUser.boardedBusName?.trim();

    if (activeRouteId) {
      const activeBus = await BusModel.findOne({ routeId: activeRouteId }).lean();
      const tripStillActive = Boolean(activeBus?.isLive);
      const stillOnPassengerList = (activeBus?.bookedStudentIds ?? []).some(
        (id) => id.equals(studentId),
      );
      if (!tripStillActive || !stillOnPassengerList) {
        await User.findByIdAndUpdate(studentId, {
          $unset: {
            boardedRouteId: 1,
            boardedBusName: 1,
            boardedBusId: 1,
          },
        });
        await pullStaleBusBookings(studentId);
        activeRouteId = undefined;
        activeBusName = undefined;
      }
    }

    if (activeRouteId && activeRouteId !== routeId) {
      return NextResponse.json(
        {
          error: alreadyBoardedOtherBusMessage(
            activeBusName || "another bus",
          ),
        },
        { status: 409 },
      );
    }

    if (activeRouteId === routeId) {
      return NextResponse.json({ error: SAME_BUS_MESSAGE }, { status: 409 });
    }

    const onThisBusList = (bus.bookedStudentIds ?? []).some((id) =>
      id.equals(studentId),
    );
    if (onThisBusList) {
      return NextResponse.json({ error: SAME_BUS_MESSAGE }, { status: 409 });
    }

    const cap = Math.max(1, bus.totalSeats ?? DEFAULT_SEAT_CAP);

    await pullStaleBusBookings(studentId);

    const available = bus.seatsAvailable ?? 0;
    if (available <= 0) {
      return NextResponse.json(
        { error: "This bus is full. No seats available." },
        { status: 400 },
      );
    }

    const updated = await BusModel.findOneAndUpdate(
      {
        routeId,
        seatsAvailable: { $gt: 0 },
        bookedStudentIds: { $nin: [studentId] },
      },
      {
        $inc: { seatsAvailable: -1 },
        $addToSet: { bookedStudentIds: studentId },
      },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      const latest = await BusModel.findOne({ routeId }).lean();
      const duplicateOnBus = (latest?.bookedStudentIds ?? []).some((id) =>
        id.equals(studentId),
      );
      if (duplicateOnBus) {
        return NextResponse.json({ error: SAME_BUS_MESSAGE }, { status: 409 });
      }
      return NextResponse.json(
        { error: "Could not reserve a seat. The bus may be full." },
        { status: 409 },
      );
    }

    await User.findByIdAndUpdate(studentId, {
      boardedRouteId: routeId,
      boardedBusName: String(bus.name ?? "Bus"),
      boardedBusId: bus._id,
    });

    const mappedBus = mapMongoBusToClient(updated as MongoBusLean);
    const occupied = Math.min(cap, cap - (updated.seatsAvailable ?? 0));

    return NextResponse.json({
      ok: true,
      routeId,
      busId: mappedBus.id,
      seatsAvailable: updated.seatsAvailable,
      totalSeats: cap,
      occupied,
      bus: mappedBus,
    });
  } catch (e) {
    console.error("POST /api/student/board:", e);
    return NextResponse.json(
      { error: "Unable to record boarding." },
      { status: 500 },
    );
  }
}
