"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFleetWebSocket } from "../lib/useFleetWebSocket";
import DashboardHUD from "../components/DashboardHUD";
import FilterControlBar from "../components/FilterControlBar";
import VehicleInspector from "../components/VehicleInspector";
import MonitorInspector from "../components/MonitorInspector";

// Dynamically import Deck.gl Map3D component to avoid SSR canvas window issues
const Map3D = dynamic(() => import("../components/Map3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#070a11] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-cyan-400">Initializing 3D Deck.gl Engine...</span>
    </div>
  ),
});

export default function FleetTrackerPage() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/fleet/stream";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const { connected, telemetry, fps, getCurrentVehicles, getVehicleHistory } =
    useFleetWebSocket(wsUrl);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [hubFilter, setHubFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode3D, setViewMode3D] = useState(true);
  const [isFollowMode, setIsFollowMode] = useState(false);
  const [isMonitorInspectorOpen, setIsMonitorInspectorOpen] = useState(false);

  // Get active vehicle positions from WebSocket frame buffer
  const vehicles = getCurrentVehicles();

  // Search filter
  const displayedVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const query = searchQuery.trim().toLowerCase();
    return vehicles.filter((v) => v.id.toLowerCase().includes(query));
  }, [vehicles, searchQuery]);

  // Currently selected vehicle detail
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  const handleSelectVehicle = (id: string | null) => {
    setSelectedVehicleId(id);
    if (!id) setIsFollowMode(false);
  };

  const handleResetSimulation = useCallback(async () => {
    try {
      await fetch(`${apiUrl}/api/fleet/simulation/reset`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to reset simulation via REST API", e);
    }
  }, [apiUrl]);

  return (
    <main className="relative w-screen h-screen bg-[#070a11] overflow-hidden select-none">
      {/* Real-time Telemetry Dashboard HUD Header */}
      <DashboardHUD
        telemetry={telemetry}
        fps={fps}
        connected={connected}
        onOpenMonitorInspector={() => setIsMonitorInspectorOpen(true)}
      />

      {/* 3D Hardware Accelerated Map Canvas */}
      <Map3D
        vehicles={displayedVehicles}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={handleSelectVehicle}
        getVehicleHistory={getVehicleHistory}
        isFollowMode={isFollowMode}
        viewMode3D={viewMode3D}
        hubFilter={hubFilter}
      />

      {/* Bottom Filter & Controls Toolbar */}
      <FilterControlBar
        hubFilter={hubFilter}
        onSelectHub={setHubFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode3D={viewMode3D}
        onToggle3D={() => setViewMode3D((prev) => !prev)}
        isFollowMode={isFollowMode}
        onToggleFollowMode={() => setIsFollowMode((prev) => !prev)}
        onResetSimulation={handleResetSimulation}
        selectedVehicleId={selectedVehicleId}
      />

      {/* Selected Vehicle Telemetry Drawer */}
      <VehicleInspector
        vehicle={selectedVehicle}
        onClose={() => handleSelectVehicle(null)}
        isFollowMode={isFollowMode}
        onToggleFollowMode={() => setIsFollowMode((prev) => !prev)}
      />

      {/* JCIP Monitor Pattern Analysis Inspector Modal */}
      <MonitorInspector
        isOpen={isMonitorInspectorOpen}
        onClose={() => setIsMonitorInspectorOpen(false)}
        telemetry={telemetry}
      />
    </main>
  );
}
