import dbConnect from "@/lib/mongodb";
import { Bus as BusModel } from "@/models";
import { ROUTE_POOL } from "./routePool";

/**
 * Ensures a Bus document exists with `routeId` set to the given route id.
 * Assigns a unique route from ROUTE_POOL.
 * Returns an error if all route slots are occupied.
 */
export async function ensureBusDocumentForRoute(params: {
  routeId: string;
  routeName: string;
}): Promise<{ created: boolean; busMongoId?: string; error?: string }> {
  await dbConnect();
  
  const existing = await BusModel.findOne({ routeId: params.routeId }).lean();
  if (existing) {
    return { created: false, busMongoId: String(existing._id) };
  }

  // Find an available route from the ROUTE_POOL
  const allBuses = await BusModel.find({}, { name: 1 }).lean();
  const usedRouteNames = new Set(allBuses.map((b) => b.name));
  
  const availableRoute = ROUTE_POOL.find((r) => !usedRouteNames.has(r.routeName));
  
  if (!availableRoute) {
    return { created: false, error: "All route slots are occupied. Remove a bus to add a new one." };
  }

  const bus = await BusModel.create({
    name: availableRoute.routeName,
    route: availableRoute.routeName,
    eta: 10,
    seatsAvailable: 40,
    totalSeats: 50,
    isLive: false,
    position: availableRoute.start, // Initial fallback position
    startCoord: availableRoute.start,
    endCoord: availableRoute.end,
    currentCoord: availableRoute.start,
    routeId: params.routeId,
  });

  return { created: true, busMongoId: String(bus._id) };
}
