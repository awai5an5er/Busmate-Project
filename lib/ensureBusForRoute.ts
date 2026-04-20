import dbConnect from "@/lib/mongodb";
import { Bus as BusModel } from "@/models";

/** Default map center used when no GPS exists yet (matches app mock region). */
const DEFAULT_POSITION = { lat: 31.5204, lng: 74.3587 };

/**
 * Ensures a Bus document exists with `routeId` set to the given route id.
 * Required for driver assignment, seat sync, and the admin Assign Driver dropdown.
 */
export async function ensureBusDocumentForRoute(params: {
  routeId: string;
  routeName: string;
  routePathLabel?: string;
}): Promise<{ created: boolean; busMongoId: string }> {
  await dbConnect();
  const existing = await BusModel.findOne({ routeId: params.routeId }).lean();
  if (existing) {
    return { created: false, busMongoId: String(existing._id) };
  }

  const pathLabel = (params.routePathLabel ?? params.routeName).slice(0, 200);
  const title = params.routeName.slice(0, 120);

  const bus = await BusModel.create({
    name: title,
    route: pathLabel,
    eta: 10,
    seatsAvailable: 40,
    totalSeats: 50,
    isLive: false,
    position: DEFAULT_POSITION,
    routeId: params.routeId,
  });

  return { created: true, busMongoId: String(bus._id) };
}
