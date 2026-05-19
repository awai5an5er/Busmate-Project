import type { IBus } from "@/models/Bus";
import { formatTripDuration } from "@/lib/formatTripDuration";
import { Route as RouteModel, TripLog as TripLogModel, User as UserModel } from "@/models";

type BusLean = Pick<
  IBus,
  | "name"
  | "route"
  | "routeId"
  | "driverId"
  | "seatsAvailable"
  | "seatsAvailableAtTripStart"
  | "tripStartedAt"
  | "updatedAt"
>;

export async function recordTripLogOnEnd(bus: BusLean): Promise<void> {
  const endTime = new Date();
  const startTime = bus.tripStartedAt
    ? new Date(bus.tripStartedAt)
    : new Date(bus.updatedAt);
  const durationMs = Math.max(0, endTime.getTime() - startTime.getTime());

  const seatsAtStart =
    typeof bus.seatsAvailableAtTripStart === "number"
      ? bus.seatsAvailableAtTripStart
      : bus.seatsAvailable;
  const totalPassengers = Math.max(
    0,
    Math.floor(seatsAtStart) - Math.floor(bus.seatsAvailable ?? 0),
  );

  let routeName = bus.route;
  if (bus.routeId) {
    const routeDoc = await RouteModel.findById(bus.routeId).select("name").lean();
    if (routeDoc && typeof routeDoc.name === "string" && routeDoc.name.length > 0) {
      routeName = routeDoc.name;
    }
  }

  let driver = "Unknown Driver";
  if (bus.driverId) {
    const driverDoc = await UserModel.findById(bus.driverId).select("name").lean();
    if (driverDoc && typeof driverDoc.name === "string" && driverDoc.name.length > 0) {
      driver = driverDoc.name;
    }
  }

  await TripLogModel.create({
    busName: bus.name,
    driver,
    routeName,
    startTime,
    endTime,
    totalDuration: formatTripDuration(durationMs),
    totalPassengers,
  });
}
