import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { User as UserModel } from "@/models";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const drivers = await UserModel.find({ role: "driver", isActive: true })
      .select("name email")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      drivers: drivers.map((d) => ({
        id: String(d._id),
        name: d.name,
        email: d.email,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/drivers:", e);
    return NextResponse.json({ error: "Unable to load drivers." }, { status: 500 });
  }
}
