import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCachedDriverLocations } from "@/lib/driverLocationRedis";
import { ensureBusDocumentForRoute } from "@/lib/ensureBusForRoute";
import {
  mapMongoBusToClient,
  type MongoBusLean,
} from "@/lib/mapMongoBusToClient";
import type { Bus } from "@/types/busmate";
import { Bus as BusModel, Route as RouteModel } from "@/models";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const filter = activeOnly ? { isActive: true } : {};
    const routeDocs = await RouteModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const rowData = await Promise.all(
      routeDocs.map(async (route) => {
        const rid = String(route._id);
        const bus = await BusModel.findOne({ routeId: rid }).lean();
        const seatsAvailable =
          typeof bus?.seatsAvailable === "number" &&
          !Number.isNaN(bus.seatsAvailable)
            ? bus.seatsAvailable
            : 0;
        const eta = typeof bus?.eta === "number" ? bus.eta : undefined;
        const tripInProgress = Boolean(bus?.isLive);

        const busData = bus ? mapMongoBusToClient(bus as MongoBusLean) : null;

        return {
          route,
          seatsAvailable,
          etaFromBus: eta,
          tripInProgress,
          busData,
          stops: route.stops || [],
        };
      }),
    );

    const cacheIds = rowData
      .map((row) => row.busData?.id)
      .filter((id): id is string => Boolean(id));
    const locMap = await getCachedDriverLocations(cacheIds);

    const rows = rowData.map(({ route, ...rest }) => {
      let bus: Bus | null = rest.busData;
      if (bus) {
        const cached = locMap.get(bus.id);
        if (cached) {
          bus = {
            ...bus,
            currentCoord: { lat: cached.lat, lng: cached.lng },
            position: {
              ...bus.position,
              lat: cached.lat,
              lng: cached.lng,
            },
          };
        }
      }
      return {
        ...route,
        seatsAvailable: rest.seatsAvailable,
        etaFromBus: rest.etaFromBus,
        tripInProgress: rest.tripInProgress,
        bus,
        stops: rest.stops,
      };
    });

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
