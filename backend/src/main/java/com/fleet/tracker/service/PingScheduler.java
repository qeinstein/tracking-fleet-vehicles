package com.fleet.tracker.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * PingScheduler — Background service sending periodic self-pings every 30 seconds.
 * Keeps free-tier hosting (e.g. Render) active and prevents instance sleep timeouts.
 */
@Service
public class PingScheduler {

    private static final Logger log = LoggerFactory.getLogger(PingScheduler.class);

    @Value("${fleet.ping.url:https://tracking-fleet-vehicles.onrender.com/api/fleet/health}")
    private String pingUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Scheduled(fixedRate = 30000, initialDelay = 10000)
    public void sendKeepAlivePing() {
        try {
            log.info("Sending 30s keep-alive ping to health endpoint: {}", pingUrl);
            String response = restTemplate.getForObject(pingUrl, String.class);
            log.info("Keep-alive ping successful. Health status response: {}", response);
        } catch (Exception e) {
            log.warn("Keep-alive ping failed for {}: {}", pingUrl, e.getMessage());
        }
    }
}
