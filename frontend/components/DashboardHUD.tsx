"use client";

import React from "react";
import { TelemetryData } from "../lib/useFleetWebSocket";
import { Activity, Cpu, Gauge, Lock, Radio, Server, ShieldCheck, Zap } from "lucide-react";

interface DashboardHUDProps {
  telemetry: TelemetryData;
  fps: number;
  connected: boolean;
  onOpenMonitorInspector: () => void;
}

export default function DashboardHUD({
  telemetry,
  fps,
  connected,
  onOpenMonitorInspector,
}: DashboardHUDProps) {
  const payloadKb = (telemetry.payloadSizeBytes / 1024).toFixed(1);
  const mutationsPerSec = telemetry.totalMutations.toLocaleString();

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* Brand Title & Status */}
      <div className="glass-panel px-4 py-2.5 rounded-xl flex items-center gap-3 pointer-events-auto">
        <div className="relative flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full ${connected ? "bg-brand-emerald animate-pulse" : "bg-brand-rose"}`} />
          {connected && <div className="absolute w-5 h-5 rounded-full bg-brand-emerald/30 animate-ping" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-wide uppercase">JCIP Fleet Tracker</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 font-semibold">
              3D Monitor Pattern
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Radio className={`w-3 h-3 ${connected ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
            <span>{connected ? "Live Real-Time Telemetry Stream" : "Active Simulation Stream"}</span>
          </p>
        </div>
      </div>

      {/* Real-time Telemetry Metrics Grid */}
      <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-5 font-mono text-xs pointer-events-auto">
        {/* Active Vehicles */}
        <div className="flex items-center gap-2.5 border-r border-slate-800 pr-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">Active Vehicles</div>
            <div className="text-sm font-bold text-white">{telemetry.activeVehicleCount.toLocaleString()}</div>
          </div>
        </div>

        {/* FPS Counter */}
        <div className="flex items-center gap-2.5 border-r border-slate-800 pr-4">
          <div className={`w-8 h-8 rounded-lg ${fps >= 50 ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40" : "bg-amber-950/60 text-amber-400 border-amber-800/40"} border flex items-center justify-center`}>
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">Render Rate</div>
            <div className="text-sm font-bold text-white">{fps} <span className="text-[10px] text-slate-400">FPS</span></div>
          </div>
        </div>

        {/* Lock Acquisition Latency */}
        <div className="flex items-center gap-2.5 border-r border-slate-800 pr-4">
          <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">Monitor Lock Latency</div>
            <div className="text-sm font-bold text-purple-300">
              {telemetry.lockLatencyMicros.toFixed(2)} <span className="text-[10px] text-slate-400">µs</span>
            </div>
          </div>
        </div>

        {/* Deep Copy Snapshot Duration */}
        <div className="flex items-center gap-2.5 border-r border-slate-800 pr-4">
          <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">Deep Copy Time</div>
            <div className="text-sm font-bold text-blue-300">
              {telemetry.deepCopyDurationMs.toFixed(2)} <span className="text-[10px] text-slate-400">ms</span>
            </div>
          </div>
        </div>

        {/* Stream Bandwidth Payload */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">Stream Payload</div>
            <div className="text-sm font-bold text-slate-200">
              {payloadKb} <span className="text-[10px] text-slate-400">KB @ 20Hz</span>
            </div>
          </div>
        </div>
      </div>

      {/* JCIP Pattern Inspector Trigger Button */}
      <button
        onClick={onOpenMonitorInspector}
        className="glass-panel px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-950/40 border border-cyan-800/40 transition-all pointer-events-auto"
      >
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>JCIP Pattern Analysis</span>
      </button>
    </header>
  );
}
