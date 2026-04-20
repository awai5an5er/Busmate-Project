"use client";

import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Clock3, Search, Users } from "lucide-react";
import { useBusMateStore } from "@/store/useBusMateStore";
import { LiveMap } from "@/components/LiveMap";
import type { NotificationType } from "@/types/busmate";

const toastTone = {
  info: "border-blue-200 bg-blue-50 text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-slate-900",
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
  const notifications = useBusMateStore((state) => state.notifications);
  const dismissNotification = useBusMateStore((state) => state.dismissNotification);
  const mergeBroadcastNotifications = useBusMateStore((state) => state.mergeBroadcastNotifications);

  const [routes, setRoutes] = useState<ActiveRouteRow[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [routeSearch, setRouteSearch] = useState("");

  const refreshRoutes = useCallback(async () => {
    try {
      const { data } = await axios.get<{ rows: Array<Record<string, unknown>> }>(
        "/api/routes?active=true",
      );
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
    } catch {
      setRoutesError("Could not load active routes.");
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRoutes();
    const timer = setInterval(() => void refreshRoutes(), ROUTE_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshRoutes]);

  const refreshBroadcasts = useCallback(async () => {
    try {
      const { data } = await axios.get<{
        items: Array<{ id: string; message: string; type: NotificationType; createdAt: number }>;
      }>("/api/broadcasts");
      mergeBroadcastNotifications(data.items ?? []);
    } catch {
      /* ignore broadcast fetch errors */
    }
  }, [mergeBroadcastNotifications]);

  useEffect(() => {
    void refreshBroadcasts();
    const timer = setInterval(() => void refreshBroadcasts(), BROADCAST_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshBroadcasts]);

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.driver.toLowerCase().includes(q),
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
        isLive: typeof tripFromServer === "boolean" ? tripFromServer : bus.isLive,
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

  const seatLabelForRoute = (route: ActiveRouteRow) => {
    const live = liveSeatsByRouteId.get(route.id);
    const merged = live !== undefined ? live : route.seatsAvailable;
    return normalizeSeatCount(merged ?? 0);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-4 shadow-xl md:p-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Interactive Live Map</h2>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            OpenStreetMap + Leaflet
          </span>
        </div>
        <LiveMap buses={enrichedBuses} />
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <Clock3 className="h-4 w-4 shrink-0 text-blue-700" />
            ETA Dashboard
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Seat counts sync from MongoDB. <strong className="font-medium text-slate-700">Active</strong> means
            the driver has started a trip for that route.
          </p>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              placeholder="Search routes or drivers…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-offset-2 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30"
              aria-label="Filter routes"
            />
          </div>
          <div className="space-y-3">
            {routesLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`route-skel-${i}`}
                    className="h-20 animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100"
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
              <p className="rounded-2xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                No active routes in the database yet.
              </p>
            )}
            {!routesLoading && !routesError && routes.length > 0 && filteredRoutes.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-3 text-xs text-slate-600">
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
                    className="rounded-2xl bg-slate-50 p-3 sm:p-4"
                  >
                    <p className="text-sm font-semibold text-slate-800">{route.name}</p>
                    <p className="text-xs text-slate-600">Driver: {route.driver}</p>
                    <div className="mt-2 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                            route.tripInProgress
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {route.tripInProgress ? "Active trip" : "Idle"}
                        </span>
                        {route.eta != null && (
                          <span className="font-medium text-blue-700">ETA: {route.eta} min</span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {String(seats)} seats
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
            <BellRing className="h-4 w-4 shrink-0 text-blue-700" />
            Notification Center
          </h3>
          <AnimatePresence>
            <div className="space-y-2">
              {notifications.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-600">
                  No alerts yet. Admin broadcasts and FCM notifications appear here.
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
      </aside>
    </div>
  );
}
