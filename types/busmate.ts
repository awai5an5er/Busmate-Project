export type Bus = {
  id: string;
  name: string;
  route: string;
  /** Short path/description shown on map (e.g. stop sequence) */
  routeLabel?: string;
  /** Official route name from Route document (map popup / ETA) */
  routeName?: string;
  /** Assigned driver display name (map popup) */
  driverName?: string;
  eta: number;
  seatsAvailable: number;
  /** Matches `Route` document id in MongoDB for ETA/seat sync */
  routeId?: string;
  /** Fleet capacity upper bound for occupancy UI */
  totalSeats?: number;
  /** True when the driver has started a trip (synced to MongoDB `isLive`) */
  isLive: boolean;
  /** Trip state: active while driver is running a trip, idle otherwise */
  status?: "active" | "idle";
  /** Whether GPS signal is active for this bus */
  gpsActive?: boolean;
  /** Fixed start coordinate for the current simulated route (generated on trip start) */
  startCoord?: { lat: number; lng: number };
  /** Fixed destination coordinate for the current simulated route */
  endCoord?: { lat: number; lng: number };
  /** Latest GPS coordinate pushed to MongoDB every 5 s */
  currentCoord?: { lat: number; lng: number };
  /** Route stops with coordinates for displaying route path on map */
  routeStops?: Array<{
    name: string;
    lat: number;
    lng: number;
    order: number;
  }>;
  position: {
    x: number;
    y: number;
    lat: number;
    lng: number;
  };
};

export type NotificationType = "info" | "success" | "warning" | "error";

export type BusNotification = {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "student" | "driver" | "admin";
  studentId?: string;
  driverId?: string;
  isActive: boolean;
  createdAt: Date;
};

export type Route = {
  id: string;
  name: string;
  driver?: string;
  description?: string;
  stops: Array<{
    name: string;
    lat: number;
    lng: number;
    order: number;
  }>;
  isActive: boolean;
  createdAt: Date;
};
