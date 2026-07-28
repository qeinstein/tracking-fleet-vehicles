"use client";

import React from "react";
import { VehiclePoint } from "../lib/useFleetWebSocket";
import { MapPin, Navigation, Gauge, Clock, X, Crosshair } from "lucide-react";

interface VehicleInspectorProps {
  vehicle: VehiclePoint | null;
  onClose: () => void;
  isFollowMode: boolean;
  onToggleFollowMode: () => void;
}

function Field({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-base font-semibold tabular-nums ${accent || "text-slate-900"}`}>{value}</div>
    </div>
  );
}

export default function VehicleInspector({
  vehicle,
  onClose,
  isFollowMode,
  onToggleFollowMode,
}: VehicleInspectorProps) {
  if (!vehicle) return null;

  const isMoving = vehicle.status === "moving";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 panel shadow-panel-lg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] rounded-t-3xl animate-slide-up
        sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-24 sm:right-4 sm:z-20 sm:w-80 sm:rounded-2xl sm:pb-4"
    >
      {/* Mobile drag-handle affordance for the bottom sheet. */}
      <div className="sm:hidden mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />

      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 font-mono">{vehicle.id}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] text-slate-500">{vehicle.hub}, Lagos</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-medium px-2 py-1 rounded-full ${
              isMoving ? "bg-green-50 text-status-moving" : "bg-amber-50 text-status-idle"
            }`}
          >
            {isMoving ? "Moving" : "Idle"}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Field
          icon={<Gauge className="w-3.5 h-3.5 text-status-moving" />}
          label="Speed"
          value={`${vehicle.speed.toFixed(0)} km/h`}
        />
        <Field
          icon={<Navigation className="w-3.5 h-3.5 text-accent" />}
          label="Heading"
          value={`${vehicle.heading.toFixed(0)}°`}
        />
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 mt-2 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Latitude</span>
          <span className="font-mono font-medium text-slate-700">{vehicle.lat.toFixed(5)}° N</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Longitude</span>
          <span className="font-mono font-medium text-slate-700">{vehicle.lon.toFixed(5)}° E</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/70">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last update
          </span>
          <span className="text-slate-500 font-mono">
            {vehicle.timestamp ? new Date(vehicle.timestamp).toLocaleTimeString() : "—"}
          </span>
        </div>
      </div>

      <button
        onClick={onToggleFollowMode}
        className={`w-full mt-3 py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          isFollowMode
            ? "bg-accent text-white hover:bg-accent-hover"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        <Crosshair className="w-4 h-4" />
        <span>{isFollowMode ? "Following" : "Follow vehicle"}</span>
      </button>
    </div>
  );
}
