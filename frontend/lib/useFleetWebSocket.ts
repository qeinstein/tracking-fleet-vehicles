"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface VehiclePoint {
  id: string;
  lat: number;
  lon: number;
  heading: number; // degrees
  speed: number;   // km/h
  timestamp: number;
  hub?: string;
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

export interface RenderStats {
  fps: number;
  vehicleCount: number;
  connected: boolean;
}

export function useFleetWebSocket(
  url: string = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/fleet/stream"
) {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    activeVehicleCount: 0,
    snapshotIndex: 0,
    totalMutations: 0,
    lockLatencyMicros: 0,
    deepCopyDurationMs: 0,
    threadPoolSize: 0,
    timestamp: Date.now(),
    payloadSizeBytes: 0,
  });

  // Target positions received from WebSocket snapshots
  const targetMapRef = useRef<Map<String, VehiclePoint>>(new Map());
  // Current interpolated positions rendered on frame
  const currentMapRef = useRef<Map<String, VehiclePoint>>(new Map());
  // Trailing paths memory for selected vehicles
  const pathHistoryRef = useRef<Map<String, [number, number][]>>(new Map());

  // Render stats
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Parse hub prefix from vehicle ID
  const deriveHub = (id: string) => {
    if (id.startsWith("NG-LOS")) return "Lagos";
    if (id.startsWith("NG-ABJ")) return "Abuja";
    if (id.startsWith("NG-KAN")) return "Kano";
    if (id.startsWith("NG-PHC")) return "Port Harcourt";
    if (id.startsWith("NG-IBA")) return "Ibadan";
    return "Nigeria";
  };

  // WebSocket Connection Lifecycle
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "FLEET_SNAPSHOT" && Array.isArray(data.vehicles)) {
              const newTargets = new Map<String, VehiclePoint>();

              for (const item of data.vehicles) {
                // item: [id, lat, lon, heading, speed, timestamp]
                const [id, lat, lon, heading, speed, timestamp] = item;
                const vehicle: VehiclePoint = {
                  id,
                  lat,
                  lon,
                  heading,
                  speed,
                  timestamp,
                  hub: deriveHub(id),
                };
                newTargets.set(id, vehicle);

                // Update trailing path line
                let history = pathHistoryRef.current.get(id);
                if (!history) {
                  history = [];
                  pathHistoryRef.current.set(id, history);
                }
                if (history.length === 0 || Math.abs(history[history.length - 1][0] - lon) > 0.0001) {
                  history.push([lon, lat]);
                  if (history.length > 25) history.shift();
                }
              }

              targetMapRef.current = newTargets;

              if (data.telemetry) {
                setTelemetry(data.telemetry);
              }
            }
          } catch (e) {
            console.error("Failed to parse fleet WebSocket message", e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 2000);
        };

        ws.onerror = (err) => {
          setConnected(false);
          ws?.close();
        };
      } catch (e) {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [url]);

  // Client-side Frame Interpolation Loop (60 FPS)
  const interpolateFrames = useCallback(() => {
    const lerpFactor = 0.25; // Smooth interpolation factor

    const currentMap = currentMapRef.current;
    const targetMap = targetMapRef.current;

    targetMap.forEach((target, id) => {
      let current = currentMap.get(id);
      if (!current) {
        currentMap.set(id, { ...target });
      } else {
        // Interpolate lat & lon
        current.lat += (target.lat - current.lat) * lerpFactor;
        current.lon += (target.lon - current.lon) * lerpFactor;

        // Angle interpolation (shortest path)
        let diff = (target.heading - current.heading + 360) % 360;
        if (diff > 180) diff -= 360;
        current.heading = (current.heading + diff * lerpFactor + 360) % 360;

        current.speed = target.speed;
        current.timestamp = target.timestamp;
      }
    });

    // Clean up removed vehicles
    currentMap.forEach((_, id) => {
      if (!targetMap.has(id)) {
        currentMap.delete(id);
      }
    });

    // Measure FPS
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    animationFrameRef.current = requestAnimationFrame(interpolateFrames);
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(interpolateFrames);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [interpolateFrames]);

  return {
    connected,
    telemetry,
    fps,
    getCurrentVehicles: () => Array.from(currentMapRef.current.values()),
    getVehicleHistory: (id: string) => pathHistoryRef.current.get(id) || [],
  };
}
