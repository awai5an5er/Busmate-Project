import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { ChatClear, ChatMessage } from "@/models";

function buildVisibilityFilter(userId: string, role: string) {
  if (role === "admin") {
    return {};
  }
  return {
    $or: [
      { senderId: userId },
      { senderRole: "admin", target: "all" },
      {
        senderRole: "admin",
        target: "driver",
        targetDriverId: userId,
      },
    ],
  };
}

export async function GET(request: NextRequest) {
  const { user, error } = await getCurrentUser(request);
  if (error || !user) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 },
    );
  }

  await dbConnect();

  const currentUserId = user._id.toString();
  const visibilityFilter = buildVisibilityFilter(currentUserId, user.role);

  const clearState = await ChatClear.findOne({ userId: currentUserId }).lean();
  const timeFilter =
    clearState?.clearedAt != null
      ? { createdAt: { $gt: clearState.clearedAt } }
      : {};

  const filter =
    Object.keys(visibilityFilter).length === 0
      ? timeFilter
      : { $and: [visibilityFilter, timeFilter] };

  const items = await ChatMessage.find(filter)
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    messages: items.map((item) => ({
      id: item._id.toString(),
      senderId: item.senderId,
      senderName: item.senderName,
      senderRole: item.senderRole,
      driverId: item.driverId ?? null,
      target: item.target,
      targetDriverId: item.targetDriverId ?? null,
      message: item.message,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const { user, error } = await getCurrentUser(request);
  if (error || !user) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const message = String(body?.message ?? "").trim();
  if (message.length === 0) {
    return NextResponse.json(
      { error: "Message cannot be empty." },
      { status: 400 },
    );
  }

  const isDriver = user.role === "driver";
  const isAdmin = user.role === "admin";

  if (!isDriver && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let target: "admin" | "all" | "driver" = "admin";
  let targetDriverId: string | null = null;

  if (isDriver) {
    target = "admin";
    targetDriverId = user.driverId ?? null;
  } else if (isAdmin) {
    const requestedTarget = String(body?.target ?? "all");
    if (requestedTarget === "driver") {
      const requestedDriverId = String(body?.targetDriverId ?? "").trim();
      if (!requestedDriverId) {
        return NextResponse.json(
          { error: "Target driver must be selected." },
          { status: 400 },
        );
      }
      target = "driver";
      targetDriverId = requestedDriverId;
    } else {
      target = "all";
      targetDriverId = null;
    }
  }

  await dbConnect();

  const created = await ChatMessage.create({
    senderId: user._id.toString(),
    senderName: user.name,
    senderRole: user.role,
    driverId: user.role === "driver" ? user.driverId ?? null : null,
    target,
    targetDriverId,
    message,
  });

  return NextResponse.json(
    {
      message: {
        id: created._id.toString(),
        senderId: created.senderId,
        senderName: created.senderName,
        senderRole: created.senderRole,
        driverId: created.driverId ?? null,
        target: created.target,
        targetDriverId: created.targetDriverId ?? null,
        message: created.message,
        createdAt: created.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await getCurrentUser(request);
  if (error || !user) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 },
    );
  }

  if (user.role !== "admin" && user.role !== "driver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const userId = user._id.toString();
  const clearedAt = new Date();

  await ChatClear.findOneAndUpdate(
    { userId },
    { userId, clearedAt },
    { upsert: true, new: true },
  );

  return NextResponse.json({ success: true, clearedAt: clearedAt.toISOString() });
}
