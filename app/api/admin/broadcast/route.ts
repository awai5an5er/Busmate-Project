import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Broadcast as BroadcastModel } from "@/models";
import type { NotificationType } from "@/types/busmate";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const message = String(body.message ?? "").trim();
    const typeRaw = body.type;
    const type: NotificationType =
      typeRaw === "success" || typeRaw === "warning" || typeRaw === "error" || typeRaw === "info"
        ? typeRaw
        : "info";

    if (message.length < 5) {
      return NextResponse.json(
        { error: "Message must be at least 5 characters." },
        { status: 400 },
      );
    }

    await dbConnect();
    const created = await BroadcastModel.create({ message, type });

    return NextResponse.json(
      {
        broadcast: {
          id: String(created._id),
          message: created.message,
          type: created.type,
          createdAt: created.createdAt.getTime(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("POST /api/admin/broadcast:", e);
    return NextResponse.json({ error: "Unable to save broadcast." }, { status: 500 });
  }
}
