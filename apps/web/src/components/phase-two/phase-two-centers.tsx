"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileCheck2,
  Lightbulb,
  MapPin,
  Network,
  PackageCheck,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  Users,
} from "lucide-react";

type Role = "buyer" | "seller" | "admin";
type DeliveryStatus = "Scheduled" | "In transit" | "At facility" | "Delivered" | "Exception";
type VerificationStatus = "Verified" | "In review" | "Needs evidence" | "Expired";
type PartnerStatus = "Active" | "Pending review" | "At risk";

interface Shipment {
  id: string;
  material: string;
  buyer: string;
  seller: string;
  carrier: string;
  origin: string;
  destination: string;
  eta: string;
  status: DeliveryStatus;
  carbonKg: number;
  cost: string;
  milestones: string[];
}

interface Partner {
  id: string;
  name: string;
  type: "Customer" | "Sponsor" | "Assurer" | "Logistics provider";
  region: string;
  status: PartnerStatus;
  certification: string;
  activeTrades: number;
}

interface Asset {
  id: string;
  material: string;
  owner: string;
  certificate: string;
  status: VerificationStatus;
  evidence: string[];
  lastChecked: string;
}

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  impact: string;
  confidence: number;
  roleFit: Role | "all";
}

const shipments: Shipment[] = [
  {
    id: "SHP-6208",
    material: "Black Gypsum",
    buyer: "GreenHarvest Co.",
    seller: "EcoPack Co.",
    carrier: "GreenLine Logistics",
    origin: "Houston, TX",
    destination: "Baton Rouge, LA",
    eta: "Today, 3:30 PM",
    status: "At facility",
    carbonKg: 360,
    cost: "$2,960",
    milestones: ["Pickup confirmed", "Scale ticket uploaded", "Arrived at buyer facility", "POD pending"],
  },
  {
    id: "SHP-6203",
    material: "Scrap Polymer Blend",
    buyer: "BrightFuture Corp",
    seller: "TerraGenesis Biofuels",
    carrier: "EcoFreight",
    origin: "Plaquemine, LA",
    destination: "Port Allen, LA",
    eta: "Delayed",
    status: "Exception",
    carbonKg: 82,
    cost: "$740",
    milestones: ["Pickup requested", "Yard access blocked", "Admin escalation opened"],
  },
  {
    id: "SHP-6199",
    material: "Used Dry Transformer",
    buyer: "NutriFeed Industries",
    seller: "Metal Reclaim LLC",
    carrier: "RapidHaul",
    origin: "Houston, TX",
    destination: "Dallas, TX",
    eta: "Delivered Jul 10",
    status: "Delivered",
    carbonKg: 210,
    cost: "$980",
    milestones: ["Inspection complete", "Loaded", "Delivered", "POD signed"],
  },
];

const partners: Partner[] = [
  { id: "PAR-1101", name: "GreenLine Logistics", type: "Logistics provider", region: "US Gulf", status: "Active", certification: "Low-emission fleet", activeTrades: 18 },
  { id: "PAR-1102", name: "Circular Assurance Group", type: "Assurer", region: "North America", status: "Active", certification: "ESG verification", activeTrades: 9 },
  { id: "PAR-1103", name: "Bayou Industrial Sponsors", type: "Sponsor", region: "Louisiana", status: "Pending review", certification: "Pilot sponsor", activeTrades: 3 },
  { id: "PAR-1104", name: "Atlas Carbon Black", type: "Customer", region: "Mexico", status: "At risk", certification: "Buyer verification renewal", activeTrades: 5 },
];

const assets: Asset[] = [
  {
    id: "ASSET-4301",
    material: "Black Gypsum",
    owner: "EcoPack Co.",
    certificate: "COA + SDS bundle",
    status: "Verified",
    evidence: ["COA verified", "SDS uploaded", "Origin matched to facility"],
    lastChecked: "Jul 14, 2026",
  },
  {
    id: "ASSET-4302",
    material: "Scrap Polymer Blend",
    owner: "TerraGenesis Biofuels",
    certificate: "Off-spec declaration",
    status: "In review",
    evidence: ["Batch photos uploaded", "Quality limits pending", "Buyer acceptance criteria linked"],
    lastChecked: "Jul 12, 2026",
  },
  {
    id: "ASSET-4303",
    material: "Corn Stover",
    owner: "Louisiana BioMass Partners",
    certificate: "Low CO2 biomass certificate",
    status: "Needs evidence",
    evidence: ["Farm origin listed", "Moisture test missing", "Renewal due"],
    lastChecked: "Jul 9, 2026",
  },
];

const recommendations: Recommendation[] = [
  {
    id: "REC-2101",
    title: "Prioritize Black Gypsum near Baton Rouge",
    reason: "Closest verified supply with active logistics lanes and low exception risk.",
    impact: "12% lower landed cost, 1.1 t CO2e avoided",
    confidence: 92,
    roleFit: "buyer",
  },
  {
    id: "REC-2102",
    title: "Bundle SDS renewal with listing refresh",
    reason: "A pending document renewal is likely blocking buyer confidence on off-spec material.",
    impact: "Improves listing readiness and reduces admin review time",
    confidence: 87,
    roleFit: "seller",
  },
  {
    id: "REC-2103",
    title: "Review Plaquemine access exception",
    reason: "Repeated yard access issues are delaying short-haul shipments.",
    impact: "Can recover 2 at-risk deliveries this week",
    confidence: 81,
    roleFit: "admin",
  },
  {
    id: "REC-2104",
    title: "Use balanced route for Houston to Baton Rouge",
    reason: "Balanced carrier option keeps price low while staying within carbon target.",
    impact: "$320 saved versus lowest CO2 option",
    confidence: 78,
    roleFit: "all",
  },
];

const comparisons = [
  { location: "Baton Rouge, LA", distance: "18 mi", cost: "$740", carbon: "0.08 t CO2e", eta: "Same day", score: 94 },
  { location: "Houston, TX", distance: "271 mi", cost: "$2,960", carbon: "0.36 t CO2e", eta: "1 day", score: 88 },
  { location: "Dallas, TX", distance: "447 mi", cost: "$3,780", carbon: "0.58 t CO2e", eta: "2 days", score: 72 },
];

const analytics = {
  buyer: [
    { label: "Average landed savings", value: "11.8%", detail: "Compared with first quote" },
    { label: "CO2e avoided", value: "18.4 t", detail: "Last 90 days" },
    { label: "Verified supplier rate", value: "96%", detail: "Across active orders" },
  ],
  seller: [
    { label: "Revenue from recurring contracts", value: "$124k", detail: "Projected next quarter" },
    { label: "Listing conversion", value: "28%", detail: "Inquiries to signed terms" },
    { label: "Document readiness", value: "87%", detail: "Certifications current" },
  ],
  admin: [
    { label: "Active pilot trades", value: "42", detail: "Across all roles" },
    { label: "Exception rate", value: "6.4%", detail: "Logistics and verification" },
    { label: "ESG reports generated", value: "18", detail: "This month" },
  ],
};

export function DeliveryTrackingCenter({ role }: { role: Role }) {
  const [selected, setSelected] = useState(shipments[0]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const activeStatus = resolved[selected.id]
    ? "In transit"
    : confirmed[selected.id]
      ? "Delivered"
      : selected.status;

  return (
    <PageShell
      eyebrow="REAL-TIME DELIVERY TRACKING"
      title="Track shipments, delivery confirmation, proof of delivery, and exceptions."
      body="Frontend demo for GPS-style shipment status, carbon-optimized routing, proof-of-delivery review, and release-ready delivery milestones."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">Active shipments</h2>
          <div className="mt-4 space-y-3">
            {shipments.map((shipment) => (
              <button
                key={shipment.id}
                onClick={() => setSelected(shipment)}
                className={`w-full rounded-xl p-4 text-left ring-1 transition ${
                  selected.id === shipment.id
                    ? "bg-neutral-950 text-white ring-neutral-950"
                    : "bg-white text-neutral-950 ring-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs">{shipment.id}</span>
                  <DeliveryBadge status={shipment.id === selected.id ? activeStatus : shipment.status} inverted={selected.id === shipment.id} />
                </div>
                <p className="mt-2 font-semibold">{shipment.material}</p>
                <p className={`text-sm ${selected.id === shipment.id ? "text-neutral-300" : "text-neutral-500"}`}>
                  {shipment.origin} to {shipment.destination} via {shipment.carrier}
                </p>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">{selected.material}</h2>
              <p className="text-sm text-neutral-500">{selected.buyer} / {selected.seller}</p>
            </div>
            <DeliveryBadge status={activeStatus} />
          </div>
          <div className="mb-5 rounded-2xl bg-slate-900 p-5 text-white">
            <div className="flex items-center justify-between">
              <MapPin className="size-5 text-emerald-300" />
              <Route className="size-5 text-emerald-300" />
              <Truck className="size-5 text-emerald-300" />
              <PackageCheck className="size-5 text-emerald-300" />
            </div>
            <div className="mt-4 h-1 rounded-full bg-white/20">
              <div className="h-full w-3/4 rounded-full bg-emerald-400" />
            </div>
            <p className="mt-4 text-sm text-neutral-300">
              {selected.origin} to {selected.destination}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="ETA" value={selected.eta} />
            <Metric label="Cost" value={selected.cost} />
            <Metric label="CO2" value={`${selected.carbonKg} kg`} />
          </div>
          <div className="mt-5 space-y-2">
            {selected.milestones.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                <CheckCircle2 className={`size-4 ${index < selected.milestones.length - 1 ? "text-emerald-600" : "text-neutral-400"}`} />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setConfirmed((current) => ({ ...current, [selected.id]: true }))}
              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Confirm delivery
            </button>
            {role === "admin" && selected.status === "Exception" && (
              <button
                onClick={() => setResolved((current) => ({ ...current, [selected.id]: true }))}
                className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Resolve exception
              </button>
            )}
            <button className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold">
              Upload POD
            </button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

export function PartnerNetworkCenter({ role }: { role: Role }) {
  const [type, setType] = useState<Partner["type"] | "All">("All");
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const visible = partners.filter((partner) => type === "All" || partner.type === type);

  return (
    <PageShell
      eyebrow="PARTNER NETWORK"
      title="Manage customers, sponsors, assurers, and logistics providers."
      body="Frontend directory for partner certification, network health, active trades, and role-specific relationship management."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", "Customer", "Sponsor", "Assurer", "Logistics provider"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setType(item)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              type === item ? "bg-neutral-950 text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((partner) => (
          <section key={partner.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-neutral-100">
                  {partner.type === "Logistics provider" ? <Truck className="size-5" /> : <Network className="size-5" />}
                </div>
                <div>
                  <p className="font-bold text-neutral-950">{partner.name}</p>
                  <p className="text-sm text-neutral-500">{partner.type} / {partner.region}</p>
                </div>
              </div>
              <PartnerBadge status={approved[partner.id] ? "Active" : partner.status} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Certification" value={partner.certification} />
              <Metric label="Active trades" value={String(partner.activeTrades)} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
                View partner
              </button>
              {(role === "admin" || partner.status === "Pending review") && (
                <button
                  onClick={() => setApproved((current) => ({ ...current, [partner.id]: true }))}
                  className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold"
                >
                  Approve
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

export function AssetVerificationCenter({ role }: { role: Role }) {
  const [assetsState, setAssetsState] = useState(assets);
  const [selected, setSelected] = useState(assets[0]);

  const verify = (id: string) => {
    setAssetsState((current) =>
      current.map((asset) => (asset.id === id ? { ...asset, status: "Verified" } : asset)),
    );
    setSelected((current) => (current.id === id ? { ...current, status: "Verified" } : current));
  };

  return (
    <PageShell
      eyebrow="DIGITAL ASSET VERIFICATION"
      title="Validate feedstock listings, waste streams, certificates, and origin evidence."
      body="Frontend demo for digital certificates, verification status, evidence chains, and admin review of asset authenticity."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">Asset queue</h2>
          <div className="mt-4 space-y-3">
            {assetsState.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelected(asset)}
                className={`w-full rounded-xl p-4 text-left ring-1 ${
                  selected.id === asset.id ? "bg-neutral-950 text-white ring-neutral-950" : "bg-white ring-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs">{asset.id}</span>
                  <AssetBadge status={asset.status} inverted={selected.id === asset.id} />
                </div>
                <p className="mt-2 font-semibold">{asset.material}</p>
                <p className={selected.id === asset.id ? "text-sm text-neutral-300" : "text-sm text-neutral-500"}>
                  {asset.owner} / {asset.certificate}
                </p>
              </button>
            ))}
          </div>
        </section>
        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">{selected.material}</h2>
              <p className="text-sm text-neutral-500">Last checked {selected.lastChecked}</p>
            </div>
            <AssetBadge status={selected.status} />
          </div>
          <div className="space-y-2">
            {selected.evidence.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                <FileCheck2 className="size-4 text-emerald-700" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold">
              <Upload className="mr-1 inline size-4" />
              Add evidence
            </button>
            {(role === "admin" || selected.status === "Needs evidence") && (
              <button
                onClick={() => verify(selected.id)}
                className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Verify asset
              </button>
            )}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

export function MapIntelligenceCenter({ role }: { role: Role }) {
  const [zip, setZip] = useState("70802");
  const [searched, setSearched] = useState(false);

  return (
    <PageShell
      eyebrow="MAP AND ZIP INTELLIGENCE"
      title="Compare distance, cost, carbon impact, and delivery time by ZIP code."
      body="Frontend demo for the Phase 2 map expansion: ZIP search, distance filtering, geospatial comparison, and CO2/cost scenario testing."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">Search radius</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={zip}
              onChange={(event) => setZip(event.target.value)}
              className="flex-1 rounded-full border border-neutral-200 px-4 py-2 text-sm outline-none"
              placeholder="ZIP code"
            />
            <button
              onClick={() => setSearched(true)}
              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Search
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-900 p-5 text-white">
            <div className="mb-5 flex items-center justify-between text-sm text-neutral-300">
              <span>ZIP {zip || "----"}</span>
              <span>100 mi radius</span>
            </div>
            <div className="relative h-64 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900 via-slate-800 to-blue-950">
              <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/60 bg-emerald-300/10" />
              {comparisons.map((item, index) => (
                <div
                  key={item.location}
                  className="absolute size-4 rounded-full bg-emerald-300 ring-4 ring-white/20"
                  style={{ left: `${30 + index * 18}%`, top: `${62 - index * 20}%` }}
                  title={item.location}
                />
              ))}
            </div>
          </div>
          {searched && <p className="mt-3 text-sm text-emerald-700">Comparison refreshed for ZIP {zip}.</p>}
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">{role === "admin" ? "Network scenarios" : "Best-fit feedstock lanes"}</h2>
          <div className="mt-4 space-y-3">
            {comparisons.map((item) => (
              <div key={item.location} className="rounded-xl border border-neutral-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-neutral-950">{item.location}</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Score {item.score}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                  <Metric label="Distance" value={item.distance} />
                  <Metric label="Cost" value={item.cost} />
                  <Metric label="CO2" value={item.carbon} />
                  <Metric label="ETA" value={item.eta} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export function AnalyticsCenter({ role }: { role: Role }) {
  const [range, setRange] = useState("90 days");
  const cards = analytics[role];

  return (
    <PageShell
      eyebrow="ANALYTICS DASHBOARD"
      title="Role-specific intelligence for trade, sustainability, and operational performance."
      body="Frontend demo for business intelligence dashboards by buyer, seller, and admin profile."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {["30 days", "90 days", "12 months"].map((item) => (
          <button
            key={item}
            onClick={() => setRange(item)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              range === item ? "bg-neutral-950 text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <section key={card.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <BarChart3 className="mb-4 size-5 text-emerald-700" />
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-neutral-950">{card.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{card.detail} / {range}</p>
          </section>
        ))}
      </div>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <h2 className="text-lg font-bold text-neutral-950">Trend preview</h2>
        <div className="mt-5 flex h-64 items-end gap-3 rounded-xl bg-neutral-50 p-5">
          {[42, 58, 51, 74, 69, 88, 81, 96].map((height, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-xl bg-emerald-600" style={{ height: `${height}%` }} />
              <span className="text-xs text-neutral-400">W{index + 1}</span>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function RecommendationsCenter({ role }: { role: Role }) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const visible = useMemo(
    () => recommendations.filter((item) => item.roleFit === "all" || item.roleFit === role),
    [role],
  );

  return (
    <PageShell
      eyebrow="RECOMMENDATIONS"
      title="Surface AI-style recommendations for products, actions, and operational next steps."
      body="Frontend demo for recommendation cards. The recommendation engine can be connected later when backend intelligence is ready."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => (
          <section key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <div className="mb-4 flex items-center justify-between">
              <Sparkles className="size-5 text-amber-500" />
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                {item.confidence}% confidence
              </span>
            </div>
            <h2 className="text-lg font-bold text-neutral-950">{item.title}</h2>
            <p className="mt-2 text-sm text-neutral-600">{item.reason}</p>
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
              {item.impact}
            </div>
            <button
              onClick={() => setAccepted((current) => ({ ...current, [item.id]: true }))}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              {accepted[item.id] ? "Accepted" : "Accept recommendation"}
              <ArrowRight className="size-4" />
            </button>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

function PageShell({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">{eyebrow}</p>
            <h1 className="max-w-4xl text-3xl font-bold text-neutral-950">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">{body}</p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
            Frontend demo
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function DeliveryBadge({ status, inverted = false }: { status: DeliveryStatus | string; inverted?: boolean }) {
  const tone: Record<string, string> = {
    Scheduled: "bg-blue-100 text-blue-700",
    "In transit": "bg-indigo-100 text-indigo-700",
    "At facility": "bg-amber-100 text-amber-800",
    Delivered: "bg-emerald-100 text-emerald-700",
    Exception: "bg-red-100 text-red-700",
  };
  return <Badge label={status} className={inverted ? "bg-white/15 text-white" : tone[status]} />;
}

function PartnerBadge({ status }: { status: PartnerStatus }) {
  const tone = {
    Active: "bg-emerald-100 text-emerald-700",
    "Pending review": "bg-blue-100 text-blue-700",
    "At risk": "bg-red-100 text-red-700",
  }[status];
  return <Badge label={status} className={tone} />;
}

function AssetBadge({ status, inverted = false }: { status: VerificationStatus; inverted?: boolean }) {
  const tone = {
    Verified: "bg-emerald-100 text-emerald-700",
    "In review": "bg-blue-100 text-blue-700",
    "Needs evidence": "bg-amber-100 text-amber-800",
    Expired: "bg-red-100 text-red-700",
  }[status];
  return <Badge label={status} className={inverted ? "bg-white/15 text-white" : tone} />;
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

export const phaseTwoNav = [
  { label: "Delivery Tracking", href: "delivery-tracking", icon: Truck },
  { label: "Partner Network", href: "partners", icon: Users },
  { label: "Asset Verification", href: "asset-verification", icon: ShieldCheck },
  { label: "Map Intelligence", href: "map-intelligence", icon: MapPin },
  { label: "Analytics", href: "analytics", icon: BarChart3 },
  { label: "Recommendations", href: "recommendations", icon: Lightbulb },
] as const;
