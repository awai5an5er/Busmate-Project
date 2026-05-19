"use client";

import { useMemo } from "react";
import { LineChart } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { etaAccuracySeed } from "@/data/mockData";

const chartTooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid rgba(245, 158, 11, 0.35)",
  borderRadius: "0.75rem",
  color: "#f8fafc",
};

export function EtaAccuracyChart() {
  const stats = useMemo(() => {
    const n = etaAccuracySeed.length;
    const mae =
      etaAccuracySeed.reduce(
        (sum, row) => sum + Math.abs(row.predicted - row.actual),
        0,
      ) / n;
    const withinTwo = etaAccuracySeed.filter(
      (row) => Math.abs(row.predicted - row.actual) <= 2,
    ).length;
    return {
      mae: mae.toFixed(1),
      accuracyPct: Math.round((withinTwo / n) * 100),
    };
  }, []);

  return (
    <div className="rounded-3xl border border-amber-400/20 bg-white/5 p-4 shadow-lg backdrop-blur md:p-5">
      <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-white">
        <LineChart className="h-4 w-4 shrink-0 text-amber-400" />
        ETA Accuracy
      </h3>
      <p className="mb-1 text-xs text-slate-400">
        Predicted vs actual arrival times on recent completed trips (sample
        dataset for FYP evaluation).
      </p>
      <p className="mb-4 text-xs text-amber-200/80">
        Mean absolute error:{" "}
        <span className="font-semibold text-amber-300">{stats.mae} min</span>
        {" · "}
        Within ±2 min:{" "}
        <span className="font-semibold text-emerald-300">
          {stats.accuracyPct}%
        </span>
      </p>
      <div className="h-52 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={etaAccuracySeed}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            barGap={4}
            barCategoryGap="18%"
          >
            <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="3 3" />
            <XAxis
              dataKey="trip"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "rgba(148, 163, 184, 0.25)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "rgba(148, 163, 184, 0.25)" }}
              tickLine={false}
              label={{
                value: "Minutes",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
                fontSize: 11,
                offset: 12,
              }}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              labelStyle={{ color: "#fbbf24", marginBottom: 4 }}
              formatter={(value, name) => [
                `${value} min`,
                name === "predicted" ? "Predicted ETA" : "Actual arrival",
              ]}
              labelFormatter={(label, payload) => {
                const row = payload?.[0]?.payload as
                  | { route?: string }
                  | undefined;
                return row?.route ? `${label} · ${row.route}` : label;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#cbd5e1", paddingTop: 8 }}
              formatter={(value) =>
                value === "predicted" ? "Predicted ETA" : "Actual arrival"
              }
            />
            <Bar
              dataKey="predicted"
              name="predicted"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="actual"
              name="actual"
              fill="#34d399"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
