"use client";

import React from "react";
import { VehiclePoint } from "../lib/useFleetWebSocket";
import { Crosshair, MapPin, Navigation, Gauge, Clock, X } from "lucide-react";

interface VehicleInspectorProps {
  vehicle: VehiclePoint | null;
  onClose: () => void;
  isFollowMode: boolean;
  onToggleFollowMode: () => void;
}

export default function VehicleInspector({
  vehicle,
  onClose,
  isFollowMode,
  onToggleFollowMode,
}: VehicleInspectorProps) {
  if (!vehicle) return null;

  return (
    <div className="absolute top-20 right-4 z-20 w-80 glass-panel rounded-2xl p-4 border border-slate-800 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">
            NG
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono">{vehicle.id}</h3>
            <span className="text-[10px] text-slate-400 font-medium">{vehicle.hub} Fleet Hub</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Speed & Heading Visual Indicators */}
      <div className="grid grid-cols-2 gap-2 my-3 font-mono">
        {/* Speed */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 font-sans">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Velocity</span>
          </div>
          <div className="text-lg font-bold text-emerald-300">
            {vehicle.speed.toFixed(1)} <span className="text-[10px] text-slate-500 font-sans">km/h</span>
          </div>
        </div>

        {/* Heading Bearing */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 font-sans">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Heading</span>
          </div>
          <div className="text-lg font-bold text-cyan-300 flex items-center justify-between">
            <span>{vehicle.heading.toFixed(0)}°</span>
            <div
              className="w-4 h-4 text-cyan-400 transition-transform duration-300"
              style={{ transform: `rotate(${vehicle.heading}deg)` }}
            >
              ↑
            </div>
          </div>
        </div>
      </div>

      {/* Lat / Lon Coordinates */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl space-y-1.5 font-mono text-xs mb-3">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-500 text-[11px] font-sans flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" /> Latitude
          </span>
          <span className="font-semibold text-slate-200">{vehicle.lat.toFixed(5)}° N</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-500 text-[11px] font-sans flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" /> Longitude
          </span>
          <span className="font-semibold text-slate-200">{vehicle.lon.toFixed(5)}° E</span>
        </div>
        <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60 text-[10px]">
          <span className="text-slate-500 font-sans flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Last Tick
          </span>
          <span className="text-slate-400">{new Date(vehicle.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Follow Camera Action */}
      <button
        onClick={onToggleFollowMode}
        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
          isFollowMode
            ? "bg-cyan-950 border-cyan-500 text-cyan-300"
            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
        }`}
      >
        <Crosshair className={`w-3.5 h-3.5 ${isFollowMode ? "text-cyan-400 animate-spin" : ""}`} />
        <span>{isFollowMode ? "Following Vehicle in 3D..." : "Lock Camera to Vehicle"}</span>
      </button>
    </div>
  );
}
