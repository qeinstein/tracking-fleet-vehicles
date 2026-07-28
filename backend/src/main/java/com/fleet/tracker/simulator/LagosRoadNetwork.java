package com.fleet.tracker.simulator;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * LagosRoadNetwork — a graph of major Lagos roads that vehicles drive along.
 * <p>
 * Nodes are approximate real junctions; edges are the corridors between them
 * (Ikorodu Road, Third Mainland Bridge, Lekki-Epe Expressway, Apapa-Oshodi
 * Expressway, mainland arterials, etc). Vehicles traverse an edge, and at each
 * junction pick another connected edge — so movement follows roads and turns at
 * intersections instead of wandering randomly. Each edge has a road class that
 * sets its free-flow speed (expressways fast, local roads slow).
 */
public final class LagosRoadNetwork {

    public static final int LOCAL = 0;
    public static final int ARTERIAL = 1;
    public static final int EXPRESSWAY = 2;

    /** Free-flow speed per road class, km/h. */
    public static final double[] CLASS_SPEED = {34.0, 58.0, 92.0};

    // Junctions [lon, lat]
    private static final double[][] NODES = {
        /* 0  Iyana-Ipaja   */ {3.2900, 6.6100},
        /* 1  Agege         */ {3.3204, 6.6155},
        /* 2  Ikeja         */ {3.3489, 6.6019},
        /* 3  Berger        */ {3.3760, 6.6120},
        /* 4  Maryland      */ {3.3670, 6.5720},
        /* 5  Ojota         */ {3.3800, 6.5820},
        /* 6  Ketu          */ {3.3910, 6.5960},
        /* 7  Mile 12       */ {3.4030, 6.6060},
        /* 8  Ikorodu       */ {3.5105, 6.6194},
        /* 9  Oshodi        */ {3.3488, 6.5551},
        /* 10 Anthony       */ {3.3690, 6.5470},
        /* 11 Gbagada       */ {3.3897, 6.5486},
        /* 12 Oworonshoki   */ {3.3980, 6.5470},
        /* 13 Mushin        */ {3.3400, 6.5380},
        /* 14 Yaba          */ {3.3711, 6.5095},
        /* 15 Surulere      */ {3.3556, 6.5006},
        /* 16 Costain       */ {3.3660, 6.4840},
        /* 17 Iddo          */ {3.3830, 6.4760},
        /* 18 Adekunle      */ {3.3960, 6.5010},
        /* 19 CMS/Marina    */ {3.3990, 6.4520},
        /* 20 Obalende      */ {3.4090, 6.4470},
        /* 21 Victoria Is.  */ {3.4219, 6.4281},
        /* 22 Lekki Phase 1 */ {3.4750, 6.4410},
        /* 23 Lekki Toll    */ {3.5410, 6.4478},
        /* 24 Ajah          */ {3.5719, 6.4676},
        /* 25 Apapa         */ {3.3595, 6.4489},
        /* 26 Cele          */ {3.3300, 6.5250},
        /* 27 Mile 2        */ {3.3200, 6.4680},
        /* 28 Festac        */ {3.2870, 6.4667},
    };

    // Edges: {nodeA, nodeB, roadClass}
    private static final int[][] EDGE_DEFS = {
        {0, 1, ARTERIAL}, {1, 2, ARTERIAL}, {2, 3, ARTERIAL}, {2, 9, ARTERIAL},
        {2, 4, ARTERIAL}, {4, 5, ARTERIAL}, {5, 6, ARTERIAL}, {6, 7, ARTERIAL},
        {7, 8, EXPRESSWAY}, {3, 7, ARTERIAL}, {5, 3, ARTERIAL}, {4, 10, ARTERIAL},
        {10, 11, ARTERIAL}, {11, 12, ARTERIAL}, {9, 13, ARTERIAL}, {13, 14, ARTERIAL},
        {9, 26, EXPRESSWAY}, {26, 25, EXPRESSWAY}, {26, 27, EXPRESSWAY}, {27, 28, ARTERIAL},
        {27, 25, ARTERIAL}, {14, 15, ARTERIAL}, {15, 16, ARTERIAL}, {16, 17, ARTERIAL},
        {14, 18, ARTERIAL}, {12, 18, EXPRESSWAY}, {18, 17, ARTERIAL}, {17, 19, ARTERIAL},
        {16, 19, ARTERIAL}, {19, 20, ARTERIAL}, {20, 21, ARTERIAL}, {21, 22, EXPRESSWAY},
        {22, 23, EXPRESSWAY}, {23, 24, EXPRESSWAY}, {25, 16, ARTERIAL}, {15, 13, ARTERIAL},
        {11, 18, ARTERIAL}, {4, 9, ARTERIAL}, {9, 15, ARTERIAL},
    };

    public static final class Edge {
        public final int a;
        public final int b;
        public final int roadClass;
        public final double[][] pts; // polyline [lon,lat], from a to b
        public final double[] segLen; // metres per segment
        public final double length; // total metres

        Edge(int a, int b, int roadClass, double[][] pts) {
            this.a = a;
            this.b = b;
            this.roadClass = roadClass;
            this.pts = pts;
            this.segLen = new double[pts.length - 1];
            double total = 0;
            for (int i = 0; i < pts.length - 1; i++) {
                segLen[i] = metres(pts[i], pts[i + 1]);
                total += segLen[i];
            }
            this.length = total;
        }
    }

    private final Edge[] edges;
    private final List<Integer>[] adjacency;

    @SuppressWarnings("unchecked")
    public LagosRoadNetwork() {
        edges = new Edge[EDGE_DEFS.length];
        adjacency = new List[NODES.length];
        for (int i = 0; i < NODES.length; i++) adjacency[i] = new ArrayList<>();

        for (int i = 0; i < EDGE_DEFS.length; i++) {
            int a = EDGE_DEFS[i][0], b = EDGE_DEFS[i][1], cls = EDGE_DEFS[i][2];
            edges[i] = new Edge(a, b, cls, shapeFor(a, b));
            adjacency[a].add(i);
            adjacency[b].add(i);
        }
    }

    /** Build the polyline for an edge, adding a gentle curve for the Third Mainland Bridge. */
    private static double[][] shapeFor(int a, int b) {
        double[] pa = NODES[a], pb = NODES[b];
        // Third Mainland Bridge (Oworonshoki 12 -> Adekunle 18): curve it over the lagoon.
        if ((a == 12 && b == 18) || (a == 18 && b == 12)) {
            double[][] curve = {
                NODES[12], {3.4020, 6.5300}, {3.4040, 6.5120}, NODES[18],
            };
            if (a == 18) { // reverse
                return new double[][]{NODES[18], {3.4040, 6.5120}, {3.4020, 6.5300}, NODES[12]};
            }
            return curve;
        }
        return new double[][]{pa, pb};
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
        if (adj.size() == 1) return adj.get(0); // dead-end: must turn around
        int pick;
        do {
            pick = adj.get(rand.nextInt(adj.size()));
        } while (pick == currentEdge);
        return pick;
    }

    /**
     * Locate a point at distance {@code s} metres along an edge in the given direction.
     * Returns {lon, lat, headingDegrees}.
     */
    public double[] locate(int edgeIndex, boolean forward, double s) {
        Edge e = edges[edgeIndex];
        int n = e.pts.length;
        for (int step = 0; step < n - 1; step++) {
            int m = forward ? step : (n - 2 - step); // segment index
            double L = e.segLen[m];
            int sp = forward ? m : m + 1; // directed start point
            int ep = forward ? m + 1 : m; // directed end point
            if (s <= L || step == n - 2) {
                double t = L > 0 ? Math.max(0, Math.min(1, s / L)) : 0;
                double lon = e.pts[sp][0] + (e.pts[ep][0] - e.pts[sp][0]) * t;
                double lat = e.pts[sp][1] + (e.pts[ep][1] - e.pts[sp][1]) * t;
                double heading = bearing(e.pts[sp], e.pts[ep]);
                return new double[]{lon, lat, heading};
            }
            s -= L;
        }
        // fallback (shouldn't happen)
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
