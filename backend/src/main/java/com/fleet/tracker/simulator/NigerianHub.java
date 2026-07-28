package com.fleet.tracker.simulator;

public enum NigerianHub {
    LAGOS("Lagos", "NG-LOS", 6.5244, 3.3792, 300),
    ABUJA("Abuja", "NG-ABJ", 9.0765, 7.3986, 250),
    KANO("Kano", "NG-KAN", 12.0022, 8.5919, 200),
    PORT_HARCOURT("Port Harcourt", "NG-PHC", 4.8156, 7.0498, 150),
    IBADAN("Ibadan", "NG-IBA", 7.3775, 3.9470, 100);

    private final String name;
    private final String prefix;
    private final double latitude;
    private final double longitude;
    private final int defaultVehicleCount;

    NigerianHub(String name, String prefix, double latitude, double longitude, int defaultVehicleCount) {
        this.name = name;
        this.prefix = prefix;
        this.latitude = latitude;
        this.longitude = longitude;
        this.defaultVehicleCount = defaultVehicleCount;
    }

    public String getName() {
        return name;
    }

    public String getPrefix() {
        return prefix;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public int getDefaultVehicleCount() {
        return defaultVehicleCount;
    }
}
