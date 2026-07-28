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
 * VehicleSimulator — High-concurrency GPS update simulation engine.
 * <p>
 * Simulates 1,000+ active fleet vehicles traversing Nigerian highway corridors bounded by:
 * <ul>
 *   <li>Latitude: 4.0°N to 14.0°N</li>
 *   <li>Longitude: 3.0°E to 15.0°E</li>
 * </ul>
 * Drives updates across a multi-threaded {@link ScheduledExecutorService} pool with >5,000 mutations/sec.
 */
@Component
public class VehicleSimulator {

    private static final Logger log = LoggerFactory.getLogger(VehicleSimulator.class);

    // Nigerian Coordinate Boundaries
    public static final double MIN_LAT = 4.0;
    public static final double MAX_LAT = 14.0;
    public static final double MIN_LON = 3.0;
    public static final double MAX_LON = 15.0;

    private static final int THREAD_POOL_SIZE = 16;
    private static final int SIMULATION_INTERVAL_MS = 20; // 50 Hz tick rate across worker threads

    private final MonitorVehicleTracker tracker;
    private final ScheduledExecutorService executorService;
    private final List<SimulatedVehicle> vehicleList = new ArrayList<>();
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Random random = new Random();

    public VehicleSimulator(MonitorVehicleTracker tracker) {
        this.tracker = tracker;
        this.executorService = Executors.newScheduledThreadPool(THREAD_POOL_SIZE);
    }

    @PostConstruct
    public void initializeAndStart() {
        initializeVehicles();
        startSimulation();
    }

    /**
     * Seed 1,000+ distinct vehicles around Nigerian hubs.
     */
    public void initializeVehicles() {
        vehicleList.clear();

        for (NigerianHub hub : NigerianHub.values()) {
            int count = hub.getDefaultVehicleCount();
            for (int i = 1; i <= count; i++) {
                String vehicleId = String.format("%s-%03d", hub.getPrefix(), i);

                // Initial position randomized within radius of hub city center
                double radiusOffset = 0.05 + (random.nextDouble() * 0.15); // ~5-20km offset
                double angle = random.nextDouble() * 2 * Math.PI;

                double lat = Math.min(MAX_LAT, Math.max(MIN_LAT, hub.getLatitude() + (Math.sin(angle) * radiusOffset)));
                double lon = Math.min(MAX_LON, Math.max(MIN_LON, hub.getLongitude() + (Math.cos(angle) * radiusOffset)));

                double heading = random.nextDouble() * 360.0;
                double speed = 40.0 + random.nextDouble() * 70.0; // 40 to 110 km/h

                SimulatedVehicle vehicle = new SimulatedVehicle(vehicleId, hub.getName(), lat, lon, heading, speed);
                vehicleList.add(vehicle);

                // Initial seed in Monitor Tracker
                tracker.setLocation(vehicleId, lat, lon, heading, speed);
            }
        }

        log.info("Initialized {} vehicles across {} Nigerian hubs.", vehicleList.size(), NigerianHub.values().length);
    }

    /**
     * Start the multi-threaded simulation updates.
     */
    public synchronized void startSimulation() {
        if (running.compareAndSet(false, true)) {
            // Partition vehicles across worker threads
            int batchSize = (int) Math.ceil((double) vehicleList.size() / THREAD_POOL_SIZE);
            for (int t = 0; t < THREAD_POOL_SIZE; t++) {
                int startIdx = t * batchSize;
                int endIdx = Math.min(vehicleList.size(), startIdx + batchSize);
                if (startIdx < vehicleList.size()) {
                    List<SimulatedVehicle> partition = vehicleList.subList(startIdx, endIdx);
                    executorService.scheduleAtFixedRate(() -> updatePartition(partition), 0, SIMULATION_INTERVAL_MS, TimeUnit.MILLISECONDS);
                }
            }
            log.info("Vehicle simulator started with {} threads, tick interval {}ms.", THREAD_POOL_SIZE, SIMULATION_INTERVAL_MS);
        }
    }

    private void updatePartition(List<SimulatedVehicle> partition) {
        if (!running.get()) return;

        for (SimulatedVehicle vehicle : partition) {
            vehicle.move(SIMULATION_INTERVAL_MS / 1000.0);
            // Guarded call to JCIP Monitor Tracker (acquires intrinsic lock)
            tracker.setLocation(
                    vehicle.id,
                    vehicle.lat,
                    vehicle.lon,
                    vehicle.heading,
                    vehicle.speed
            );
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
        return vehicleList;
    }

    public boolean isRunning() {
        return running.get();
    }

    public int getThreadPoolSize() {
        return THREAD_POOL_SIZE;
    }

    /**
     * Internal vehicle state container for physics update math.
     */
    public static class SimulatedVehicle {
        public final String id;
        public final String hub;
        public double lat;
        public double lon;
        public double heading; // degrees
        public double speed;   // km/h

        private final Random rand = new Random();

        public SimulatedVehicle(String id, String hub, double lat, double lon, double heading, double speed) {
            this.id = id;
            this.hub = hub;
            this.lat = lat;
            this.lon = lon;
            this.heading = heading;
            this.speed = speed;
        }

        public void move(double deltaTimeSeconds) {
            // Slight steering adjustment (smooth curve wander)
            double steeringDelta = (rand.nextDouble() - 0.5) * 4.0; // +/- 2 degrees
            heading = (heading + steeringDelta + 360) % 360;

            // Speed fluctuation
            double speedDelta = (rand.nextDouble() - 0.5) * 2.0;
            speed = Math.max(20.0, Math.min(120.0, speed + speedDelta));

            // Convert speed (km/h) to displacement in degrees lat/lon (~111 km per lat degree)
            double speedMetersPerSec = (speed * 1000.0) / 3600.0;
            double distanceMeters = speedMetersPerSec * deltaTimeSeconds * 10.0; // Acceleration factor for demo dynamics

            double rad = Math.toRadians(heading);
            double deltaLat = (distanceMeters * Math.cos(rad)) / 111_000.0;
            double deltaLon = (distanceMeters * Math.sin(rad)) / (111_000.0 * Math.cos(Math.toRadians(lat)));

            double nextLat = lat + deltaLat;
            double nextLon = lon + deltaLon;

            // Boundary collision handling (Turn around smoothly if hitting Nigeria borders)
            if (nextLat < MIN_LAT || nextLat > MAX_LAT) {
                heading = (180 - heading + 360) % 360;
                nextLat = Math.min(MAX_LAT - 0.05, Math.max(MIN_LAT + 0.05, nextLat));
            }

            if (nextLon < MIN_LON || nextLon > MAX_LON) {
                heading = (360 - heading) % 360;
                nextLon = Math.min(MAX_LON - 0.05, Math.max(MIN_LON + 0.05, nextLon));
            }

            this.lat = nextLat;
            this.lon = nextLon;
        }
    }
}
