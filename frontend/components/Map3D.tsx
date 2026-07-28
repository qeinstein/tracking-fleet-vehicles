"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { AmbientLight, DirectionalLight, LightingEffect } from "@deck.gl/core";
import { VehiclePoint } from "../lib/useFleetWebSocket";
import { CAR_MESH, paintForId } from "../lib/carMesh";
import { LAGOS_BOUNDS, LAGOS_CENTER } from "../lib/districts";
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

// A Google-Maps-like vector basemap (light street map with roads, POIs and building data).
// Overridable via env in case a different tile provider is preferred.
const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/liberty";

const INITIAL_VIEW = {
  longitude: LAGOS_CENTER[0],
  latitude: LAGOS_CENTER[1],
  zoom: 12.9,
  pitch: 52,
  bearing: -18,
  minZoom: 11.5, // keep the viewport smaller than Lagos so panning stays coupled to the map
  maxZoom: 19,
  maxPitch: 70,
};

const CAR_MODEL_LENGTH_M = 4.6; // mesh length in local units (≈ metres)
const CAR_REAL_SIZE_SCALE = 6; // fixed real-world size: cars grow as you zoom in
const CAR_MIN_PX = 6; // floor so cars never vanish (stay small dots when zoomed out)

// Cars have a fixed real-world metre size (so they're small when zoomed out and only
// grow as you zoom in), with a modest minimum on-screen size so they never disappear.
function carSizeScaleFor(zoom: number): number {
  const metersPerPixel = (156543.03392 * Math.cos((LAGOS_CENTER[1] * Math.PI) / 180)) / Math.pow(2, zoom);
  const floorScale = (CAR_MIN_PX * metersPerPixel) / CAR_MODEL_LENGTH_M;
  return Math.max(CAR_REAL_SIZE_SCALE, floorScale);
}

const lighting = new LightingEffect({
  ambient: new AmbientLight({ color: [255, 255, 255], intensity: 1.5 }),
  sun: new DirectionalLight({ color: [255, 255, 255], intensity: 2.1, direction: [-1, -3, -1] }),
  fill: new DirectionalLight({ color: [255, 255, 255], intensity: 0.7, direction: [2, 1, -1] }),
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Add extruded 3D buildings to the MapLibre basemap for a realistic street-level look.
function addBuildings(map: any) {
  try {
    if (!map || map.getLayer("fleet-3d-buildings")) return;
    if (!map.getSource("openmaptiles")) return;
    const layers = map.getStyle().layers || [];
    const firstSymbol = layers.find((l: any) => l.type === "symbol")?.id;
    map.addLayer(
      {
        id: "fleet-3d-buildings",
        source: "openmaptiles",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": "#e4e2da",
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 8],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
          "fill-extrusion-opacity": 0.9,
        },
      },
      firstSymbol
    );
  } catch (e) {
    // basemap schema differs — skip 3D buildings gracefully
  }
}

export default function Map3D({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  getVehicleHistory,
  isFollowMode,
  viewMode3D,
  hubFilter,
}: Map3DProps) {
  const [viewState, setViewState] = useState<any>(INITIAL_VIEW);

  const filteredVehicles = useMemo(() => {
    if (hubFilter === "ALL") return vehicles;
    return vehicles.filter((v) => v.hub === hubFilter);
  }, [vehicles, hubFilter]);

  // Follow mode: keep the camera centred on the selected vehicle.
  useEffect(() => {
    if (isFollowMode && selectedVehicleId) {
      const target = vehicles.find((v) => v.id === selectedVehicleId);
      if (target) {
        setViewState((prev: any) => ({
          ...prev,
          longitude: target.lon,
          latitude: target.lat,
          zoom: Math.max(15, prev.zoom),
        }));
      }
    }
  }, [isFollowMode, selectedVehicleId, vehicles]);

  const trailPaths = useMemo(() => {
    if (!selectedVehicleId) return [];
    const history = getVehicleHistory(selectedVehicleId);
    if (history.length < 2) return [];
    return [{ path: history }];
  }, [selectedVehicleId, getVehicleHistory, vehicles]);

  const layers = [
    new PathLayer({
      id: "trail",
      data: trailPaths,
      getPath: (d: any) => d.path,
      getColor: [79, 70, 229, 200],
      getWidth: 6,
      widthMinPixels: 3,
      widthMaxPixels: 8,
      jointRounded: true,
      capRounded: true,
    }),
    new ScatterplotLayer({
      id: "selection-ring",
      data: selectedVehicleId ? filteredVehicles.filter((v) => v.id === selectedVehicleId) : [],
      getPosition: (d: VehiclePoint) => [d.lon, d.lat, 0],
      transitions: { getPosition: { duration: 55 } },
      getRadius: 26,
      radiusUnits: "meters",
      radiusMinPixels: 14,
      radiusMaxPixels: 60,
      stroked: true,
      filled: true,
      getLineWidth: 2,
      lineWidthMinPixels: 2,
      getLineColor: [79, 70, 229, 255],
      getFillColor: [79, 70, 229, 40],
    }),
    new SimpleMeshLayer<VehiclePoint>({
      id: "cars",
      data: filteredVehicles,
      mesh: CAR_MESH as any,
      getPosition: (d: VehiclePoint) => [d.lon, d.lat, 0],
      // mesh nose points +Y; deck.gl yaw is CCW about up, so use -heading.
      getOrientation: (d: VehiclePoint) => [0, -d.heading, 0],
      getColor: (d: VehiclePoint) => d.color ?? (paintForId(d.id) as [number, number, number]),
      getScale: (d: VehiclePoint) =>
        d.id === selectedVehicleId ? [1.55, 1.55, 1.55] : [1, 1, 1],
      sizeScale: carSizeScaleFor(viewState.zoom),
      material: { ambient: 0.5, diffuse: 0.8, shininess: 60, specularColor: [70, 70, 70] },
      pickable: true,
      // GPU-interpolate position between the ~20 Hz snapshots for smooth 60 FPS motion.
      transitions: { getPosition: { duration: 55 } },
      onClick: (info) => onSelectVehicle(info.object ? (info.object as VehiclePoint).id : null),
      updateTriggers: {
        getScale: [selectedVehicleId],
      },
    }),
  ];

  const handleViewStateChange = useCallback(({ viewState: v }: { viewState: any }) => {
    setViewState({
      ...v,
      longitude: clamp(v.longitude, LAGOS_BOUNDS.minLon, LAGOS_BOUNDS.maxLon),
      latitude: clamp(v.latitude, LAGOS_BOUNDS.minLat, LAGOS_BOUNDS.maxLat),
      zoom: clamp(v.zoom, INITIAL_VIEW.minZoom, INITIAL_VIEW.maxZoom),
    });
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#eef0ec]">
      <DeckGL
        viewState={{ ...viewState, pitch: viewMode3D ? viewState.pitch : 0 }}
        onViewStateChange={handleViewStateChange}
        controller={{ dragRotate: true, doubleClickZoom: false, touchRotate: true }}
        effects={[lighting]}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
        onClick={(info) => {
          if (!info.object) onSelectVehicle(null);
        }}
      >
        <Map
          reuseMaps
          renderWorldCopies={false}
          mapStyle={MAP_STYLE}
          onLoad={(e: any) => addBuildings(e.target)}
        />
      </DeckGL>
    </div>
  );
}
