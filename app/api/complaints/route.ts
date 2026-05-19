import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Complaint as ComplaintModel, User as UserModel } from "@/models";
import { getCurrentUser } from "@/lib/auth";

function mapComplaintRow(r: {
  _id: unknown;
  message: string;
  studentId: string;
  studentName: string;
  driverId?: string | null;
  driverName?: string | null;
  createdAt: Date;
}) {
  return {
    id: String(r._id),
    message: r.message,
    studentId: r.studentId,
    studentName: r.studentName,
    driverId: r.driverId ?? null,
    driverName: r.driverName ?? null,
    recipient: r.driverId ? (r.driverName ?? "Driver") : "Admin",
    createdAt: new Date(r.createdAt).getTime(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser(request);
    if (error || !user) {
      return NextResponse.json(
        { error: error || "Authentication required." },
        { status: 401 },
      );
    }

    await dbConnect();
    const rows = await ComplaintModel.find({ studentId: user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      complaints: rows.map((r) => mapComplaintRow(r)),
    });
  } catch (e) {
    console.error("GET /api/complaints:", e);
    return NextResponse.json(
      { error: "Unable to load complaints." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser(request);
    if (error || !user) {
      return NextResponse.json(
        { error: error || "Authentication required." },
        { status: 401 },
      );
    }

    await dbConnect();
    await ComplaintModel.deleteMany({ studentId: user._id.toString() });

    return NextResponse.json({
      success: true,
      message: "All your complaints were cleared.",
    });
  } catch (e) {
    console.error("DELETE /api/complaints:", e);
    return NextResponse.json(
      { error: "Unable to clear complaints." },
      { status: 500 },
    );
  }
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

    const body = (await request.json()) as Record<string, unknown>;
    const message = String(body.message ?? "").trim();
    const rawDriverId = body.driverId;
    const driverId =
      rawDriverId != null &&
      rawDriverId !== "" &&
      String(rawDriverId).trim() !== ""
        ? String(rawDriverId).trim()
        : undefined;

    if (message.length < 5) {
      return NextResponse.json(
        { error: "Complaint message must be at least 5 characters." },
        { status: 400 },
      );
    }

    await dbConnect();

    let driverName: string | undefined = undefined;
    if (driverId) {
      const driverDoc = await UserModel.findById(driverId)
        .select("name role isActive")
        .lean();
      if (
        !driverDoc ||
        driverDoc.role !== "driver" ||
        !driverDoc.isActive
      ) {
        return NextResponse.json(
          { error: "Selected recipient is not an active driver." },
          { status: 400 },
        );
      }
      driverName = String(driverDoc.name ?? "");
    }

    const created = await ComplaintModel.create({
      message,
      studentId: user._id.toString(),
      studentName: user.name || "Unknown Student",
      ...(driverId
        ? { driverId, driverName: driverName ?? null }
        : { driverId: null, driverName: null }),
    });

    return NextResponse.json(
      {
        complaint: mapComplaintRow({
          _id: created._id,
          message: created.message,
          studentId: created.studentId,
          studentName: created.studentName,
          driverId: created.driverId ?? null,
          driverName: created.driverName ?? null,
          createdAt: created.createdAt,
        }),
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("POST /api/complaints:", e);
    return NextResponse.json(
      { error: "Unable to submit complaint." },
      { status: 500 },
    );
  }
}
