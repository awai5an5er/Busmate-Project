import { motion } from "framer-motion";
import { LocateFixed, Play, Square, Users } from "lucide-react";
import { useBusMateStore } from "../store/useBusMateStore";

export function DriverInterface() {
  const buses = useBusMateStore((state) => state.buses);
  const driverTripActive = useBusMateStore((state) => state.driverTripActive);
  const gpsActive = useBusMateStore((state) => state.gpsActive);
  const startTrip = useBusMateStore((state) => state.startTrip);
  const endTrip = useBusMateStore((state) => state.endTrip);
  const setGpsActive = useBusMateStore((state) => state.setGpsActive);
  const updateSeatAvailability = useBusMateStore((state) => state.updateSeatAvailability);

  const controlledBus = buses[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg md:p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Trip Controls</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={startTrip}
            className="flex min-h-20 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500"
          >
            <Play className="h-5 w-5" />
            Start Trip
          </button>
          <button
            type="button"
            onClick={endTrip}
            className="flex min-h-20 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-500"
          >
            <Square className="h-5 w-5" />
            End Trip
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Occupancy Toggle
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{controlledBus.name}</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700">
              <Users className="h-4 w-4" />
              {controlledBus.seatsAvailable} seats available
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            value={controlledBus.seatsAvailable}
            onChange={(event) =>
              updateSeatAvailability(controlledBus.id, Number(event.target.value))
            }
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200"
          />
        </div>
      </section>

      <aside className="space-y-4">
        <motion.div
          animate={driverTripActive ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 1.2, repeat: driverTripActive ? Infinity : 0 }}
          className={`rounded-3xl border p-4 shadow-lg ${
            driverTripActive
              ? "border-emerald-200 bg-emerald-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-xs font-medium uppercase text-slate-500">Live Status</p>
          <p
            className={`mt-2 text-lg font-bold ${
              driverTripActive ? "text-emerald-700" : "text-slate-700"
            }`}
          >
            {driverTripActive ? "Trip is Active" : "Trip is Idle"}
          </p>
          {driverTripActive && (
            <span className="mt-2 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
              Live bus session
            </span>
          )}
        </motion.div>

        <div
          className={`rounded-3xl border p-4 shadow-lg ${
            gpsActive ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs font-medium uppercase text-slate-500">Status Indicator</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <LocateFixed className={`h-4 w-4 ${gpsActive ? "text-blue-700" : "text-red-700"}`} />
              GPS location sharing
            </span>
            <button
              type="button"
              onClick={() => setGpsActive(!gpsActive)}
              className={`rounded-xl px-3 py-1 text-xs font-semibold text-white ${
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
