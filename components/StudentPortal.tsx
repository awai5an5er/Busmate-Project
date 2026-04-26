"use client";

import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Clock3, Search, Users, X } from "lucide-react";
import { useBusMateStore } from "@/store/useBusMateStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LiveMap } from "@/components/LiveMap";
import type { NotificationType } from "@/types/busmate";

const toastTone = {
  info: "border-amber-200 bg-amber-50 text-slate-900",
  success: "border-amber-300 bg-amber-100 text-slate-900",
  warning: "border-amber-200 bg-amber-50 text-slate-900",
  error: "border-red-200 bg-red-50 text-slate-900",
};

const ROUTE_POLL_MS = 20_000;
const BROADCAST_POLL_MS = 12_000;

type ActiveRouteRow = {
  id: string;
  name: string;
  driver: string;
  isActive: boolean;
  /** True when the assigned bus has an active trip (driver pressed Start Trip) */
  tripInProgress: boolean;
  seatsAvailable: number;
  eta?: number;
};

function normalizeSeatCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  return 0;
}

export function StudentPortal() {
  const buses = useBusMateStore((state) => state.buses);
  const upsertBus = useBusMateStore((state) => state.upsertBus);
  const notifications = useBusMateStore((state) => state.notifications);
  const dismissNotification = useBusMateStore(
    (state) => state.dismissNotification,
  );
  const dismissAllNotifications = useBusMateStore(
    (state) => state.dismissAllNotifications,
  );
  const mergeBroadcastNotifications = useBusMateStore(
    (state) => state.mergeBroadcastNotifications,
  );
  const pushNotification = useBusMateStore((state) => state.pushNotification);

  const { user } = useCurrentUser();
  const notifiedTripsRef = useRef<Set<string>>(new Set());

  const [routes, setRoutes] = useState<ActiveRouteRow[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [routeSearch, setRouteSearch] = useState("");
  const [previousTripsState, setPreviousTripsState] = useState<Set<string>>(
    new Set(),
  );

  const refreshRoutes = useCallback(async () => {
    try {
      const { data } = await axios.get<{
        rows: Array<Record<string, unknown>>;
      }>("/api/routes?active=true");
      const mapped: ActiveRouteRow[] = (data.rows ?? []).map((r) => ({
        id: String(r._id),
        name: String(r.name ?? "Route"),
        driver: String(r.driver ?? "Unassigned"),
        isActive: Boolean(r.isActive),
        tripInProgress: Boolean(r.tripInProgress),
        seatsAvailable: normalizeSeatCount(r.seatsAvailable),
        eta: typeof r.etaFromBus === "number" ? r.etaFromBus : undefined,
      }));
      setRoutes(mapped);
      setRoutesError(null);

      // Check for trip starts and show notifications
      const currentTripsActive = new Set<string>();
      (data.rows ?? []).forEach((r) => {
        const routeId = String(r._id);
        if (Boolean(r.tripInProgress)) {
          currentTripsActive.add(routeId);

          // If this trip wasn't active before, show notification
          if (!previousTripsState.has(routeId)) {
            const routeName = String(r.name ?? "Route");
            const tripKey = `${routeId}-started`;
            if (!notifiedTripsRef.current.has(tripKey)) {
              notifiedTripsRef.current.add(tripKey);
              pushNotification(
                `Bus ${routeName} has started its journey.`,
                "success",
              );
            }
          }
        }
      });
      setPreviousTripsState(currentTripsActive);

      // Also upsert buses from the API response to ensure they're in the store
      // And attach route stops to buses
      (data.rows ?? []).forEach((r) => {
        if (r.bus && typeof r.bus === "object") {
          const busWithStops = {
            ...(r.bus as Parameters<typeof upsertBus>[0]),
            routeStops: Array.isArray(r.stops) ? r.stops : undefined,
          };
          upsertBus(busWithStops);
        }
      });
    } catch {
      setRoutesError("Could not load active routes.");
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, [upsertBus, pushNotification, previousTripsState]);

  useEffect(() => {
    void refreshRoutes();
    const timer = setInterval(() => void refreshRoutes(), ROUTE_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshRoutes]);

  const refreshBroadcasts = useCallback(async () => {
    try {
      const { data } = await axios.get<{
        items: Array<{
          id: string;
          message: string;
          type: NotificationType;
          createdAt: number;
        }>;
      }>("/api/broadcasts");
      mergeBroadcastNotifications(data.items ?? []);
    } catch {
      /* ignore broadcast fetch errors */
    }
  }, [mergeBroadcastNotifications]);

  useEffect(() => {
    void refreshBroadcasts();
    const timer = setInterval(
      () => void refreshBroadcasts(),
      BROADCAST_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [refreshBroadcasts]);

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q),
    );
  }, [routes, routeSearch]);

  const enrichedBuses = useMemo(() => {
    const byRouteId = new Map(routes.map((r) => [r.id, r]));
    const byRouteName = new Map(
      routes.map((r) => [r.name.trim().toLowerCase(), r]),
    );
    return buses.map((bus) => {
      const label = (bus.routeName ?? bus.name).trim().toLowerCase();
      const r =
        (bus.routeId ? byRouteId.get(bus.routeId) : undefined) ??
        byRouteName.get(label);
      const tripFromServer = r?.tripInProgress;
      return {
        ...bus,
        routeName: r?.name ?? bus.routeName ?? bus.name,
        driverName: r?.driver ?? bus.driverName ?? "—",
        isLive:
          typeof tripFromServer === "boolean" ? tripFromServer : bus.isLive,
      };
    });
  }, [buses, routes]);

  const liveSeatsByRouteId = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of buses) {
      if (b.routeId) {
        map.set(b.routeId, normalizeSeatCount(b.seatsAvailable));
      }
    }
    for (const r of routes) {
      if (map.has(r.id)) continue;
      const label = r.name.trim().toLowerCase();
      const match = buses.find(
        (b) => (b.routeName ?? b.name).trim().toLowerCase() === label,
      );
      if (match) {
        map.set(r.id, normalizeSeatCount(match.seatsAvailable));
      }
    }
    return map;
  }, [buses, routes]);

  const activeBuses = useMemo(() => {
    return enrichedBuses.filter((bus) => bus.isLive);
  }, [enrichedBuses]);

  const hasActiveBuses = activeBuses.length > 0;

  const seatLabelForRoute = (route: ActiveRouteRow) => {
    const live = liveSeatsByRouteId.get(route.id);
    const merged = live !== undefined ? live : route.seatsAvailable;
    return normalizeSeatCount(merged ?? 0);
  };

  return (
    <div className="space-y-4">
      {user && (
        <div className="rounded-3xl border border-amber-100/30 bg-gradient-to-r from-[#f59e0b]/20 to-[#f59e0b]/10 p-4 md:p-5 backdrop-blur">
          <p className="text-sm font-medium text-amber-200">Welcome,</p>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="mt-1 text-xs text-amber-300/70">Student Portal</p>
        </div>
      )}
      {hasActiveBuses && (
        <section className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-white/5 p-4 shadow-xl backdrop-blur md:p-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">
              Interactive Live Map
            </h2>
            <span className="w-fit rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-200">
              OpenStreetMap + Leaflet
            </span>
          </div>
          <LiveMap buses={activeBuses} />
        </section>
      )}

      {!hasActiveBuses && (
        <section className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-white/5 p-4 shadow-xl backdrop-blur md:p-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-white">
              Interactive Live Map
            </h2>
            <span className="w-fit rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-200">
              OpenStreetMap + Leaflet
            </span>
          </div>
          <div className="flex h-[360px] items-center justify-center rounded-2xl bg-[#0b162b]/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="rounded-full bg-amber-500/20 p-6">
                <svg
                  className="h-12 w-12 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  No Active Buses
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Waiting for drivers to start trips...
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-4 shadow-lg backdrop-blur md:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <Clock3 className="h-4 w-4 shrink-0 text-amber-400" />
            ETA Dashboard
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Seat counts sync from MongoDB.{" "}
            <strong className="font-medium text-amber-300">Active</strong> means
            the driver has started a trip for that route.
          </p>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              placeholder="Search routes or drivers…"
              className="w-full rounded-xl border border-amber-400/30 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-400 outline-none ring-offset-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
              aria-label="Filter routes"
            />
          </div>
          <div className="space-y-3">
            {routesLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`route-skel-${i}`}
                    className="h-20 animate-pulse rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20"
                  />
                ))}
              </div>
            )}
            {!routesLoading && routesError && (
              <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                {routesError}
              </p>
            )}
            {!routesLoading && !routesError && routes.length === 0 && (
              <p className="rounded-2xl border border-dashed border-amber-400/30 p-3 text-xs text-amber-200/70">
                No active routes in the database yet.
              </p>
            )}
            {!routesLoading &&
              !routesError &&
              routes.length > 0 &&
              filteredRoutes.length === 0 && (
                <p className="rounded-2xl border border-dashed border-amber-400/30 p-3 text-xs text-amber-200/70">
                  No routes match &quot;{routeSearch.trim()}&quot;.
                </p>
              )}
            {!routesLoading &&
              !routesError &&
              filteredRoutes.map((route) => {
                const seats = seatLabelForRoute(route);
                return (
                  <div
                    key={route.id}
                    className="rounded-2xl bg-white/5 p-3 sm:p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {route.name}
                    </p>
                    <p className="text-xs text-amber-200/70">
                      Driver: {route.driver}
                    </p>
                    <div className="mt-2 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-medium ${route.tripInProgress
                              ? "bg-amber-500/30 text-amber-200"
                              : "bg-slate-700/50 text-slate-300"
                            }`}
                        >
                          {route.tripInProgress ? "Active trip" : "Idle"}
                        </span>
                        {route.eta != null && (
                          <span className="font-medium text-amber-300">
                            ETA: {route.eta} min
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {String(seats)} seats
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-4 shadow-lg backdrop-blur md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <div className="relative">
                <BellRing className="h-4 w-4 text-amber-400" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </div>
              Notification Center
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={async () => {
                  try {
                    await axios.delete("/api/broadcasts");
                  } catch (err) {
                    console.error("Failed to clear broadcasts:", err);
                  }
                  dismissAllNotifications();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition"
              >
                <X className="h-3.5 w-3.5" />
                Clear All
              </button>
            )}
          </div>
          <AnimatePresence>
            <div className="space-y-2">
              {notifications.length === 0 && (
                <p className="rounded-xl border border-dashed border-amber-400/30 p-3 text-xs text-amber-200/70">
                  All systems normal. No new alerts.
                </p>
              )}
              {notifications.map((alert) => (
                <motion.button
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  type="button"
                  onClick={() => dismissNotification(alert.id)}
                  className={`w-full rounded-xl border p-3 text-left text-xs ${toastTone[alert.type]}`}
                >
                  {alert.message}
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
