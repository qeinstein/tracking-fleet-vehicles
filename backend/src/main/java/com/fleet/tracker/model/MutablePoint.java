package com.fleet.tracker.model;

/**
 * MutablePoint — Implements JCIP Listing 4.4 (Java Concurrency in Practice, Section 4.2.2).
 * <p>
 * This class is intentionally NOT thread-safe on its own.
 * Its thread safety is delegated to and guarded by the intrinsic lock of {@link com.fleet.tracker.tracker.MonitorVehicleTracker}.
 */
public class MutablePoint {
    public double x;         // Latitude (N)
    public double y;         // Longitude (E)
    public double heading;   // Direction bearing in degrees (0 - 360)
    public double speed;     // Vehicle speed in km/h
    public long timestamp;   // Last update timestamp (epoch millis)

    public MutablePoint() {
        this.x = 0.0;
        this.y = 0.0;
        this.heading = 0.0;
        this.speed = 0.0;
        this.timestamp = System.currentTimeMillis();
    }

    public MutablePoint(double x, double y, double heading, double speed) {
        this.x = x;
        this.y = y;
        this.heading = heading;
        this.speed = speed;
        this.timestamp = System.currentTimeMillis();
    }

    public MutablePoint(double x, double y, double heading, double speed, long timestamp) {
        this.x = x;
        this.y = y;
        this.heading = heading;
        this.speed = speed;
        this.timestamp = timestamp;
    }

    /**
     * JCIP Listing 4.4 mandatory Copy Constructor.
     * Used by MonitorVehicleTracker to safely perform deep copies.
     *
     * @param p The source MutablePoint instance to copy.
     */
    public MutablePoint(MutablePoint p) {
        this.x = p.x;
        this.y = p.y;
        this.heading = p.heading;
        this.speed = p.speed;
        this.timestamp = p.timestamp;
    }
}
