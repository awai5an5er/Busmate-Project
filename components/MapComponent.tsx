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
import { useMemo, useEffect, useRef, useState } from "react";
import type { Bus } from "@/types/busmate";
import { useBusMateStore } from "@/store/useBusMateStore";
import { getBusLeafletIcon } from "@/lib/busLeafletIcon";
import { getStartStopIcons } from "@/lib/startStopIcons";

type MapComponentProps = {
  buses: Bus[];
};

const fallbackCenter: [number, number] = [31.5204, 74.3587];

// Calculate distance between two coordinates (Haversine formula)
function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Interpolate position along a path
function interpolatePosition(
  path: [number, number][],
  progress: number,
): [number, number] {
  if (path.length < 2) return path[0];

  const totalDistance = path.reduce((sum, point, i) => {
    if (i === 0) return 0;
    return (
      sum + getDistance(path[i - 1][0], path[i - 1][1], point[0], point[1])
    );
  }, 0);

  const targetDistance = totalDistance * progress;
  let currentDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const segmentDistance = getDistance(
      path[i][0],
      path[i][1],
      path[i + 1][0],
      path[i + 1][1],
    );
    if (currentDistance + segmentDistance >= targetDistance) {
      const segmentProgress =
        (targetDistance - currentDistance) / segmentDistance;
      const lat = path[i][0] + (path[i + 1][0] - path[i][0]) * segmentProgress;
      const lng = path[i][1] + (path[i + 1][1] - path[i][1]) * segmentProgress;
      return [lat, lng];
    }
    currentDistance += segmentDistance;
  }

  return path[path.length - 1];
}

export function MapComponent({ buses }: MapComponentProps) {
  const activeBuses = buses.filter((b) => b.isLive);
  const hasActiveBuses = activeBuses.length > 0;
  const pushNotification = useBusMateStore((state) => state.pushNotification);
  const updateBusFromFeed = useBusMateStore((state) => state.updateBusFromFeed);

  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, [number, number]>
  >({});
  const animationStartTimesRef = useRef<Record<string, number>>({});
  const destinationNotifiedRef = useRef<Set<string>>(new Set());

  const center = hasActiveBuses
    ? ([activeBuses[0].position.lat, activeBuses[0].position.lng] as [
        number,
        number,
      ])
    : fallbackCenter;

  // Animation loop
  useEffect(() => {
    if (!hasActiveBuses) return;

    const animationFrame = setInterval(() => {
      setAnimatedPositions((prev) => {
        const updated = { ...prev };

        activeBuses.forEach((bus) => {
          if (!bus.routeStops || bus.routeStops.length < 2) {
            updated[bus.id] = [bus.position.lat, bus.position.lng];
            return;
          }

          const routePath = bus.routeStops
            .sort((a, b) => a.order - b.order)
            .map((stop) => [stop.lat, stop.lng] as [number, number]);

          if (!animationStartTimesRef.current[bus.id]) {
            animationStartTimesRef.current[bus.id] = Date.now();
          }

          const elapsedSeconds =
            (Date.now() - animationStartTimesRef.current[bus.id]) / 1000;
          const totalDistance = routePath.reduce((sum, point, i) => {
            if (i === 0) return 0;
            return (
              sum +
              getDistance(
                routePath[i - 1][0],
                routePath[i - 1][1],
                point[0],
                point[1],
              )
            );
          }, 0);

          // Speed: ~20 km/h for urban transit
          const speedKmH = 20;
          const totalSeconds = (totalDistance / speedKmH) * 3600;
          const progress = Math.min(elapsedSeconds / totalSeconds, 1);

          const interpolatedPos = interpolatePosition(routePath, progress);
          updated[bus.id] = interpolatedPos;

          // Update store with animated position
          updateBusFromFeed(bus.id, {
            position: {
              x: bus.position.x,
              y: bus.position.y,
              lat: interpolatedPos[0],
              lng: interpolatedPos[1],
            },
          });

          // Check destination arrival (50m geofence)
          const finalStop = routePath[routePath.length - 1];
          const distanceToDestination = getDistance(
            interpolatedPos[0],
            interpolatedPos[1],
            finalStop[0],
            finalStop[1],
          );

          if (distanceToDestination < 0.05) {
            if (!destinationNotifiedRef.current.has(bus.id)) {
              destinationNotifiedRef.current.add(bus.id);
              pushNotification(
                `Bus ${bus.routeName || bus.name} has reached its destination.`,
                "success",
              );
            }
          }
        });

        return updated;
      });
    }, 500); // Update every 500ms for smooth animation

    return () => clearInterval(animationFrame);
  }, [hasActiveBuses, activeBuses, pushNotification, updateBusFromFeed]);

  // Create route paths and markers for all active buses
  const routeData = useMemo(() => {
    const { startIcon, stopIcon } = getStartStopIcons();

    return activeBuses.map((bus) => {
      if (!bus.routeStops || bus.routeStops.length < 2) {
        return null;
      }

      const sortedStops = [...bus.routeStops].sort((a, b) => a.order - b.order);
      const routePath = sortedStops.map(
        (stop) => [stop.lat, stop.lng] as [number, number],
      );

      return {
        busId: bus.id,
        routeName: bus.routeName || bus.name,
        path: routePath,
        startMarker: {
          pos: routePath[0],
          icon: startIcon,
          label: "Start",
        },
        stopMarker: {
          pos: routePath[routePath.length - 1],
          icon: stopIcon,
          label: "Stop",
        },
      };
    });
  }, [activeBuses]);

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

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl">
      <MapContainer center={center} zoom={14} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Render routes, start/stop markers */}
        {routeData.map((data) => {
          if (!data) return null;

          return (
            <div key={`route-group-${data.busId}`}>
              {/* Solid blue polyline for route */}
              <Polyline
                positions={data.path}
                pathOptions={{ color: "#3B82F6", weight: 4 }}
              />

              {/* Start marker (green) */}
              <Marker
                position={data.startMarker.pos}
                icon={data.startMarker.icon}
              >
                <Popup>
                  <div className="text-sm font-semibold text-slate-900">
                    {data.routeName} - Start
                  </div>
                </Popup>
              </Marker>

              {/* Stop marker (red) */}
              <Marker
                position={data.stopMarker.pos}
                icon={data.stopMarker.icon}
              >
                <Popup>
                  <div className="text-sm font-semibold text-slate-900">
                    {data.routeName} - Destination
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        {/* Animated bus markers */}
        {activeBuses.map((bus) => {
          const animatedPos = animatedPositions[bus.id] || [
            bus.position.lat,
            bus.position.lng,
          ];
          const routeTitle = bus.routeName ?? bus.name;
          const driver = bus.driverName ?? "—";

          return (
            <Marker
              key={bus.id}
              position={animatedPos}
              icon={getBusLeafletIcon(bus.isLive)}
            >
              <Popup>
                <div className="min-w-[200px] space-y-1 text-slate-900">
                  <p className="text-sm font-semibold leading-tight">
                    Route: {routeTitle}
                  </p>
                  <p className="text-sm text-slate-800">Driver: {driver}</p>
                  <p className="text-sm text-slate-800">
                    Available seats: {bus.seatsAvailable}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
