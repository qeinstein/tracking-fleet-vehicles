"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFleetWebSocket } from "../lib/useFleetWebSocket";
import DashboardHUD from "../components/DashboardHUD";
import FilterControlBar from "../components/FilterControlBar";
import VehicleInspector from "../components/VehicleInspector";

const Map3D = dynamic(() => import("../components/Map3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#eef0ec] flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-slate-500">Loading Lagos map…</span>
    </div>
  ),
});

export default function FleetTrackerPage() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/fleet/stream";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const { connected, telemetry, fps, vehicles, getVehicleHistory } = useFleetWebSocket(wsUrl);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [hubFilter, setHubFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode3D, setViewMode3D] = useState(true);
  const [isFollowMode, setIsFollowMode] = useState(false);
  const [fleetSize, setFleetSize] = useState(1200);

  const displayedVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.trim().toLowerCase();
    return vehicles.filter((v) => v.id.toLowerCase().includes(q));
  }, [vehicles, searchQuery]);

  const { movingCount, idleCount } = useMemo(() => {
    let moving = 0;
    for (const v of vehicles) if (v.status === "moving") moving++;
    return { movingCount: moving, idleCount: vehicles.length - moving };
  }, [vehicles]);

  const selectedVehicle = useMemo(
    () => (selectedVehicleId ? vehicles.find((v) => v.id === selectedVehicleId) || null : null),
    [vehicles, selectedVehicleId]
  );

  const handleSelectVehicle = (id: string | null) => {
    setSelectedVehicleId(id);
    if (!id) setIsFollowMode(false);
  };

  const handleSetFleetSize = useCallback(
    async (n: number) => {
      setFleetSize(n);
      try {
        await fetch(`${apiUrl}/api/fleet/simulation/reset?count=${n}`, { method: "POST" });
      } catch (e) {
        // backend offline — fallback fleet is unaffected; ignore
      }
    },
    [apiUrl]
  );

  return (
    <main className="app-shell relative bg-[#eef0ec]">
      <Map3D
        vehicles={displayedVehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={handleSelectVehicle}
        getVehicleHistory={getVehicleHistory}
        isFollowMode={isFollowMode}
        viewMode3D={viewMode3D}
        hubFilter={hubFilter}
      />

      <DashboardHUD
        telemetry={telemetry}
        fps={fps}
        connected={connected}
        movingCount={movingCount}
        idleCount={idleCount}
      />

      <FilterControlBar
        hubFilter={hubFilter}
        onSelectHub={setHubFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode3D={viewMode3D}
        onToggle3D={() => setViewMode3D((p) => !p)}
        isFollowMode={isFollowMode}
        onToggleFollowMode={() => setIsFollowMode((p) => !p)}
        selectedVehicleId={selectedVehicleId}
        fleetSize={fleetSize}
        onSetFleetSize={handleSetFleetSize}
      />

      <VehicleInspector
        vehicle={selectedVehicle}
        onClose={() => handleSelectVehicle(null)}
        isFollowMode={isFollowMode}
        onToggleFollowMode={() => setIsFollowMode((p) => !p)}
      />
    </main>
  );
}
