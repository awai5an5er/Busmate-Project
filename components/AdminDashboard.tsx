"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Megaphone, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartSeed } from "@/data/mockData";
import { useBusMateStore } from "@/store/useBusMateStore";

type DriverOption = {
  id: string;
  name: string;
  email: string;
};

type RouteTableRow = {
  routeId: string;
  name: string;
  /** Display name: assigned User from Bus, else Route.driver string */
  driver: string;
  active: boolean;
  busId: string | null;
  assignedDriverId: string | null;
};

export function AdminDashboard() {
  const [rows, setRows] = useState<RouteTableRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [newRoute, setNewRoute] = useState("");
  const [newDriver, setNewDriver] = useState("");
  const [newStatus, setNewStatus] = useState<"active" | "offline">("active");
  const [broadcast, setBroadcast] = useState("");
  const [routeFormError, setRouteFormError] = useState("");
  const [broadcastError, setBroadcastError] = useState("");
  const [assigningBusId, setAssigningBusId] = useState<string | null>(null);

  const loadingAdminTable = useBusMateStore((state) => state.loadingAdminTable);
  const setLoadingAdminTable = useBusMateStore((state) => state.setLoadingAdminTable);
  const pushNotification = useBusMateStore((state) => state.pushNotification);

  const loadManagementHub = useCallback(async () => {
    const syncRes = await axios
      .post<{ busesCreated?: number; routesChecked?: number }>("/api/admin/ensure-route-buses")
      .catch(() => null);
    const created = syncRes?.data?.busesCreated ?? 0;
    if (created > 0) {
      pushNotification(
        `Created ${created} bus record(s) in MongoDB and linked them to routes.`,
        "success",
      );
    }

    const [{ data: routesData }, { data: busesData }, { data: driversData }] = await Promise.all([
      axios.get<{ rows: Array<Record<string, unknown>> }>("/api/routes"),
      axios.get<{
        buses: Array<{
          id: string;
          routeId: string | null;
          assignedDriverId: string | null;
          driverName: string | null;
        }>;
      }>("/api/admin/buses"),
      axios.get<{ drivers: DriverOption[] }>("/api/admin/drivers"),
    ]);

    setDrivers(driversData.drivers ?? []);

    const byRoute = new Map<
      string,
      { busId: string; assignedDriverId: string | null; driverName: string | null }
    >();
    for (const b of busesData.buses ?? []) {
      if (b.routeId) {
        const key = String(b.routeId);
        if (!byRoute.has(key)) {
          byRoute.set(key, {
            busId: b.id,
            assignedDriverId: b.assignedDriverId,
            driverName: b.driverName,
          });
        }
      }
    }

    const mapped: RouteTableRow[] = (routesData.rows ?? []).map((r) => {
      const rid = String(r._id);
      const link = byRoute.get(rid);
      const routeDriverLabel = String(r.driver ?? "Pending Assignment");
      const driverDisplay =
        link?.driverName && link.driverName.length > 0 ? link.driverName : routeDriverLabel;

      return {
        routeId: rid,
        name: String(r.name ?? ""),
        driver: driverDisplay,
        active: Boolean(r.isActive),
        busId: link?.busId ?? null,
        assignedDriverId: link?.assignedDriverId ?? null,
      };
    });

    setRows(mapped);
  }, [pushNotification]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadManagementHub();
      } catch {
        if (!cancelled) pushNotification("Could not load management data.", "error");
      } finally {
        if (!cancelled) setLoadingAdminTable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadManagementHub, pushNotification, setLoadingAdminTable]);

  const stats = useMemo(
    () => [
      { label: "Total Routes", value: rows.length },
      { label: "Active Routes", value: rows.filter((item) => item.active).length },
      {
        label: "Drivers Assigned",
        value: rows.filter((item) => item.assignedDriverId).length,
      },
    ],
    [rows],
  );

  const handleCreateRoute = async () => {
    if (newRoute.trim().length < 3) {
      setRouteFormError("Route name should be at least 3 characters.");
      return;
    }
    setRouteFormError("");
    try {
      await axios.post("/api/routes", {
        name: newRoute.trim(),
        driver: newDriver.trim() || "Pending Assignment",
        status: newStatus,
      });
      await loadManagementHub();
      setNewRoute("");
      setNewDriver("");
      setNewStatus("active");
      pushNotification("Route saved to the database.", "success");
    } catch {
      pushNotification("Could not create route.", "error");
    }
  };

  const handleAssignDriver = async (row: RouteTableRow, driverId: string) => {
    if (!row.busId) {
      pushNotification("No bus is linked to this route yet (set bus.routeId).", "warning");
      return;
    }
    setAssigningBusId(row.busId);
    try {
      await axios.put("/api/admin/assign-bus", {
        busId: row.busId,
        driverId: driverId === "" ? null : driverId,
      });
      await loadManagementHub();
      pushNotification("Driver assignment updated.", "success");
    } catch {
      pushNotification("Could not update driver assignment.", "error");
    } finally {
      setAssigningBusId(null);
    }
  };

  const handleSendBroadcast = async () => {
    if (broadcast.trim().length < 5) {
      setBroadcastError("Broadcast message must be at least 5 characters.");
      return;
    }
    setBroadcastError("");
    try {
      await axios.post("/api/admin/broadcast", {
        message: broadcast.trim(),
        type: "info",
      });
      pushNotification(`Broadcast sent: ${broadcast.trim()}`, "success");
      setBroadcast("");
    } catch {
      pushNotification("Could not send broadcast.", "error");
    }
  };

  return (
    <div className="space-y-4 px-2 sm:px-4">
      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {stats.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 grid-cols-1 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4 md:p-5">
          <p className="mb-3 text-xs text-slate-500">
            Each route needs a <strong className="font-medium text-slate-600">Bus</strong> document in MongoDB
            (linked by <code className="rounded bg-slate-100 px-1">routeId</code>). Missing buses are created
            automatically when you open this page or add a route.
          </p>
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Management Hub</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input
                value={newRoute}
                onChange={(event) => setNewRoute(event.target.value)}
                placeholder="Route name"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-700 sm:min-w-[120px]"
              />
              <input
                value={newDriver}
                onChange={(event) => setNewDriver(event.target.value)}
                placeholder="Driver"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-700 sm:min-w-[100px]"
              />
              <select
                value={newStatus}
                onChange={(event) => setNewStatus(event.target.value as "active" | "offline")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-700"
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
              </select>
              <button
                type="button"
                onClick={() => void handleCreateRoute()}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Route</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
          {routeFormError && (
            <div className="mb-3 inline-flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{routeFormError}</span>
            </div>
          )}
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
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[500px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                    <th className="hidden sm:table-cell whitespace-nowrap py-2 pr-1">Route Id</th>
                    <th className="whitespace-nowrap py-2 pr-1 sm:pr-2">Route Name</th>
                    <th className="hidden md:table-cell whitespace-nowrap py-2 pr-1 sm:pr-2">Driver</th>
                    <th className="whitespace-nowrap py-2 pr-1 sm:pr-2">Assign Driver</th>
                    <th className="hidden sm:table-cell whitespace-nowrap py-2 pr-1 sm:pr-2">Status</th>
                    <th className="whitespace-nowrap py-2 pr-0">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.routeId} className="border-b border-slate-100">
                      <td className="hidden sm:table-cell max-w-[6rem] truncate py-2 pr-1 font-medium text-slate-700 text-xs" title={row.routeId}>
                        {row.routeId.substring(0, 8)}
                      </td>
                      <td className="py-2 pr-1 sm:pr-2 font-medium text-slate-900 text-xs sm:text-sm truncate">{row.name}</td>
                      <td className="hidden md:table-cell py-2 pr-1 sm:pr-2 text-slate-900 text-xs sm:text-sm truncate">{row.driver}</td>
                      <td className="py-2 pr-1 sm:pr-2">
                        <select
                          value={row.assignedDriverId ?? ""}
                          disabled={!row.busId || assigningBusId === row.busId}
                          onChange={(e) => void handleAssignDriver(row, e.target.value)}
                          className="w-full max-w-[8rem] sm:max-w-[10rem] rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs text-slate-900 outline-none focus:border-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                          aria-label={`Assign driver for ${row.name}`}
                        >
                          <option value="">
                            {row.busId ? "—" : "No bus"}
                          </option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="hidden sm:table-cell py-2 pr-1 sm:pr-2">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.active ? "Active" : "Off"}
                        </span>
                      </td>
                      <td className="py-2 pr-1">
                        <button
                          type="button"
                          onClick={() => setRows((prev) => prev.filter((item) => item.routeId !== row.routeId))}
                          className="rounded-lg border border-red-200 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold text-red-600 whitespace-nowrap"
                        >
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">×</span>
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
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4 md:p-5">
            <h3 className="mb-3 text-sm sm:text-base font-semibold text-slate-800">Analytics View</h3>
            <div className="h-48 sm:h-60">
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
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4 md:p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-800">
              <Megaphone className="h-4 w-4 text-emerald-700" />
              Broadcast Tool
            </h3>
            <textarea
              value={broadcast}
              onChange={(event) => setBroadcast(event.target.value)}
              rows={3}
              placeholder="Send system-wide update..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={() => void handleSendBroadcast()}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Send Broadcast
            </button>
            {broadcastError && (
              <div className="mt-3 inline-flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {broadcastError}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
