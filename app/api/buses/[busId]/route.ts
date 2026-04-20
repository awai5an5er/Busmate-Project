import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { busFilter } from "@/lib/busFilter";
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

    const seatRaw = body.seatCount ?? body.seatsAvailable;
    if (typeof seatRaw === "number" && !Number.isNaN(seatRaw) && seatRaw >= 0) {
      $set.seatsAvailable = Math.floor(seatRaw);
    }

    if (typeof body.isLive === "boolean") {
      $set.isLive = body.isLive;
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json(
        { error: "Provide seatCount (or seatsAvailable) and/or isLive." },
        { status: 400 },
      );
    }

    await dbConnect();
    const updated = await BusModel.findOneAndUpdate(
      busFilter(busId),
      { $set },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
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
