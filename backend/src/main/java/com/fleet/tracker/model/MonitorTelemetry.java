package com.fleet.tracker.model;

/**
 * MonitorTelemetry — Telemetry metrics payload sent with WebSocket broadcast ticks.
 */
public class MonitorTelemetry {
    public int activeVehicleCount;
    public long snapshotIndex;
    public long totalMutations;
    public double lockLatencyMicros;
    public double deepCopyDurationMs;
    public int threadPoolSize;
    public long timestamp;
    public int payloadSizeBytes;

    public MonitorTelemetry() {}

    public MonitorTelemetry(int activeVehicleCount, long snapshotIndex, long totalMutations,
                            double lockLatencyMicros, double deepCopyDurationMs,
                            int threadPoolSize, long timestamp, int payloadSizeBytes) {
        this.activeVehicleCount = activeVehicleCount;
        this.snapshotIndex = snapshotIndex;
        this.totalMutations = totalMutations;
        this.lockLatencyMicros = lockLatencyMicros;
        this.deepCopyDurationMs = deepCopyDurationMs;
        this.threadPoolSize = threadPoolSize;
        this.timestamp = timestamp;
        this.payloadSizeBytes = payloadSizeBytes;
    }
}
