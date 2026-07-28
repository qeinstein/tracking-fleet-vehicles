"use client";

import React, { useState, useMemo, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import { IconLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { ConeGeometry, CubeGeometry } from "@luma.gl/engine";
import { VehiclePoint } from "../lib/useFleetWebSocket";
import "maplibre-gl/dist/maplibre-gl.css";

interface Map3DProps {
  vehicles: VehiclePoint[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
  getVehicleHistory: (id: string) => [number, number][];
  isFollowMode: boolean;
  viewMode3D: boolean;
  hubFilter: string;
}

// Hub color mappings (Clean, distinct, minimalist tones)
const HUB_COLORS: Record<string, [number, number, number]> = {
  Lagos: [6, 182, 212],      // Cyan
  Abuja: [16, 185, 129],     // Emerald
  Kano: [245, 158, 11],      // Amber
  "Port Harcourt": [168, 85, 247], // Purple
  Ibadan: [236, 72, 153],     // Pink
  Default: [148, 163, 184],  // Slate
};

const NIGERIA_INITIAL_VIEW = {
  longitude: 8.6753,
  latitude: 9.0820,
  zoom: 6.2,
  pitch: 55,
  bearing: -10,
  maxPitch: 75,
  minZoom: 4,
  maxZoom: 18,
};

// 3D Car Mesh Geometry using LumaGL Cone & Box
const CAR_BODY_GEOMETRY = new ConeGeometry({
  radius: 0.0003,
  height: 0.001,
  cap: true,
  nradial: 8,
});

export default function Map3D({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  getVehicleHistory,
  isFollowMode,
  viewMode3D,
  hubFilter,
}: Map3DProps) {
  const [viewState, setViewState] = useState(NIGERIA_INITIAL_VIEW);

  // Filter vehicles by selected hub
  const filteredVehicles = useMemo(() => {
    if (hubFilter === "ALL") return vehicles;
    return vehicles.filter((v) => v.hub === hubFilter);
  }, [vehicles, hubFilter]);

  // Handle Follow Mode: smoothly update camera center to match selected vehicle
  useEffect(() => {
    if (isFollowMode && selectedVehicleId) {
      const targetVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (targetVehicle) {
        setViewState((prev) => ({
          ...prev,
          longitude: targetVehicle.lon,
          latitude: targetVehicle.lat,
          zoom: Math.max(13, prev.zoom),
        }));
      }
    }
  }, [isFollowMode, selectedVehicleId, vehicles]);

  // Selected vehicle trail path
  const trailPaths = useMemo(() => {
    if (!selectedVehicleId) return [];
    const history = getVehicleHistory(selectedVehicleId);
    if (history.length < 2) return [];
    return [
      {
        id: selectedVehicleId,
        path: history,
        color: [6, 182, 212, 220] as [number, number, number, number],
      },
    ];
  }, [selectedVehicleId, getVehicleHistory]);

  // Deck.gl Layers
  const layers = [
    // Trailing movement path line
    new PathLayer({
      id: "vehicle-trail-layer",
      data: trailPaths,
      getPath: (d) => d.path,
      getColor: (d) => d.color,
      getWidth: 4,
      widthMinPixels: 3,
      jointRounded: true,
      capRounded: true,
    }),

    // 3D Hardware Accelerated Vehicle Layer (SimpleMeshLayer)
    new SimpleMeshLayer({
      id: "3d-vehicle-cars-layer",
      data: filteredVehicles,
      mesh: CAR_BODY_GEOMETRY,
      getPosition: (d: VehiclePoint) => [d.lon, d.lat, 15],
      getOrientation: (d: VehiclePoint) => [0, -d.heading + 90, 0],
      getScale: [250, 450, 250],
      getColor: (d: VehiclePoint) => {
        if (d.id === selectedVehicleId) return [239, 68, 68, 255]; // Highlight red
        return HUB_COLORS[d.hub || "Default"] || HUB_COLORS.Default;
      },
      pickable: true,
      onClick: (info) => {
        if (info.object) {
          onSelectVehicle((info.object as VehiclePoint).id);
        } else {
          onSelectVehicle(null);
        }
      },
      updateTriggers: {
        getColor: [selectedVehicleId],
      },
    }),

    // Ground glow indicator rings under active vehicles
    new ScatterplotLayer({
      id: "vehicle-glow-rings",
      data: filteredVehicles,
      getPosition: (d: VehiclePoint) => [d.lon, d.lat, 0],
      getRadius: (d: VehiclePoint) => (d.id === selectedVehicleId ? 600 : 180),
      getFillColor: (d: VehiclePoint) => {
        const rgb = HUB_COLORS[d.hub || "Default"] || HUB_COLORS.Default;
        return [...rgb, d.id === selectedVehicleId ? 140 : 40];
      },
      pickable: false,
      updateTriggers: {
        getRadius: [selectedVehicleId],
        getFillColor: [selectedVehicleId],
      },
    }),
  ];

  return (
    <div className="relative w-full h-full bg-[#070a11] overflow-hidden">
      <DeckGL
        viewState={{
          ...viewState,
          pitch: viewMode3D ? viewState.pitch : 0,
        }}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={{ dragRotate: true, doubleClickZoom: false }}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "default")}
      >
        <Map
          reuseMaps
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/json"
          preventStyleDiffing={true}
        />
      </DeckGL>
    </div>
  );
}
