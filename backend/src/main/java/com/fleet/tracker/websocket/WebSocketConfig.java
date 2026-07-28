package com.fleet.tracker.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final FleetWebSocketHandler fleetWebSocketHandler;

    public WebSocketConfig(FleetWebSocketHandler fleetWebSocketHandler) {
        this.fleetWebSocketHandler = fleetWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(fleetWebSocketHandler, "/fleet/stream")
                .setAllowedOrigins("*");
    }
}
