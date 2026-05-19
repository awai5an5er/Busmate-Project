"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  History,
  Megaphone,
  Plus,
  Siren,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartSeed } from "@/data/mockData";
import { useBusMateStore } from "@/store/useBusMateStore";
import { ChatBox } from "@/components/ChatBox";

type DriverOption = {
  id: string;
  name: string;
  email: string;
};

const ADMIN_POLL_MS = 5_000;

type RouteTableRow = {
  routeId: string;
  name: string;
  /** Display name: assigned User from Bus, else Route.driver string */
  driver: string;
  /** Route enabled in the system (create-route / isActive). */
  routeEnabled: boolean;
  busId: string | null;
  assignedDriverId: string | null;
  tripStatus: "idle" | "active";
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
  const [updatingTripBusId, setUpdatingTripBusId] = useState<string | null>(
    null,
  );
  const [complaints, setComplaints] = useState<
    Array<{
      id: string;
      message: string;
      studentId: string;
      studentName: string;
      createdAt: number;
    }>
  >([]);
  const [emergencies, setEmergencies] = useState<
    Array<{
      id: string;
      driverName: string;
      busName: string;
      coordinates: { lat: number; lng: number };
      createdAt: number;
    }>
  >([]);
  const notifiedEmergencyIdsRef = useRef<Set<string>>(new Set());
  const [tripLogs, setTripLogs] = useState<
    Array<{
      id: string;
      busName: string;
      driver: string;
      routeName: string;
      startTime: number;
      endTime: number;
      totalDuration: string;
      totalPassengers: number;
    }>
  >([]);

  const loadingAdminTable = useBusMateStore((state) => state.loadingAdminTable);
  const setLoadingAdminTable = useBusMateStore(
    (state) => state.setLoadingAdminTable,
  );
  const pushNotification = useBusMateStore((state) => state.pushNotification);

  const loadTripLogs = useCallback(async () => {
    try {
      const { data } = await axios.get<{
        trips: Array<{
          id: string;
          busName: string;
          driver: string;
          routeName: string;
          startTime: number;
          endTime: number;
          totalDuration: string;
          totalPassengers: number;
        }>;
      }>("/api/admin/trip-logs");
      setTripLogs(data.trips ?? []);
    } catch {
      /* ignore trip log fetch errors */
    }
  }, []);

  const loadManagementHub = useCallback(async () => {
    const syncRes = await axios
      .post<{
        busesCreated?: number;
        routesChecked?: number;
      }>("/api/admin/ensure-route-buses")
      .catch(() => null);
    const created = syncRes?.data?.busesCreated ?? 0;
    if (created > 0) {
      pushNotification(
        `Created ${created} bus record(s) in MongoDB and linked them to routes.`,
        "success",
      );
    }

    const [{ data: routesData }, { data: busesData }, { data: driversData }] =
      await Promise.all([
        axios.get<{ rows: Array<Record<string, unknown>> }>("/api/routes"),
        axios.get<{
          buses: Array<{
            id: string;
            routeId: string | null;
            assignedDriverId: string | null;
            driverName: string | null;
            tripStatus: "idle" | "active";
          }>;
        }>("/api/admin/buses"),
        axios.get<{ drivers: DriverOption[] }>("/api/admin/drivers"),
      ]);

    setDrivers(driversData.drivers ?? []);

    const byRoute = new Map<
      string,
      {
        busId: string;
        assignedDriverId: string | null;
        driverName: string | null;
        tripStatus: "idle" | "active";
      }
    >();
    for (const b of busesData.buses ?? []) {
      if (b.routeId) {
        const key = String(b.routeId);
        if (!byRoute.has(key)) {
          byRoute.set(key, {
            busId: b.id,
            assignedDriverId: b.assignedDriverId,
            driverName: b.driverName,
            tripStatus: b.tripStatus === "active" ? "active" : "idle",
          });
        }
      }
    }

    const mapped: RouteTableRow[] = (routesData.rows ?? []).map((r) => {
      const rid = String(r._id);
      const link = byRoute.get(rid);
      const routeDriverLabel = String(r.driver ?? "Pending Assignment");
      const driverDisplay =
        link?.driverName && link.driverName.length > 0
          ? link.driverName
          : routeDriverLabel;

      const hasDriver = Boolean(link?.assignedDriverId);
      const tripStatus: "idle" | "active" = hasDriver
        ? link?.tripStatus === "active"
          ? "active"
          : "idle"
        : "idle";

      return {
        routeId: rid,
        name: String(r.name ?? ""),
        driver: driverDisplay,
        routeEnabled: Boolean(r.isActive),
        busId: link?.busId ?? null,
        assignedDriverId: link?.assignedDriverId ?? null,
        tripStatus,
      };
    });

    setRows(mapped);
    void loadTripLogs();
  }, [pushNotification, loadTripLogs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadManagementHub();
      } catch {
        if (!cancelled)
          pushNotification("Could not load management data.", "error");
      } finally {
        if (!cancelled) setLoadingAdminTable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadManagementHub, pushNotification, setLoadingAdminTable]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadManagementHub().catch(() => null);
    }, ADMIN_POLL_MS);
    return () => clearInterval(timer);
  }, [loadManagementHub]);

  const stats = useMemo(
    () => [
      { label: "Total Routes", value: rows.length },
      {
        label: "Active Trips",
        value: rows.filter((item) => item.tripStatus === "active").length,
      },
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

  const handleTripChange = async (
    row: RouteTableRow,
    trip: "idle" | "active",
  ) => {
    if (!row.busId) {
      pushNotification(
        "No bus is linked to this route yet (set bus.routeId).",
        "warning",
      );
      return;
    }
    if (!row.assignedDriverId) {
      pushNotification("Assign a driver before changing trip status.", "warning");
      return;
    }
    setUpdatingTripBusId(row.busId);
    try {
      await axios.put("/api/admin/trip-status", {
        busId: row.busId,
        status: trip,
      });
      await loadManagementHub();
      pushNotification("Trip status updated.", "success");
    } catch {
      pushNotification("Could not update trip status.", "error");
    } finally {
      setUpdatingTripBusId(null);
    }
  };

  const handleAssignDriver = async (row: RouteTableRow, driverId: string) => {
    if (!row.busId) {
      pushNotification(
        "No bus is linked to this route yet (set bus.routeId).",
        "warning",
      );
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

  const loadComplaints = useCallback(async () => {
    try {
      const { data } = await axios.get<{
        complaints: Array<{
          id: string;
          message: string;
          studentId: string;
          studentName: string;
          createdAt: number;
        }>;
      }>("/api/admin/complaints");
      setComplaints(data.complaints ?? []);
    } catch {
      /* ignore complaints fetch errors */
    }
  }, []);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  const loadEmergencies = useCallback(async () => {
    try {
      const { data } = await axios.get<{
        emergencies: Array<{
          id: string;
          driverName: string;
          busName: string;
          coordinates: { lat: number; lng: number };
          createdAt: number;
        }>;
      }>("/api/admin/emergencies");
      const list = data.emergencies ?? [];
      setEmergencies(list);

      for (const alert of list) {
        if (notifiedEmergencyIdsRef.current.has(alert.id)) continue;
        notifiedEmergencyIdsRef.current.add(alert.id);
        const time = new Date(alert.createdAt).toLocaleString();
        const coords = `${alert.coordinates.lat.toFixed(5)}, ${alert.coordinates.lng.toFixed(5)}`;
        pushNotification(
          `SOS EMERGENCY — ${alert.driverName} (${alert.busName}) at ${coords} — ${time}`,
          "error",
        );
      }
    } catch {
      /* ignore emergency fetch errors */
    }
  }, [pushNotification]);

  useEffect(() => {
    void loadEmergencies();
  }, [loadEmergencies]);

  const handleClearEmergencies = async () => {
    try {
      await axios.delete("/api/admin/emergencies");
      setEmergencies([]);
      notifiedEmergencyIdsRef.current.clear();
      pushNotification("All emergency alerts cleared.", "success");
    } catch {
      pushNotification("Failed to clear emergency alerts.", "error");
    }
  };

  return (
    <div className="space-y-4 px-2 sm:px-4">
      {emergencies.length > 0 && (
        <section className="rounded-3xl border-2 border-red-500/60 bg-red-950/40 p-4 shadow-lg shadow-red-900/30 backdrop-blur sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-red-300">
              <Siren className="h-5 w-5 animate-pulse text-red-400" />
              Priority SOS Alerts ({emergencies.length})
            </h2>
            <button
              type="button"
              onClick={() => void loadEmergencies()}
              className="inline-flex items-center rounded-lg border border-red-400/40 px-2.5 py-1 text-xs font-medium text-red-200 hover:bg-red-900/40 transition"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleClearEmergencies()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-200 transition"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {emergencies.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-red-400/40 bg-red-900/30 p-3"
              >
                <p className="text-sm font-bold text-red-100">
                  SOS — {alert.driverName}
                </p>
                <p className="mt-1 text-sm text-red-200/90">
                  Bus: {alert.busName}
                </p>
                <p className="mt-1 text-xs text-red-200/80">
                  GPS: {alert.coordinates.lat.toFixed(5)},{" "}
                  {alert.coordinates.lng.toFixed(5)}
                </p>
                <p className="mt-2 text-xs text-red-300/70">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {stats.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-amber-400/20 bg-white/5 p-4 shadow-lg backdrop-blur"
          >
            <p className="text-xs uppercase tracking-wide text-amber-200/70">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 grid-cols-1 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-3 shadow-lg backdrop-blur sm:p-4 md:p-5">
          <p className="mb-3 text-xs text-amber-200/70">
            Each route needs a{" "}
            <strong className="font-medium text-amber-200">Bus</strong> document
            in MongoDB (linked by{" "}
            <code className="rounded bg-amber-500/20 px-1 text-amber-200">
              routeId
            </code>
            ). Missing buses are created automatically when you open this page
            or add a route.
          </p>
          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-white">Management Hub</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input
                value={newRoute}
                onChange={(event) => setNewRoute(event.target.value)}
                placeholder="Route name"
                className="flex-1 rounded-xl border border-amber-400/30 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-amber-500 sm:min-w-[120px]"
              />
              <input
                value={newDriver}
                onChange={(event) => setNewDriver(event.target.value)}
                placeholder="Driver"
                className="flex-1 rounded-xl border border-amber-400/30 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-amber-500 sm:min-w-[100px]"
              />
              <select
                value={newStatus}
                onChange={(event) =>
                  setNewStatus(event.target.value as "active" | "offline")
                }
                className="rounded-xl border border-slate-700/70 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              >
                <option value="active">Active</option>
                <option value="offline">Offline</option>
              </select>
              <button
                type="button"
                onClick={() => void handleCreateRoute()}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white whitespace-nowrap"
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
                  className="h-12 animate-pulse rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20"
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[560px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-amber-400/20 text-left text-xs uppercase text-amber-200/70">
                    <th className="hidden sm:table-cell whitespace-nowrap py-2 pr-1">
                      Route Id
                    </th>
                    <th className="whitespace-nowrap py-2 pr-1 sm:pr-2">
                      Route Name
                    </th>
                    <th className="hidden md:table-cell whitespace-nowrap py-2 pr-1 sm:pr-2">
                      Driver
                    </th>
                    <th className="whitespace-nowrap py-2 pr-1 sm:pr-2">
                      Assign Driver
                    </th>
                    <th className="hidden sm:table-cell whitespace-nowrap py-2 pr-1 sm:pr-2">
                      Status
                    </th>
                    <th className="whitespace-nowrap py-2 pr-1 sm:pr-2">
                      Trip
                    </th>
                    <th className="whitespace-nowrap py-2 pr-0">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.routeId}
                      className="border-b border-amber-400/20"
                    >
                      <td
                        className="hidden sm:table-cell max-w-[6rem] truncate py-2 pr-1 font-medium text-amber-200 text-xs"
                        title={row.routeId}
                      >
                        {row.routeId.substring(0, 8)}
                      </td>
                      <td className="py-2 pr-1 sm:pr-2 font-medium text-white text-xs sm:text-sm truncate">
                        {row.name}
                      </td>
                      <td className="hidden md:table-cell py-2 pr-1 sm:pr-2 text-amber-200/70 text-xs sm:text-sm truncate">
                        {row.driver}
                      </td>
                      <td className="py-2 pr-1 sm:pr-2">
                        <select
                          value={row.assignedDriverId ?? ""}
                          disabled={!row.busId || assigningBusId === row.busId}
                          onChange={(e) =>
                            void handleAssignDriver(row, e.target.value)
                          }
                          className="w-full max-w-[8rem] sm:max-w-[10rem] rounded-lg border border-slate-700/70 bg-slate-900 px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs text-white outline-none focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-800"
                          aria-label={`Assign driver for ${row.name}`}
                        >
                          <option value="">
                            {row.busId ? "no driver" : "No bus"}
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
                            row.assignedDriverId
                              ? "bg-emerald-500/25 text-emerald-300"
                              : "bg-slate-700/50 text-slate-400"
                          }`}
                          title={
                            row.assignedDriverId
                              ? "Driver assigned to this route"
                              : "No driver assigned"
                          }
                        >
                          {row.assignedDriverId ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 pr-1 sm:pr-2">
                        <select
                          value={
                            row.assignedDriverId ? row.tripStatus : "idle"
                          }
                          disabled={
                            !row.busId ||
                            !row.assignedDriverId ||
                            updatingTripBusId === row.busId
                          }
                          onChange={(e) =>
                            void handleTripChange(
                              row,
                              e.target.value as "idle" | "active",
                            )
                          }
                          className="w-full max-w-[6rem] sm:max-w-[7rem] rounded-lg border border-slate-700/70 bg-slate-900 px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs text-white outline-none focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-800"
                          aria-label={`Trip status for ${row.name}`}
                        >
                          <option value="idle">idle</option>
                          <option value="active">active</option>
                        </select>
                      </td>
                      <td className="py-2 pr-1">
                        <button
                          type="button"
                          onClick={() =>
                            setRows((prev) =>
                              prev.filter(
                                (item) => item.routeId !== row.routeId,
                              ),
                            )
                          }
                          className="rounded-lg border border-red-400/30 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold text-red-400 whitespace-nowrap"
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
          <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-3 shadow-lg backdrop-blur sm:p-4 md:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm sm:text-base font-semibold text-white">
              <History className="h-4 w-4 text-amber-400" />
              Trip History Log
            </h3>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[520px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-amber-400/20 text-left text-xs uppercase text-amber-200/70">
                    <th className="py-2 pr-2">Bus</th>
                    <th className="py-2 pr-2">Driver</th>
                    <th className="py-2 pr-2">Route</th>
                    <th className="py-2 pr-2">Start</th>
                    <th className="py-2 pr-2">End</th>
                    <th className="py-2 pr-2">Duration</th>
                    <th className="py-2 pr-0">Passengers</th>
                  </tr>
                </thead>
                <tbody>
                  {tripLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-4 text-center text-xs text-amber-200/70"
                      >
                        No completed trips yet.
                      </td>
                    </tr>
                  )}
                  {tripLogs.map((trip) => (
                    <tr
                      key={trip.id}
                      className="border-b border-amber-400/10 text-amber-100"
                    >
                      <td className="py-2 pr-2 font-medium text-white">
                        {trip.busName}
                      </td>
                      <td className="py-2 pr-2">{trip.driver}</td>
                      <td className="py-2 pr-2">{trip.routeName}</td>
                      <td className="whitespace-nowrap py-2 pr-2 text-amber-200/80">
                        {new Date(trip.startTime).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 text-amber-200/80">
                        {new Date(trip.endTime).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2">{trip.totalDuration}</td>
                      <td className="py-2 pr-0 font-semibold text-amber-300">
                        {trip.totalPassengers}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-3 shadow-lg backdrop-blur sm:p-4 md:p-5">
            <h3 className="mb-3 text-sm sm:text-base font-semibold text-white">
              Analytics View
            </h3>
            <div className="h-48 sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSeed}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-3 shadow-lg backdrop-blur sm:p-4 md:p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm sm:text-base font-semibold text-white">
              <Megaphone className="h-4 w-4 text-amber-400" />
              Broadcast Tool
            </h3>
            <textarea
              value={broadcast}
              onChange={(event) => setBroadcast(event.target.value)}
              rows={3}
              placeholder="Send system-wide update..."
              className="w-full rounded-xl border border-amber-400/30 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => void handleSendBroadcast()}
              className="mt-3 w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
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
          <ChatBox title="Admin Driver Chat" />
          <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-3 shadow-lg backdrop-blur sm:p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-white">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Student Complaints ({complaints.length})
              </h3>
              {complaints.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      await axios.delete("/api/admin/complaints");
                      await loadComplaints();
                      pushNotification("All complaints cleared.", "success");
                    } catch (err) {
                      console.error("Failed to clear complaints:", err);
                      pushNotification("Failed to clear complaints.", "error");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Clear All
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {complaints.length === 0 && (
                <p className="rounded-xl border border-dashed border-amber-400/30 p-3 text-xs text-amber-200/70">
                  No complaints submitted yet.
                </p>
              )}
              {complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="rounded-xl border border-amber-400/20 bg-white/5 p-3"
                >
                  <p className="text-sm text-white mb-2">{complaint.message}</p>
                  <div className="flex items-center justify-between text-xs text-amber-200/70">
                    <span>By: {complaint.studentName}</span>
                    <span>
                      {new Date(complaint.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
