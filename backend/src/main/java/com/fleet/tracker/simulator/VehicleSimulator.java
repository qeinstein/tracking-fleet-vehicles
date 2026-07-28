package com.fleet.tracker.simulator;

import com.fleet.tracker.tracker.MonitorVehicleTracker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * VehicleSimulator — high-concurrency GPS simulation engine for a Lagos fleet.
 * <p>
 * Vehicles drive along a {@link LagosRoadNetwork} (real major corridors), turning at
 * junctions, at speeds that vary by road class, by vehicle, and with fluctuating congestion —
 * so the fleet flows along roads rather than wandering, with a realistic mix of fast and slow cars.
 * <p>
 * A pool of {@value #THREAD_POOL_SIZE} worker threads advances the fleet at 50&nbsp;Hz, funnelling
 * every GPS write through the guarded {@link MonitorVehicleTracker}. The active fleet is published
 * as a {@code volatile} snapshot list so it can be resized at runtime without invalidating workers.
 */
@Component
public class VehicleSimulator {

    private static final Logger log = LoggerFactory.getLogger(VehicleSimulator.class);

    // Lagos State metropolitan bounding box (kept for reference / FE parity).
    public static final double MIN_LAT = 6.393;
    public static final double MAX_LAT = 6.702;
    public static final double MIN_LON = 3.050;
    public static final double MAX_LON = 3.700;

    private static final int THREAD_POOL_SIZE = 16;
    private static final int SIMULATION_INTERVAL_MS = 20; // 50 Hz
    private static final double MOTION_GAIN = 1.6; // amplify displacement so motion is lively on-map

    public static final int DEFAULT_FLEET_SIZE = 1200;
    public static final int MIN_FLEET_SIZE = 50;
    public static final int MAX_FLEET_SIZE = 5000;

    private final MonitorVehicleTracker tracker;
    private final LagosRoadNetwork network = new LagosRoadNetwork();
    private final ScheduledExecutorService executorService;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Random random = new Random();

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

    public void initializeVehicles() {
        seedFleet(this.fleetSize);
    }

    public void setFleetSize(int requested) {
        int clamped = Math.max(MIN_FLEET_SIZE, Math.min(MAX_FLEET_SIZE, requested));
        this.fleetSize = clamped;
        seedFleet(clamped);
    }

    /** Build a new fleet spread across the road network, reset the tracker, then publish it. */
    private void seedFleet(int total) {
        List<SimulatedVehicle> next = new ArrayList<>(total);
        Map<String, Integer> perDistrict = new HashMap<>();

        for (int i = 0; i < total; i++) {
            int edgeIndex = random.nextInt(network.edgeCount());
            boolean forward = random.nextBoolean();
            LagosRoadNetwork.Edge e = network.edge(edgeIndex);
            double distAlong = random.nextDouble() * e.length;
            double speedFactor = 0.55 + random.nextDouble() * 0.85; // 0.55–1.40
            double congestion = 0.35 + random.nextDouble() * 0.65;

            double[] loc = network.locate(edgeIndex, forward, distAlong);
            LagosDistrict district = nearestDistrict(loc[0], loc[1]);
            int seq = perDistrict.merge(district.getPrefix(), 1, Integer::sum);
            String id = String.format("%s-%04d", district.getPrefix(), seq);

            SimulatedVehicle v = new SimulatedVehicle(id, district.getName(), edgeIndex, forward, distAlong, speedFactor, congestion);
            v.lat = loc[1];
            v.lon = loc[0];
            v.heading = loc[2];
            v.speed = LagosRoadNetwork.CLASS_SPEED[e.roadClass] * speedFactor * congestion;
            next.add(v);
        }

        this.vehicles = next;
        tracker.clear();
        for (SimulatedVehicle v : next) {
            tracker.setLocation(v.id, v.lat, v.lon, v.heading, v.speed);
        }
        log.info("Seeded {} vehicles onto the Lagos road network ({} edges).", next.size(), network.edgeCount());
    }

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

    private void updatePartition(int threadIndex) {
        if (!running.get()) return;
        List<SimulatedVehicle> snapshot = this.vehicles; // volatile read
        double dt = SIMULATION_INTERVAL_MS / 1000.0;
        for (int i = threadIndex; i < snapshot.size(); i += THREAD_POOL_SIZE) {
            SimulatedVehicle vehicle = snapshot.get(i);
            vehicle.move(dt, random, network);
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

    private static LagosDistrict nearestDistrict(double lon, double lat) {
        LagosDistrict best = LagosDistrict.IKEJA;
        double bestD = Double.MAX_VALUE;
        for (LagosDistrict d : LagosDistrict.values()) {
            double dl = lon - d.getLongitude();
            double da = lat - d.getLatitude();
            double dist = dl * dl + da * da;
            if (dist < bestD) {
                bestD = dist;
                best = d;
            }
        }
        return best;
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

    /**
     * A vehicle travelling along the road network.
     */
    public static class SimulatedVehicle {
        public final String id;
        public final String hub;
        public double lat;
        public double lon;
        public double heading;
        public double speed; // km/h

        private int edgeIndex;
        private boolean forward;
        private double distAlong;   // metres travelled along the current directed edge
        private final double speedFactor; // persistent per-vehicle temperament
        private double congestion;  // slowly varying traffic factor

        public SimulatedVehicle(String id, String hub, int edgeIndex, boolean forward,
                                double distAlong, double speedFactor, double congestion) {
            this.id = id;
            this.hub = hub;
            this.edgeIndex = edgeIndex;
            this.forward = forward;
            this.distAlong = distAlong;
            this.speedFactor = speedFactor;
            this.congestion = congestion;
        }

        public void move(double deltaTimeSeconds, Random rand, LagosRoadNetwork network) {
            // Congestion random-walks slowly so some cars stay quick and others bog down.
            congestion += (rand.nextDouble() - 0.5) * 0.04;
            if (congestion < 0.12) congestion = 0.12;
            if (congestion > 1.05) congestion = 1.05;

            LagosRoadNetwork.Edge e = network.edge(edgeIndex);
            double freeFlow = LagosRoadNetwork.CLASS_SPEED[e.roadClass];
            double targetKmh = freeFlow * speedFactor * congestion;
            // ease current speed toward target for smooth accel/decel
            speed += (targetKmh - speed) * 0.12;
            if (speed < 0) speed = 0;

            double metresPerSec = (speed * 1000.0) / 3600.0;
            distAlong += metresPerSec * deltaTimeSeconds * MOTION_GAIN;

            // Advance across junctions when we run past the end of the current edge.
            int guard = 0;
            while (distAlong > e.length && guard++ < 8) {
                distAlong -= e.length;
                int arrivalNode = forward ? e.b : e.a;
                int nextIndex = network.nextEdge(arrivalNode, edgeIndex, rand);
                LagosRoadNetwork.Edge ne = network.edge(nextIndex);
                edgeIndex = nextIndex;
                forward = (ne.a == arrivalNode); // travel away from the junction we arrived at
                e = ne;
            }

            double[] loc = network.locate(edgeIndex, forward, distAlong);
            this.lon = loc[0];
            this.lat = loc[1];
            this.heading = loc[2];
        }
    }
}
