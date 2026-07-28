package com.fleet.tracker;

import com.fleet.tracker.tracker.MonitorVehicleTracker;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class FleetTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(FleetTrackerApplication.class, args);
    }

    /**
     * Singleton MonitorVehicleTracker instance representing the central thread-safe state container.
     */
    @Bean
    public MonitorVehicleTracker monitorVehicleTracker() {
        return new MonitorVehicleTracker();
    }
}
