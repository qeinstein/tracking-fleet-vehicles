"use client";

import React from "react";
import { TelemetryData } from "../lib/useFleetWebSocket";
import { BookOpen, Cpu, Lock, Shield, X, Zap } from "lucide-react";

interface MonitorInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryData;
}

export default function MonitorInspector({
  isOpen,
  onClose,
  telemetry,
}: MonitorInspectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Java Monitor Pattern (JCIP Section 4.2.2)</h2>
              <p className="text-xs text-slate-400">State encapsulation & deep-copy isolation analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Monitor Telemetry Stats */}
        <div className="grid grid-cols-3 gap-3 font-mono">
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] text-slate-500 font-sans uppercase">Lock Latency</div>
            <div className="text-lg font-bold text-purple-300 mt-0.5">
              {telemetry.lockLatencyMicros.toFixed(2)} <span className="text-xs text-slate-500">µs</span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-1">Guarded via synchronized(this)</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] text-slate-500 font-sans uppercase">Deep Copy Duration</div>
            <div className="text-lg font-bold text-blue-300 mt-0.5">
              {telemetry.deepCopyDurationMs.toFixed(2)} <span className="text-xs text-slate-500">ms</span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-1">1,000+ MutablePoints copied</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] text-slate-500 font-sans uppercase">Total GPS Mutations</div>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">
              {telemetry.totalMutations.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-sans mt-1">Across 16 worker threads</div>
          </div>
        </div>

        {/* Pattern Explanation & Code Highlights */}
        <div className="space-y-3 text-xs text-slate-300">
          <div className="bg-cyan-950/40 border border-cyan-800/40 p-3 rounded-xl flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-cyan-300">Why Deep Copying is Essential:</span> If <code className="font-mono text-cyan-200">getLocations()</code> returned direct references to internal <code className="font-mono text-cyan-200">MutablePoint</code> objects, client threads could modify vehicle coordinates without holding the monitor lock, creating subtle race conditions.
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden font-mono text-[11px]">
            <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider font-sans font-semibold flex items-center justify-between">
              <span>JCIP Listing 4.5 — MonitorVehicleTracker.java</span>
              <span className="text-emerald-400 font-mono">synchronized(this)</span>
            </div>
            <pre className="p-4 text-slate-300 overflow-x-auto leading-relaxed">
{`public class MonitorVehicleTracker {
    private final Map<String, MutablePoint> locations;

    public synchronized Map<String, MutablePoint> getLocations() {
        return Collections.unmodifiableMap(deepCopy(locations));
    }

    public synchronized void setLocation(String id, double x, double y, double heading, double speed) {
        MutablePoint loc = locations.get(id);
        if (loc == null) locations.put(id, new MutablePoint(x, y, heading, speed));
        else { loc.x = x; loc.y = y; loc.heading = heading; loc.speed = speed; }
    }

    private static Map<String, MutablePoint> deepCopy(Map<String, MutablePoint> m) {
        Map<String, MutablePoint> result = new HashMap<>();
        for (String id : m.keySet()) result.put(id, new MutablePoint(m.get(id)));
        return result;
    }
}`}
            </pre>
          </div>
        </div>

        {/* Footer close */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-all"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
