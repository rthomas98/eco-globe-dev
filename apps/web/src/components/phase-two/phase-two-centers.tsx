"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  Lightbulb,
  MapPin,
  Network,
  PackageCheck,
  Route,
  ShieldCheck,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { MapIntelligenceWorkspaceProps } from "../logistics/map-intelligence-workspace";
import type { ShipmentTrackingMapProps } from "../logistics/shipment-tracking-map";
import { ExternalPortalsAnalytics } from "../analytics/external-portals-analytics";
import { RecommendationsWorkspace } from "../recommendations/recommendations-workspace";

const MapIntelligenceWorkspace = dynamic<MapIntelligenceWorkspaceProps>(
  () =>
    import("../logistics/map-intelligence-workspace").then(
      (module) => module.MapIntelligenceWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-2xl bg-slate-100 text-sm font-medium text-slate-500">
        Loading Mapbox intelligence…
      </div>
    ),
  },
);

const ShipmentTrackingMap = dynamic<ShipmentTrackingMapProps>(
  () =>
    import("../logistics/shipment-tracking-map").then(
      (module) => module.ShipmentTrackingMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl bg-slate-100 text-sm font-medium text-slate-500">
        Loading shipment map…
      </div>
    ),
  },
);

type Role = "buyer" | "seller" | "admin";
type DeliveryStatus =
  | "Scheduled"
  | "In transit"
  | "At facility"
  | "Delivered"
  | "Exception";
type VerificationStatus =
  | "Verified"
  | "In review"
  | "Needs evidence"
  | "Expired";
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
  route: ShipmentTrackingMapProps["shipment"]["route"];
}

interface Partner {
  id: string;
  name: string;
  type: "Customer" | "Sponsor" | "Assurer" | "Logistics provider";
  region: string;
  status: PartnerStatus;
  certification: string;
  activeTrades: number;
  description: string;
  relationshipSince: string;
  capabilities: string[];
  recentActivity: string[];
  contact: {
    name: string;
    role: string;
    email: string;
  };
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
    milestones: [
      "Pickup confirmed",
      "Scale ticket uploaded",
      "Arrived at buyer facility",
      "POD pending",
    ],
    route: {
      coordinates: [
        [-95.3698, 29.7604],
        [-94.7977, 30.0913],
        [-93.2174, 30.2266],
        [-92.0198, 30.2241],
        [-91.1871, 30.4515],
      ],
      currentCoordinate: [-91.1871, 30.4515],
      progressCoordinateCount: 5,
      stops: [
        {
          label: "Houston pickup",
          coordinate: [-95.3698, 29.7604],
          kind: "origin",
        },
        {
          label: "Lake Charles cross-dock",
          coordinate: [-93.2174, 30.2266],
          kind: "stop",
        },
        {
          label: "Baton Rouge facility",
          coordinate: [-91.1871, 30.4515],
          kind: "destination",
        },
      ],
    },
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
    milestones: [
      "Pickup requested",
      "Yard access blocked",
      "Admin escalation opened",
    ],
    route: {
      coordinates: [
        [-91.234, 30.2891],
        [-91.228, 30.332],
        [-91.2068, 30.4515],
      ],
      currentCoordinate: [-91.228, 30.332],
      progressCoordinateCount: 2,
      stops: [
        {
          label: "Plaquemine yard",
          coordinate: [-91.234, 30.2891],
          kind: "origin",
        },
        {
          label: "Access exception",
          coordinate: [-91.228, 30.332],
          kind: "stop",
        },
        {
          label: "Port Allen facility",
          coordinate: [-91.2068, 30.4515],
          kind: "destination",
        },
      ],
    },
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
    route: {
      coordinates: [
        [-95.3698, 29.7604],
        [-95.592, 30.498],
        [-96.3344, 31.1],
        [-96.8, 32.7767],
      ],
      currentCoordinate: [-96.8, 32.7767],
      progressCoordinateCount: 4,
      stops: [
        {
          label: "Houston pickup",
          coordinate: [-95.3698, 29.7604],
          kind: "origin",
        },
        {
          label: "Central Texas checkpoint",
          coordinate: [-96.3344, 31.1],
          kind: "stop",
        },
        {
          label: "Dallas delivery",
          coordinate: [-96.8, 32.7767],
          kind: "destination",
        },
      ],
    },
  },
];

const partners: Partner[] = [
  {
    id: "PAR-1101",
    name: "GreenLine Logistics",
    type: "Logistics provider",
    region: "US Gulf",
    status: "Active",
    certification: "Low-emission fleet",
    activeTrades: 18,
    description:
      "Regional carrier specializing in verified industrial byproduct and biomass lanes across the Gulf Coast.",
    relationshipSince: "March 2024",
    capabilities: [
      "Live GPS tracking",
      "Proof of delivery",
      "Low-emission fleet",
      "Hazmat-ready drivers",
    ],
    recentActivity: [
      "Delivered SHP-6196 on time",
      "Renewed fleet emissions certificate",
      "Accepted Baton Rouge lane request",
    ],
    contact: {
      name: "Morgan Lee",
      role: "Partnership manager",
      email: "morgan@greenline.example",
    },
  },
  {
    id: "PAR-1102",
    name: "Circular Assurance Group",
    type: "Assurer",
    region: "North America",
    status: "Active",
    certification: "ESG verification",
    activeTrades: 9,
    description:
      "Independent assurance partner for sustainability evidence, chain-of-custody reviews, and ESG reporting.",
    relationshipSince: "August 2024",
    capabilities: [
      "ESG assurance",
      "Certificate review",
      "Chain of custody",
      "Audit support",
    ],
    recentActivity: [
      "Verified three COA bundles",
      "Completed Q2 ESG review",
      "Updated assurance methodology",
    ],
    contact: {
      name: "Elena Brooks",
      role: "Assurance lead",
      email: "elena@circularassurance.example",
    },
  },
  {
    id: "PAR-1103",
    name: "Bayou Industrial Sponsors",
    type: "Sponsor",
    region: "Louisiana",
    status: "Pending review",
    certification: "Pilot sponsor",
    activeTrades: 3,
    description:
      "Louisiana industrial network supporting circular-material pilots, introductions, and facility access.",
    relationshipSince: "June 2026",
    capabilities: [
      "Pilot sponsorship",
      "Facility introductions",
      "Regional outreach",
      "Program funding",
    ],
    recentActivity: [
      "Submitted sponsor verification",
      "Introduced two facility partners",
      "Requested pilot scope review",
    ],
    contact: {
      name: "Andre Mitchell",
      role: "Program director",
      email: "andre@bayouindustrial.example",
    },
  },
  {
    id: "PAR-1104",
    name: "Atlas Carbon Black",
    type: "Customer",
    region: "Mexico",
    status: "At risk",
    certification: "Buyer verification renewal",
    activeTrades: 5,
    description:
      "Cross-border buyer sourcing verified recovered carbon feedstocks for industrial manufacturing.",
    relationshipSince: "November 2025",
    capabilities: [
      "Cross-border procurement",
      "Recurring contracts",
      "Bulk receiving",
      "Quality inspection",
    ],
    recentActivity: [
      "Renewal reminder sent",
      "Two trades awaiting documents",
      "Updated receiving specification",
    ],
    contact: {
      name: "Sofia Ramirez",
      role: "Procurement lead",
      email: "sofia@atlascarbon.example",
    },
  },
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
    evidence: [
      "Batch photos uploaded",
      "Quality limits pending",
      "Buyer acceptance criteria linked",
    ],
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
      <ShipmentTrackingMap shipment={selected} status={activeStatus} />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">
            Active shipments
          </h2>
          <div className="mt-4 space-y-3">
            {shipments.map((shipment) => (
              <button
                key={shipment.id}
                type="button"
                onClick={() => setSelected(shipment)}
                className={`w-full rounded-xl p-4 text-left ring-1 transition ${
                  selected.id === shipment.id
                    ? "bg-neutral-950 text-white ring-neutral-950"
                    : "bg-white text-neutral-950 ring-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs">{shipment.id}</span>
                  <DeliveryBadge
                    status={
                      shipment.id === selected.id
                        ? activeStatus
                        : shipment.status
                    }
                    inverted={selected.id === shipment.id}
                  />
                </div>
                <p className="mt-2 font-semibold">{shipment.material}</p>
                <p
                  className={`text-sm ${selected.id === shipment.id ? "text-neutral-300" : "text-neutral-500"}`}
                >
                  {shipment.origin} to {shipment.destination} via{" "}
                  {shipment.carrier}
                </p>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                {selected.material}
              </h2>
              <p className="text-sm text-neutral-500">
                {selected.buyer} / {selected.seller}
              </p>
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
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
              >
                <CheckCircle2
                  className={`size-4 ${index < selected.milestones.length - 1 ? "text-emerald-600" : "text-neutral-400"}`}
                />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setConfirmed((current) => ({ ...current, [selected.id]: true }))
              }
              className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Confirm delivery
            </button>
            {role === "admin" && selected.status === "Exception" && (
              <button
                type="button"
                onClick={() =>
                  setResolved((current) => ({
                    ...current,
                    [selected.id]: true,
                  }))
                }
                className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Resolve exception
              </button>
            )}
            <button
              type="button"
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold"
            >
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
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [introductionRequested, setIntroductionRequested] = useState<
    Record<string, boolean>
  >({});
  const visible = partners.filter(
    (partner) => type === "All" || partner.type === type,
  );
  const selectedStatus = selectedPartner
    ? approved[selectedPartner.id]
      ? "Active"
      : selectedPartner.status
    : null;

  const approvePartner = (id: string) => {
    setApproved((current) => ({ ...current, [id]: true }));
  };

  return (
    <PageShell
      eyebrow="PARTNER NETWORK"
      title="Manage customers, sponsors, assurers, and logistics providers."
      body="Frontend directory for partner certification, network health, active trades, and role-specific relationship management."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            "All",
            "Customer",
            "Sponsor",
            "Assurer",
            "Logistics provider",
          ] as const
        ).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setType(item)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              type === item
                ? "bg-neutral-950 text-white"
                : "bg-white text-neutral-700 ring-1 ring-neutral-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((partner) => (
          <section
            key={partner.id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-neutral-100">
                  {partner.type === "Logistics provider" ? (
                    <Truck className="size-5" />
                  ) : (
                    <Network className="size-5" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-neutral-950">{partner.name}</p>
                  <p className="text-sm text-neutral-500">
                    {partner.type} / {partner.region}
                  </p>
                </div>
              </div>
              <PartnerBadge
                status={approved[partner.id] ? "Active" : partner.status}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Certification" value={partner.certification} />
              <Metric
                label="Active trades"
                value={String(partner.activeTrades)}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedPartner(partner)}
                className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
              >
                View partner
              </button>
              {(role === "admin" || partner.status === "Pending review") && (
                <button
                  type="button"
                  onClick={() => approvePartner(partner.id)}
                  className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold"
                >
                  {approved[partner.id] ? "Approved" : "Approve"}
                </button>
              )}
            </div>
          </section>
        ))}
      </div>

      {selectedPartner && selectedStatus && (
        <div className="fixed inset-0 z-[70] flex">
          <button
            type="button"
            aria-label="Close partner profile"
            onClick={() => setSelectedPartner(null)}
            className="absolute inset-0 bg-neutral-950/35 backdrop-blur-[1px]"
          />
          <dialog
            open
            aria-modal="true"
            aria-labelledby="partner-profile-title"
            className="relative z-10 ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-0 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-100 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-emerald-700">
                  PARTNER PROFILE
                </p>
                <h2
                  id="partner-profile-title"
                  className="mt-1 text-2xl font-bold text-neutral-950"
                >
                  {selectedPartner.name}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {selectedPartner.type} / {selectedPartner.region}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close partner profile"
                autoFocus
                onClick={() => setSelectedPartner(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PartnerBadge status={selectedStatus} />
                <span className="font-mono text-xs text-neutral-400">
                  {selectedPartner.id}
                </span>
              </div>

              <p className="text-sm leading-6 text-neutral-600">
                {selectedPartner.description}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Certification"
                  value={selectedPartner.certification}
                />
                <Metric
                  label="Active trades"
                  value={String(selectedPartner.activeTrades)}
                />
                <Metric
                  label="Partner since"
                  value={selectedPartner.relationshipSince}
                />
              </div>

              <section>
                <h3 className="text-sm font-bold text-neutral-950">
                  Capabilities
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPartner.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-neutral-950">
                  Recent activity
                </h3>
                <div className="mt-3 space-y-2">
                  {selectedPartner.recentActivity.map((activity) => (
                    <div
                      key={activity}
                      className="flex items-start gap-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {activity}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-neutral-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  Primary contact
                </p>
                <p className="mt-2 font-bold text-neutral-950">
                  {selectedPartner.contact.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {selectedPartner.contact.role}
                </p>
                <p className="mt-2 text-sm text-neutral-700">
                  {selectedPartner.contact.email}
                </p>
              </section>

              {introductionRequested[selectedPartner.id] && (
                <p
                  role="status"
                  className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                >
                  Introduction request sent to {selectedPartner.contact.name}.
                </p>
              )}
            </div>

            <div className="sticky bottom-0 grid gap-2 border-t border-neutral-100 bg-white px-6 py-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setIntroductionRequested((current) => ({
                    ...current,
                    [selectedPartner.id]: true,
                  }))
                }
                disabled={introductionRequested[selectedPartner.id]}
                className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300"
              >
                {introductionRequested[selectedPartner.id]
                  ? "Introduction requested"
                  : "Request introduction"}
              </button>
              {(role === "admin" ||
                selectedPartner.status === "Pending review") &&
                selectedStatus !== "Active" && (
                  <button
                    type="button"
                    onClick={() => approvePartner(selectedPartner.id)}
                    className="rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-800"
                  >
                    Approve partner
                  </button>
                )}
            </div>
          </dialog>
        </div>
      )}
    </PageShell>
  );
}

export function AssetVerificationCenter({ role }: { role: Role }) {
  const [assetsState, setAssetsState] = useState(assets);
  const [selected, setSelected] = useState(assets[0]);

  const verify = (id: string) => {
    setAssetsState((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, status: "Verified" } : asset,
      ),
    );
    setSelected((current) =>
      current.id === id ? { ...current, status: "Verified" } : current,
    );
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
                type="button"
                onClick={() => setSelected(asset)}
                className={`w-full rounded-xl p-4 text-left ring-1 ${
                  selected.id === asset.id
                    ? "bg-neutral-950 text-white ring-neutral-950"
                    : "bg-white ring-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs">{asset.id}</span>
                  <AssetBadge
                    status={asset.status}
                    inverted={selected.id === asset.id}
                  />
                </div>
                <p className="mt-2 font-semibold">{asset.material}</p>
                <p
                  className={
                    selected.id === asset.id
                      ? "text-sm text-neutral-300"
                      : "text-sm text-neutral-500"
                  }
                >
                  {asset.owner} / {asset.certificate}
                </p>
              </button>
            ))}
          </div>
        </section>
        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                {selected.material}
              </h2>
              <p className="text-sm text-neutral-500">
                Last checked {selected.lastChecked}
              </p>
            </div>
            <AssetBadge status={selected.status} />
          </div>
          <div className="space-y-2">
            {selected.evidence.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm"
              >
                <FileCheck2 className="size-4 text-emerald-700" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold"
            >
              <Upload className="mr-1 inline size-4" />
              Add evidence
            </button>
            {(role === "admin" || selected.status === "Needs evidence") && (
              <button
                type="button"
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
  return (
    <PageShell
      eyebrow="MAP AND ZIP INTELLIGENCE"
      title="Compare distance, cost, carbon impact, and delivery time by ZIP code."
      body="Search any U.S. ZIP code, filter verified facilities by radius, and compare Mapbox-powered lane estimates."
    >
      <MapIntelligenceWorkspace role={role} />
    </PageShell>
  );
}

export function AnalyticsCenter({ role }: { role: Role }) {
  return (
    <PageShell
      eyebrow="EXTERNAL PORTAL ANALYTICS"
      title="Understand performance across buyers, schools, pantries, market operators, and transport partners."
      body="Explore role-specific activity, service levels, community impact, operating funnels, and participant health across the complete EcoGlobe network."
    >
      <ExternalPortalsAnalytics role={role} />
    </PageShell>
  );
}

export function RecommendationsCenter({ role }: { role: Role }) {
  return (
    <PageShell
      eyebrow="RECOMMENDATIONS"
      title="Surface AI-style recommendations for products, actions, and operational next steps."
      body="Prioritize explainable opportunities, understand the evidence behind each suggestion, and turn the strongest signals into accountable action plans."
    >
      <RecommendationsWorkspace role={role} />
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
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              {eyebrow}
            </p>
            <h1 className="max-w-4xl text-3xl font-bold text-neutral-950">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">{body}</p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
            Interactive workspace
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

const DELIVERY_TONE: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-700",
  "In transit": "bg-indigo-100 text-indigo-700",
  "At facility": "bg-amber-100 text-amber-800",
  Delivered: "bg-emerald-100 text-emerald-700",
  Exception: "bg-red-100 text-red-700",
};

function DeliveryBadge({
  status,
  inverted = false,
}: {
  status: DeliveryStatus | string;
  inverted?: boolean;
}) {
  return (
    <Badge
      label={status}
      className={inverted ? "bg-white/15 text-white" : DELIVERY_TONE[status]}
    />
  );
}

function PartnerBadge({ status }: { status: PartnerStatus }) {
  const tone = {
    Active: "bg-emerald-100 text-emerald-700",
    "Pending review": "bg-blue-100 text-blue-700",
    "At risk": "bg-red-100 text-red-700",
  }[status];
  return <Badge label={status} className={tone} />;
}

function AssetBadge({
  status,
  inverted = false,
}: {
  status: VerificationStatus;
  inverted?: boolean;
}) {
  const tone = {
    Verified: "bg-emerald-100 text-emerald-700",
    "In review": "bg-blue-100 text-blue-700",
    "Needs evidence": "bg-amber-100 text-amber-800",
    Expired: "bg-red-100 text-red-700",
  }[status];
  return (
    <Badge
      label={status}
      className={inverted ? "bg-white/15 text-white" : tone}
    />
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

export const phaseTwoNav = [
  { label: "Delivery Tracking", href: "delivery-tracking", icon: Truck },
  { label: "Partner Network", href: "partners", icon: Users },
  {
    label: "Asset Verification",
    href: "asset-verification",
    icon: ShieldCheck,
  },
  { label: "Map Intelligence", href: "map-intelligence", icon: MapPin },
  { label: "Analytics", href: "analytics", icon: BarChart3 },
  { label: "Recommendations", href: "recommendations", icon: Lightbulb },
] as const;
