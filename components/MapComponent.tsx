"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import type { Bus } from "@/types/busmate";
import { getBusLeafletIcon } from "@/lib/busLeafletIcon";

type MapComponentProps = {
  buses: Bus[];
};

const fallbackCenter: [number, number] = [31.5204, 74.3587];

export function MapComponent({ buses }: MapComponentProps) {
  const center = buses[0]
    ? ([buses[0].position.lat, buses[0].position.lng] as [number, number])
    : fallbackCenter;

  const routePath = buses.map((bus) => [bus.position.lat, bus.position.lng] as [number, number]);

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl">
      <MapContainer center={center} zoom={14} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePath.length > 1 && <Polyline positions={routePath} pathOptions={{ color: "#3b82f6", weight: 4 }} />}
        {buses.map((bus) => {
          const routeTitle = bus.routeName ?? bus.name;
          const driver = bus.driverName ?? "—";
          return (
            <Marker
              key={bus.id}
              position={[bus.position.lat, bus.position.lng]}
              icon={getBusLeafletIcon(bus.isLive)}
            >
              <Popup>
                <div className="min-w-[200px] space-y-1 text-slate-900">
                  <p className="text-sm font-semibold leading-tight">Route: {routeTitle}</p>
                  <p className="text-sm text-slate-800">Driver: {driver}</p>
                  <p className="text-sm text-slate-800">Available seats: {bus.seatsAvailable}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
