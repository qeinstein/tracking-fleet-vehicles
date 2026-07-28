"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DISTRICTS, districtFromId, LAGOS_BOUNDS } from "./districts";
import { paintForId } from "./carPaint";

export interface VehiclePoint {
  id: string;
  lat: number;
  lon: number;
  heading: number; // degrees, clockwise from north
  speed: number; // km/h
  timestamp: number;
  hub: string; // Lagos district name
  status: "moving" | "idle";
  color: [number, number, number]; // precomputed paint colour
}

export interface TelemetryData {
  activeVehicleCount: number;
  snapshotIndex: number;
  totalMutations: number;
  lockLatencyMicros: number;
  deepCopyDurationMs: number;
  threadPoolSize: number;
  timestamp: number;
  payloadSizeBytes: number;
}

const DEFAULT_TELEMETRY: TelemetryData = {
  activeVehicleCount: 0,
  snapshotIndex: 0,
  totalMutations: 0,
  lockLatencyMicros: 0,
  deepCopyDurationMs: 0,
  threadPoolSize: 16,
  timestamp: 0,
  payloadSizeBytes: 0,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function makeVehicle(
  id: string,
  lat: number,
  lon: number,
  heading: number,
  speed: number,
  timestamp: number
): VehiclePoint {
  return {
    id,
    lat,
    lon,
    heading,
    speed,
    timestamp,
    hub: districtFromId(id),
    status: speed > 4 ? "moving" : "idle",
    color: paintForId(id),
  };
}

// Client-side fallback fleet, used only when the backend WebSocket is unreachable.
function generateFallbackVehicles(perDistrict = 6): Map<string, VehiclePoint> {
  const map = new Map<string, VehiclePoint>();
  for (const d of DISTRICTS) {
    for (let i = 1; i <= perDistrict; i++) {
      const id = `LAG-${d.code}-${String(i).padStart(4, "0")}`;
      const angle = (i / perDistrict) * 2 * Math.PI;
      const dist = 0.008 + (i % 3) * 0.006;
      map.set(
        id,
        makeVehicle(
          id,
          d.center[1] + Math.sin(angle) * dist,
          d.center[0] + Math.cos(angle) * dist,
          (angle * 180) / Math.PI,
          12 + (i % 5) * 8,
          Date.now()
        )
      );
    }
  }
  return map;
}

export function useFleetWebSocket(
  url: string = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/fleet/stream"
) {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData>(DEFAULT_TELEMETRY);
  const [fps, setFps] = useState(60);
  // Vehicles update once per backend snapshot (~20 Hz); deck.gl GPU-interpolates positions
  // between snapshots for smooth 60 FPS motion, so we don't re-emit every animation frame.
  const [vehicles, setVehicles] = useState<VehiclePoint[]>([]);

  const connectedRef = useRef(false);
  const targetRef = useRef<Map<string, VehiclePoint>>(generateFallbackVehicles());
  const pathHistoryRef = useRef<Map<string, [number, number][]>>(new Map());

  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const lastOfflineEmitRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  // ---- WebSocket lifecycle -------------------------------------------------
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let closed = false;

    const connect = () => {
      try {
        ws = new WebSocket(url);
        ws.onopen = () => setConnected(true);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "FLEET_SNAPSHOT" && Array.isArray(data.vehicles)) {
              const arr: VehiclePoint[] = new Array(data.vehicles.length);
              for (let i = 0; i < data.vehicles.length; i++) {
                const [id, lat, lon, heading, speed, timestamp] = data.vehicles[i];
                arr[i] = makeVehicle(id, lat, lon, heading, speed, timestamp);

                let history = pathHistoryRef.current.get(id);
                if (!history) {
                  history = [];
                  pathHistoryRef.current.set(id, history);
                }
                const last = history[history.length - 1];
                if (!last || Math.abs(last[0] - lon) > 0.00008 || Math.abs(last[1] - lat) > 0.00008) {
                  history.push([lon, lat]);
                  if (history.length > 40) history.shift();
                }
              }
              setVehicles(arr);
              if (data.telemetry) setTelemetry(data.telemetry);
            }
          } catch (e) {
            /* ignore malformed frame */
          }
        };
        ws.onclose = () => {
          setConnected(false);
          if (!closed) reconnectTimeout = setTimeout(connect, 2000);
        };
        ws.onerror = () => ws?.close();
      } catch (e) {
        setConnected(false);
        if (!closed) reconnectTimeout = setTimeout(connect, 2000);
      }
    };

    connect();
    return () => {
      closed = true;
      ws?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [url]);

  // ---- FPS meter + offline fallback advancement ---------------------------
  const loop = useCallback((now: number) => {
    frameCountRef.current++;
    if (lastFpsTimeRef.current === 0) lastFpsTimeRef.current = now;
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    if (!connectedRef.current) {
      const target = targetRef.current;
      target.forEach((t) => {
        const rad = (t.heading * Math.PI) / 180;
        let nlat = t.lat + Math.cos(rad) * 0.00012;
        let nlon = t.lon + Math.sin(rad) * 0.00012;
        if (nlat < LAGOS_BOUNDS.minLat || nlat > LAGOS_BOUNDS.maxLat) t.heading = (180 - t.heading + 360) % 360;
        if (nlon < LAGOS_BOUNDS.minLon || nlon > LAGOS_BOUNDS.maxLon) t.heading = (360 - t.heading) % 360;
        t.lat = clamp(nlat, LAGOS_BOUNDS.minLat, LAGOS_BOUNDS.maxLat);
        t.lon = clamp(nlon, LAGOS_BOUNDS.minLon, LAGOS_BOUNDS.maxLon);
        t.heading = (t.heading + (Math.random() - 0.49) * 3 + 360) % 360;
      });
      // Emit ~20 fps; deck.gl interpolates the rest for smoothness.
      if (now - lastOfflineEmitRef.current >= 50) {
        lastOfflineEmitRef.current = now;
        setVehicles(Array.from(target.values()));
        setTelemetry((prev) => ({
          ...prev,
          activeVehicleCount: target.size,
          snapshotIndex: prev.snapshotIndex + 1,
          timestamp: Date.now(),
        }));
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  const getVehicleHistory = useCallback(
    (id: string): [number, number][] => pathHistoryRef.current.get(id) || [],
    []
  );

  return { connected, telemetry, fps, vehicles, getVehicleHistory };
}
