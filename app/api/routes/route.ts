import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { ensureBusDocumentForRoute } from "@/lib/ensureBusForRoute";
import { Bus as BusModel, Route as RouteModel } from "@/models";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const filter = activeOnly ? { isActive: true } : {};
    const routeDocs = await RouteModel.find(filter).sort({ updatedAt: -1 }).limit(100).lean();

    const rows = await Promise.all(
      routeDocs.map(async (route) => {
        const rid = String(route._id);
        const bus = await BusModel.findOne({ routeId: rid }).select("seatsAvailable eta isLive").lean();
        const seatsAvailable =
          typeof bus?.seatsAvailable === "number" && !Number.isNaN(bus.seatsAvailable)
            ? bus.seatsAvailable
            : 0;
        const eta = typeof bus?.eta === "number" ? bus.eta : undefined;
        const tripInProgress = Boolean(bus?.isLive);
        return {
          ...route,
          seatsAvailable,
          etaFromBus: eta,
          tripInProgress,
        };
      }),
    );

    return NextResponse.json({ rows });
  } catch (error: unknown) {
    console.error("Routes fetch error:", error);
    return NextResponse.json(
      { error: "Unable to fetch routes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const driver = String(body.driver ?? "").trim() || "Pending Assignment";
    const statusRaw = body.status;

    const isActive =
      typeof statusRaw === "boolean"
        ? statusRaw
        : String(statusRaw ?? "active").toLowerCase() === "active";

    if (name.length < 3) {
      return NextResponse.json(
        { error: "Route name should be at least 3 characters." },
        { status: 400 },
      );
    }

    const created = await RouteModel.create({
      name,
      driver,
      stops: [],
      isActive,
    });

    const routeId = String(created._id);
    await ensureBusDocumentForRoute({
      routeId,
      routeName: name,
      routePathLabel: name,
    });

    return NextResponse.json({ route: created.toObject() }, { status: 201 });
  } catch (error: unknown) {
    console.error("Route create error:", error);
    return NextResponse.json(
      { error: "Unable to create route." },
      { status: 500 },
    );
  }
}
