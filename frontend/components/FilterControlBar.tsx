"use client";

import React from "react";
import { Search, Box, Square, Crosshair, Users, ChevronDown } from "lucide-react";
import { DISTRICTS } from "../lib/districts";

interface FilterControlBarProps {
  hubFilter: string;
  onSelectHub: (hub: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode3D: boolean;
  onToggle3D: () => void;
  isFollowMode: boolean;
  onToggleFollowMode: () => void;
  selectedVehicleId: string | null;
  fleetSize: number;
  onSetFleetSize: (n: number) => void;
}

const FLEET_SIZES = [300, 600, 1200, 2400];

export default function FilterControlBar({
  hubFilter,
  onSelectHub,
  searchQuery,
  onSearchChange,
  viewMode3D,
  onToggle3D,
  isFollowMode,
  onToggleFollowMode,
  selectedVehicleId,
  fleetSize,
  onSetFleetSize,
}: FilterControlBarProps) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 panel rounded-2xl shadow-panel-lg p-2 flex items-center gap-2 flex-wrap justify-center max-w-[calc(100vw-2rem)]">
      {/* District filter */}
      <div className="relative">
        <select
          value={hubFilter}
          onChange={(e) => onSelectHub(e.target.value)}
          className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-accent cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <option value="ALL">All districts</option>
          {DISTRICTS.map((d) => (
            <option key={d.code} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Search */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search vehicle ID…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-40 sm:w-48 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-accent font-mono transition-colors"
        />
      </div>

      <div className="w-px h-7 bg-slate-200 mx-0.5" />

      {/* Fleet size — "show more cars" */}
      <div className="relative flex items-center" title="Number of vehicles in the fleet">
        <Users className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <select
          value={fleetSize}
          onChange={(e) => onSetFleetSize(Number(e.target.value))}
          className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-accent cursor-pointer hover:bg-slate-100 transition-colors"
        >
          {FLEET_SIZES.map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString()} cars
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="w-px h-7 bg-slate-200 mx-0.5" />

      {/* 3D / 2D toggle */}
      <button
        onClick={onToggle3D}
        className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 border transition-colors ${
          viewMode3D
            ? "bg-accent-soft border-accent/30 text-accent"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
        }`}
      >
        {viewMode3D ? <Box className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        <span>{viewMode3D ? "3D" : "2D"}</span>
      </button>

      {/* Follow */}
      <button
        disabled={!selectedVehicleId}
        onClick={onToggleFollowMode}
        className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 border transition-colors ${
          !selectedVehicleId
            ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400"
            : isFollowMode
            ? "bg-accent-soft border-accent/30 text-accent"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Crosshair className="w-4 h-4" />
        <span>Follow</span>
      </button>
    </div>
  );
}
