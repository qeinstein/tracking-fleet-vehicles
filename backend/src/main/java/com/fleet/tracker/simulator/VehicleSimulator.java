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
 * VehicleSimulator — Lagos fleet simulation with a car-following traffic model.
 * <p>
 * Vehicles drive along the real {@link LagosRoadNetwork}, turning randomly at junctions. Each tick
 * they are grouped by lane (edge + direction) and each car keeps a safe headway behind the car
 * ahead — so cars queue up in traffic and never overlap, while clear expressways let fast cars run.
 * The reported speed is the <em>actual</em> speed achieved, so it always matches on-screen motion.
 * <p>
 * A 50&nbsp;Hz coordinator computes movement; the resulting GPS writes are fanned out concurrently
 * to the guarded {@link MonitorVehicleTracker}, which the WebSocket broadcaster reads in parallel —
 * the Java Monitor Pattern under concurrent readers and writers.
 */
@Component
public class VehicleSimulator {

    private static final Logger log = LoggerFactory.getLogger(VehicleSimulator.class);

    public static final double MIN_LAT = 6.393;
    public static final double MAX_LAT = 6.702;
    public static final double MIN_LON = 3.050;
    public static final double MAX_LON = 3.700;

    private static final int THREAD_POOL_SIZE = 16; // reported concurrency scale
    private static final int SIMULATION_INTERVAL_MS = 20; // 50 Hz
    private static final double MOTION_GAIN = 1.6;
    private static final double MAX_SPEED_KMH = 150.0;

    public static final int DEFAULT_FLEET_SIZE = 1200;
    public static final int MIN_FLEET_SIZE = 50;
    public static final int MAX_FLEET_SIZE = 5000;

    private final MonitorVehicleTracker tracker;
    private final LagosRoadNetwork network = new LagosRoadNetwork();
    private final ScheduledExecutorService coordinator = Executors.newSingleThreadScheduledExecutor();
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Random random = new Random();

    private volatile List<SimulatedVehicle> vehicles = new ArrayList<>();
    private volatile int fleetSize = DEFAULT_FLEET_SIZE;

    public VehicleSimulator(MonitorVehicleTracker tracker) {
        this.tracker = tracker;
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

    private void seedFleet(int total) {
        List<SimulatedVehicle> next = new ArrayList<>(total);
        Map<String, Integer> perDistrict = new HashMap<>();

        for (int i = 0; i < total; i++) {
            int edgeIndex = random.nextInt(network.edgeCount());
            boolean forward = random.nextBoolean();
            LagosRoadNetwork.Edge e = network.edge(edgeIndex);
            double distAlong = random.nextDouble() * e.length;

            double factor = 0.55 + random.nextDouble() * 0.95; // 0.55–1.50
            if (random.nextDouble() < 0.12) factor *= 1.35;      // ~12% "speedsters"
            double congestion = 0.4 + random.nextDouble() * 0.6;
            double laneOffset = 3.5 + random.nextDouble() * 2.5; // metres to the right of centreline

            double[] loc = network.locate(edgeIndex, forward, distAlong);
            LagosDistrict district = nearestDistrict(loc[0], loc[1]);
            int seq = perDistrict.merge(district.getPrefix(), 1, Integer::sum);
            String id = String.format("%s-%04d", district.getPrefix(), seq);

            SimulatedVehicle v = new SimulatedVehicle(id, district.getName(), edgeIndex, forward,
                    distAlong, factor, congestion, laneOffset);
            v.lon = loc[0];
            v.lat = loc[1];
            v.heading = loc[2];
            v.speed = LagosRoadNetwork.CLASS_SPEED[e.roadClass] * factor * congestion;
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
            coordinator.scheduleAtFixedRate(this::tick, 0, SIMULATION_INTERVAL_MS, TimeUnit.MILLISECONDS);
            log.info("Vehicle simulator started (car-following, {}ms tick).", SIMULATION_INTERVAL_MS);
        }
    }

    /** One simulation step: group by lane, apply car-following, then fan out writes to the monitor. */
    private void tick() {
        if (!running.get()) return;
        try {
            List<SimulatedVehicle> snap = this.vehicles; // volatile read
            double dt = SIMULATION_INTERVAL_MS / 1000.0;

            // Group vehicles by lane (edge + direction).
            Map<Long, List<SimulatedVehicle>> lanes = new HashMap<>();
            for (SimulatedVehicle v : snap) {
                long key = ((long) v.edgeIndex << 1) | (v.forward ? 1L : 0L);
                lanes.computeIfAbsent(key, k -> new ArrayList<>()).add(v);
            }

            // Within each lane, sort by position and let each car follow the one ahead.
            for (List<SimulatedVehicle> lane : lanes.values()) {
                lane.sort((a, b) -> Double.compare(a.distAlong, b.distAlong));
                for (int i = 0; i < lane.size(); i++) {
                    double leaderDist = (i < lane.size() - 1) ? lane.get(i + 1).distAlong : Double.MAX_VALUE;
                    lane.get(i).advance(dt, random, network, leaderDist);
                }
            }

            // Concurrent writes into the guarded monitor tracker.
            snap.parallelStream().forEach(v ->
                    tracker.setLocation(v.id, v.lat, v.lon, v.heading, v.speed));
        } catch (Exception ex) {
            log.warn("simulation tick error: {}", ex.getMessage());
        }
    }

    @PreDestroy
    public synchronized void stopSimulation() {
        if (running.compareAndSet(true, false)) {
            coordinator.shutdown();
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

    /** A vehicle travelling along the road network with car-following behaviour. */
    public static class SimulatedVehicle {
        public final String id;
        public final String hub;
        public double lat;
        public double lon;
        public double heading;
        public double speed; // km/h — the actual achieved speed

        private int edgeIndex;
        private boolean forward;
        private double distAlong;
        private final double speedFactor;
        private double congestion;
        private final double laneOffsetM;

        public SimulatedVehicle(String id, String hub, int edgeIndex, boolean forward, double distAlong,
                                double speedFactor, double congestion, double laneOffsetM) {
            this.id = id;
            this.hub = hub;
            this.edgeIndex = edgeIndex;
            this.forward = forward;
            this.distAlong = distAlong;
            this.speedFactor = speedFactor;
            this.congestion = congestion;
            this.laneOffsetM = laneOffsetM;
        }

        void advance(double dt, Random rand, LagosRoadNetwork network, double leaderDist) {
            // slow-drifting congestion so cars naturally speed up / slow down
            congestion += (rand.nextDouble() - 0.5) * 0.04;
            if (congestion < 0.12) congestion = 0.12;
            if (congestion > 1.08) congestion = 1.08;

            LagosRoadNetwork.Edge e = network.edge(edgeIndex);
            double free = LagosRoadNetwork.CLASS_SPEED[e.roadClass];
            double desiredKmh = Math.min(MAX_SPEED_KMH, free * speedFactor * congestion);
            double desiredMps = desiredKmh * 1000.0 / 3600.0;

            double tentative = distAlong + desiredMps * dt * MOTION_GAIN;

            // Car-following: never advance to within the safe gap behind the car ahead.
            if (leaderDist < Double.MAX_VALUE) {
                double mps = desiredMps;
                double minGap = 6.0 + 0.6 * mps; // larger gap at higher speed
                double maxDist = leaderDist - minGap;
                if (tentative > maxDist) {
                    tentative = Math.max(distAlong, maxDist);
                }
            }

            // Actual achieved speed (honest: matches the distance really covered).
            double moved = Math.max(0, tentative - distAlong);
            double actualMps = (moved / dt) / MOTION_GAIN;
            speed = Math.min(MAX_SPEED_KMH, actualMps * 3.6);
            distAlong = tentative;

            // Cross junctions, choosing a random connected road.
            int guard = 0;
            while (distAlong > e.length && guard++ < 8) {
                distAlong -= e.length;
                int arrivalNode = forward ? e.b : e.a;
                int nextIndex = network.nextEdge(arrivalNode, edgeIndex, rand);
                LagosRoadNetwork.Edge ne = network.edge(nextIndex);
                edgeIndex = nextIndex;
                forward = (ne.a == arrivalNode);
                e = ne;
            }

            double[] loc = network.locate(edgeIndex, forward, distAlong);
            double h = loc[2];
            double rad = Math.toRadians(h);
            // offset to the right of travel direction so opposing lanes don't sit on the centreline
            double eastM = Math.cos(rad) * laneOffsetM;
            double northM = -Math.sin(rad) * laneOffsetM;
            double lat0 = loc[1];
            this.lat = lat0 + northM / 111_320.0;
            this.lon = loc[0] + eastM / (111_320.0 * Math.cos(Math.toRadians(lat0)));
            this.heading = h;
        }
    }
}
