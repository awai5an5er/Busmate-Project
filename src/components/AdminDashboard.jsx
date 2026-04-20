import { useMemo, useState } from "react";
import { AlertTriangle, Megaphone, Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartSeed, routeSeed } from "../data/mockData";
import { useBusMateStore } from "../store/useBusMateStore";

export function AdminDashboard() {
  const [rows, setRows] = useState(routeSeed);
  const [newRoute, setNewRoute] = useState("");
  const [broadcast, setBroadcast] = useState("");
  const [formError, setFormError] = useState("");
  const loadingAdminTable = useBusMateStore((state) => state.loadingAdminTable);
  const pushNotification = useBusMateStore((state) => state.pushNotification);

  const stats = useMemo(
    () => [
      { label: "Total Routes", value: rows.length },
      { label: "Active Routes", value: rows.filter((item) => item.active).length },
      { label: "Drivers Online", value: 7 },
    ],
    [rows],
  );

  const handleCreateRoute = () => {
    if (newRoute.trim().length < 3) {
      setFormError("Route name should be at least 3 characters.");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: `R-${400 + prev.length}`,
        name: newRoute.trim(),
        driver: "Pending Assignment",
        active: false,
      },
    ]);
    setNewRoute("");
    setFormError("");
  };

  const handleDelete = (routeId) => {
    setRows((prev) => prev.filter((row) => row.id !== routeId));
  };

  const handleBroadcast = () => {
    if (broadcast.trim().length < 5) {
      setFormError("Broadcast message must be at least 5 characters.");
      return;
    }
    pushNotification(`Admin Broadcast: ${broadcast.trim()}`, "info");
    setBroadcast("");
    setFormError("");
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3">
        {stats.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Management Hub</h2>
            <div className="flex gap-2">
              <input
                value={newRoute}
                onChange={(event) => setNewRoute(event.target.value)}
                placeholder="New route name"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-700"
              />
              <button
                type="button"
                onClick={handleCreateRoute}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {loadingAdminTable ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="h-12 animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100"
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                    <th className="py-2">Route Id</th>
                    <th className="py-2">Route Name</th>
                    <th className="py-2">Driver</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-700">{row.id}</td>
                      <td className="py-2">{row.name}</td>
                      <td className="py-2 text-slate-600">{row.driver}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            row.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.active ? "Active" : "Offline"}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
            <h3 className="mb-3 text-base font-semibold text-slate-800">Analytics View</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSeed}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-5">
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
              <Megaphone className="h-4 w-4 text-emerald-700" />
              Broadcast Tool
            </h3>
            <textarea
              value={broadcast}
              onChange={(event) => setBroadcast(event.target.value)}
              rows={3}
              placeholder="Send system-wide update..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={handleBroadcast}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Send Broadcast
            </button>
            {formError && (
              <div className="mt-3 inline-flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {formError}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
