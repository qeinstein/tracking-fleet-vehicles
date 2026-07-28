package com.fleet.tracker.simulator;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * LagosRoadNetwork — the <b>real</b> Lagos road network, loaded from OpenStreetMap geometry
 * baked into {@code /resources/lagos-roads.json} (motorways, trunk, primary/secondary/tertiary,
 * residential & unclassified roads within Lagos State).
 * <p>
 * Nodes are OSM junctions; edges are the actual road polylines between them (with their real
 * curves). Vehicles traverse an edge and, at each junction, pick a random connected edge — so the
 * fleet drives along real roads and turns randomly at intersections. Road class sets free-flow speed.
 */
public final class LagosRoadNetwork {

    public static final int LOCAL = 0;
    public static final int ARTERIAL = 1;
    public static final int EXPRESSWAY = 2;

    /** Free-flow speed per road class, km/h. */
    public static final double[] CLASS_SPEED = {38.0, 62.0, 96.0};

    public static final class Edge {
        public final int a;
        public final int b;
        public final int roadClass;
        public final double[][] pts; // polyline [lon,lat] from a to b
        public final double[] segLen; // metres per segment
        public final double length; // total metres

        Edge(int a, int b, int roadClass, double[][] pts) {
            this.a = a;
            this.b = b;
            this.roadClass = roadClass;
            this.pts = pts;
            this.segLen = new double[Math.max(1, pts.length - 1)];
            double total = 0;
            for (int i = 0; i < pts.length - 1; i++) {
                segLen[i] = metres(pts[i], pts[i + 1]);
                total += segLen[i];
            }
            this.length = Math.max(total, 1.0); // avoid zero-length edges
        }
    }

    private final Edge[] edges;
    private final List<Integer>[] adjacency;

    /** JSON DTOs matching lagos-roads.json ({nodes:[[lon,lat]], edges:[{a,b,cls,pts}]}). */
    static final class Graph {
        public double[][] nodes;
        public EdgeDTO[] edges;
    }

    static final class EdgeDTO {
        public int a;
        public int b;
        public int cls;
        public double[][] pts;
    }

    @SuppressWarnings("unchecked")
    public LagosRoadNetwork() {
        try (InputStream in = getClass().getResourceAsStream("/lagos-roads.json")) {
            if (in == null) {
                throw new IllegalStateException("lagos-roads.json not found on classpath");
            }
            Graph g = new ObjectMapper().readValue(in, Graph.class);
            int nNodes = g.nodes.length;
            adjacency = new List[nNodes];
            for (int i = 0; i < nNodes; i++) adjacency[i] = new ArrayList<>(2);

            edges = new Edge[g.edges.length];
            for (int i = 0; i < g.edges.length; i++) {
                EdgeDTO d = g.edges[i];
                int cls = (d.cls >= LOCAL && d.cls <= EXPRESSWAY) ? d.cls : LOCAL;
                edges[i] = new Edge(d.a, d.b, cls, d.pts);
                adjacency[d.a].add(i);
                adjacency[d.b].add(i);
            }
        } catch (IOException ex) {
            throw new RuntimeException("Failed to load Lagos road network", ex);
        }
    }

    public int edgeCount() {
        return edges.length;
    }

    public Edge edge(int i) {
        return edges[i];
    }

    /** Pick a connected edge to continue onto at {@code node}, avoiding an immediate U-turn. */
    public int nextEdge(int node, int currentEdge, Random rand) {
        List<Integer> adj = adjacency[node];
        if (adj.isEmpty()) return currentEdge;
        if (adj.size() == 1) return adj.get(0); // dead-end: turn around
        int pick;
        int tries = 0;
        do {
            pick = adj.get(rand.nextInt(adj.size()));
        } while (pick == currentEdge && ++tries < 8);
        return pick;
    }

    /**
     * Locate a point {@code s} metres along an edge in the given direction.
     * Returns {lon, lat, headingDegrees}.
     */
    public double[] locate(int edgeIndex, boolean forward, double s) {
        Edge e = edges[edgeIndex];
        int n = e.pts.length;
        if (n < 2) {
            return new double[]{e.pts[0][0], e.pts[0][1], 0};
        }
        for (int step = 0; step < n - 1; step++) {
            int m = forward ? step : (n - 2 - step);
            double L = e.segLen[m];
            int sp = forward ? m : m + 1;
            int ep = forward ? m + 1 : m;
            if (s <= L || step == n - 2) {
                double t = L > 0 ? Math.max(0, Math.min(1, s / L)) : 0;
                double lon = e.pts[sp][0] + (e.pts[ep][0] - e.pts[sp][0]) * t;
                double lat = e.pts[sp][1] + (e.pts[ep][1] - e.pts[sp][1]) * t;
                double heading = bearing(e.pts[sp], e.pts[ep]);
                return new double[]{lon, lat, heading};
            }
            s -= L;
        }
        double[] end = forward ? e.pts[n - 1] : e.pts[0];
        return new double[]{end[0], end[1], 0};
    }

    private static double metres(double[] p, double[] q) {
        double midLat = Math.toRadians((p[1] + q[1]) / 2);
        double dLat = (q[1] - p[1]) * 111_320.0;
        double dLon = (q[0] - p[0]) * 111_320.0 * Math.cos(midLat);
        return Math.sqrt(dLat * dLat + dLon * dLon);
    }

    private static double bearing(double[] from, double[] to) {
        double midLat = Math.toRadians((from[1] + to[1]) / 2);
        double east = (to[0] - from[0]) * Math.cos(midLat);
        double north = to[1] - from[1];
        return (Math.toDegrees(Math.atan2(east, north)) + 360) % 360;
    }
}
