import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { ensureBusDocumentForRoute } from "@/lib/ensureBusForRoute";
import { requireAdmin } from "@/lib/requireAdmin";
import { Route as RouteModel } from "@/models";

/**
 * Creates a default Bus for every Route that does not have one yet.
 * Safe to call repeatedly (idempotent).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    await dbConnect();
    const routes = await RouteModel.find({}).sort({ updatedAt: -1 }).lean();

    let busesCreated = 0;
    for (const route of routes) {
      const routeId = String(route._id);
      const routeName = String(route.name ?? "Route");
      const { created } = await ensureBusDocumentForRoute({
        routeId,
        routeName,
        routePathLabel: routeName,
      });
      if (created) busesCreated++;
    }

    return NextResponse.json({
      ok: true,
      routesChecked: routes.length,
      busesCreated,
    });
  } catch (e) {
    console.error("POST /api/admin/ensure-route-buses:", e);
    return NextResponse.json({ error: "Unable to sync buses." }, { status: 500 });
  }
}
