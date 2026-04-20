"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BusFront, LocateFixed, Play, Square, Users } from "lucide-react";
import { useBusMateStore } from "@/store/useBusMateStore";
import type { Bus } from "@/types/busmate";

type AssignmentApi = {
  bus: Bus | null;
  routeName: string | null;
  routeId: string | null;
  userId?: string;
};

export function DriverInterface() {
  const buses = useBusMateStore((state) => state.buses);
  const gpsActive = useBusMateStore((state) => state.gpsActive);
  const startTrip = useBusMateStore((state) => state.startTrip);
  const endTrip = useBusMateStore((state) => state.endTrip);
  const setGpsActive = useBusMateStore((state) => state.setGpsActive);
  const updateSeatAvailability = useBusMateStore((state) => state.updateSeatAvailability);
  const upsertBus = useBusMateStore((state) => state.upsertBus);
  const updateBusFromFeed = useBusMateStore((state) => state.updateBusFromFeed);
  const pushNotification = useBusMateStore((state) => state.pushNotification);

  const saveSeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loadState, setLoadState] = useState<"loading" | "empty" | "ready">("loading");
  const [routeTitle, setRouteTitle] = useState<string | null>(null);
  const [assignedBus, setAssignedBus] = useState<Bus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get<AssignmentApi>("/api/driver/assignment");
        if (cancelled) return;
        if (!data.bus) {
          setAssignedBus(null);
          setRouteTitle(null);
          setLoadState("empty");
          return;
        }
        upsertBus(data.bus);
        setAssignedBus(data.bus);
        setRouteTitle(data.routeName ?? data.bus.name);
        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setLoadState("empty");
          pushNotification("Could not load your route assignment.", "error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushNotification, upsertBus]);

  const controlledBus =
    (assignedBus ? buses.find((b) => b.id === assignedBus.id) : null) ?? assignedBus;

  const handleOccupancyChange = (nextSeats: number) => {
    if (!controlledBus) return;
    updateSeatAvailability(controlledBus.id, nextSeats);

    if (saveSeatTimer.current) clearTimeout(saveSeatTimer.current);
    saveSeatTimer.current = setTimeout(async () => {
      try {
        await axios.patch(`/api/buses/${controlledBus.id}`, { seatCount: nextSeats });
      } catch {
        pushNotification("Could not sync seat count to the server.", "error");
      }
    }, 400);
  };

  const seatMax = Math.max(1, controlledBus?.totalSeats ?? 40);
  const tripOn = Boolean(controlledBus?.isLive);

  const handleStartTrip = async () => {
    if (!controlledBus) return;
    try {
      await axios.patch(`/api/buses/${controlledBus.id}`, { isLive: true });
      updateBusFromFeed(controlledBus.id, { isLive: true });
      startTrip();
    } catch {
      pushNotification("Could not start trip on the server.", "error");
    }
  };

  const handleEndTrip = async () => {
    if (!controlledBus) return;
    try {
      await axios.patch(`/api/buses/${controlledBus.id}`, { isLive: false });
      updateBusFromFeed(controlledBus.id, { isLive: false });
      endTrip();
    } catch {
      pushNotification("Could not end trip on the server.", "error");
    }
  };

  if (loadState === "loading") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg md:p-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          </div>
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (loadState === "empty" || !controlledBus) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-center shadow-lg md:p-8">
        <BusFront className="mx-auto mb-3 h-10 w-10 text-amber-700" />
        <h2 className="text-lg font-semibold text-slate-800">No vehicle assigned</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your account is not linked to a bus in MongoDB yet. Ask an admin to set{" "}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">driverId</code> on your bus
          document, or assign <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">routeId</code>{" "}
          on the bus record.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg md:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned route</p>
            <h2 className="text-xl font-semibold text-slate-900">{routeTitle ?? controlledBus.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{controlledBus.route}</p>
          </div>
          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:mt-0">
            {controlledBus.name}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleStartTrip()}
            className="flex min-h-[4.5rem] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500"
          >
            <Play className="h-5 w-5 shrink-0" />
            Start Trip
          </button>
          <button
            type="button"
            onClick={() => void handleEndTrip()}
            className="flex min-h-[4.5rem] items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-500"
          >
            <Square className="h-5 w-5 shrink-0" />
            End Trip
          </button>
        </div>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Occupancy</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-slate-700">Available seats</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700">
              <Users className="h-4 w-4 shrink-0" />
              {String(controlledBus.seatsAvailable ?? 0)} / {String(seatMax)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={seatMax}
            value={Math.min(controlledBus.seatsAvailable, seatMax)}
            onChange={(event) => handleOccupancyChange(Number(event.target.value))}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200"
            aria-label="Adjust available seats"
          />
        </div>
      </section>

      <aside className="space-y-4">
        <motion.div
          animate={tripOn ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 1.2, repeat: tripOn ? Infinity : 0 }}
          className={`rounded-3xl border p-4 shadow-lg ${
            tripOn ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-xs font-medium uppercase text-slate-500">Live Status</p>
          <p className={`mt-2 text-lg font-bold ${tripOn ? "text-emerald-700" : "text-slate-700"}`}>
            {tripOn ? "Trip is Active" : "Trip is Idle"}
          </p>
        </motion.div>

        <div
          className={`rounded-3xl border p-4 shadow-lg ${
            gpsActive ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs font-medium uppercase text-slate-500">Status Indicator</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <LocateFixed className={`h-4 w-4 shrink-0 ${gpsActive ? "text-blue-700" : "text-red-700"}`} />
              GPS location sharing
            </span>
            <button
              type="button"
              onClick={() => setGpsActive(!gpsActive)}
              className={`w-full rounded-xl px-3 py-2 text-xs font-semibold text-white sm:w-auto ${
                gpsActive ? "bg-blue-700" : "bg-red-600"
              }`}
            >
              {gpsActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
