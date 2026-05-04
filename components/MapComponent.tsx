"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import axios from "axios";
import type { Bus } from "@/types/busmate";
import { useBusMateStore } from "@/store/useBusMateStore";
import { getBusLeafletIcon } from "@/lib/busLeafletIcon";
import { getStartStopIcons } from "@/lib/startStopIcons";

// ─── Constants ────────────────────────────────────────────────────────────────
const LAHORE_BOUNDS = {
  latMin: 31.45,
  latMax: 31.60,
  lngMin: 74.25,
  lngMax: 74.45,
};
const BUS_SPEED_KMH = 30;
const TICK_MS = 1500; // animation interval
const GPS_SYNC_MS = 5000; // MongoDB sync interval
const ARRIVAL_THRESHOLD_KM = 0.05; // 50 m
const DELAY_MIN_S = 30; // min seconds before a traffic delay
const DELAY_MAX_S = 60; // max seconds before a traffic delay
const DELAY_PAUSE_MIN_S = 10; // min pause duration
const DELAY_PAUSE_MAX_S = 20; // max pause duration

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng points. */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Linear interpolation between two lat/lng points at fraction t ∈ [0,1]. */
function lerpLatLng(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number } {
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t,
  };
}

/** Random float in [min, max]. */
function randFloat(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Generate a random coordinate within Lahore bounding box. */
function randomLahoreCoord() {
  return {
    lat: randFloat(LAHORE_BOUNDS.latMin, LAHORE_BOUNDS.latMax),
    lng: randFloat(LAHORE_BOUNDS.lngMin, LAHORE_BOUNDS.lngMax),
  };
}

// ─── Per-bus simulation state (stored in a ref so it survives re-renders) ────
type BusSimState = {
  startCoord: { lat: number; lng: number };
  endCoord: { lat: number; lng: number };
  progress: number; // 0 → 1
  totalDistKm: number;
  arrived: boolean;
  journeyNotified: boolean;
  // traffic delay
  nextDelayAt: number; // elapsed seconds until next delay triggers
  delayActive: boolean;
  delayEndsAt: number; // elapsed seconds when delay ends
  elapsedS: number; // cumulative un-paused travel seconds
};

type MapComponentProps = {
  buses: Bus[];
};

const fallbackCenter: [number, number] = [31.5204, 74.3587];

// ─── Component ────────────────────────────────────────────────────────────────
export function MapComponent({ buses }: MapComponentProps) {
  const activeBuses = useMemo(() => buses.filter((b) => b.isLive), [buses]);
  const hasActiveBuses = activeBuses.length > 0;

  const pushNotification = useBusMateStore((state) => state.pushNotification);
  const updateBusFromFeed = useBusMateStore((state) => state.updateBusFromFeed);
  const updateBusTripState = useBusMateStore(
    (state) => state.updateBusTripState,
  );

  // Map from busId → animated [lat, lng] for rendering
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, [number, number]>
  >({});

  // Per-bus simulation state — never triggers re-render on its own
  const simRef = useRef<Record<string, BusSimState>>({});

  // Track which buses are currently being simulated to avoid duplicate inits
  const simulatingRef = useRef<Set<string>>(new Set());

  // ── Initialise simulation state for a bus when it goes live ─────────────
  const initBusSim = useCallback(
    (bus: Bus) => {
      if (simulatingRef.current.has(bus.id)) return;
      simulatingRef.current.add(bus.id);

      const startCoord = {
        lat: bus.position.lat,
        lng: bus.position.lng,
      };
      const endCoord = randomLahoreCoord();
      // Ensure end is reasonably far (>1 km) from start
      let attempts = 0;
      let finalEnd = endCoord;
      while (
        haversineKm(startCoord.lat, startCoord.lng, finalEnd.lat, finalEnd.lng) <
          1 &&
        attempts < 10
      ) {
        finalEnd = randomLahoreCoord();
        attempts++;
      }

      const totalDistKm = haversineKm(
        startCoord.lat,
        startCoord.lng,
        finalEnd.lat,
        finalEnd.lng,
      );

      simRef.current[bus.id] = {
        startCoord,
        endCoord: finalEnd,
        progress: 0,
        totalDistKm,
        arrived: false,
        journeyNotified: false,
        nextDelayAt: randFloat(DELAY_MIN_S, DELAY_MAX_S),
        delayActive: false,
        delayEndsAt: 0,
        elapsedS: 0,
      };

      // Persist start/end coords to MongoDB immediately
      void axios
        .patch(`/api/buses/${bus.id}`, {
          startCoord,
          endCoord: finalEnd,
          status: "active",
          gpsActive: true,
        })
        .catch(() => null);

      // Update store so ETA card reflects active immediately
      updateBusTripState(bus.id, {
        status: "active",
        gpsActive: true,
        startCoord,
        endCoord: finalEnd,
      });
    },
    [updateBusTripState],
  );

  // ── Remove sim state when a bus goes offline ─────────────────────────────
  const cleanupBusSim = useCallback((busId: string) => {
    simulatingRef.current.delete(busId);
    delete simRef.current[busId];
  }, []);

  // ── Main animation tick ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasActiveBuses) return;

    const intervalId = setInterval(() => {
      const tickS = TICK_MS / 1000;

      setAnimatedPositions((prev) => {
        const updated = { ...prev };

        for (const bus of activeBuses) {
          // Initialise if not yet started
          if (!simRef.current[bus.id]) {
            initBusSim(bus);
          }

          const sim = simRef.current[bus.id];
          if (!sim || sim.arrived) continue;

          // ── First tick: fire "started journey" notification ──────────────
          if (!sim.journeyNotified) {
            sim.journeyNotified = true;
            const busName = bus.routeName ?? bus.name;
            pushNotification(
              `Bus ${busName} has started its journey.`,
              "success",
            );
          }

          // ── Traffic delay logic ──────────────────────────────────────────
          if (sim.delayActive) {
            if (sim.elapsedS >= sim.delayEndsAt) {
              // Delay over — resume
              sim.delayActive = false;
              sim.nextDelayAt = sim.elapsedS + randFloat(DELAY_MIN_S, DELAY_MAX_S);
            } else {
              // Still paused — skip advancing position this tick
              sim.elapsedS += tickS;
              continue;
            }
          }

          // Check if we should trigger the next delay
          if (sim.elapsedS >= sim.nextDelayAt && !sim.arrived) {
            const pauseDuration = randFloat(DELAY_PAUSE_MIN_S, DELAY_PAUSE_MAX_S);
            sim.delayActive = true;
            sim.delayEndsAt = sim.elapsedS + pauseDuration;

            // Remaining distance & ETA after delay
            const remainingDistKm =
              sim.totalDistKm * (1 - sim.progress);
            const delayedEtaMin = Math.ceil(
              (remainingDistKm / BUS_SPEED_KMH) * 60 +
                pauseDuration / 60,
            );

            const busName = bus.routeName ?? bus.name;
            pushNotification(
              `Bus ${busName} is delayed due to traffic. New ETA: ${delayedEtaMin} min.`,
              "warning",
            );

            // Update store eta
            updateBusTripState(bus.id, { eta: delayedEtaMin });

            sim.elapsedS += tickS;
            continue;
          }

          // ── Advance progress ─────────────────────────────────────────────
          // stepFraction = distance covered this tick / total distance
          const distPerTickKm = (BUS_SPEED_KMH * tickS) / 3600;
          const stepFraction = distPerTickKm / sim.totalDistKm;
          sim.progress = Math.min(sim.progress + stepFraction, 1);
          sim.elapsedS += tickS;

          // ── Interpolate position ─────────────────────────────────────────
          const pos = lerpLatLng(sim.startCoord, sim.endCoord, sim.progress);
          updated[bus.id] = [pos.lat, pos.lng];

          // ── Recalculate remaining ETA ────────────────────────────────────
          const remainingDistKm =
            haversineKm(pos.lat, pos.lng, sim.endCoord.lat, sim.endCoord.lng);
          const etaMin = Math.max(
            0,
            Math.ceil((remainingDistKm / BUS_SPEED_KMH) * 60),
          );

          // Update store with new position + ETA
          updateBusFromFeed(bus.id, {
            position: { x: 0, y: 0, lat: pos.lat, lng: pos.lng },
            eta: etaMin,
          });

          // ── Arrival detection ────────────────────────────────────────────
          if (remainingDistKm < ARRIVAL_THRESHOLD_KM) {
            sim.arrived = true;
            const busName = bus.routeName ?? bus.name;

            pushNotification(
              `Bus ${busName} has reached its destination.`,
              "success",
            );

            updateBusTripState(bus.id, {
              status: "idle",
              gpsActive: false,
              eta: 0,
            });

            // Sync final state to MongoDB
            void axios
              .patch(`/api/buses/${bus.id}`, {
                status: "idle",
                gpsActive: false,
                eta: 0,
              })
              .catch(() => null);
          }
        }

        return updated;
      });
    }, TICK_MS);

    return () => clearInterval(intervalId);
  }, [
    hasActiveBuses,
    activeBuses,
    pushNotification,
    updateBusFromFeed,
    updateBusTripState,
    initBusSim,
  ]);

  // ── Clean up sim state for buses that go offline ─────────────────────────
  useEffect(() => {
    const activeBusIds = new Set(activeBuses.map((b) => b.id));
    for (const busId of simulatingRef.current) {
      if (!activeBusIds.has(busId)) {
        cleanupBusSim(busId);
      }
    }
  }, [activeBuses, cleanupBusSim]);

  // ── GPS sync: PATCH every 5 s with current position ─────────────────────
  useEffect(() => {
    if (!hasActiveBuses) return;

    const syncId = setInterval(() => {
      for (const bus of activeBuses) {
        const sim = simRef.current[bus.id];
        if (!sim || sim.arrived) continue;

        const pos = lerpLatLng(sim.startCoord, sim.endCoord, sim.progress);
        const remainingDistKm = haversineKm(
          pos.lat,
          pos.lng,
          sim.endCoord.lat,
          sim.endCoord.lng,
        );
        const etaMin = Math.max(
          0,
          Math.ceil((remainingDistKm / BUS_SPEED_KMH) * 60),
        );

        void axios
          .patch(`/api/buses/${bus.id}`, {
            currentCoord: { lat: pos.lat, lng: pos.lng },
            eta: etaMin,
            status: "active",
            gpsActive: true,
          })
          .catch(() => null);
      }
    }, GPS_SYNC_MS);

    return () => clearInterval(syncId);
  }, [hasActiveBuses, activeBuses]);

  // ── Route polyline data (memoised) ───────────────────────────────────────
  const routeData = useMemo(() => {
    const { startIcon, stopIcon } = getStartStopIcons();

    // Prefer routeStops if available; fall back to sim start/end
    return activeBuses.map((bus) => {
      const sim = simRef.current[bus.id];

      // Use routeStops path if present
      if (bus.routeStops && bus.routeStops.length >= 2) {
        const sortedStops = [...bus.routeStops].sort(
          (a, b) => a.order - b.order,
        );
        const path = sortedStops.map(
          (s) => [s.lat, s.lng] as [number, number],
        );
        return {
          busId: bus.id,
          routeName: bus.routeName ?? bus.name,
          path,
          startPos: path[0],
          endPos: path[path.length - 1],
          startIcon,
          stopIcon,
        };
      }

      // Fall back to generated sim start/end coords
      if (sim) {
        const path: [number, number][] = [
          [sim.startCoord.lat, sim.startCoord.lng],
          [sim.endCoord.lat, sim.endCoord.lng],
        ];
        return {
          busId: bus.id,
          routeName: bus.routeName ?? bus.name,
          path,
          startPos: path[0],
          endPos: path[1],
          startIcon,
          stopIcon,
        };
      }

      return null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBuses, animatedPositions]); // re-compute when positions change so polyline stays in sync with sim state

  const center: [number, number] = hasActiveBuses
    ? [activeBuses[0].position.lat, activeBuses[0].position.lng]
    : fallbackCenter;

  // ── No active buses placeholder ──────────────────────────────────────────
  if (!hasActiveBuses) {
    return (
      <div className="relative h-[360px] overflow-hidden rounded-2xl bg-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="rounded-full bg-slate-200 p-6">
            <svg
              className="h-12 w-12 text-slate-500"
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
            <p className="text-sm font-semibold text-slate-700">Standby</p>
            <p className="text-xs text-slate-500 mt-1">
              Waiting for active bus signals...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Map render ───────────────────────────────────────────────────────────
  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route polylines + start/stop markers */}
        {routeData.map((data) => {
          if (!data) return null;
          return (
            <div key={`route-group-${data.busId}`}>
              {/* Blue route polyline */}
              <Polyline
                positions={data.path}
                pathOptions={{ color: "#3B82F6", weight: 4, opacity: 0.8 }}
              />

              {/* Start marker (green) */}
              <Marker position={data.startPos} icon={data.startIcon}>
                <Popup>
                  <div className="text-sm font-semibold text-slate-900">
                    {data.routeName} — Start
                  </div>
                </Popup>
              </Marker>

              {/* Destination marker (red) */}
              <Marker position={data.endPos} icon={data.stopIcon}>
                <Popup>
                  <div className="text-sm font-semibold text-slate-900">
                    {data.routeName} — Destination
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        {/* Animated bus markers */}
        {activeBuses.map((bus) => {
          const animPos = animatedPositions[bus.id] ?? [
            bus.position.lat,
            bus.position.lng,
          ];
          const routeTitle = bus.routeName ?? bus.name;
          const driver = bus.driverName ?? "—";
          const sim = simRef.current[bus.id];
          const remainingDistKm = sim
            ? haversineKm(
                animPos[0],
                animPos[1],
                sim.endCoord.lat,
                sim.endCoord.lng,
              )
            : null;
          const etaMin =
            remainingDistKm !== null
              ? Math.max(0, Math.ceil((remainingDistKm / BUS_SPEED_KMH) * 60))
              : bus.eta;

          return (
            <Marker
              key={bus.id}
              position={animPos}
              icon={getBusLeafletIcon(bus.isLive)}
            >
              <Popup>
                <div className="min-w-[200px] space-y-1 text-slate-900">
                  <p className="text-sm font-semibold leading-tight">
                    {routeTitle}
                  </p>
                  <p className="text-sm text-slate-700">Driver: {driver}</p>
                  <p className="text-sm text-slate-700">
                    ETA: {etaMin} min
                  </p>
                  <p className="text-sm text-slate-700">
                    Seats: {bus.seatsAvailable}
                  </p>
                  {bus.status && (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        bus.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {bus.status === "active" ? "Active trip" : "Idle"}
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
