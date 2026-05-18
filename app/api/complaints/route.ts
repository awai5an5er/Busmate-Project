import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Complaint as ComplaintModel, User as UserModel } from "@/models";
import { getCurrentUser } from "@/lib/auth";

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
    const driverId = body.driverId ? String(body.driverId) : undefined;

    if (message.length < 5) {
      return NextResponse.json(
        { error: "Complaint message must be at least 5 characters." },
        { status: 400 },
      );
    }

    await dbConnect();

    // If a driverId was provided, try to resolve their name
    let driverName: string | undefined = undefined;
    if (driverId) {
      try {
        const driverDoc = await UserModel.findById(driverId).select("name").lean();
        if (driverDoc && typeof driverDoc === "object") {
          driverName = String((driverDoc as { name?: string }).name ?? "");
        }
      } catch {
        // ignore failure to resolve driver name
      }
    }

    const created = await ComplaintModel.create({
      message,
      studentId: user._id.toString(),
      studentName: user.name || "Unknown Student",
      driverId: driverId ?? null,
      driverName: driverName ?? null,
    });

    return NextResponse.json(
      {
        complaint: {
          id: String(created._id),
          message: created.message,
          studentId: created.studentId,
          studentName: created.studentName,
          driverId: created.driverId ?? null,
          driverName: created.driverName ?? null,
          createdAt: created.createdAt.getTime(),
        },
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
