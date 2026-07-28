package com.fleet.tracker.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleet.tracker.model.MonitorTelemetry;
import com.fleet.tracker.model.MutablePoint;
import com.fleet.tracker.simulator.VehicleSimulator;
import com.fleet.tracker.tracker.MonitorVehicleTracker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * FleetWebSocketHandler — High-performance WebSocket stream handler.
 * <p>
 * Periodically invokes {@link MonitorVehicleTracker#getLocations()} (which acquires the monitor lock
 * and generates a deep copy), serializes the snapshot payload to compact JSON under 150 KB, and streams
 * to connected React frontend clients at 20 Hz (50ms interval).
 */
@Component
public class FleetWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(FleetWebSocketHandler.class);
    private static final int TICK_INTERVAL_MS = 50; // 20 Hz updates

    private final MonitorVehicleTracker tracker;
    private final VehicleSimulator simulator;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final ScheduledExecutorService tickerExecutor = Executors.newSingleThreadScheduledExecutor();

    public FleetWebSocketHandler(MonitorVehicleTracker tracker, VehicleSimulator simulator) {
        this.tracker = tracker;
        this.simulator = simulator;
    }

    @PostConstruct
    public void startBroadcasting() {
        tickerExecutor.scheduleAtFixedRate(this::broadcastSnapshot, 100, TICK_INTERVAL_MS, TimeUnit.MILLISECONDS);
        log.info("WebSocket fleet stream ticker started at {}ms interval (20Hz).", TICK_INTERVAL_MS);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        log.info("WebSocket client connected: {}", session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session);
        log.info("WebSocket client disconnected: {}", session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.warn("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
        sessions.remove(session);
    }

    /**
     * Broadcast tick method.
     * Executes tracker.getLocations() — acquiring intrinsic lock and taking deep copy.
     */
    private void broadcastSnapshot() {
        if (sessions.isEmpty()) return;

        try {
            // Invokes JCIP Monitor Pattern deep copy
            Map<String, MutablePoint> snapshotMap = tracker.getLocations();

            List<Object[]> vehiclesPayload = new ArrayList<>(snapshotMap.size());
            for (Map.Entry<String, MutablePoint> entry : snapshotMap.entrySet()) {
                String id = entry.getKey();
                MutablePoint p = entry.getValue();
                // Compact format: [id, lat, lon, heading, speed, timestamp]
                vehiclesPayload.add(new Object[]{ id, p.x, p.y, p.heading, p.speed, p.timestamp });
            }

            // Construct full frame payload
            Map<String, Object> frame = new HashMap<>();
            frame.type = "FLEET_SNAPSHOT";
            frame.put("vehicles", vehiclesPayload);

            MonitorTelemetry telemetry = new MonitorTelemetry(
                    snapshotMap.size(),
                    tracker.getSnapshotCount(),
                    tracker.getMutationCount(),
                    tracker.getLastLockLatencyMicros(),
                    tracker.getLastDeepCopyDurationMs(),
                    simulator.getThreadPoolSize(),
                    System.currentTimeMillis(),
                    0
            );

            frame.put("telemetry", telemetry);

            String jsonPayload = objectMapper.writeValueAsString(frame);
            telemetry.payloadSizeBytes = jsonPayload.getBytes().length;

            TextMessage textMessage = new TextMessage(jsonPayload);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    synchronized (session) {
                        try {
                            session.sendMessage(textMessage);
                        } catch (IOException e) {
                            log.warn("Error sending message to session {}", session.getId());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error during fleet broadcast tick", e);
        }
    }

    @PreDestroy
    public void stopBroadcasting() {
        tickerExecutor.shutdown();
    }
}
