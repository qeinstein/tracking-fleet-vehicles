"use client";

import React from "react";
import Link from "next/link";
import { TelemetryData } from "../lib/useFleetWebSocket";
import { Navigation, Info } from "lucide-react";

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

export default function DashboardHUD({
  telemetry,
  fps,
  connected,
  movingCount,
  idleCount,
}: DashboardHUDProps) {
  const total = telemetry.activeVehicleCount || movingCount + idleCount;

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-3 pointer-events-none">
      {/* Brand */}
      <div className="panel rounded-2xl shadow-panel px-4 py-3 flex items-center gap-3 pointer-events-auto">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm">
          <Navigation className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-900 leading-tight">Lagos Fleet Tracker</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-status-moving" : "bg-status-idle"}`}
            />
            <span className="text-[11px] text-slate-500">
              {connected ? "Live telemetry stream" : "Simulation mode"}
            </span>
          </div>
        </div>
      </div>

      {/* Live stats + About */}
      <div className="flex items-stretch gap-3">
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
          <span className="hidden sm:inline">About</span>
        </Link>
      </div>
    </header>
  );
}
