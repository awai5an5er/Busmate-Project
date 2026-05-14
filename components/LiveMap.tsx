"use client";

import dynamic from "next/dynamic";
import type { Bus } from "@/types/busmate";
import type { TripControl } from "@/components/MapComponent";

const ClientMap = dynamic(
  () =>
    import("@/components/MapComponent").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-2xl bg-slate-100">
        <div className="h-24 w-[90%] animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
      </div>
    ),
  },
);

export type { TripControl };

export function LiveMap({
  buses,
  tripControl = "driver",
  useDeviceGps = false,
}: {
  buses: Bus[];
  tripControl?: TripControl;
  /** Driver portal: use browser geolocation instead of simulated movement. */
  useDeviceGps?: boolean;
}) {
  return (
    <ClientMap
      buses={buses}
      tripControl={tripControl}
      useDeviceGps={useDeviceGps}
    />
  );
}
