package com.fleet.tracker.tracker;

import com.fleet.tracker.model.MutablePoint;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * MonitorVehicleTracker — Implements JCIP Listing 4.5 (Java Concurrency in Practice, Section 4.2.2).
 * <p>
 * Demonstrates the <b>Java Monitor Pattern</b>.
 * All accessors ({@link #getLocations()}, {@link #getLocation(String)}, {@link #setLocation(String, double, double, double, double)})
 * are guarded by {@code synchronized} on {@code this} (the intrinsic lock).
 * <p>
 * Crucially, {@link #getLocations()} performs a <b>deep copy</b> of the inner {@link MutablePoint} instances
 * before publishing to callers, preventing escape of mutable references.
 */
public class MonitorVehicleTracker {

    private final Map<String, MutablePoint> locations;

    // Telemetry & Benchmark counters
    private final AtomicLong mutationCount = new AtomicLong(0);
    private final AtomicLong snapshotCount = new AtomicLong(0);

    private volatile double lastLockLatencyMicros = 0.0;
    private volatile double lastDeepCopyDurationMs = 0.0;

    public MonitorVehicleTracker(Map<String, MutablePoint> locations) {
        this.locations = deepCopy(locations);
    }

    public MonitorVehicleTracker() {
        this.locations = new HashMap<>();
    }

    /**
     * Retrieves a deep copy of all vehicle locations.
     * JCIP Listing 4.5 requirement: Must deep-copy map and inner MutablePoints while holding intrinsic lock.
     *
     * @return Unmodifiable deep copy map of vehicle IDs to MutablePoints.
     */
    public synchronized Map<String, MutablePoint> getLocations() {
        long startNanos = System.nanoTime();
        Map<String, MutablePoint> copy = deepCopy(locations);
        long endNanos = System.nanoTime();

        this.lastDeepCopyDurationMs = (endNanos - startNanos) / 1_000_000.0;
        this.snapshotCount.incrementAndGet();

        return Collections.unmodifiableMap(copy);
    }

    /**
     * Retrieves a deep copy of a single vehicle location.
     *
     * @param id Vehicle identifier
     * @return Deep copy of MutablePoint, or null if non-existent.
     */
    public synchronized MutablePoint getLocation(String id) {
        MutablePoint loc = locations.get(id);
        return loc == null ? null : new MutablePoint(loc);
    }

    /**
     * Mutates or inserts a vehicle location.
     * Guarded by intrinsic lock to ensure thread safety against concurrent deep-copy readers.
     */
    public synchronized void setLocation(String id, double x, double y, double heading, double speed) {
        long startNanos = System.nanoTime();
        
        MutablePoint loc = locations.get(id);
        if (loc == null) {
            locations.put(id, new MutablePoint(x, y, heading, speed));
        } else {
            loc.x = x;
            loc.y = y;
            loc.heading = heading;
            loc.speed = speed;
            loc.timestamp = System.currentTimeMillis();
        }

        long endNanos = System.nanoTime();
        this.lastLockLatencyMicros = (endNanos - startNanos) / 1_000.0;
        this.mutationCount.incrementAndGet();
    }

    /**
     * Removes a vehicle from the tracker.
     */
    public synchronized void removeLocation(String id) {
        locations.remove(id);
    }

    /**
     * Clears all tracked vehicles. Guarded by the intrinsic lock so it is safe to invoke
     * while reader threads may be taking deep-copy snapshots.
     */
    public synchronized void clear() {
        locations.clear();
    }

    /**
     * Helper method to perform a full deep copy of the map and inner MutablePoints.
     * Private helper invoked strictly while holding the monitor lock.
     */
    private static Map<String, MutablePoint> deepCopy(Map<String, MutablePoint> m) {
        Map<String, MutablePoint> result = new HashMap<>();
        for (String id : m.keySet()) {
            result.put(id, new MutablePoint(m.get(id)));
        }
        return result;
    }

    // Telemetry getters
    public long getMutationCount() {
        return mutationCount.get();
    }

    public long getSnapshotCount() {
        return snapshotCount.get();
    }

    public double getLastLockLatencyMicros() {
        return lastLockLatencyMicros;
    }

    public double getLastDeepCopyDurationMs() {
        return lastDeepCopyDurationMs;
    }

    public synchronized int getVehicleCount() {
        return locations.size();
    }
}
