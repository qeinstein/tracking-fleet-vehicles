"use client";

import React, { useState, useMemo, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import Map from "react-map-gl/maplibre";
import { IconLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";
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

// Hub color mappings
const HUB_COLORS: Record<string, [number, number, number]> = {
  Lagos: [6, 182, 212],      // Cyan
  Abuja: [16, 185, 129],     // Emerald
  Kano: [245, 158, 11],      // Amber
  "Port Harcourt": [168, 85, 247], // Purple
  Ibadan: [236, 72, 153],     // Pink
  Default: [148, 163, 184],  // Slate
};

// Nigeria Geographical Boundary Limits
const NIGERIA_BOUNDS = {
  minLongitude: 2.5,
  maxLongitude: 14.8,
  minLatitude: 4.0,
  maxLatitude: 14.2,
};

const NIGERIA_INITIAL_VIEW = {
  longitude: 8.6753,
  latitude: 9.0820,
  zoom: 6.2,
  pitch: 45,
  bearing: -10,
  maxPitch: 75,
  minZoom: 5.8,
  maxZoom: 18,
};

// Top-down sleek Car SVG Icon Atlas (Google Maps / Uber style)
const CAR_ICON_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <g>
    <!-- Car Outer Chassis Body -->
    <path d="M 22 6 C 16 6 14 12 14 18 L 14 46 C 14 52 16 58 22 58 L 42 58 C 48 58 50 52 50 46 L 50 18 C 50 12 48 6 42 6 Z" fill="#0f172a" stroke="#ffffff" stroke-width="3"/>
    <!-- Roof Cabin / Glass -->
    <path d="M 20 22 C 20 16 24 14 32 14 C 40 14 44 16 44 22 L 42 42 C 42 46 38 48 32 48 C 26 48 22 46 22 42 Z" fill="#1e293b"/>
    <!-- Front Windshield -->
    <path d="M 22 20 Q 32 16 42 20 L 40 27 Q 32 24 24 27 Z" fill="#38bdf8"/>
    <!-- Rear Windshield -->
    <path d="M 23 41 Q 32 43 41 41 L 40 45 Q 32 47 24 45 Z" fill="#38bdf8"/>
    <!-- Front Headlights (Yellow glow) -->
    <ellipse cx="18" cy="8" rx="3" ry="2" fill="#fef08a"/>
    <ellipse cx="46" cy="8" rx="3" ry="2" fill="#fef08a"/>
    <!-- Rear Taillights (Red glow) -->
    <rect x="17" y="55" width="6" height="2.5" rx="1" fill="#ef4444"/>
    <rect x="41" y="55" width="6" height="2.5" rx="1" fill="#ef4444"/>
  </g>
</svg>
`)}`;

const CAR_ICON_MAPPING = {
  car: { x: 0, y: 0, width: 64, height: 64, mask: false },
};

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

    // Ground glow indicator rings under active vehicles
    new ScatterplotLayer({
      id: "vehicle-glow-rings",
      data: filteredVehicles,
      getPosition: (d: VehiclePoint) => [d.lon, d.lat, 0],
      getRadius: (d: VehiclePoint) => (d.id === selectedVehicleId ? 500 : 150),
      radiusMinPixels: 10,
      radiusMaxPixels: 36,
      stroked: true,
      getLineWidth: 2,
      getLineColor: (d: VehiclePoint) => {
        if (d.id === selectedVehicleId) return [239, 68, 68, 255];
        const rgb = HUB_COLORS[d.hub || "Default"] || HUB_COLORS.Default;
        return [...rgb, 200];
      },
      getFillColor: (d: VehiclePoint) => {
        const rgb = HUB_COLORS[d.hub || "Default"] || HUB_COLORS.Default;
        return [...rgb, d.id === selectedVehicleId ? 160 : 60];
      },
      pickable: false,
      updateTriggers: {
        getRadius: [selectedVehicleId],
        getFillColor: [selectedVehicleId],
        getLineColor: [selectedVehicleId],
      },
    }),

    // Google Maps / Uber style top-down rotating Car Icon Layer
    new IconLayer({
      id: "vehicle-car-icons",
      data: filteredVehicles,
      iconAtlas: CAR_ICON_SVG,
      iconMapping: CAR_ICON_MAPPING,
      getIcon: () => "car",
      getPosition: (d: VehiclePoint) => [d.lon, d.lat, 0],
      getSize: (d: VehiclePoint) => (d.id === selectedVehicleId ? 38 : 28),
      sizeMinPixels: 24,
      sizeMaxPixels: 48,
      sizeScale: 1,
      getAngle: (d: VehiclePoint) => 360 - d.heading,
      pickable: true,
      onClick: (info) => {
        if (info.object) {
          onSelectVehicle((info.object as VehiclePoint).id);
        } else {
          onSelectVehicle(null);
        }
      },
      updateTriggers: {
        getSize: [selectedVehicleId],
      },
    }),
  ];

  const handleViewStateChange = ({ viewState: nextState }: { viewState: any }) => {
    // Clamp longitude & latitude so camera stays strictly within geographical boundaries
    const clampedLon = Math.max(
      NIGERIA_BOUNDS.minLongitude,
      Math.min(NIGERIA_BOUNDS.maxLongitude, nextState.longitude)
    );
    const clampedLat = Math.max(
      NIGERIA_BOUNDS.minLatitude,
      Math.min(NIGERIA_BOUNDS.maxLatitude, nextState.latitude)
    );
    setViewState({
      ...nextState,
      longitude: clampedLon,
      latitude: clampedLat,
    });
  };

  return (
    <div className="relative w-full h-full bg-[#070a11] overflow-hidden">
      <DeckGL
        viewState={{
          ...viewState,
          pitch: viewMode3D ? viewState.pitch : 0,
        }}
        onViewStateChange={handleViewStateChange}
        controller={{ dragRotate: true, doubleClickZoom: false }}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "default")}
      >
        <Map
          reuseMaps
          renderWorldCopies={false}
          maxBounds={[
            [NIGERIA_BOUNDS.minLongitude, NIGERIA_BOUNDS.minLatitude],
            [NIGERIA_BOUNDS.maxLongitude, NIGERIA_BOUNDS.maxLatitude],
          ]}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/json"
        />
      </DeckGL>
    </div>
  );
}
