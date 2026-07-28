package com.fleet.tracker.simulator;

import com.fleet.tracker.tracker.MonitorVehicleTracker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * VehicleSimulator — High-concurrency GPS update simulation engine, bounded to Lagos State.
 * <p>
 * Simulates a live fleet of vehicles driving around the Lagos metropolitan area:
 * <ul>
 *   <li>Latitude:  {@value #MIN_LAT}°N to {@value #MAX_LAT}°N</li>
 *   <li>Longitude: {@value #MIN_LON}°E to {@value #MAX_LON}°E</li>
 * </ul>
 * A fixed pool of {@value #THREAD_POOL_SIZE} worker threads advances vehicle vectors at 50&nbsp;Hz,
 * producing thousands of guarded GPS mutations per second against the {@link MonitorVehicleTracker}.
 * <p>
 * The active fleet is published as a {@code volatile} snapshot list so it can be reseeded or resized
 * at runtime without invalidating the worker partitions (workers stride the current list each tick).
 */
@Component
public class VehicleSimulator {

    private static final Logger log = LoggerFactory.getLogger(VehicleSimulator.class);

    // Lagos State metropolitan bounding box — the fleet never leaves this area.
    public static final double MIN_LAT = 6.393;
    public static final double MAX_LAT = 6.702;
    public static final double MIN_LON = 3.050;
    public static final double MAX_LON = 3.700;

    private static final int THREAD_POOL_SIZE = 16;
    private static final int SIMULATION_INTERVAL_MS = 20; // 50 Hz tick rate across worker threads

    public static final int DEFAULT_FLEET_SIZE = 1200;
    public static final int MIN_FLEET_SIZE = 50;
    public static final int MAX_FLEET_SIZE = 5000;

    private final MonitorVehicleTracker tracker;
    private final ScheduledExecutorService executorService;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Random random = new Random();

    /** Current active fleet, swapped atomically on reseed/resize. Workers read this each tick. */
    private volatile List<SimulatedVehicle> vehicles = new ArrayList<>();
    private volatile int fleetSize = DEFAULT_FLEET_SIZE;

    public VehicleSimulator(MonitorVehicleTracker tracker) {
        this.tracker = tracker;
        this.executorService = Executors.newScheduledThreadPool(THREAD_POOL_SIZE);
    }

    @PostConstruct
    public void initializeAndStart() {
        initializeVehicles();
        startSimulation();
    }

    /** Reseed the fleet at the current fleet size. */
    public void initializeVehicles() {
        seedFleet(this.fleetSize);
    }

    /** Resize the fleet at runtime and reseed. Clamped to [{@value #MIN_FLEET_SIZE}, {@value #MAX_FLEET_SIZE}]. */
    public void setFleetSize(int requested) {
        int clamped = Math.max(MIN_FLEET_SIZE, Math.min(MAX_FLEET_SIZE, requested));
        this.fleetSize = clamped;
        seedFleet(clamped);
    }

    /**
     * Build a brand-new fleet of {@code total} vehicles distributed across Lagos districts by weight,
     * reset the tracker, seed initial positions, then publish the new list to the workers.
     */
    private void seedFleet(int total) {
        List<SimulatedVehicle> next = new ArrayList<>(total);
        double totalWeight = LagosDistrict.totalWeight();

        int assigned = 0;
        LagosDistrict[] districts = LagosDistrict.values();
        for (int d = 0; d < districts.length; d++) {
            LagosDistrict hub = districts[d];
            int count = (d == districts.length - 1)
                    ? Math.max(0, total - assigned)                       // last district absorbs rounding
                    : (int) Math.round(total * (hub.getWeight() / totalWeight));
            assigned += count;

            for (int i = 1; i <= count; i++) {
                String vehicleId = String.format("%s-%04d", hub.getPrefix(), i);

                // Scatter within ~0.6–3.5 km of the district centre, clamped to Lagos bounds.
                double radiusOffset = 0.006 + (random.nextDouble() * 0.026);
                double angle = random.nextDouble() * 2 * Math.PI;
                double lat = clampLat(hub.getLatitude() + Math.sin(angle) * radiusOffset);
                double lon = clampLon(hub.getLongitude() + Math.cos(angle) * radiusOffset);

                double heading = random.nextDouble() * 360.0;
                double speed = 8.0 + random.nextDouble() * 47.0; // 8–55 km/h city driving

                SimulatedVehicle v = new SimulatedVehicle(vehicleId, hub.getName(), lat, lon, heading, speed);
                next.add(v);
            }
        }

        // Publish the new fleet, then reset & seed the monitor tracker.
        this.vehicles = next;
        tracker.clear();
        for (SimulatedVehicle v : next) {
            tracker.setLocation(v.id, v.lat, v.lon, v.heading, v.speed);
        }

        log.info("Seeded {} vehicles across {} Lagos districts.", next.size(), districts.length);
    }

    /** Start the fixed worker pool. Each worker strides the current volatile fleet list. */
    public synchronized void startSimulation() {
        if (running.compareAndSet(false, true)) {
            for (int t = 0; t < THREAD_POOL_SIZE; t++) {
                final int threadIndex = t;
                executorService.scheduleAtFixedRate(
                        () -> updatePartition(threadIndex),
                        0, SIMULATION_INTERVAL_MS, TimeUnit.MILLISECONDS);
            }
            log.info("Vehicle simulator started with {} threads, tick interval {}ms.", THREAD_POOL_SIZE, SIMULATION_INTERVAL_MS);
        }
    }

    /** Worker {@code threadIndex} updates every vehicle whose index ≡ threadIndex (mod pool size). */
    private void updatePartition(int threadIndex) {
        if (!running.get()) return;
        List<SimulatedVehicle> snapshot = this.vehicles; // volatile read
        double dt = SIMULATION_INTERVAL_MS / 1000.0;
        for (int i = threadIndex; i < snapshot.size(); i += THREAD_POOL_SIZE) {
            SimulatedVehicle vehicle = snapshot.get(i);
            vehicle.move(dt, random);
            // Guarded call to the JCIP Monitor Tracker (acquires the intrinsic lock).
            tracker.setLocation(vehicle.id, vehicle.lat, vehicle.lon, vehicle.heading, vehicle.speed);
        }
    }

    @PreDestroy
    public synchronized void stopSimulation() {
        if (running.compareAndSet(true, false)) {
            executorService.shutdown();
            log.info("Vehicle simulator stopped.");
        }
    }

    public List<SimulatedVehicle> getVehicleList() {
        return vehicles;
    }

    public boolean isRunning() {
        return running.get();
    }

    public int getThreadPoolSize() {
        return THREAD_POOL_SIZE;
    }

    public int getFleetSize() {
        return fleetSize;
    }

    private static double clampLat(double lat) {
        return Math.max(MIN_LAT, Math.min(MAX_LAT, lat));
    }

    private static double clampLon(double lon) {
        return Math.max(MIN_LON, Math.min(MAX_LON, lon));
    }

    /**
     * Internal vehicle state container for physics update math.
     */
    public static class SimulatedVehicle {
        public final String id;
        public final String hub;
        public double lat;
        public double lon;
        public double heading; // degrees, clockwise from north
        public double speed;   // km/h

        public SimulatedVehicle(String id, String hub, double lat, double lon, double heading, double speed) {
            this.id = id;
            this.hub = hub;
            this.lat = lat;
            this.lon = lon;
            this.heading = heading;
            this.speed = speed;
        }

        public void move(double deltaTimeSeconds, Random rand) {
            // Gentle steering wander to mimic turns through the street grid.
            double steeringDelta = (rand.nextDouble() - 0.5) * 6.0; // +/- 3 degrees
            heading = (heading + steeringDelta + 360) % 360;

            // Realistic Lagos traffic speed fluctuation (occasional near-stops).
            double speedDelta = (rand.nextDouble() - 0.5) * 4.0;
            speed = Math.max(0.0, Math.min(60.0, speed + speedDelta));

            // Convert km/h to a per-tick displacement in degrees (slightly amplified for lively motion).
            double speedMetersPerSec = (speed * 1000.0) / 3600.0;
            double distanceMeters = speedMetersPerSec * deltaTimeSeconds * 1.6;

            double rad = Math.toRadians(heading);
            double deltaLat = (distanceMeters * Math.cos(rad)) / 111_000.0;
            double deltaLon = (distanceMeters * Math.sin(rad)) / (111_000.0 * Math.cos(Math.toRadians(lat)));

            double nextLat = lat + deltaLat;
            double nextLon = lon + deltaLon;

            // Reflect off the Lagos State boundary so vehicles turn back into the metro area.
            if (nextLat < MIN_LAT || nextLat > MAX_LAT) {
                heading = (180 - heading + 360) % 360;
                nextLat = Math.min(MAX_LAT - 0.002, Math.max(MIN_LAT + 0.002, nextLat));
            }
            if (nextLon < MIN_LON || nextLon > MAX_LON) {
                heading = (360 - heading) % 360;
                nextLon = Math.min(MAX_LON - 0.002, Math.max(MIN_LON + 0.002, nextLon));
            }

            this.lat = nextLat;
            this.lon = nextLon;
        }
    }
}
