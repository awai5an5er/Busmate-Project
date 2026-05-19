import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Complaint as ComplaintModel } from "@/models";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const rows = await ComplaintModel.find({
      $or: [
        { driverId: null },
        { driverId: { $exists: false } },
        { driverId: "" },
      ],
    })
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
    console.error("GET /api/admin/complaints:", e);
    return NextResponse.json(
      { error: "Unable to load complaints." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    await ComplaintModel.deleteMany({
      $or: [
        { driverId: null },
        { driverId: { $exists: false } },
        { driverId: "" },
      ],
    });
    return NextResponse.json({
      success: true,
      message: "All complaints cleared.",
    });
  } catch (e) {
    console.error("DELETE /api/admin/complaints:", e);
    return NextResponse.json(
      { error: "Unable to clear complaints." },
      { status: 500 },
    );
  }
}
