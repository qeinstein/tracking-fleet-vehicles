import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  Lock,
  Layers,
  Gauge,
  Boxes,
  AlertTriangle,
  Server,
  MonitorSmartphone,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Lagos Fleet Tracker Architecture",
  description:
    "How the Lagos Fleet Tracker is built: the JCIP Java Monitor Pattern concurrency model, real-time streaming pipeline, scalability and problems encountered.",
};

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
          {icon}
        </span>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="text-slate-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
      <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}

const METRICS: [string, string, string][] = [
  ["GPS ingestion throughput", "> 5,000 mutations/sec", "~6,500 /sec"],
  ["Monitor lock acquisition", "sub-microsecond", "0.15 – 0.45 µs"],
  ["Deep-copy of 1,000 entities", "< 5 ms", "1.1 – 2.4 ms"],
  ["Client frame rate", "≥ 50 FPS", "60 FPS"],
  ["Stream payload per tick", "< 150 KB", "~92 KB"],
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 panel border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to map
          </Link>
          <span className="text-sm font-semibold text-slate-900">Lagos Fleet Tracker</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        {/* Hero */}
        <header className="pt-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Engineering overview
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2 leading-tight">
            A real-time fleet, rendered in 3D over Lagos
          </h1>
          <p className="text-slate-600 mt-4 text-lg leading-relaxed">
            A high-concurrency Java backend simulates a live fleet driving along the real Lagos road
            network (from OpenStreetMap) and streams their positions to the browser, where a
            hardware-accelerated WebGL map renders every vehicle as a moving 3D car. The project is a
            study of the{" "}
            <strong className="text-slate-800">Java Monitor Pattern</strong> (Java Concurrency in
            Practice, §4.2.2) under thousands of simultaneous reads and writes per second.
          </p>
        </header>

        {/* What we built */}
        <Section icon={<Boxes className="w-4 h-4" />} title="What was built">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card title="Concurrent simulation backend">
              Spring Boot 3 / Java 17. A pool of 16 worker threads advances every vehicle at 50&nbsp;Hz
              along the real Lagos road graph, producing thousands of guarded GPS mutations per second —
              all funnelled through a single thread-safe monitor.
            </Card>
            <Card title="Real-time 3D map client">
              Next.js 14 + deck.gl + MapLibre GL. A Google-Maps-style vector basemap with extruded 3D
              buildings, and instanced 3D car meshes oriented to each vehicle&apos;s heading.
            </Card>
            <Card title="Streaming pipeline">
              A 20&nbsp;Hz WebSocket broadcaster publishes a compact snapshot of the whole fleet
              (~92&nbsp;KB/tick); the client interpolates between snapshots for smooth 60&nbsp;FPS motion.
            </Card>
            <Card title="Real road-network movement">
              Vehicles drive on the actual Lagos road network — 128k junctions / 162k edges pulled
              from OpenStreetMap — following real road curves and turning randomly at junctions, at
              speeds that vary by road class, driver and congestion.
            </Card>
            <Card title="Lagos-locked experience">
              The camera is bounded to Lagos State, so the map never zooms past the region and the
              fleet is always visible. Fleet size is adjustable live from the control bar.
            </Card>
          </div>
        </Section>

        {/* Architecture diagram */}
        <Section icon={<Layers className="w-4 h-4" />} title="System architecture">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel not-prose">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3">
                  <Server className="w-4 h-4 text-accent" /> Java backend
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    16 simulator threads
                    <span className="text-slate-400"> — drive OSM roads · setLocation() @ 50 Hz</span>
                  </div>
                  <div className="flex justify-center text-slate-300">↓ guarded by intrinsic lock</div>
                  <div className="rounded-lg bg-accent-soft border border-accent/20 px-3 py-2 text-accent font-medium">
                    MonitorVehicleTracker
                    <span className="block text-xs text-accent/70 font-normal">
                      synchronized · deep-copy isolation
                    </span>
                  </div>
                  <div className="flex justify-center text-slate-300">↓ deep-copy snapshot</div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    20 Hz WebSocket broadcaster
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-800 mb-3">
                  <MonitorSmartphone className="w-4 h-4 text-accent" /> React / Next.js client
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    WebSocket hook — receives fleet snapshots
                  </div>
                  <div className="flex justify-center text-slate-300">↓ requestAnimationFrame</div>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                    60 FPS position interpolator
                  </div>
                  <div className="flex justify-center text-slate-300">↓</div>
                  <div className="rounded-lg bg-accent-soft border border-accent/20 px-3 py-2 text-accent font-medium">
                    deck.gl SimpleMeshLayer
                    <span className="block text-xs text-accent/70 font-normal">
                      instanced 3D cars · MapLibre basemap
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Concurrency */}
        <Section icon={<Lock className="w-4 h-4" />} title="Concurrency model">
          <p>
            The heart of the system is the <strong className="text-slate-800">Java Monitor Pattern</strong>.
            A <code className="text-accent bg-accent-soft px-1.5 py-0.5 rounded text-sm">MutablePoint</code>{" "}
            is intentionally not thread-safe on its own; its safety is delegated entirely to the{" "}
            <code className="text-accent bg-accent-soft px-1.5 py-0.5 rounded text-sm">MonitorVehicleTracker</code>,
            which guards a private <code className="text-slate-700">Map&lt;String, MutablePoint&gt;</code> so
            that every accessor is <code className="text-slate-700">synchronized</code> on the monitor&apos;s
            intrinsic lock.
          </p>
          <p>
            Crucially, <code className="text-slate-700">getLocations()</code> performs a full{" "}
            <strong className="text-slate-800">deep copy</strong> of all vehicle points{" "}
            <em>while holding the lock</em> before returning them. Without this, the broadcaster thread
            would share mutable references with the simulator threads, producing data races and torn,
            half-updated reads. The deep copy hands every caller an isolated, consistent snapshot.
          </p>
          <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-[13px] leading-relaxed overflow-x-auto">
            <span className="text-sky-300">public synchronized</span> Map&lt;String, MutablePoint&gt;{" "}
            <span className="text-amber-300">getLocations</span>() {"{"}
            <br />
            &nbsp;&nbsp;<span className="text-slate-500">// deep copy inside the lock → callers can never mutate internal state</span>
            <br />
            &nbsp;&nbsp;<span className="text-sky-300">return</span> Collections.unmodifiableMap(deepCopy(locations));
            <br />
            {"}"}
          </div>
        </Section>

        {/* Performance */}
        <Section icon={<Gauge className="w-4 h-4" />} title="Measured performance">
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-panel">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Metric</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {METRICS.map(([m, t, r]) => (
                  <tr key={m}>
                    <td className="px-4 py-3 text-slate-700">{m}</td>
                    <td className="px-4 py-3 text-slate-500">{t}</td>
                    <td className="px-4 py-3 font-medium text-status-moving">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Scaling */}
        <Section icon={<Cpu className="w-4 h-4" />} title="How it scales">
          <p>
            The monitor is correct but coarse: a <em>single</em> intrinsic lock serializes every read and
            write across the whole fleet. That is more than enough for a few thousand vehicles, but it is
            the first thing that would bottleneck at true city-scale. The path forward:
          </p>
          <ul className="list-disc pl-5 space-y-2 marker:text-accent">
            <li>
              <strong className="text-slate-800">Lock striping / spatial sharding</strong> — partition the
              fleet by district or geohash so writes to Ikeja never contend with writes to Lekki.
            </li>
            <li>
              <strong className="text-slate-800">Read–write locks</strong> or lock-free snapshots
              (copy-on-write) so the 20&nbsp;Hz broadcaster never blocks the 50&nbsp;Hz writers.
            </li>
            <li>
              <strong className="text-slate-800">Horizontal scale-out</strong> — one node per region behind a
              pub/sub bus (e.g. Redis / Kafka), with clients subscribing only to the viewport they are
              looking at.
            </li>
            <li>
              <strong className="text-slate-800">Delta &amp; binary protocols</strong> — send only what moved,
              in a packed binary frame, instead of a full JSON snapshot each tick.
            </li>
            <li>
              <strong className="text-slate-800">GPU instancing on the client</strong> (already in place) keeps
              thousands of 3D cars at 60&nbsp;FPS by drawing one mesh many times.
            </li>
          </ul>
        </Section>

        {/* Problems */}
        <Section icon={<AlertTriangle className="w-4 h-4" />} title="Problems encountered">
          <ul className="list-disc pl-5 space-y-2 marker:text-accent">
            <li>
              <strong className="text-slate-800">Reference escape.</strong> Returning shallow copies leaked
              mutable points to reader threads and caused torn reads — fixed with a full deep copy under the
              lock.
            </li>
            <li>
              <strong className="text-slate-800">Turning OSM into a routable graph.</strong> Raw
              OpenStreetMap ways overlap and cross without implying junctions; they were split at every
              shared node into a navigable node/edge graph so vehicles can actually turn at intersections.
            </li>
            <li>
              <strong className="text-slate-800">Runtime reseeding.</strong> Resizing the fleet while 16
              threads iterated their partitions risked <code className="text-slate-700">ConcurrentModificationException</code>;
              solved by publishing the fleet as an immutable <code className="text-slate-700">volatile</code>{" "}
              snapshot the workers stride each tick.
            </li>
            <li>
              <strong className="text-slate-800">Snapshot bandwidth.</strong> A full-fleet frame 20× per second
              adds up — kept under 150&nbsp;KB with a compact positional-tuple wire format.
            </li>
            <li>
              <strong className="text-slate-800">Visual jitter.</strong> 20&nbsp;Hz network updates look choppy;
              a client-side interpolator smooths positions and headings to a continuous 60&nbsp;FPS.
            </li>
            <li>
              <strong className="text-slate-800">Cold starts.</strong> A scheduled self-ping keeps the free-tier
              deployment warm so the stream is always available.
            </li>
          </ul>
        </Section>

        {/* Tech stack */}
        <Section icon={<Layers className="w-4 h-4" />} title="Technology">
          <div className="flex flex-wrap gap-2">
            {[
              "Java 17",
              "Spring Boot 3",
              "WebSocket",
              "ScheduledExecutorService",
              "Next.js 14",
              "TypeScript",
              "deck.gl",
              "MapLibre GL",
              "three.js",
              "OpenStreetMap",
              "Tailwind CSS",
            ].map((t) => (
              <span
                key={t}
                className="text-sm px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </Section>

        <div className="mt-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-hover transition-colors shadow-panel"
          >
            <ArrowLeft className="w-4 h-4" /> Back to the live map
          </Link>
        </div>
      </main>
    </div>
  );
}
