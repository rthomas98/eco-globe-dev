"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CloudCog,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  Leaf,
  MessageSquare,
  PackageCheck,
  Plus,
  RadioTower,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import {
  carrierIntegrations as initialCarriers,
  logisticsShipments as initialShipments,
  routeOptimizationSummary,
  type CarrierIntegration,
  type LogisticsShipment,
  type LogisticsStatus,
} from "./logistics-demo-data";

type ShipmentTab = "Overview" | "Documents" | "Exceptions" | "Activity";

const SHIPMENT_PROGRESS: Record<LogisticsStatus, number> = {
  "Quote needed": 8,
  "Quote sent": 16,
  Booked: 28,
  "In transit": 64,
  "Out for delivery": 88,
  Delivered: 100,
  Exception: 46,
};

const CARRIER_PERFORMANCE: Record<
  string,
  { onTime: number; acceptance: number; carbon: string; rating: string }
> = {
  EcoFreight: { onTime: 96, acceptance: 92, carbon: "-18%", rating: "4.8" },
  "GreenLine Logistics": {
    onTime: 94,
    acceptance: 89,
    carbon: "-12%",
    rating: "4.7",
  },
  RapidHaul: { onTime: 98, acceptance: 86, carbon: "+6%", rating: "4.5" },
  "RailLoop Intermodal": {
    onTime: 0,
    acceptance: 0,
    carbon: "Pending",
    rating: "—",
  },
};

export function AdminLogisticsCommandCenter({
  shipmentId,
}: {
  shipmentId?: string;
}) {
  const router = useRouter();
  const [shipments, setShipments] = useState(initialShipments);
  const [carriers, setCarriers] = useState(initialCarriers);
  const selected = shipments.find((shipment) => shipment.id === shipmentId);

  const updateShipment = (id: string, update: Partial<LogisticsShipment>) => {
    setShipments((current) =>
      current.map((shipment) =>
        shipment.id === id ? { ...shipment, ...update } : shipment,
      ),
    );
  };

  if (shipmentId) {
    return selected ? (
      <LogisticsDetail
        shipment={selected}
        onBack={() => router.push("/admin/logistics")}
        onUpdate={(update) => updateShipment(selected.id, update)}
      />
    ) : (
      <ShipmentNotFound onBack={() => router.push("/admin/logistics")} />
    );
  }

  return (
    <LogisticsOverview
      shipments={shipments}
      carriers={carriers}
      onOpen={(id) => router.push(`/admin/logistics/${id}`)}
      onAdd={(shipment) => setShipments((current) => [shipment, ...current])}
      onUpdateCarrier={(name, update) =>
        setCarriers((current) =>
          current.map((carrier) =>
            carrier.name === name ? { ...carrier, ...update } : carrier,
          ),
        )
      }
    />
  );
}

function LogisticsOverview({
  shipments,
  carriers,
  onOpen,
  onAdd,
  onUpdateCarrier,
}: {
  shipments: LogisticsShipment[];
  carriers: CarrierIntegration[];
  onOpen: (id: string) => void;
  onAdd: (shipment: LogisticsShipment) => void;
  onUpdateCarrier: (name: string, update: Partial<CarrierIntegration>) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LogisticsStatus | "All">("All");
  const [carrier, setCarrier] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [rules, setRules] = useState({
    carbon: true,
    insurance: true,
    autoRelease: true,
    manualOverride: true,
  });

  const visible = useMemo(() => {
    const query = search.toLowerCase().trim();
    return shipments.filter(
      (shipment) =>
        (status === "All" || shipment.status === status) &&
        (carrier === "All" || shipment.carrier === carrier) &&
        (!query ||
          [
            shipment.id,
            shipment.orderId,
            shipment.product,
            shipment.buyer,
            shipment.seller,
            shipment.origin,
            shipment.destination,
          ].some((value) => value.toLowerCase().includes(query))),
    );
  }, [carrier, search, shipments, status]);

  const active = shipments.filter(
    (shipment) =>
      !["Delivered", "Quote needed", "Quote sent"].includes(shipment.status),
  ).length;
  const exceptions = shipments.filter(
    (shipment) => shipment.status === "Exception",
  ).length;
  const delivered = shipments.filter(
    (shipment) => shipment.status === "Delivered",
  ).length;
  const connected = carriers.filter(
    (item) => item.status === "Connected",
  ).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              LOGISTICS CONTROL TOWER
            </p>
            <h1 className="max-w-4xl text-3xl font-bold tracking-[-0.02em] text-neutral-950">
              Orchestrate shipments, carriers, routes, exceptions, and delivery
              readiness.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Monitor every active lane, intervene before service failures,
              compare carrier health, and enforce cost and carbon routing
              policies.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white"
          >
            <Plus className="size-4" /> Create shipment
          </button>
        </div>

        <section className="overflow-hidden rounded-[28px] bg-neutral-950 text-white shadow-sm">
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-9">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                <RadioTower className="size-4" /> Live operations network
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                Keep every shipment moving with one accountable view of service,
                evidence, and risk.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                {connected} carrier integrations are connected.{" "}
                {exceptions > 0
                  ? `${exceptions} shipment requires intervention.`
                  : "No open exceptions."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              <HeroStat label="Active" value={String(active)} />
              <HeroStat label="Delivered" value={String(delivered)} />
              <HeroStat
                label="Connected"
                value={`${connected}/${carriers.length}`}
              />
            </div>
          </div>
        </section>

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Logistics summary"
        >
          <SummaryCard
            icon={Truck}
            label="Active shipments"
            value={String(active)}
            detail="Across current carrier lanes"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Open exceptions"
            value={String(exceptions)}
            detail={exceptions ? "Admin action required" : "All clear"}
            tone={exceptions ? "red" : "emerald"}
          />
          <SummaryCard
            icon={Leaf}
            label="CO2 avoided"
            value={routeOptimizationSummary.carbonAvoided}
            detail={`${routeOptimizationSummary.optimizedShipments} optimized shipments`}
            tone="emerald"
          />
          <SummaryCard
            icon={Clock3}
            label="Quote response"
            value={routeOptimizationSummary.averageQuoteTime}
            detail="Network average"
          />
        </section>

        {exceptions > 0 && (
          <button
            type="button"
            onClick={() => setStatus("Exception")}
            className="flex w-full items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-amber-950">
                  Exception queue needs attention
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  One shipment is delayed by missing facility access. Open the
                  queue to coordinate the carrier and seller.
                </p>
              </div>
            </div>
            <ChevronRight className="mt-1 size-5 shrink-0 text-amber-600" />
          </button>
        )}

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1 xl:max-w-lg">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                aria-label="Search shipments"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search shipment, order, material, lane…"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none focus:border-neutral-900 focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Shipment status"
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
                  "Quote needed",
                  "Quote sent",
                ]}
              />
              <FilterSelect
                label="Carrier"
                value={carrier}
                onChange={setCarrier}
                options={["All", ...carriers.map((item) => item.name)]}
              />
              {(search || status !== "All" || carrier !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatus("All");
                    setCarrier("All");
                  }}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Clear
                </button>
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

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-neutral-950">
                Shipment operations
              </h2>
              <p className="text-xs text-neutral-500">
                {visible.length} of {shipments.length} shipments
              </p>
            </div>
            <SlidersHorizontal className="size-4 text-neutral-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Shipment</th>
                  <th className="px-4 py-3 font-semibold">Lane</th>
                  <th className="px-4 py-3 font-semibold">Carrier</th>
                  <th className="px-4 py-3 font-semibold">Progress</th>
                  <th className="px-4 py-3 font-semibold">ETA</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visible.map((shipment) => (
                  <ShipmentRow
                    key={shipment.id}
                    shipment={shipment}
                    onOpen={() => onOpen(shipment.id)}
                  />
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="px-6 py-16 text-center">
                <Search className="mx-auto size-6 text-neutral-300" />
                <p className="mt-3 font-semibold text-neutral-800">
                  No shipments match these filters
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Try another lane, carrier, or status.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <CarrierPerformance
            carriers={carriers}
            onUpdate={(name, update) => {
              onUpdateCarrier(name, update);
              setNotice(`${name} integration status updated.`);
            }}
          />
          <RoutingPolicies rules={rules} setRules={setRules} />
        </div>
      </div>
      {showCreate && (
        <CreateShipmentDialog
          carriers={carriers}
          onClose={() => setShowCreate(false)}
          onCreate={(shipment) => {
            onAdd(shipment);
            setShowCreate(false);
            setNotice(
              `${shipment.id} was created and added to logistics operations.`,
            );
          }}
        />
      )}
    </div>
  );
}

function ShipmentRow({
  shipment,
  onOpen,
}: {
  shipment: LogisticsShipment;
  onOpen: () => void;
}) {
  const progress = SHIPMENT_PROGRESS[shipment.status];
  return (
    <tr className="transition hover:bg-neutral-50/80">
      <td className="px-5 py-4">
        <button type="button" onClick={onOpen} className="text-left">
          <p className="font-mono text-xs font-bold text-neutral-950">
            {shipment.id}
          </p>
          <p className="mt-1 max-w-44 truncate font-semibold text-neutral-800">
            {shipment.product}
          </p>
          <p className="mt-1 text-xs text-neutral-400">{shipment.orderId}</p>
        </button>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-neutral-800">{shipment.origin}</p>
        <p className="mt-1 text-xs text-neutral-400">
          to {shipment.destination} · {shipment.distance}
        </p>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-neutral-800">{shipment.carrier}</p>
        <p className="mt-1 text-xs text-neutral-400">{shipment.service}</p>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-24 rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full ${shipment.status === "Exception" ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-neutral-600">
            {progress}%
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-neutral-800">{shipment.eta}</p>
        <p className="mt-1 text-xs text-neutral-400">{shipment.cost}</p>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={shipment.status} />
      </td>
      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-3.5 py-2 text-xs font-bold text-white"
        >
          Open <ChevronRight className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}

function LogisticsDetail({
  shipment,
  onBack,
  onUpdate,
}: {
  shipment: LogisticsShipment;
  onBack: () => void;
  onUpdate: (update: Partial<LogisticsShipment>) => void;
}) {
  const [tab, setTab] = useState<ShipmentTab>("Overview");
  const [notice, setNotice] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [reviewedDocs, setReviewedDocs] = useState<string[]>([]);
  const progress = SHIPMENT_PROGRESS[shipment.status];
  const carbonSaved = Math.max(
    0,
    shipment.optimizedCarbonKg - shipment.carbonKg,
  );

  const resolve = () => {
    onUpdate({
      status: "In transit",
      eta: "Updated ETA pending carrier confirmation",
      lastUpdate: "Facility access exception cleared by admin operations.",
      nextStep: "Carrier dispatch must confirm the next route checkpoint.",
    });
    setNotice("Exception resolved and shipment returned to active transit.");
  };
  const delivered = () => {
    onUpdate({
      status: "Delivered",
      eta: "Delivered today",
      lastUpdate: "Delivery confirmed by EcoGlobe admin operations.",
      nextStep: "Buyer inspection and escrow release are ready.",
    });
    setNotice(
      "Delivery confirmation recorded and inspection readiness opened.",
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" /> Back to logistics control tower
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
                {shipment.id} · {shipment.orderId}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                {shipment.product}
              </h1>
              <p className="mt-2 text-sm text-neutral-400">
                {shipment.origin} to {shipment.destination} ·{" "}
                {shipment.quantity} · {shipment.carrier}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"
              >
                <MessageSquare className="size-4" /> Contact carrier
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
                    onClick={delivered}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950"
                  >
                    <PackageCheck className="size-4" /> Confirm delivery
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {shipment.status === "Exception" && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-950">
                Active logistics exception
              </p>
              <p className="mt-1 text-sm text-red-800">{shipment.lastUpdate}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                Next action · {shipment.nextStep}
              </p>
            </div>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {notice}
          </p>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Gauge}
            label="Route progress"
            value={`${progress}%`}
            detail={
              shipment.status === "Exception"
                ? "Progress paused"
                : shipment.lastUpdate
            }
            tone={shipment.status === "Exception" ? "red" : "emerald"}
          />
          <SummaryCard
            icon={CalendarClock}
            label="Estimated arrival"
            value={shipment.eta}
            detail={shipment.service}
          />
          <SummaryCard
            icon={CircleDollarSign}
            label="Booked cost"
            value={shipment.cost}
            detail={`${shipment.quantity} committed`}
          />
          <SummaryCard
            icon={Leaf}
            label="Carbon saved"
            value={`${carbonSaved} kg`}
            detail={`${shipment.carbonKg} kg current route`}
            tone="emerald"
          />
        </section>

        <RouteProgress shipment={shipment} progress={progress} />

        <div
          className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1"
          role="tablist"
          aria-label="Shipment details"
        >
          {(
            ["Overview", "Documents", "Exceptions", "Activity"] as ShipmentTab[]
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

        {tab === "Overview" && <OverviewTab shipment={shipment} />}
        {tab === "Documents" && (
          <DocumentsTab
            shipment={shipment}
            reviewed={reviewedDocs}
            onReview={(document) => {
              setReviewedDocs((current) =>
                current.includes(document) ? current : [...current, document],
              );
              setNotice(`${document} marked reviewed.`);
            }}
          />
        )}
        {tab === "Exceptions" && (
          <ExceptionTab
            shipment={shipment}
            onResolve={resolve}
            onContact={() => setContactOpen(true)}
          />
        )}
        {tab === "Activity" && <ActivityTab shipment={shipment} />}

        {contactOpen && (
          <ContactCarrierDialog
            shipment={shipment}
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

function RouteProgress({
  shipment,
  progress,
}: {
  shipment: LogisticsShipment;
  progress: number;
}) {
  return (
    <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Live route control
          </p>
          <h2 className="mt-2 text-xl font-bold">
            {shipment.origin} → {shipment.destination}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {shipment.distance} · {shipment.carrier} · {shipment.service}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
          {progress}% complete
        </span>
      </div>
      <div
        className="mt-8 grid gap-4 sm:grid-cols-[repeat(var(--stops),minmax(0,1fr))]"
        style={{ "--stops": shipment.route.length } as React.CSSProperties}
      >
        {shipment.route.map((stop, index) => {
          const reached =
            ((index + 1) / shipment.route.length) * 100 <= progress + 20;
          return (
            <div key={stop} className="relative">
              <div className="flex items-center">
                <span
                  className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${reached ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-600 bg-slate-900 text-slate-400"}`}
                >
                  {reached ? <Check className="size-4" /> : index + 1}
                </span>
                {index < shipment.route.length - 1 && (
                  <div className="h-0.5 flex-1 bg-slate-700">
                    <div
                      className={`h-full ${reached ? "w-full bg-emerald-400" : "w-0"}`}
                    />
                  </div>
                )}
              </div>
              <p
                className={`mt-3 text-sm font-semibold ${reached ? "text-white" : "text-slate-500"}`}
              >
                {stop}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3">
        <RadioTower className="mt-0.5 size-4 shrink-0 text-emerald-300" />
        <div>
          <p className="text-sm font-semibold">Latest network event</p>
          <p className="mt-1 text-sm text-slate-400">{shipment.lastUpdate}</p>
        </div>
      </div>
    </section>
  );
}

function OverviewTab({ shipment }: { shipment: LogisticsShipment }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Panel title="Shipment parties and service" icon={Truck}>
        <InfoGrid
          items={[
            { label: "Seller", value: shipment.seller },
            { label: "Buyer", value: shipment.buyer },
            { label: "Carrier", value: shipment.carrier },
            { label: "Service", value: shipment.service },
            { label: "Quantity", value: shipment.quantity },
            { label: "Routing objective", value: shipment.sustainableOption },
          ]}
        />
      </Panel>
      <Panel title="Next operational action" icon={ArrowUpRight}>
        <p className="text-sm leading-6 text-neutral-600">
          {shipment.nextStep}
        </p>
        <div className="mt-4 rounded-xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Last update
          </p>
          <p className="mt-2 text-sm font-medium text-neutral-800">
            {shipment.lastUpdate}
          </p>
        </div>
      </Panel>
    </div>
  );
}

function DocumentsTab({
  shipment,
  reviewed,
  onReview,
}: {
  shipment: LogisticsShipment;
  reviewed: string[];
  onReview: (document: string) => void;
}) {
  return (
    <Panel title="Shipment evidence and documents" icon={FileCheck2}>
      <div className="divide-y divide-neutral-100">
        {shipment.documents.map((document) => {
          const complete = reviewed.includes(document);
          return (
            <div
              key={document}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-100">
                  <FileText className="size-5 text-neutral-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{document}</p>
                  <p className="text-xs text-neutral-500">
                    Linked to {shipment.trackingId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onReview(document)}
                disabled={complete}
                className={`w-fit rounded-full px-3 py-2 text-xs font-bold ${complete ? "bg-emerald-100 text-emerald-800" : "border border-neutral-200 text-neutral-700"}`}
              >
                {complete ? "Reviewed" : "Mark reviewed"}
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function ExceptionTab({
  shipment,
  onResolve,
  onContact,
}: {
  shipment: LogisticsShipment;
  onResolve: () => void;
  onContact: () => void;
}) {
  const open = shipment.status === "Exception";
  return (
    <Panel title="Exception management" icon={AlertTriangle}>
      <div
        className={`rounded-2xl p-5 ${open ? "bg-red-50" : "bg-emerald-50"}`}
      >
        <div className="flex items-start gap-3">
          {open ? (
            <AlertTriangle className="size-5 text-red-600" />
          ) : (
            <CheckCircle2 className="size-5 text-emerald-700" />
          )}
          <div>
            <p
              className={`font-bold ${open ? "text-red-950" : "text-emerald-950"}`}
            >
              {open ? "Open exception" : "No active exception"}
            </p>
            <p
              className={`mt-1 text-sm ${open ? "text-red-800" : "text-emerald-800"}`}
            >
              {open
                ? shipment.lastUpdate
                : "This shipment is moving within the current service plan."}
            </p>
          </div>
        </div>
        {open && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onContact}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-900"
            >
              Contact carrier
            </button>
            <button
              type="button"
              onClick={onResolve}
              className="rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white"
            >
              Resolve exception
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function ActivityTab({ shipment }: { shipment: LogisticsShipment }) {
  const items = [
    {
      title: shipment.lastUpdate,
      detail: "Carrier network event",
      time: "Latest",
    },
    {
      title: `${shipment.carrier} accepted the service plan`,
      detail: shipment.service,
      time: "2 days ago",
    },
    {
      title: "Route optimization completed",
      detail: `${shipment.sustainableOption} selected`,
      time: "3 days ago",
    },
    {
      title: "Shipment record created",
      detail: `${shipment.orderId} · ${shipment.quantity}`,
      time: "4 days ago",
    },
  ];
  return (
    <Panel title="Shipment activity trail" icon={Activity}>
      <Timeline items={items} />
    </Panel>
  );
}

function CarrierPerformance({
  carriers,
  onUpdate,
}: {
  carriers: CarrierIntegration[];
  onUpdate: (name: string, update: Partial<CarrierIntegration>) => void;
}) {
  return (
    <Panel
      title="Carrier network performance"
      icon={Truck}
      action={
        <span className="text-xs font-semibold text-neutral-400">
          Rolling 90 days
        </span>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {carriers.map((carrier) => {
          const performance = CARRIER_PERFORMANCE[carrier.name] ?? {
            onTime: 0,
            acceptance: 0,
            carbon: "—",
            rating: "—",
          };
          return (
            <article
              key={carrier.name}
              className="rounded-2xl border border-neutral-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-neutral-950">{carrier.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {carrier.coverage}
                  </p>
                </div>
                <IntegrationBadge status={carrier.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniMetric label="On time" value={`${performance.onTime}%`} />
                <MiniMetric
                  label="Accept"
                  value={`${performance.acceptance}%`}
                />
                <MiniMetric label="Carbon" value={performance.carbon} />
              </div>
              {carrier.issue && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {carrier.issue}
                </p>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(carrier.name, {
                      status:
                        carrier.status === "Connected"
                          ? "Degraded"
                          : "Connected",
                      issue:
                        carrier.status === "Connected"
                          ? "Integration placed in manual review by admin."
                          : undefined,
                    })
                  }
                  className="text-xs font-bold text-neutral-600 underline underline-offset-4"
                >
                  {carrier.status === "Connected"
                    ? "Place in review"
                    : "Mark connected"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function RoutingPolicies({
  rules,
  setRules,
}: {
  rules: Record<string, boolean>;
  setRules: React.Dispatch<
    React.SetStateAction<{
      carbon: boolean;
      insurance: boolean;
      autoRelease: boolean;
      manualOverride: boolean;
    }>
  >;
}) {
  const policies = [
    {
      key: "carbon",
      icon: Leaf,
      title: "Prefer lowest-carbon route",
      detail: "Auto-select when cost delta is under 8%.",
    },
    {
      key: "insurance",
      icon: ShieldCheck,
      title: "Require carrier insurance",
      detail: "Block booking if cargo coverage is missing.",
    },
    {
      key: "autoRelease",
      icon: PackageCheck,
      title: "Automated release trigger",
      detail: "Delivery confirmation opens buyer inspection.",
    },
    {
      key: "manualOverride",
      icon: Settings2,
      title: "Manual admin override",
      detail: "Allow carrier switching during exceptions.",
    },
  ];
  return (
    <Panel title="Routing policies" icon={CloudCog}>
      <div className="space-y-3">
        {policies.map((policy) => (
          <div
            key={policy.key}
            className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 p-4"
          >
            <div className="flex items-start gap-3">
              <policy.icon className="mt-0.5 size-4 text-neutral-500" />
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  {policy.title}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{policy.detail}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={rules[policy.key]}
              onClick={() =>
                setRules((current) => ({
                  ...current,
                  [policy.key]: !current[policy.key as keyof typeof current],
                }))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${rules[policy.key] ? "bg-emerald-500" : "bg-neutral-300"}`}
            >
              <span
                className={`absolute top-1 size-4 rounded-full bg-white transition ${rules[policy.key] ? "left-6" : "left-1"}`}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-bold">Optimization impact</p>
        <p className="mt-1">
          {routeOptimizationSummary.optimizedShipments} shipments optimized,
          saving {routeOptimizationSummary.monthlySavings} this month.
        </p>
      </div>
    </Panel>
  );
}

function CreateShipmentDialog({
  carriers,
  onClose,
  onCreate,
}: {
  carriers: CarrierIntegration[];
  onClose: () => void;
  onCreate: (shipment: LogisticsShipment) => void;
}) {
  const [product, setProduct] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [carrier, setCarrier] = useState(
    carriers.find((item) => item.status === "Connected")?.name ??
      carriers[0]?.name ??
      "Carrier pending",
  );
  return (
    <Modal
      title="Create logistics shipment"
      description="Add an operational shipment and assign the initial carrier plan."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const base = initialShipments[0];
          const suffix = String(Date.now()).slice(-4);
          onCreate({
            ...base,
            id: `SHP-6${suffix}`,
            orderId: `EG-6${suffix}`,
            trackingId: `ECO-NEW-${suffix}`,
            product,
            origin,
            destination,
            carrier,
            status: "Booked",
            eta: "Carrier confirmation pending",
            route: [origin, destination],
            lastUpdate: "Shipment created by admin operations.",
            nextStep:
              "Carrier must accept the route and send pickup readiness.",
          });
        }}
        className="space-y-4"
      >
        <FormField
          label="Material or product"
          value={product}
          onChange={setProduct}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Origin" value={origin} onChange={setOrigin} />
          <FormField
            label="Destination"
            value={destination}
            onChange={setDestination}
          />
        </div>
        <label className="block text-sm font-semibold text-neutral-800">
          Carrier
          <select
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm"
          >
            {carriers.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-bold text-neutral-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!product.trim() || !origin.trim() || !destination.trim()}
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white disabled:bg-neutral-300"
          >
            Create shipment
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ContactCarrierDialog({
  shipment,
  onClose,
  onSend,
}: {
  shipment: LogisticsShipment;
  onClose: () => void;
  onSend: () => void;
}) {
  const [message, setMessage] = useState(
    `Please confirm the latest ETA, driver status, and next checkpoint for ${shipment.trackingId}.`,
  );
  return (
    <Modal
      title={`Contact ${shipment.carrier}`}
      description={`${shipment.id} · ${shipment.origin} to ${shipment.destination}`}
      onClose={onClose}
    >
      <textarea
        aria-label="Carrier message"
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

function IntegrationBadge({
  status,
}: {
  status: CarrierIntegration["status"];
}) {
  const tone =
    status === "Connected"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Degraded"
        ? "bg-amber-100 text-amber-800"
        : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>
      {status}
    </span>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.06] px-4 py-3">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
    </div>
  );
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-2">
      <p className="text-[10px] uppercase text-neutral-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-neutral-800">{value}</p>
    </div>
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

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-neutral-800">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-900"
      />
    </label>
  );
}

function ShipmentNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-neutral-200">
        <AlertTriangle className="mx-auto size-8 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-neutral-950">
          Shipment record not found
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          This logistics record may have been removed or the address is
          incorrect.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white"
        >
          Return to logistics control tower
        </button>
      </section>
    </div>
  );
}
