import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Clock3, Users } from "lucide-react";
import { useBusMateStore } from "../store/useBusMateStore";
import { LiveMap } from "./LiveMap";

const toastTone = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

export function StudentPortal() {
  const buses = useBusMateStore((state) => state.buses);
  const notifications = useBusMateStore((state) => state.notifications);
  const dismissNotification = useBusMateStore((state) => state.dismissNotification);

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-4 shadow-xl backdrop-blur md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Interactive Live Map</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            Google Maps Integration Slot
          </span>
        </div>

        <LiveMap buses={buses} />
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <Clock3 className="h-4 w-4 text-blue-700" />
            ETA Dashboard
          </h3>
          <div className="space-y-3">
            {buses.map((bus) => (
              <div key={bus.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{bus.name}</p>
                <p className="text-xs text-slate-500">{bus.route}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-blue-700">ETA: {bus.eta} min</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Users className="h-3.5 w-3.5" />
                    {bus.seatsAvailable} seats
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
            <BellRing className="h-4 w-4 text-blue-700" />
            Notification Center
          </h3>
          <AnimatePresence>
            <div className="space-y-2">
              {notifications.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                  No alerts yet. Incoming FCM notifications will appear here.
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
