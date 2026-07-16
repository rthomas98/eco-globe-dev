"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileCheck2,
  Filter,
  Gauge,
  LocateFixed,
  MapPin,
  MessageSquare,
  Navigation,
  PackageCheck,
  RadioTower,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Upload,
  X,
} from "lucide-react";
import {
  logisticsShipments,
  type LogisticsShipment,
  type LogisticsStatus,
} from "./logistics-demo-data";

type TrackingTab =
  | "Live route"
  | "Milestones"
  | "Proof of delivery"
  | "Activity";

interface DeliveryMeta {
  driver: string;
  vehicle: string;
  lastPing: string;
  etaConfidence: number;
  dwellMinutes: number;
  geofence: string;
  podStatus: "Not ready" | "Awaiting upload" | "Under review" | "Accepted";
  milestones: Array<{
    label: string;
    time: string;
    state: "complete" | "current" | "pending";
  }>;
}

const DELIVERY_META: Record<string, DeliveryMeta> = {
  "SHP-50021": {
    driver: "M. Ortiz",
    vehicle: "EF-4027 · Flatbed",
    lastPing: "34 sec ago",
    etaConfidence: 92,
    dwellMinutes: 18,
    geofence: "I-85 · 42 mi southwest of Atlanta",
    podStatus: "Not ready",
    milestones: [
      {
        label: "Cadiz port release",
        time: "May 17 · 08:42",
        state: "complete",
      },
      {
        label: "New Orleans cross-dock",
        time: "May 20 · 14:18",
        state: "complete",
      },
      {
        label: "Atlanta approach geofence",
        time: "Tracking now",
        state: "current",
      },
      {
        label: "Buyer receiving appointment",
        time: "May 22 · 11:00",
        state: "pending",
      },
    ],
  },
  "SHP-50018": {
    driver: "A. Landry",
    vehicle: "GL-1188 · Bulk hopper",
    lastPing: "12 sec ago",
    etaConfidence: 97,
    dwellMinutes: 7,
    geofence: "Baton Rouge receiving geofence",
    podStatus: "Awaiting upload",
    milestones: [
      {
        label: "Houston yard pickup",
        time: "Today · 07:14",
        state: "complete",
      },
      {
        label: "Lake Charles weigh station",
        time: "Today · 10:38",
        state: "complete",
      },
      {
        label: "Baton Rouge scale house",
        time: "Today · 14:52",
        state: "current",
      },
      {
        label: "Unload and buyer signature",
        time: "Expected 15:30",
        state: "pending",
      },
    ],
  },
  "SHP-50012": {
    driver: "R. Collins",
    vehicle: "RH-4410 · Equipment trailer",
    lastPing: "Delivery complete",
    etaConfidence: 100,
    dwellMinutes: 24,
    geofence: "Dallas receiving dock",
    podStatus: "Accepted",
    milestones: [
      {
        label: "Houston equipment yard",
        time: "May 13 · 08:06",
        state: "complete",
      },
      {
        label: "Dallas arrival geofence",
        time: "May 13 · 13:47",
        state: "complete",
      },
      { label: "Unload inspection", time: "May 13 · 14:22", state: "complete" },
      { label: "POD accepted", time: "May 13 · 15:03", state: "complete" },
    ],
  },
  "SHP-50009": {
    driver: "D. Foster",
    vehicle: "EF-3411 · Short-haul bulk",
    lastPing: "6 min ago",
    etaConfidence: 41,
    dwellMinutes: 54,
    geofence: "Plaquemine seller yard",
    podStatus: "Not ready",
    milestones: [
      { label: "Driver dispatched", time: "Today · 09:08", state: "complete" },
      {
        label: "Seller yard arrival",
        time: "Today · 10:02",
        state: "complete",
      },
      { label: "Facility access clearance", time: "Blocked", state: "current" },
      { label: "Port Allen buyer dock", time: "Delayed", state: "pending" },
    ],
  },
};

export function AdminDeliveryTrackingCenter({
  shipmentId,
}: {
  shipmentId?: string;
}) {
  const router = useRouter();
  const [shipments, setShipments] = useState(logisticsShipments);
  const [meta, setMeta] = useState(DELIVERY_META);
  const selected = shipments.find((shipment) => shipment.id === shipmentId);

  const updateShipment = (id: string, update: Partial<LogisticsShipment>) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === id ? { ...shipment, ...update } : shipment,
      ),
    );
  };

  const updateMeta = (id: string, update: Partial<DeliveryMeta>) => {
    setMeta((current) => ({ ...current, [id]: { ...current[id], ...update } }));
  };

  if (shipmentId) {
    return selected && meta[selected.id] ? (
      <DeliveryDetail
        shipment={selected}
        meta={meta[selected.id]}
        onBack={() => router.push("/admin/delivery-tracking")}
        onUpdate={(update) => updateShipment(selected.id, update)}
        onUpdateMeta={(update) => updateMeta(selected.id, update)}
      />
    ) : (
      <TrackingNotFound
        onBack={() => router.push("/admin/delivery-tracking")}
      />
    );
  }

  return (
    <DeliveryOverview
      shipments={shipments}
      meta={meta}
      onOpen={(id) => router.push(`/admin/delivery-tracking/${id}`)}
    />
  );
}

function DeliveryOverview({
  shipments,
  meta,
  onOpen,
}: {
  shipments: LogisticsShipment[];
  meta: Record<string, DeliveryMeta>;
  onOpen: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LogisticsStatus | "All">("All");
  const [selectedId, setSelectedId] = useState(
    shipments.find((shipment) => shipment.status !== "Delivered")?.id ??
      shipments[0].id,
  );
  const [showRules, setShowRules] = useState(false);
  const [notice, setNotice] = useState("");
  const selected =
    shipments.find((shipment) => shipment.id === selectedId) ?? shipments[0];
  const selectedMeta = meta[selected.id];

  const visible = useMemo(() => {
    const query = search.toLowerCase().trim();
    return shipments.filter(
      (shipment) =>
        (status === "All" || shipment.status === status) &&
        (!query ||
          [
            shipment.id,
            shipment.trackingId,
            shipment.product,
            shipment.carrier,
            shipment.origin,
            shipment.destination,
          ].some((value) => value.toLowerCase().includes(query))),
    );
  }, [search, shipments, status]);

  const inMotion = shipments.filter((shipment) =>
    ["In transit", "Out for delivery"].includes(shipment.status),
  ).length;
  const exceptions = shipments.filter(
    (shipment) => shipment.status === "Exception",
  ).length;
  const podPending = Object.values(meta).filter((item) =>
    ["Awaiting upload", "Under review"].includes(item.podStatus),
  ).length;
  const avgConfidence = Math.round(
    Object.values(meta).reduce((total, item) => total + item.etaConfidence, 0) /
      Object.values(meta).length,
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              REAL-TIME DELIVERY CONTROL
            </p>
            <h1 className="max-w-4xl text-3xl font-bold tracking-[-0.02em] text-neutral-950">
              Track live movement, delivery confirmation, proof of delivery, and
              exceptions.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Give operations one accountable view of route telemetry, ETA
              confidence, geofences, receiving milestones, and release-ready
              delivery evidence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white"
          >
            <BellRing className="size-4" /> Alert rules
          </button>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Navigation}
            label="Shipments in motion"
            value={String(inMotion)}
            detail="Reporting live telemetry"
            tone="emerald"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Active exceptions"
            value={String(exceptions)}
            detail={exceptions ? "Intervention required" : "No blockers"}
            tone={exceptions ? "red" : "emerald"}
          />
          <SummaryCard
            icon={FileCheck2}
            label="POD queue"
            value={String(podPending)}
            detail="Awaiting upload or review"
          />
          <SummaryCard
            icon={Gauge}
            label="ETA confidence"
            value={`${avgConfidence}%`}
            detail="Network average"
          />
        </section>

        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {notice}
          </p>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
          <LiveFleetCanvas
            shipment={selected}
            meta={selectedMeta}
            onOpen={() => onOpen(selected.id)}
          />
          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-neutral-950">Operations queue</h2>
                <p className="text-xs text-neutral-500">
                  Prioritized by delivery risk
                </p>
              </div>
              <Activity className="size-4 text-neutral-400" />
            </div>
            <div className="mt-4 space-y-2">
              {shipments
                .filter((shipment) => shipment.status !== "Delivered")
                .sort((a) => (a.status === "Exception" ? -1 : 1))
                .map((shipment) => (
                  <button
                    key={shipment.id}
                    type="button"
                    onClick={() => setSelectedId(shipment.id)}
                    className={`w-full rounded-xl p-3 text-left ring-1 transition ${selected.id === shipment.id ? "bg-neutral-950 text-white ring-neutral-950" : "bg-white text-neutral-900 ring-neutral-200 hover:bg-neutral-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px]">
                        {shipment.id}
                      </span>
                      <StatusBadge
                        status={shipment.status}
                        inverted={selected.id === shipment.id}
                      />
                    </div>
                    <p className="mt-2 truncate text-sm font-bold">
                      {shipment.product}
                    </p>
                    <p
                      className={`mt-1 text-xs ${selected.id === shipment.id ? "text-neutral-400" : "text-neutral-500"}`}
                    >
                      {meta[shipment.id]?.geofence}
                    </p>
                  </button>
                ))}
            </div>
          </aside>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1 xl:max-w-lg">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                aria-label="Search delivery tracking"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shipment, tracking ID, route, carrier…"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none focus:border-neutral-900 focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Delivery status"
                value={status}
                onChange={(value) =>
                  setStatus(value as LogisticsStatus | "All")
                }
                options={[
                  "All",
                  "In transit",
                  "Out for delivery",
                  "Delivered",
                  "Exception",
                  "Booked",
                ]}
              />
              {(search || status !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatus("All");
                  }}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-neutral-950">
                Delivery tracking network
              </h2>
              <p className="text-xs text-neutral-500">
                {visible.length} monitored shipments
              </p>
            </div>
            <SlidersHorizontal className="size-4 text-neutral-400" />
          </div>
          <div className="divide-y divide-neutral-100">
            {visible.map((shipment) => (
              <DeliveryRow
                key={shipment.id}
                shipment={shipment}
                meta={meta[shipment.id]}
                onOpen={() => onOpen(shipment.id)}
              />
            ))}
            {visible.length === 0 && (
              <div className="px-6 py-16 text-center">
                <Search className="mx-auto size-6 text-neutral-300" />
                <p className="mt-3 font-semibold text-neutral-800">
                  No tracked deliveries match
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Clear the search or choose another status.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <PodReadiness shipments={shipments} meta={meta} onOpen={onOpen} />
          <TelemetryHealth shipments={shipments} meta={meta} />
        </div>
      </div>
      {showRules && (
        <AlertRulesDialog
          onClose={() => setShowRules(false)}
          onSave={() => {
            setShowRules(false);
            setNotice("Delivery alert rules updated for the operations team.");
          }}
        />
      )}
    </div>
  );
}

function LiveFleetCanvas({
  shipment,
  meta,
  onOpen,
}: {
  shipment: LogisticsShipment;
  meta: DeliveryMeta;
  onOpen?: () => void;
}) {
  const progress = trackingProgress(shipment.status);
  return (
    <section className="relative min-h-[390px] overflow-hidden rounded-[24px] bg-slate-950 p-6 text-white shadow-sm">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            <RadioTower className="size-4" /> Live shipment focus
          </div>
          <h2 className="mt-3 text-2xl font-bold">{shipment.product}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {shipment.origin} → {shipment.destination}
          </p>
        </div>
        <StatusBadge status={shipment.status} inverted />
      </div>
      <div className="relative z-10 mt-16 px-2 sm:px-8">
        <div className="relative h-2 rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${shipment.status === "Exception" ? "bg-red-400" : "bg-emerald-400"}`}
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute -top-3 size-8 -translate-x-1/2 rounded-full border-4 border-slate-950 bg-white shadow-xl"
            style={{ left: `${progress}%` }}
          >
            <Truck className="m-1 size-4 text-slate-950" />
          </div>
        </div>
        <div className="mt-5 flex items-start justify-between gap-4 text-xs">
          <div>
            <MapPin className="mb-2 size-4 text-emerald-300" />
            <p className="font-bold">{shipment.origin}</p>
            <p className="mt-1 text-slate-500">Origin</p>
          </div>
          <div className="max-w-[190px] text-center">
            <LocateFixed className="mx-auto mb-2 size-4 text-amber-300" />
            <p className="font-bold">{meta.geofence}</p>
            <p className="mt-1 text-slate-500">Last ping {meta.lastPing}</p>
          </div>
          <div className="text-right">
            <PackageCheck className="ml-auto mb-2 size-4 text-emerald-300" />
            <p className="font-bold">{shipment.destination}</p>
            <p className="mt-1 text-slate-500">Destination</p>
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-10 grid gap-2 sm:grid-cols-3">
        <DarkMetric label="ETA" value={shipment.eta} />
        <DarkMetric label="Confidence" value={`${meta.etaConfidence}%`} />
        <DarkMetric label="Dwell" value={`${meta.dwellMinutes} min`} />
      </div>
      {onOpen && (
        <div className="relative z-10 mt-5 flex justify-end">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-950"
          >
            Open live details <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}

function DeliveryRow({
  shipment,
  meta,
  onOpen,
}: {
  shipment: LogisticsShipment;
  meta: DeliveryMeta;
  onOpen: () => void;
}) {
  return (
    <article className="grid gap-4 px-5 py-5 transition hover:bg-neutral-50/70 xl:grid-cols-[minmax(260px,1.2fr)_minmax(220px,1fr)_120px_120px_150px] xl:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
          <Truck className="size-5 text-neutral-600" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-bold text-neutral-950">
              {shipment.id}
            </p>
            <StatusBadge status={shipment.status} />
          </div>
          <p className="mt-2 truncate font-bold text-neutral-900">
            {shipment.product}
          </p>
          <p className="mt-1 truncate text-xs text-neutral-500">
            {shipment.carrier} · {meta.vehicle}
          </p>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-800">
          {meta.geofence}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Last ping {meta.lastPing}
        </p>
      </div>
      <MiniMetric label="ETA confidence" value={`${meta.etaConfidence}%`} />
      <MiniMetric label="Dwell" value={`${meta.dwellMinutes} min`} />
      <div className="flex items-center justify-between gap-3 xl:justify-end">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.podStatus === "Accepted" ? "bg-emerald-100 text-emerald-800" : meta.podStatus === "Awaiting upload" ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-600"}`}
        >
          {meta.podStatus}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full bg-neutral-950 p-2.5 text-white"
          aria-label={`Open ${shipment.id}`}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </article>
  );
}

function DeliveryDetail({
  shipment,
  meta,
  onBack,
  onUpdate,
  onUpdateMeta,
}: {
  shipment: LogisticsShipment;
  meta: DeliveryMeta;
  onBack: () => void;
  onUpdate: (update: Partial<LogisticsShipment>) => void;
  onUpdateMeta: (update: Partial<DeliveryMeta>) => void;
}) {
  const [tab, setTab] = useState<TrackingTab>("Live route");
  const [notice, setNotice] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const progress = trackingProgress(shipment.status);

  const resolve = () => {
    onUpdate({
      status: "In transit",
      eta: "ETA recalculating",
      lastUpdate: "Access exception resolved by admin delivery operations.",
      nextStep: "Carrier must confirm departure from the seller geofence.",
    });
    onUpdateMeta({
      etaConfidence: 78,
      lastPing: "Just now",
      dwellMinutes: 0,
      milestones: meta.milestones.map((item) =>
        item.state === "current"
          ? { ...item, state: "complete", time: "Cleared just now" }
          : item,
      ),
    });
    setNotice("Exception resolved and live route monitoring resumed.");
  };
  const confirmDelivery = () => {
    onUpdate({
      status: "Delivered",
      eta: "Delivered today",
      lastUpdate: "Delivery confirmed by admin operations.",
      nextStep: "POD review and escrow release readiness are open.",
    });
    onUpdateMeta({
      etaConfidence: 100,
      podStatus: "Awaiting upload",
      geofence: shipment.destination,
      lastPing: "Delivery confirmed",
      milestones: meta.milestones.map((item) => ({
        ...item,
        state: "complete" as const,
      })),
    });
    setNotice("Delivery confirmed. Proof-of-delivery upload is now required.");
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" /> Back to delivery tracking
        </button>
        <section className="overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-sm">
          <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={shipment.status} inverted />
                <span className="font-mono text-xs text-neutral-500">
                  {shipment.trackingId}
                </span>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                LIVE DELIVERY · {shipment.id}
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {shipment.product}
              </h1>
              <p className="mt-2 text-sm text-neutral-400">
                {shipment.origin} to {shipment.destination} · {shipment.carrier}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"
              >
                <MessageSquare className="size-4" /> Contact dispatch
              </button>
              {shipment.status === "Exception" ? (
                <button
                  type="button"
                  onClick={resolve}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950"
                >
                  <CheckCircle2 className="size-4" /> Resolve exception
                </button>
              ) : (
                shipment.status !== "Delivered" && (
                  <button
                    type="button"
                    onClick={confirmDelivery}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950"
                  >
                    <PackageCheck className="size-4" /> Confirm delivery
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {notice}
          </p>
        )}
        {shipment.status === "Exception" && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-950">Live delivery exception</p>
              <p className="mt-1 text-sm text-red-800">{shipment.lastUpdate}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-red-700">
                Next action · {shipment.nextStep}
              </p>
            </div>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Navigation}
            label="Route progress"
            value={`${progress}%`}
            detail={meta.geofence}
            tone={shipment.status === "Exception" ? "red" : "emerald"}
          />
          <SummaryCard
            icon={Gauge}
            label="ETA confidence"
            value={`${meta.etaConfidence}%`}
            detail={shipment.eta}
          />
          <SummaryCard
            icon={Clock3}
            label="Current dwell"
            value={`${meta.dwellMinutes} min`}
            detail={`Last ping ${meta.lastPing}`}
          />
          <SummaryCard
            icon={FileCheck2}
            label="POD status"
            value={meta.podStatus}
            detail="Delivery evidence readiness"
          />
        </section>

        <div
          className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1"
          role="tablist"
          aria-label="Delivery details"
        >
          {(
            [
              "Live route",
              "Milestones",
              "Proof of delivery",
              "Activity",
            ] as TrackingTab[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === item ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Live route" && (
          <DetailRoute shipment={shipment} meta={meta} progress={progress} />
        )}
        {tab === "Milestones" && <MilestonesPanel meta={meta} />}
        {tab === "Proof of delivery" && (
          <PodPanel
            shipment={shipment}
            meta={meta}
            onUpload={() => {
              onUpdateMeta({ podStatus: "Under review" });
              setNotice(
                "Proof of delivery uploaded and added to the admin review queue.",
              );
            }}
            onAccept={() => {
              onUpdateMeta({ podStatus: "Accepted" });
              setNotice(
                "Proof of delivery accepted. Escrow release readiness is confirmed.",
              );
            }}
          />
        )}
        {tab === "Activity" && (
          <ActivityPanel shipment={shipment} meta={meta} />
        )}
        {contactOpen && (
          <DispatchDialog
            shipment={shipment}
            meta={meta}
            onClose={() => setContactOpen(false)}
            onSend={() => {
              setContactOpen(false);
              setNotice(`Dispatch message sent to ${shipment.carrier}.`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function DetailRoute({
  shipment,
  meta,
  progress,
}: {
  shipment: LogisticsShipment;
  meta: DeliveryMeta;
  progress: number;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <LiveFleetCanvas shipment={shipment} meta={meta} />
      <Panel title="Live telemetry" icon={RadioTower}>
        <InfoGrid
          items={[
            { label: "Driver", value: meta.driver },
            { label: "Vehicle", value: meta.vehicle },
            { label: "Last ping", value: meta.lastPing },
            { label: "Current geofence", value: meta.geofence },
            { label: "Route progress", value: `${progress}%` },
            { label: "ETA confidence", value: `${meta.etaConfidence}%` },
          ]}
        />
      </Panel>
    </div>
  );
}

function MilestonesPanel({ meta }: { meta: DeliveryMeta }) {
  return (
    <Panel title="Delivery milestones" icon={Route}>
      <div className="space-y-0">
        {meta.milestones.map((milestone, index) => (
          <div
            key={milestone.label}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            <div
              className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${milestone.state === "complete" ? "bg-emerald-100 text-emerald-700" : milestone.state === "current" ? "bg-amber-100 text-amber-700 ring-4 ring-amber-50" : "bg-neutral-100 text-neutral-400"}`}
            >
              {milestone.state === "complete" ? (
                <Check className="size-4" />
              ) : milestone.state === "current" ? (
                <CircleDot className="size-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < meta.milestones.length - 1 && (
              <div className="absolute left-[15px] top-9 h-[calc(100%-24px)] w-px bg-neutral-200" />
            )}
            <div className="flex-1">
              <p className="font-bold text-neutral-900">{milestone.label}</p>
              <p className="mt-1 text-sm text-neutral-500">{milestone.time}</p>
            </div>
            <span className="text-xs font-semibold capitalize text-neutral-400">
              {milestone.state}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PodPanel({
  shipment,
  meta,
  onUpload,
  onAccept,
}: {
  shipment: LogisticsShipment;
  meta: DeliveryMeta;
  onUpload: () => void;
  onAccept: () => void;
}) {
  const ready =
    shipment.status === "Delivered" || shipment.status === "Out for delivery";
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <Panel title="Proof-of-delivery readiness" icon={FileCheck2}>
        <div
          className={`rounded-2xl p-5 ${meta.podStatus === "Accepted" ? "bg-emerald-50" : "bg-neutral-50"}`}
        >
          <div className="flex items-start gap-3">
            {meta.podStatus === "Accepted" ? (
              <BadgeIcon />
            ) : (
              <Upload className="size-5 text-neutral-500" />
            )}
            <div>
              <p className="font-bold text-neutral-950">{meta.podStatus}</p>
              <p className="mt-1 text-sm text-neutral-600">
                {meta.podStatus === "Accepted"
                  ? "Delivery evidence is accepted and release readiness is confirmed."
                  : ready
                    ? "Upload the signed POD, receiving photos, and final weight ticket."
                    : "POD upload opens when the shipment reaches the delivery geofence."}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUpload}
            disabled={!ready || meta.podStatus === "Accepted"}
            className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:bg-neutral-300"
          >
            Upload POD package
          </button>
          {meta.podStatus === "Under review" && (
            <button
              type="button"
              onClick={onAccept}
              className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-bold"
            >
              Accept evidence
            </button>
          )}
        </div>
      </Panel>
      <Panel title="Required evidence" icon={ShieldCheck}>
        <Checklist
          items={[
            {
              label: "Signed receiving confirmation",
              complete: meta.podStatus !== "Not ready",
            },
            {
              label: "Delivery photos",
              complete:
                meta.podStatus === "Under review" ||
                meta.podStatus === "Accepted",
            },
            {
              label: "Final weight or scale ticket",
              complete: meta.podStatus === "Accepted",
            },
            {
              label: "Exception closure",
              complete: shipment.status !== "Exception",
            },
          ]}
        />
      </Panel>
    </div>
  );
}

function ActivityPanel({
  shipment,
  meta,
}: {
  shipment: LogisticsShipment;
  meta: DeliveryMeta;
}) {
  const items = [
    { title: shipment.lastUpdate, detail: meta.geofence, time: "Latest" },
    ...meta.milestones
      .slice()
      .reverse()
      .map((item) => ({
        title: item.label,
        detail:
          item.state === "complete"
            ? "Milestone confirmed"
            : "Delivery plan milestone",
        time: item.time,
      })),
  ];
  return (
    <Panel title="Delivery event history" icon={Activity}>
      <Timeline items={items} />
    </Panel>
  );
}

function PodReadiness({
  shipments,
  meta,
  onOpen,
}: {
  shipments: LogisticsShipment[];
  meta: Record<string, DeliveryMeta>;
  onOpen: (id: string) => void;
}) {
  const queue = shipments.filter(
    (shipment) => meta[shipment.id]?.podStatus !== "Accepted",
  );
  return (
    <Panel
      title="Proof-of-delivery queue"
      icon={FileCheck2}
      action={
        <span className="text-xs font-semibold text-neutral-400">
          {queue.length} open
        </span>
      }
    >
      <div className="divide-y divide-neutral-100">
        {queue.map((shipment) => (
          <button
            key={shipment.id}
            type="button"
            onClick={() => onOpen(shipment.id)}
            className="flex w-full items-center justify-between gap-4 py-4 text-left"
          >
            <div>
              <p className="font-bold text-neutral-900">
                {shipment.id} · {shipment.product}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {shipment.destination} · {shipment.carrier}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-700">
                {meta[shipment.id]?.podStatus}
              </span>
              <ChevronRight className="size-4 text-neutral-300" />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function TelemetryHealth({
  shipments,
  meta,
}: {
  shipments: LogisticsShipment[];
  meta: Record<string, DeliveryMeta>;
}) {
  return (
    <Panel title="Telemetry health" icon={RadioTower}>
      <div className="space-y-4">
        {shipments.map((shipment) => {
          const current = meta[shipment.id];
          const healthy =
            shipment.status !== "Exception" &&
            current.lastPing !== "Delivery complete";
          return (
            <div key={shipment.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-neutral-800">
                  {shipment.carrier}
                </span>
                <span
                  className={`text-xs font-bold ${healthy ? "text-emerald-700" : shipment.status === "Delivered" ? "text-neutral-500" : "text-amber-700"}`}
                >
                  {shipment.status === "Delivered"
                    ? "Complete"
                    : healthy
                      ? "Reporting"
                      : "Delayed ping"}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full ${healthy ? "w-[92%] bg-emerald-500" : shipment.status === "Delivered" ? "w-full bg-neutral-300" : "w-[48%] bg-amber-500"}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AlertRulesDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [rules, setRules] = useState({
    stale: true,
    geofence: true,
    dwell: true,
    pod: true,
  });
  const options = [
    {
      key: "stale",
      title: "Stale telemetry",
      detail: "Alert after 5 minutes without a carrier ping.",
    },
    {
      key: "geofence",
      title: "Missed geofence",
      detail: "Alert if an expected route checkpoint is skipped.",
    },
    {
      key: "dwell",
      title: "Excessive dwell",
      detail: "Alert after 45 minutes at a pickup or delivery site.",
    },
    {
      key: "pod",
      title: "POD overdue",
      detail: "Alert 30 minutes after delivery without evidence.",
    },
  ];
  return (
    <Modal
      title="Delivery alert rules"
      description="Choose the conditions that should notify admin operations."
      onClose={onClose}
    >
      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.key}
            className="flex items-start justify-between gap-4 rounded-xl bg-neutral-50 p-4"
          >
            <div>
              <p className="text-sm font-bold text-neutral-900">
                {option.title}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{option.detail}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={rules[option.key as keyof typeof rules]}
              onClick={() =>
                setRules((current) => ({
                  ...current,
                  [option.key]: !current[option.key as keyof typeof current],
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full ${rules[option.key as keyof typeof rules] ? "bg-emerald-500" : "bg-neutral-300"}`}
            >
              <span
                className={`absolute top-1 size-4 rounded-full bg-white transition ${rules[option.key as keyof typeof rules] ? "left-6" : "left-1"}`}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm font-bold text-neutral-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white"
        >
          Save alert rules
        </button>
      </div>
    </Modal>
  );
}

function DispatchDialog({
  shipment,
  meta,
  onClose,
  onSend,
}: {
  shipment: LogisticsShipment;
  meta: DeliveryMeta;
  onClose: () => void;
  onSend: () => void;
}) {
  const [message, setMessage] = useState(
    `Please confirm driver status, current ETA, and the next delivery milestone for ${shipment.trackingId}. Last ping: ${meta.lastPing}.`,
  );
  return (
    <Modal
      title={`Contact ${shipment.carrier} dispatch`}
      description={`${shipment.id} · Driver ${meta.driver}`}
      onClose={onClose}
    >
      <textarea
        aria-label="Dispatch message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-36 w-full rounded-xl border border-neutral-200 p-4 text-sm outline-none focus:border-neutral-900"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm font-bold text-neutral-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={!message.trim()}
          className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white disabled:bg-neutral-300"
        >
          Send to dispatch
        </button>
      </div>
    </Modal>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "emerald" | "red";
}) {
  const colors =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "red"
        ? "bg-red-100 text-red-700"
        : "bg-neutral-100 text-neutral-600";
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <div
        className={`flex size-9 items-center justify-center rounded-xl ${colors}`}
      >
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
      <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{detail}</p>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-neutral-500" />
          <h2 className="font-bold text-neutral-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-neutral-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {item.label}
          </dt>
          <dd className="mt-2 text-sm font-bold text-neutral-900">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.06] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  inverted = false,
}: {
  status: LogisticsStatus;
  inverted?: boolean;
}) {
  const tone = inverted
    ? "bg-white/10 text-white"
    : status === "Exception"
      ? "bg-red-100 text-red-800"
      : status === "Delivered"
        ? "bg-emerald-100 text-emerald-800"
        : status === "Out for delivery"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
    >
      {status}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-neutral-700 outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Timeline({
  items,
}: {
  items: Array<{ title: string; detail: string; time: string }>;
}) {
  return (
    <div>
      {items.map((item, index) => (
        <div
          key={`${item.title}-${item.time}`}
          className="relative flex gap-4 pb-5 last:pb-0"
        >
          <div className="relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-3.5 text-emerald-700" />
          </div>
          {index < items.length - 1 && (
            <div className="absolute left-[11px] top-7 h-[calc(100%-20px)] w-px bg-neutral-200" />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-neutral-900">{item.title}</p>
              <span className="text-xs text-neutral-400">{item.time}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Checklist({
  items,
}: {
  items: Array<{ label: string; complete: boolean }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-sm">
          <span
            className={`flex size-5 items-center justify-center rounded-full ${item.complete ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}
          >
            {item.complete ? (
              <Check className="size-3" />
            ) : (
              <CircleDot className="size-3" />
            )}
          </span>
          <span
            className={
              item.complete
                ? "font-medium text-neutral-800"
                : "text-neutral-500"
            }
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
function BadgeIcon() {
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100">
      <Check className="size-4 text-emerald-700" />
    </span>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm"
      />
      <dialog
        open
        aria-modal="true"
        className="relative z-10 m-0 w-full max-w-xl rounded-[24px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-950">{title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{description}</p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </dialog>
    </div>
  );
}

function trackingProgress(status: LogisticsStatus) {
  return status === "Delivered"
    ? 100
    : status === "Out for delivery"
      ? 88
      : status === "In transit"
        ? 62
        : status === "Exception"
          ? 42
          : status === "Booked"
            ? 20
            : 10;
}

function TrackingNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-neutral-200">
        <AlertTriangle className="mx-auto size-8 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-neutral-950">
          Delivery record not found
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          This tracking record may have been removed or the address is
          incorrect.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white"
        >
          Return to delivery tracking
        </button>
      </section>
    </div>
  );
}
