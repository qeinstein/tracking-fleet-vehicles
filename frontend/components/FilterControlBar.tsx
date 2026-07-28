"use client";

import React from "react";
import { Compass, Eye, Filter, RefreshCw, Search, Target } from "lucide-react";

interface FilterControlBarProps {
  hubFilter: string;
  onSelectHub: (hub: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode3D: boolean;
  onToggle3D: () => void;
  isFollowMode: boolean;
  onToggleFollowMode: () => void;
  onResetSimulation: () => void;
  selectedVehicleId: string | null;
}

const HUBS = ["ALL", "Lagos", "Abuja", "Kano", "Port Harcourt", "Ibadan"];

export default function FilterControlBar({
  hubFilter,
  onSelectHub,
  searchQuery,
  onSearchChange,
  viewMode3D,
  onToggle3D,
  isFollowMode,
  onToggleFollowMode,
  onResetSimulation,
  selectedVehicleId,
}: FilterControlBarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 glass-panel p-2 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Hub Filter Selector */}
      <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
        <div className="px-2 text-slate-500 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">Hub</span>
        </div>
        {HUBS.map((hub) => (
          <button
            key={hub}
            onClick={() => onSelectHub(hub)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              hubFilter === hub
                ? "bg-cyan-500 text-black font-semibold shadow-lg shadow-cyan-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {hub}
          </button>
        ))}
      </div>

      {/* Vehicle ID Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search Vehicle ID..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-40 sm:w-48 bg-slate-950/60 border border-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono transition-all"
        />
      </div>

      {/* Camera 3D / 2D Toggle */}
      <button
        onClick={onToggle3D}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
          viewMode3D
            ? "bg-slate-800 border-cyan-500/50 text-cyan-300 shadow-md"
            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
        }`}
      >
        <Compass className={`w-3.5 h-3.5 ${viewMode3D ? "text-cyan-400" : ""}`} />
        <span>{viewMode3D ? "3D Tilt (55°)" : "2D Flat"}</span>
      </button>

      {/* Follow Vehicle Mode Toggle */}
      <button
        disabled={!selectedVehicleId}
        onClick={onToggleFollowMode}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
          !selectedVehicleId
            ? "opacity-40 cursor-not-allowed bg-slate-950 border-slate-900 text-slate-600"
            : isFollowMode
            ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md"
            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
        }`}
      >
        <Target className={`w-3.5 h-3.5 ${isFollowMode ? "text-cyan-400 animate-pulse" : ""}`} />
        <span>Follow</span>
      </button>

      {/* Reset Simulation Button */}
      <button
        onClick={onResetSimulation}
        title="Reseed 1,000+ Vehicles"
        className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
