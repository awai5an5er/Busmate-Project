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
  position: { lat: number; lng: number };
  routeId?: string;
};

export function mapMongoBusToClient(doc: MongoBusLean): Bus {
  const id = doc.shortId ? String(doc.shortId) : String(doc._id);
  return {
    id,
    name: doc.name,
    route: doc.route,
    eta: doc.eta,
    seatsAvailable: doc.seatsAvailable,
    isLive: Boolean(doc.isLive),
    routeId: doc.routeId,
    totalSeats: doc.totalSeats,
    position: {
      x: 50,
      y: 50,
      lat: doc.position.lat,
      lng: doc.position.lng,
    },
  };
}
