package com.fleet.tracker;

import com.fleet.tracker.model.MutablePoint;
import com.fleet.tracker.tracker.MonitorVehicleTracker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class MonitorVehicleTrackerTest {

    private MonitorVehicleTracker tracker;

    @BeforeEach
    void setUp() {
        tracker = new MonitorVehicleTracker();
        tracker.setLocation("NG-LOS-001", 6.5244, 3.3792, 90.0, 60.0);
        tracker.setLocation("NG-ABJ-001", 9.0765, 7.3986, 180.0, 80.0);
    }

    @Test
    @DisplayName("JCIP Listing 4.5: Deep Copy Isolation Test")
    void testDeepCopyIsolation() {
        // Retrieve snapshot map via Monitor pattern accessor
        Map<String, MutablePoint> snapshot = tracker.getLocations();

        // Verify initial coordinates
        MutablePoint pointInSnapshot = snapshot.get("NG-LOS-001");
        assertNotNull(pointInSnapshot);
        assertEquals(6.5244, pointInSnapshot.x, 0.0001);

        // Attempt to mutate the point extracted from snapshot
        pointInSnapshot.x = 99.9999;
        pointInSnapshot.y = 88.8888;

        // Re-query tracker to ensure internal state was NOT modified by snapshot mutation
        MutablePoint actualPoint = tracker.getLocation("NG-LOS-001");
        assertNotNull(actualPoint);
        assertEquals(6.5244, actualPoint.x, 0.0001, "Internal point lat must remain unchanged despite snapshot mutation!");
        assertEquals(3.3792, actualPoint.y, 0.0001, "Internal point lon must remain unchanged despite snapshot mutation!");
    }

    @Test
    @DisplayName("High Concurrency Multi-Threaded Read/Write Stress Test")
    void testConcurrentReadWriteSafety() throws InterruptedException {
        int writerThreads = 10;
        int updatesPerThread = 500;
        ExecutorService executor = Executors.newFixedThreadPool(writerThreads + 2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(writerThreads);

        // Writer threads updating vehicle positions concurrently
        for (int i = 0; i < writerThreads; i++) {
            final String vehicleId = "NG-CONC-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int j = 0; j < updatesPerThread; j++) {
                        tracker.setLocation(vehicleId, 6.0 + (j * 0.001), 3.0 + (j * 0.001), 45.0, 50.0);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Reader thread taking continuous snapshots
        executor.submit(() -> {
            try {
                startLatch.await();
                while (doneLatch.getCount() > 0) {
                    Map<String, MutablePoint> snap = tracker.getLocations();
                    assertNotNull(snap);
                    Thread.sleep(10);
                }
            } catch (InterruptedException ignored) {}
        });

        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertTrue(completed, "Concurrent writers completed without deadlock");
        assertEquals(2 + writerThreads, tracker.getVehicleCount(), "Vehicle count reflects all concurrent insertions");
    }
}
