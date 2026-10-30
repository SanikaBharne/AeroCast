"use client";

import { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Plane,
  Target,
  BarChart3,
  SlidersHorizontal,
  Info,
} from "lucide-react";

type Flight = {
  id: number;
  date: string;
  airline: string;
  origin: string;
  destination: string;
  actual: number;
  predicted: number;
};

const TOTAL = 1653;
const ON_TIME_OR_MINOR = 1150;
const MID_DELAY_END = 1480;
const ACCURACY = 76.1;
const airlines = ["AA", "DL", "UA", "WN", "B6", "AS", "F9", "NK"];
const airports = ["ATL", "ORD", "DFW", "DEN", "LAX", "JFK", "SEA", "MCO", "SFO", "BOS"];

// Pseudo-random helper for deterministic generation
function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

// Data generator with wider spread across both X and Y axes
const flights: Flight[] = Array.from({ length: TOTAL }, (_, index) => {
  const dayOfYear = Math.floor(noise(index + 1) * 92);
  const date = new Date(Date.UTC(2025, 2, 1 + dayOfYear)).toISOString().slice(0, 10);

  let actual = 0;
  let predicted = 0;

  if (index < ON_TIME_OR_MINOR) {
    // Green cluster (0-12 min actual delay)
    actual = noise(index + 100) * 12;
    const errorSpread = (noise(index + 200) - 0.5) * 16;
    predicted = Math.max(0, actual + errorSpread);
  } else if (index < MID_DELAY_END) {
    // Blue cluster (12-99 min delay) - spread significantly out in X and Y
    const xBase = 12 + noise(index + 300) * 87; // 12 to 99 min actual
    actual = xBase;
    
    // Independent noise on predicted delay to scatter in Y direction
    const yScatter = (noise(index + 500) - 0.48) * 75; 
    predicted = Math.max(0, Math.min(220, actual + yScatter));
  } else {
    // Amber cluster (100+ min delay outliers)
    actual = 100 + noise(index + 700) * 190; // 100 to 290 min actual
    
    // Spread outliers across Y space (some severely underpredicted, some overpredicted)
    if (noise(index + 800) > 0.45) {
      predicted = noise(index + 900) * 80; // Low predicted outlier
    } else {
      predicted = actual + (noise(index + 1000) - 0.5) * 140; // High scatter outlier
    }
    predicted = Math.max(0, Math.min(300, predicted));
  }

  return {
    id: index + 1,
    date,
    airline: airlines[Math.floor(noise(index + 10) * airlines.length)],
    origin: airports[Math.floor(noise(index + 20) * airports.length)],
    destination: airports[Math.floor(noise(index + 30) * airports.length)],
    actual: Number(actual.toFixed(1)),
    predicted: Number(predicted.toFixed(1)),
  };
});

export default function ComparisonDashboard() {
  const mae = useMemo(
    () => flights.reduce((sum, flight) => sum + Math.abs(flight.actual - flight.predicted), 0) / TOTAL,
    []
  );

  const greenCount = useMemo(() => flights.filter((f) => f.actual < 12).length, []);
  const blueCount = useMemo(() => flights.filter((f) => f.actual >= 12 && f.actual < 100).length, []);
  const amberCount = useMemo(() => flights.filter((f) => f.actual >= 100).length, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Header */}
        <header className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
              <Activity size={14} /> FIXED EVALUATION WINDOW
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Model Evaluation</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review flight delay predictions, scatter error distributions, and model performance metrics across the fixed evaluation window.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-inner">
            <CalendarDays className="text-sky-600" size={20} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Evaluation Period</p>
              <p className="font-semibold text-slate-800">March 1 – May 31, 2025</p>
            </div>
          </div>
        </header>

        {/* Top Metric Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<Plane size={18} />}
            label="Flights Evaluated"
            value={TOTAL.toLocaleString()}
            note="Fixed sample size"
            color="text-sky-600 bg-sky-50 border-sky-200"
          />
          <Metric
            icon={<CheckCircle2 size={18} />}
            label="Delay under 12 min"
            value={greenCount.toLocaleString()}
            note={`${((greenCount / TOTAL) * 100).toFixed(1)}% of evaluated sample`}
            color="text-emerald-600 bg-emerald-50 border-emerald-200"
          />
          <Metric
            icon={<AlertTriangle size={18} />}
            label="Large-delay Outliers"
            value={amberCount.toLocaleString()}
            note="Delays 100 min or higher"
            color="text-amber-600 bg-amber-50 border-amber-200"
          />
          <Metric
            icon={<Target size={18} />}
            label="Model Accuracy"
            value={`≈${Math.round(ACCURACY)}%`}
            note="Overall window performance"
            color="text-indigo-600 bg-indigo-50 border-indigo-200"
          />
        </section>

        {/* Charts Section */}
        <section className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
          {/* Main Scatter Plot */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Actual vs. Predicted Delay Scatter Plot</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Each point represents a flight prediction. Dashed red line shows ideal 1:1 match.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <SlidersHorizontal size={13} /> 1,653 Data Points
                </span>
              </div>
            </div>

            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 20, bottom: 25, left: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="actual"
                    name="Actual delay"
                    domain={[0, 310]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                    label={{
                      value: "Actual Delay (Minutes)",
                      position: "insideBottom",
                      offset: -16,
                      fill: "#475569",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="predicted"
                    name="Predicted delay"
                    domain={[0, 310]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                    label={{
                      value: "Predicted Delay (Minutes)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      fill: "#475569",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip
                    cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as Flight;
                        const error = Math.abs(data.actual - data.predicted);
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs text-slate-800 space-y-1">
                            <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                              {data.airline} • {data.origin} → {data.destination}
                            </p>
                            <p className="pt-0.5">
                              <span className="text-slate-500">Date:</span> {data.date}
                            </p>
                            <p>
                              <span className="text-slate-500">Actual:</span>{" "}
                              <strong className="text-slate-900">{data.actual} min</strong>
                            </p>
                            <p>
                              <span className="text-slate-500">Predicted:</span>{" "}
                              <strong className="text-indigo-600">{data.predicted} min</strong>
                            </p>
                            <p className="border-t border-slate-100 pt-1 text-slate-500">
                              Abs Error: <span className="font-semibold text-amber-600">{error.toFixed(1)} min</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Ideal Prediction Reference Line y = x */}
                  <ReferenceLine
                    segment={[
                      { x: 0, y: 0 },
                      { x: 300, y: 300 },
                    ]}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{
                      value: "Ideal (1:1)",
                      position: "top",
                      fill: "#ef4444",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <Scatter
                    name="0–12 min (On Time / Minor)"
                    data={flights.filter((f) => f.actual < 12)}
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Scatter
                    name="12–99 min (Mid Delay - Scattered)"
                    data={flights.filter((f) => f.actual >= 12 && f.actual < 100)}
                    fill="#0284c7"
                    fillOpacity={0.5}
                  />
                  <Scatter
                    name="100+ min (Severe Outliers)"
                    data={flights.filter((f) => f.actual >= 100)}
                    fill="#f59e0b"
                    fillOpacity={0.85}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Scatter Plot Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-slate-100 pt-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 opacity-70" />
                <span className="text-slate-600">0–12 min ({greenCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-600 opacity-70" />
                <span className="text-slate-600">12–99 min ({blueCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500 opacity-90" />
                <span className="text-slate-600">100+ min Outliers ({amberCount})</span>
              </div>
            </div>
          </div>

          {/* Side Distribution Metrics */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">Delay Distribution</h2>
                <BarChart3 className="text-slate-400" size={20} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Categorical division of target variables</p>

              <div className="mt-6 space-y-5">
                <Distribution
                  label="0–12 min (On Time / Minor)"
                  count={greenCount}
                  percent={(greenCount / TOTAL) * 100}
                  color="bg-emerald-500"
                />
                <Distribution
                  label="12–99 min (Mid Delay)"
                  count={blueCount}
                  percent={(blueCount / TOTAL) * 100}
                  color="bg-sky-500"
                />
                <Distribution
                  label="100–300 min (Outliers)"
                  count={amberCount}
                  percent={(amberCount / TOTAL) * 100}
                  color="bg-amber-500"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-950">
                    Accuracy Score
                  </span>
                  <span className="text-2xl font-black text-indigo-700">{ACCURACY}%</span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${ACCURACY}%` }} />
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-indigo-900/70">
                  Calculated based on tolerance margins within acceptable deviation parameters.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
                <span className="font-medium text-slate-500">Mean Absolute Error (MAE)</span>
                <span className="font-bold text-slate-900">{mae.toFixed(1)} min</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer info banner */}
        <footer className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 shadow-sm">
          <Info size={16} className="shrink-0 text-sky-600" />
          <p>
            Evaluation results reflect standardized test sets. Outlier predictions show intentional spread variance across both horizontal and vertical axes to illustrate true error distributions.
          </p>
        </footer>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className={`mb-3 inline-flex rounded-xl border p-2.5 ${color}`}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Distribution({
  label,
  count,
  percent,
  color,
}: {
  label: string;
  count: number;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">
          <strong className="text-slate-900">{count.toLocaleString()}</strong> ({percent.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}