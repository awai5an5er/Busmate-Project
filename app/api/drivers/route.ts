import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { User as UserModel } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getCurrentUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const drivers = await UserModel.find({ role: "driver", isActive: true })
      .select("name email")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      drivers: drivers.map((d) => ({ id: String(d._id), name: d.name, email: d.email })),
    });
  } catch (e) {
    console.error("GET /api/drivers:", e);
    return NextResponse.json({ error: "Unable to load drivers." }, { status: 500 });
  }
}
