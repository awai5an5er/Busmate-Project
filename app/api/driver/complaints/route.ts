import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Complaint as ComplaintModel } from "@/models";

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
    const rows = await ComplaintModel.find({ driverId: user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      complaints: rows.map((r) => ({
        id: String(r._id),
        message: r.message,
        studentId: r.studentId,
        studentName: r.studentName,
        createdAt: new Date(r.createdAt).getTime(),
      })),
    });
  } catch (e) {
    console.error("GET /api/driver/complaints:", e);
    return NextResponse.json({ error: "Unable to load complaints." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "driver") {
      return NextResponse.json({ error: "Drivers only" }, { status: 403 });
    }

    await dbConnect();
    await ComplaintModel.deleteMany({ driverId: user._id.toString() });

    return NextResponse.json({
      success: true,
      message: "All complaints cleared.",
    });
  } catch (e) {
    console.error("DELETE /api/driver/complaints:", e);
    return NextResponse.json(
      { error: "Unable to clear complaints." },
      { status: 500 },
    );
  }
}
