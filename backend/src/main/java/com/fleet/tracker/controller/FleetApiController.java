package com.fleet.tracker.controller;

import com.fleet.tracker.model.MonitorTelemetry;
import com.fleet.tracker.model.MutablePoint;
import com.fleet.tracker.simulator.VehicleSimulator;
import com.fleet.tracker.tracker.MonitorVehicleTracker;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/fleet")
@CrossOrigin(origins = "*")
public class FleetApiController {

    private final MonitorVehicleTracker tracker;
    private final VehicleSimulator simulator;

    public FleetApiController(MonitorVehicleTracker tracker, VehicleSimulator simulator) {
        this.tracker = tracker;
        this.simulator = simulator;
    }

    @GetMapping("/vehicles")
    public ResponseEntity<Map<String, MutablePoint>> getVehiclesSnapshot() {
        // Invokes JCIP Monitor Pattern deep-copy getter
        return ResponseEntity.ok(tracker.getLocations());
    }

    @GetMapping("/vehicles/{id}")
    public ResponseEntity<MutablePoint> getVehicleLocation(@PathVariable String id) {
        MutablePoint point = tracker.getLocation(id);
        if (point == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(point);
    }

    @GetMapping("/telemetry")
    public ResponseEntity<MonitorTelemetry> getTelemetry() {
        MonitorTelemetry telemetry = new MonitorTelemetry(
                tracker.getVehicleCount(),
                tracker.getSnapshotCount(),
                tracker.getMutationCount(),
                tracker.getLastLockLatencyMicros(),
                tracker.getLastDeepCopyDurationMs(),
                simulator.getThreadPoolSize(),
                System.currentTimeMillis(),
                0
        );
        return ResponseEntity.ok(telemetry);
    }

    @PostMapping("/simulation/reset")
    public ResponseEntity<Map<String, Object>> resetSimulation() {
        simulator.initializeVehicles();
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Reset and reseeded 1,000+ vehicles across Nigerian hubs.");
        response.put("activeVehicles", tracker.getVehicleCount());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("pattern", "Java Monitor Pattern (JCIP 4.2.2)");
        health.put("activeVehicles", tracker.getVehicleCount());
        health.put("simulatorRunning", simulator.isRunning());
        return ResponseEntity.ok(health);
    }
}
