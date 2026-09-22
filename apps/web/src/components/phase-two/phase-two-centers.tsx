"use client";

import { SavedPartnerNetwork } from "./saved-partner-network";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  BarChart3,
  FileCheck2,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import type { MapIntelligenceWorkspaceProps } from "../logistics/map-intelligence-workspace";
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

type Role = "buyer" | "seller" | "admin";
type VerificationStatus =
  | "Verified"
  | "In review"
  | "Needs evidence"
  | "Expired";
interface Asset {
  id: string;
  material: string;
  owner: string;
  certificate: string;
  status: VerificationStatus;
  evidence: string[];
  lastChecked: string;
}

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

export { SavedDeliveryTracking as DeliveryTrackingCenter } from "./saved-delivery-tracking";

export function PartnerNetworkCenter({ role: _role }: { role: Role }) {
  return <SavedPartnerNetwork />;
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
