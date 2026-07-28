package com.fleet.tracker.simulator;

/**
 * LagosDistrict — Seeding hubs for the fleet, all located inside Lagos State, Nigeria.
 * <p>
 * The simulation deliberately concentrates the entire fleet within the Lagos metropolitan
 * area so that a viewer zoomed to Lagos always sees a dense, realistic population of vehicles
 * (rather than 1,000 vehicles spread thin across the whole country). Each district carries a
 * relative {@code weight} that determines how many vehicles are seeded there for a given fleet size.
 */
public enum LagosDistrict {
    IKEJA("Ikeja", "LAG-IKJ", 6.6018, 3.3515, 1.6),
    VICTORIA_ISLAND("Victoria Island", "LAG-VIL", 6.4281, 3.4219, 1.2),
    LEKKI("Lekki", "LAG-LEK", 6.4478, 3.5410, 1.4),
    YABA("Yaba", "LAG-YAB", 6.5095, 3.3711, 0.9),
    SURULERE("Surulere", "LAG-SUR", 6.5006, 3.3556, 0.9),
    APAPA("Apapa", "LAG-APA", 6.4489, 3.3595, 0.8),
    IKORODU("Ikorodu", "LAG-IKO", 6.6194, 3.5105, 0.9),
    OSHODI("Oshodi", "LAG-OSH", 6.5551, 3.3488, 1.0),
    AGEGE("Agege", "LAG-AGE", 6.6155, 3.3204, 0.7),
    FESTAC("Festac", "LAG-FES", 6.4667, 3.2870, 0.7),
    AJAH("Ajah", "LAG-AJA", 6.4676, 3.5719, 1.0),
    GBAGADA("Gbagada", "LAG-GBA", 6.5486, 3.3897, 0.9);

    private final String name;
    private final String prefix;
    private final double latitude;
    private final double longitude;
    private final double weight;

    LagosDistrict(String name, String prefix, double latitude, double longitude, double weight) {
        this.name = name;
        this.prefix = prefix;
        this.latitude = latitude;
        this.longitude = longitude;
        this.weight = weight;
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

    public double getWeight() {
        return weight;
    }

    public static double totalWeight() {
        double sum = 0;
        for (LagosDistrict d : values()) {
            sum += d.weight;
        }
        return sum;
    }
}
