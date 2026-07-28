"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TelemetryData } from "../lib/useFleetWebSocket";
import { Navigation, Info, ChevronDown } from "lucide-react";

interface DashboardHUDProps {
  telemetry: TelemetryData;
  fps: number;
  connected: boolean;
  movingCount: number;
  idleCount: number;
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="px-3.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-semibold tabular-nums ${accent || "text-slate-900"}`}>{value}</span>
        {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

// Compact row used inside the mobile stats sidebar (stacked instead of side-by-side).
function StatRow({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className={`text-sm font-semibold tabular-nums ${accent || "text-slate-900"}`}>{value}</span>
        {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
      </span>
    </div>
  );
}

export default function DashboardHUD({
  telemetry,
  fps,
  connected,
  movingCount,
  idleCount,
}: DashboardHUDProps) {
  const total = telemetry.activeVehicleCount || movingCount + idleCount;
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);

  return (
    <header className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Brand */}
        <div className="panel rounded-2xl shadow-panel px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 pointer-events-auto min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Navigation className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-slate-900 leading-tight truncate">Lagos Fleet Tracker</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? "bg-status-moving" : "bg-status-idle"}`}
              />
              <span className="hidden sm:inline text-[11px] text-slate-500">
                {connected ? "Live telemetry stream" : "Simulation mode"}
              </span>
              <span className="sm:hidden text-[11px] text-slate-500">
                {connected ? "Live" : "Sim"}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop: full live stats + About */}
        <div className="hidden sm:flex items-stretch gap-3">
          <div className="panel rounded-2xl shadow-panel py-2 flex items-center divide-x divide-slate-200/70 pointer-events-auto font-sans">
            <Stat label="Vehicles" value={total.toLocaleString()} accent="text-accent" />
            <Stat label="Moving" value={movingCount.toLocaleString()} accent="text-status-moving" />
            <Stat label="Idle" value={idleCount.toLocaleString()} accent="text-status-idle" />
            <Stat label="Render" value={String(fps)} sub="fps" />
          </div>
          <Link
            href="/about"
            className="panel rounded-2xl shadow-panel px-3.5 flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-accent transition-colors pointer-events-auto"
          >
            <Info className="w-4 h-4" />
            <span>About</span>
          </Link>
        </div>

        {/* Mobile: compact toggle that reveals a floating stats sidebar */}
        <button
          onClick={() => setMobileStatsOpen((v) => !v)}
          className="sm:hidden panel rounded-2xl shadow-panel px-3 py-2.5 flex items-center gap-1.5 pointer-events-auto flex-shrink-0"
        >
          <span className="text-sm font-semibold tabular-nums text-accent">{total.toLocaleString()}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mobileStatsOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Mobile floating stats sidebar */}
      {mobileStatsOpen && (
        <div className="sm:hidden mt-2 ml-auto w-52 panel rounded-2xl shadow-panel-lg p-3 pointer-events-auto animate-slide-up">
          <StatRow label="Vehicles" value={total.toLocaleString()} accent="text-accent" />
          <StatRow label="Moving" value={movingCount.toLocaleString()} accent="text-status-moving" />
          <StatRow label="Idle" value={idleCount.toLocaleString()} accent="text-status-idle" />
          <StatRow label="Render" value={String(fps)} sub="fps" />
          <Link
            href="/about"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>About</span>
          </Link>
        </div>
      )}
    </header>
  );
}
