"use client";

import dynamic from "next/dynamic";
import type { Bus } from "@/types/busmate";

const ClientMap = dynamic(() => import("@/components/MapComponent").then((mod) => mod.MapComponent), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-2xl bg-slate-100">
      <div className="h-24 w-[90%] animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
    </div>
  ),
});

export function LiveMap({ buses }: { buses: Bus[] }) {
  return <ClientMap buses={buses} />;
}
