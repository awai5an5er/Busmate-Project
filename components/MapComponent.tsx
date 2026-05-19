"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Map, { Marker, Popup } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import type { Bus } from "@/types/busmate";
import { useBusMateStore } from "@/store/useBusMateStore";
import { busMapMarkerHtml } from "@/lib/busMapMarkerHtml";
import { studentMapMarkerHtml } from "@/lib/studentMapMarkerHtml";

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const LAHORE_BOUNDS = {
  latMin: 31.45,
  latMax: 31.6,
  lngMin: 74.25,
  lngMax: 74.45,
};
const BUS_SPEED_KMH = 30;
const TICK_MS = 1500;
const GPS_SYNC_MS = 5000;
const ARRIVAL_THRESHOLD_KM = 0.05;
const DELAY_MIN_S = 30;
const DELAY_MAX_S = 60;
const DELAY_PAUSE_MIN_S = 10;
const DELAY_PAUSE_MAX_S = 20;

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

function segmentProgress(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  p: { lat: number; lng: number },
): number {
  const total = haversineKm(start.lat, start.lng, end.lat, end.lng);
  if (total < 1e-4) return 1;
  const d0 = haversineKm(start.lat, start.lng, p.lat, p.lng);
  return Math.min(1, Math.max(0, d0 / total));
}

function randFloat(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomLahoreCoord() {
  return {
    lat: randFloat(LAHORE_BOUNDS.latMin, LAHORE_BOUNDS.latMax),
    lng: randFloat(LAHORE_BOUNDS.lngMin, LAHORE_BOUNDS.lngMax),
  };
}

type BusSimState = {
  startCoord: { lat: number; lng: number };
  endCoord: { lat: number; lng: number };
  progress: number;
  totalDistKm: number;
  arrived: boolean;
  journeyNotified: boolean;
  nextDelayAt: number;
  delayActive: boolean;
  delayEndsAt: number;
  elapsedS: number;
  lastSyncedProgress?: number;
  lastSyncAtMs?: number;
  lastServerCoord?: { lat: number; lng: number };
  appliedServerCoordKey?: string;
};

export type TripControl = "driver" | "student";

type MapComponentProps = {
  buses: Bus[];
  tripControl?: TripControl;
  
  useDeviceGps?: boolean;
};

const fallbackCenter = { latitude: 31.5204, longitude: 74.3587, zoom: 13 };


function zoomForDistanceKm(km: number): number {
  if (km < 0.5) return 15;
  if (km < 2) return 14;
  if (km < 5) return 13;
  if (km < 15) return 12;
  return 11;
}

function shouldUseLiveBusCoord(bus: Bus, studentView: boolean): boolean {
  if (!studentView || !bus.isLive) return false;
  const c = bus.currentCoord;
  return (
    typeof c?.lat === "number" &&
    typeof c?.lng === "number" &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng)
  );
}

function routeEndFromBus(bus: Bus): { lat: number; lng: number } | null {
  if (bus.routeStops && bus.routeStops.length >= 2) {
    const sorted = [...bus.routeStops].sort((a, b) => a.order - b.order);
    const last = sorted[sorted.length - 1];
    return { lat: last.lat, lng: last.lng };
  }
  if (bus.endCoord) return { lat: bus.endCoord.lat, lng: bus.endCoord.lng };
  return null;
}

function routeStartFromBus(bus: Bus): { lat: number; lng: number } | null {
  if (bus.routeStops && bus.routeStops.length >= 2) {
    const sorted = [...bus.routeStops].sort((a, b) => a.order - b.order);
    const first = sorted[0];
    return { lat: first.lat, lng: first.lng };
  }
  if (bus.startCoord) return { lat: bus.startCoord.lat, lng: bus.startCoord.lng };
  return null;
}

export function MapComponent({
  buses,
  tripControl = "driver",
  useDeviceGps = false,
}: MapComponentProps) {
  const isStudentView = tripControl === "student";
  const liveTripBuses = useMemo(() => buses.filter((b) => b.isLive), [buses]);
  const displayBuses = useMemo(() => {
    if (useDeviceGps && !isStudentView) return buses;
    return liveTripBuses;
  }, [buses, useDeviceGps, isStudentView, liveTripBuses]);

  const hasMapContent = displayBuses.length > 0;
  const displayBusesRef = useRef(displayBuses);
  displayBusesRef.current = displayBuses;

  const pushNotification = useBusMateStore((state) => state.pushNotification);
  const updateBusFromFeed = useBusMateStore((state) => state.updateBusFromFeed);
  const updateBusTripState = useBusMateStore(
    (state) => state.updateBusTripState,
  );

  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, [number, number]>
  >({});
  const [deviceCoords, setDeviceCoords] = useState<
    Record<string, [number, number]>
  >({});
  const deviceCoordsRef = useRef(deviceCoords);
  deviceCoordsRef.current = deviceCoords;

  const [geoError, setGeoError] = useState(false);
  const [studentLocation, setStudentLocation] = useState<
    [number, number] | null
  >(null);
  const [studentGeoError, setStudentGeoError] = useState(false);
  const [popupBusId, setPopupBusId] = useState<string | null>(null);
  const [viewState, setViewState] = useState(() => {
    const b = displayBuses[0];
    if (b) {
      return {
        latitude: b.position.lat,
        longitude: b.position.lng,
        zoom: 13,
      };
    }
    return fallbackCenter;
  });

  const simRef = useRef<Record<string, BusSimState>>({});
  const simulatingRef = useRef<Set<string>>(new Set());
  const seededRouteCoordsRef = useRef<Set<string>>(new Set());
  const didCenterOnGpsRef = useRef(false);
  
  const studentMapCenteredRef = useRef(false);
  const lastStudentCenterKeyRef = useRef<string | null>(null);
  const studentDualFitDoneRef = useRef(false);

  const initBusSim = useCallback(
    (bus: Bus) => {
      if (useDeviceGps && !isStudentView) return;
      if (simulatingRef.current.has(bus.id)) return;
      if (isStudentView && (!bus.startCoord || !bus.endCoord)) return;
      simulatingRef.current.add(bus.id);

      let startCoord: { lat: number; lng: number };
      let endCoord: { lat: number; lng: number };

      if (isStudentView && bus.startCoord && bus.endCoord) {
        startCoord = { lat: bus.startCoord.lat, lng: bus.startCoord.lng };
        endCoord = { lat: bus.endCoord.lat, lng: bus.endCoord.lng };
      } else {
        startCoord = {
          lat: bus.position.lat,
          lng: bus.position.lng,
        };
        let finalEnd = randomLahoreCoord();
        let attempts = 0;
        while (
          haversineKm(
            startCoord.lat,
            startCoord.lng,
            finalEnd.lat,
            finalEnd.lng,
          ) < 1 &&
          attempts < 10
        ) {
          finalEnd = randomLahoreCoord();
          attempts++;
        }
        endCoord = finalEnd;
      }

      const totalDistKm = haversineKm(
        startCoord.lat,
        startCoord.lng,
        endCoord.lat,
        endCoord.lng,
      );

      const cc = bus.currentCoord ?? {
        lat: bus.position.lat,
        lng: bus.position.lng,
      };
      const now = Date.now();
      const baseProgress = isStudentView
        ? segmentProgress(startCoord, endCoord, cc)
        : 0;
      const coordKey = `${cc.lat.toFixed(5)},${cc.lng.toFixed(5)}`;

      simRef.current[bus.id] = {
        startCoord,
        endCoord,
        progress: baseProgress,
        totalDistKm,
        arrived: false,
        journeyNotified: isStudentView,
        nextDelayAt: randFloat(DELAY_MIN_S, DELAY_MAX_S),
        delayActive: false,
        delayEndsAt: 0,
        elapsedS: 0,
        ...(isStudentView
          ? {
              lastSyncedProgress: baseProgress,
              lastSyncAtMs: now,
              lastServerCoord: { lat: cc.lat, lng: cc.lng },
              appliedServerCoordKey: coordKey,
            }
          : {}),
      };

      if (!isStudentView) {
        void axios
          .patch(`/api/buses/${bus.id}`, {
            startCoord,
            endCoord,
            status: "active",
            gpsActive: true,
          })
          .catch(() => null);

        updateBusTripState(bus.id, {
          status: "active",
          gpsActive: true,
          startCoord,
          endCoord,
        });
      }
    },
    [updateBusTripState, isStudentView, useDeviceGps],
  );

  const cleanupBusSim = useCallback((busId: string) => {
    simulatingRef.current.delete(busId);
    delete simRef.current[busId];
  }, []);

  useEffect(() => {
    if (!hasMapContent || (useDeviceGps && !isStudentView)) return;

    const intervalId = setInterval(() => {
      const tickS = TICK_MS / 1000;

      setAnimatedPositions((prev) => {
        const updated = { ...prev };

        for (const bus of displayBusesRef.current) {
          if (isStudentView && shouldUseLiveBusCoord(bus, true)) {
            const cc = bus.currentCoord!;
            updated[bus.id] = [cc.lat, cc.lng];
            const end =
              routeEndFromBus(bus) ??
              (bus.endCoord
                ? { lat: bus.endCoord.lat, lng: bus.endCoord.lng }
                : null);
            const remainingDistKm = end
              ? haversineKm(cc.lat, cc.lng, end.lat, end.lng)
              : null;
            const etaMin =
              remainingDistKm !== null
                ? Math.max(
                    0,
                    Math.ceil((remainingDistKm / BUS_SPEED_KMH) * 60),
                  )
                : bus.eta;
            updateBusFromFeed(bus.id, { eta: etaMin });
            continue;
          }

          if (!simRef.current[bus.id]) {
            initBusSim(bus);
          }

          const sim = simRef.current[bus.id];
          if (!sim || sim.arrived) continue;

          if (isStudentView) {
            const cc = bus.currentCoord ?? {
              lat: bus.position.lat,
              lng: bus.position.lng,
            };

            const pServer = segmentProgress(
              sim.startCoord,
              sim.endCoord,
              cc,
            );
            const coordKey = `${cc.lat.toFixed(5)},${cc.lng.toFixed(5)}`;
            if (coordKey !== sim.appliedServerCoordKey) {
              sim.lastSyncedProgress = pServer;
              sim.lastSyncAtMs = Date.now();
              sim.appliedServerCoordKey = coordKey;
            }
            const syncMs = sim.lastSyncAtMs ?? Date.now();
            const ageS = Math.max(0, (Date.now() - syncMs) / 1000);
            const raw = Math.min(
              1,
              (sim.lastSyncedProgress ?? 0) +
                (BUS_SPEED_KMH * ageS) / 3600 / sim.totalDistKm,
            );
            sim.progress = Math.min(raw, pServer + 0.04);
            sim.elapsedS += tickS;

            const pos = lerpLatLng(sim.startCoord, sim.endCoord, sim.progress);
            updated[bus.id] = [pos.lat, pos.lng];

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

            updateBusFromFeed(bus.id, {
              position: { x: 0, y: 0, lat: pos.lat, lng: pos.lng },
              eta: etaMin,
            });

            if (remainingDistKm < ARRIVAL_THRESHOLD_KM) {
              sim.arrived = true;
            }
            continue;
          }

          if (!sim.journeyNotified) {
            sim.journeyNotified = true;
            const busName = bus.routeName ?? bus.name;
            pushNotification(
              `Bus ${busName} has started its journey.`,
              "success",
            );
          }

          if (sim.delayActive) {
            if (sim.elapsedS >= sim.delayEndsAt) {
              sim.delayActive = false;
              sim.nextDelayAt = sim.elapsedS + randFloat(DELAY_MIN_S, DELAY_MAX_S);
            } else {
              sim.elapsedS += tickS;
              continue;
            }
          }

          if (sim.elapsedS >= sim.nextDelayAt && !sim.arrived) {
            const pauseDuration = randFloat(DELAY_PAUSE_MIN_S, DELAY_PAUSE_MAX_S);
            sim.delayActive = true;
            sim.delayEndsAt = sim.elapsedS + pauseDuration;

            const remainingDistKm = sim.totalDistKm * (1 - sim.progress);
            const delayedEtaMin = Math.ceil(
              (remainingDistKm / BUS_SPEED_KMH) * 60 + pauseDuration / 60,
            );

            const busName = bus.routeName ?? bus.name;
            pushNotification(
              `Bus ${busName} is delayed due to traffic. New ETA: ${delayedEtaMin} min.`,
              "warning",
            );

            updateBusTripState(bus.id, { eta: delayedEtaMin });

            sim.elapsedS += tickS;
            continue;
          }

          const distPerTickKm = (BUS_SPEED_KMH * tickS) / 3600;
          const stepFraction = distPerTickKm / sim.totalDistKm;
          sim.progress = Math.min(sim.progress + stepFraction, 1);
          sim.elapsedS += tickS;

          const pos = lerpLatLng(sim.startCoord, sim.endCoord, sim.progress);
          updated[bus.id] = [pos.lat, pos.lng];

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

          updateBusFromFeed(bus.id, {
            position: { x: 0, y: 0, lat: pos.lat, lng: pos.lng },
            eta: etaMin,
          });

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
    hasMapContent,
    isStudentView,
    pushNotification,
    updateBusFromFeed,
    updateBusTripState,
    initBusSim,
    useDeviceGps,
  ]);

  useEffect(() => {
    const activeBusIds = new Set(displayBuses.map((b) => b.id));
    for (const busId of simulatingRef.current) {
      if (!activeBusIds.has(busId)) {
        cleanupBusSim(busId);
      }
    }
  }, [displayBuses, cleanupBusSim]);

  useEffect(() => {
    if (!hasMapContent || isStudentView || !useDeviceGps) return;
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDeviceCoords((prev) => {
          const next = { ...prev };
          for (const bus of displayBusesRef.current) {
            next[bus.id] = [lat, lng];
          }
          return next;
        });
        if (!didCenterOnGpsRef.current) {
          didCenterOnGpsRef.current = true;
          setViewState((vs) => ({
            ...vs,
            latitude: lat,
            longitude: lng,
            zoom: 15,
          }));
        }
      },
      () => setGeoError(true),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 25000 },
    );

    return () => {
      didCenterOnGpsRef.current = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [hasMapContent, isStudentView, useDeviceGps]);

  useEffect(() => {
    if (!isStudentView || !hasMapContent) {
      setStudentLocation(null);
      setStudentGeoError(false);
      return;
    }
    if (!navigator.geolocation) {
      setStudentGeoError(true);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setStudentGeoError(false);
        setStudentLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => setStudentGeoError(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 25000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isStudentView, hasMapContent]);

  useEffect(() => {
    if (!hasMapContent || isStudentView || useDeviceGps) return;

    const syncId = setInterval(() => {
      for (const bus of displayBusesRef.current) {
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
  }, [hasMapContent, isStudentView, useDeviceGps]);

  useEffect(() => {
    if (!hasMapContent || isStudentView || !useDeviceGps) return;

    const syncId = setInterval(() => {
      for (const bus of displayBusesRef.current) {
        const pair = deviceCoordsRef.current[bus.id];
        if (!pair) continue;
        const [lat, lng] = pair;
        const end = routeEndFromBus(bus);
        const start = routeStartFromBus(bus);
        if (start && end && !seededRouteCoordsRef.current.has(bus.id)) {
          seededRouteCoordsRef.current.add(bus.id);
          void axios
            .patch(`/api/buses/${bus.id}`, {
              startCoord: start,
              endCoord: end,
              status: bus.isLive ? "active" : "idle",
              gpsActive: true,
            })
            .catch(() => null);
          updateBusTripState(bus.id, {
            startCoord: start,
            endCoord: end,
            gpsActive: true,
            status: bus.isLive ? "active" : "idle",
          });
        }

        const etaMin = end
          ? Math.max(
              0,
              Math.ceil(
                (haversineKm(lat, lng, end.lat, end.lng) / BUS_SPEED_KMH) * 60,
              ),
            )
          : bus.eta;

        void axios
          .patch(`/api/buses/${bus.id}`, {
            currentCoord: { lat, lng },
            eta: etaMin,
            status: bus.isLive ? "active" : "idle",
            gpsActive: true,
          })
          .catch(() => null);

        updateBusFromFeed(bus.id, {
          position: { x: 0, y: 0, lat, lng },
          eta: etaMin,
          currentCoord: { lat, lng },
          gpsActive: true,
        });
      }
    }, GPS_SYNC_MS);

    return () => clearInterval(syncId);
  }, [hasMapContent, isStudentView, useDeviceGps, updateBusFromFeed, updateBusTripState]);

  const busMarkerPosition = useCallback(
    (bus: Bus): [number, number] => {
      if (useDeviceGps && !isStudentView && deviceCoords[bus.id]) {
        return deviceCoords[bus.id]!;
      }
      if (shouldUseLiveBusCoord(bus, isStudentView)) {
        const c = bus.currentCoord!;
        return [c.lat, c.lng];
      }
      return (
        animatedPositions[bus.id] ?? [bus.position.lat, bus.position.lng]
      );
    },
    [useDeviceGps, isStudentView, deviceCoords, animatedPositions],
  );

  const openBusForPopup = useMemo(() => {
    if (!popupBusId) return null;
    return displayBuses.find((b) => b.id === popupBusId) ?? null;
  }, [popupBusId, displayBuses]);

  const busPopupEl = useMemo(() => {
    if (!openBusForPopup) return null;
    const bus = openBusForPopup;
    const [lat, lng] = busMarkerPosition(bus);
    const routeTitle = bus.routeName ?? bus.name;
    const driver = bus.driverName ?? "—";
    const sim = simRef.current[bus.id];
    const endCoord = routeEndFromBus(bus);
    const remainingDistKm = sim
      ? haversineKm(lat, lng, sim.endCoord.lat, sim.endCoord.lng)
      : endCoord
        ? haversineKm(lat, lng, endCoord.lat, endCoord.lng)
        : null;
    const etaMin =
      remainingDistKm !== null
        ? Math.max(0, Math.ceil((remainingDistKm / BUS_SPEED_KMH) * 60))
        : bus.eta;

    return (
      <Popup
        key={`popup-bus-${bus.id}`}
        longitude={lng}
        latitude={lat}
        anchor="top"
        onClose={() => setPopupBusId(null)}
        closeOnClick={false}
      >
        <div className="min-w-[200px] space-y-1 text-slate-900">
          <p className="text-sm font-semibold leading-tight">{routeTitle}</p>
          <p className="text-sm text-slate-700">Driver: {driver}</p>
          <p className="text-sm text-slate-700">ETA: {etaMin} min</p>
          <p className="text-sm text-slate-700">Seats: {bus.seatsAvailable}</p>
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
    );
  }, [
    openBusForPopup,
    popupBusId,
    busMarkerPosition,
  ]);

  useEffect(() => {
    if (!hasMapContent) {
      studentMapCenteredRef.current = false;
      lastStudentCenterKeyRef.current = null;
      studentDualFitDoneRef.current = false;
      return;
    }
    if (useDeviceGps && !isStudentView) return;

    const b = displayBuses[0];
    if (!b) return;

    if (isStudentView) {
      const live = shouldUseLiveBusCoord(b, true);
      const focusLat = live ? b.currentCoord!.lat : b.position.lat;
      const focusLng = live ? b.currentCoord!.lng : b.position.lng;
      const busKey = `${b.id}|${live ? "live" : "sim"}`;
      const prev = lastStudentCenterKeyRef.current;
      const prevBusId = prev?.split("|")[0] ?? null;
      const prevMode = prev?.split("|")[1] ?? null;
      const mode = live ? "live" : "sim";

      const needCenter =
        !studentMapCenteredRef.current ||
        prevBusId !== b.id ||
        (prevMode === "sim" && mode === "live");

      if (needCenter) {
        studentMapCenteredRef.current = true;
        lastStudentCenterKeyRef.current = busKey;

        let latitude = focusLat;
        let longitude = focusLng;
        let zoom = 14;

        if (studentLocation) {
          const [sLat, sLng] = studentLocation;
          latitude = (focusLat + sLat) / 2;
          longitude = (focusLng + sLng) / 2;
          zoom = zoomForDistanceKm(
            haversineKm(focusLat, focusLng, sLat, sLng),
          );
          studentDualFitDoneRef.current = true;
        }

        setViewState((vs) => ({
          ...vs,
          latitude,
          longitude,
          zoom,
        }));
      }
      return;
    }

    setViewState((vs) => ({
      ...vs,
      latitude: b.position.lat,
      longitude: b.position.lng,
    }));
  }, [displayBuses, hasMapContent, useDeviceGps, isStudentView, studentLocation]);

  useEffect(() => {
    if (
      !isStudentView ||
      !hasMapContent ||
      !studentLocation ||
      !studentMapCenteredRef.current ||
      studentDualFitDoneRef.current
    ) {
      return;
    }
    const b = displayBuses[0];
    if (!b) return;

    const live = shouldUseLiveBusCoord(b, true);
    const busLat = live ? b.currentCoord!.lat : b.position.lat;
    const busLng = live ? b.currentCoord!.lng : b.position.lng;
    const [sLat, sLng] = studentLocation;

    studentDualFitDoneRef.current = true;

    setViewState((vs) => ({
      ...vs,
      latitude: (busLat + sLat) / 2,
      longitude: (busLng + sLng) / 2,
      zoom: zoomForDistanceKm(haversineKm(busLat, busLng, sLat, sLng)),
    }));
  }, [isStudentView, hasMapContent, studentLocation, displayBuses]);

  if (!hasMapContent) {
    return (
      <div className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
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
            <p className="mt-1 text-xs text-slate-500">
              Waiting for active bus signals...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl">
      {geoError && useDeviceGps && !isStudentView && (
        <div className="absolute left-2 right-2 top-2 z-10 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Location unavailable. Allow browser location access to broadcast your
          position.
        </div>
      )}
      {isStudentView && studentGeoError && !studentLocation && (
        <div className="absolute left-2 right-2 top-2 z-10 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Allow location access to see where you are on the map.
        </div>
      )}
      {isStudentView && (
        <div className="absolute bottom-2 left-2 z-10 flex flex-col gap-1.5 rounded-lg border border-white/20 bg-slate-900/85 px-2.5 py-2 text-[10px] text-white shadow-lg backdrop-blur sm:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-300"
              aria-hidden
            />
            You
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-4 shrink-0 rounded-sm bg-emerald-500"
              aria-hidden
            />
            Bus
          </span>
        </div>
      )}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle={OSM_STYLE}
      >
        {isStudentView && studentLocation && (
          <Marker
            key="student-self"
            longitude={studentLocation[1]}
            latitude={studentLocation[0]}
            anchor="center"
          >
            <div
              role="img"
              aria-label="Your location"
              dangerouslySetInnerHTML={{ __html: studentMapMarkerHtml() }}
            />
          </Marker>
        )}

        {displayBuses.map((bus) => {
          const [lat, lng] = busMarkerPosition(bus);
          const routeTitle = bus.routeName ?? bus.name;

          return (
            <Marker
              key={bus.id}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0"
                aria-label={`${routeTitle} bus marker`}
                dangerouslySetInnerHTML={{ __html: busMapMarkerHtml(bus.isLive) }}
                onClick={() =>
                  setPopupBusId((p) => (p === bus.id ? null : bus.id))
                }
              />
            </Marker>
          );
        })}

        {busPopupEl}
      </Map>
    </div>
  );
}
