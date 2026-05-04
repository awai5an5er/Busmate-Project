import type { Bus } from "@/types/busmate";

export type MongoBusLean = {
  _id: unknown;
  shortId?: string;
  name: string;
  route: string;
  eta: number;
  seatsAvailable: number;
  totalSeats?: number;
  isLive: boolean;
  status?: "active" | "idle";
  gpsActive?: boolean;
  position: { lat: number; lng: number };
  startCoord?: { lat: number; lng: number };
  endCoord?: { lat: number; lng: number };
  currentCoord?: { lat: number; lng: number };
  routeId?: string;
  routeStops?: Array<{
    name: string;
    lat: number;
    lng: number;
    order: number;
  }>;
};

export function mapMongoBusToClient(doc: MongoBusLean): Bus {
  const id = doc.shortId ? String(doc.shortId) : String(doc._id);
  const lat =
    typeof doc.currentCoord?.lat === "number"
      ? doc.currentCoord.lat
      : doc.position.lat;
  const lng =
    typeof doc.currentCoord?.lng === "number"
      ? doc.currentCoord.lng
      : doc.position.lng;
  return {
    id,
    name: doc.name,
    route: doc.route,
    eta: doc.eta,
    seatsAvailable: doc.seatsAvailable,
    isLive: Boolean(doc.isLive),
    status: doc.status,
    gpsActive: doc.gpsActive,
    routeId: doc.routeId,
    totalSeats: doc.totalSeats,
    routeStops: doc.routeStops || undefined,
    startCoord: doc.startCoord,
    endCoord: doc.endCoord,
    currentCoord: doc.currentCoord,
    position: {
      x: 50,
      y: 50,
      lat,
      lng,
    },
  };
}
