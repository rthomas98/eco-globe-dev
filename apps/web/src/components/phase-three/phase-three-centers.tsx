"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Blocks,
  Languages,
  MonitorSmartphone,
  Play,
  Rocket,
  Workflow,
} from "lucide-react";
import { MobileAccessPreview } from "../mobile/mobile-access-preview";
import { LocalizationWorkspace } from "../localization/localization-workspace";
import type { NationalExpansionWorkspaceProps } from "../expansion/national-expansion-workspace";

const NationalExpansionWorkspace = dynamic<NationalExpansionWorkspaceProps>(
  () =>
    import("../expansion/national-expansion-workspace").then(
      (module) => module.NationalExpansionWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-2xl bg-slate-100 text-sm font-medium text-slate-500">
        Loading national expansion workspace…
      </div>
    ),
  },
);

type Role = "buyer" | "seller" | "admin" | "public";
type ChainStatus = "Verified" | "Pending attestation" | "Disputed";
type AutomationStatus = "Ready" | "Paused" | "Needs review";

const traceRecords = [
  {
    id: "CHAIN-9001",
    material: "Black Gypsum",
    owner: "EcoPack Co.",
    status: "Verified" as ChainStatus,
    hash: "0x7fa9...21bd",
    events: [
      "Origin attested",
      "COA attached",
      "Escrow funded",
      "Delivery confirmed",
    ],
  },
  {
    id: "CHAIN-9002",
    material: "Scrap Polymer Blend",
    owner: "TerraGenesis Biofuels",
    status: "Pending attestation" as ChainStatus,
    hash: "0x2ac1...8ff0",
    events: ["Batch created", "SDS uploaded", "Buyer criteria pending"],
  },
  {
    id: "CHAIN-9003",
    material: "Corn Stover",
    owner: "Louisiana BioMass Partners",
    status: "Disputed" as ChainStatus,
    hash: "0x9bf4...ab42",
    events: [
      "Farm origin logged",
      "Moisture evidence missing",
      "Admin review opened",
    ],
  },
];

const automations = [
  {
    id: "AUTO-3001",
    name: "Release escrow after signed POD",
    trigger: "Delivery confirmed + 48 hour dispute window closes",
    action: "Release monthly escrow balance",
    status: "Ready" as AutomationStatus,
  },
  {
    id: "AUTO-3002",
    name: "Renew contract 30 days before expiry",
    trigger: "Active contract reaches renewal window",
    action: "Send renewal packet to both counterparties",
    status: "Ready" as AutomationStatus,
  },
  {
    id: "AUTO-3003",
    name: "Hold payment on compliance exception",
    trigger: "Document expires or asset verification fails",
    action: "Pause release and notify admin operations",
    status: "Needs review" as AutomationStatus,
  },
];

export function BlockchainTraceabilityCenter({ role }: { role: Role }) {
  const [selected, setSelected] = useState(traceRecords[0]);
  const [attested, setAttested] = useState<Record<string, boolean>>({});
  const status = attested[selected.id] ? "Verified" : selected.status;

  return (
    <PageShell
      eyebrow="BLOCKCHAIN TRACEABILITY"
      title="Show an on-chain-style history for feedstock origin, documents, escrow, and delivery."
      body="Frontend demo only. This screen presents how immutable transaction and sustainability proof could look when blockchain infrastructure is added later."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-bold text-neutral-950">Trace records</h2>
          <div className="mt-4 space-y-3">
            {traceRecords.map((record) => (
              <button
                type="button"
                key={record.id}
                onClick={() => setSelected(record)}
                className={`w-full rounded-xl p-4 text-left ring-1 ${
                  selected.id === record.id
                    ? "bg-neutral-950 text-white ring-neutral-950"
                    : "bg-white ring-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{record.id}</span>
                  <TraceBadge
                    status={attested[record.id] ? "Verified" : record.status}
                    inverted={selected.id === record.id}
                  />
                </div>
                <p className="mt-2 font-semibold">{record.material}</p>
                <p
                  className={
                    selected.id === record.id
                      ? "text-sm text-neutral-300"
                      : "text-sm text-neutral-500"
                  }
                >
                  {record.owner} / {record.hash}
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
              <p className="text-sm text-neutral-500">{selected.hash}</p>
            </div>
            <TraceBadge status={status} />
          </div>
          <div className="space-y-3">
            {selected.events.map((event, index) => (
              <div
                key={event}
                className="flex gap-3 rounded-xl bg-neutral-50 p-3"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    {event}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Stored as a demo ledger milestone.
                  </p>
                </div>
              </div>
            ))}
          </div>
          {(role === "admin" || selected.status === "Pending attestation") && (
            <button
              type="button"
              onClick={() =>
                setAttested((current) => ({ ...current, [selected.id]: true }))
              }
              className="mt-5 w-full rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Attest record
            </button>
          )}
        </aside>
      </div>
    </PageShell>
  );
}

export function SmartContractAutomationCenter({ role }: { role: Role }) {
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const visible =
    role === "buyer"
      ? automations.slice(0, 2)
      : role === "seller"
        ? automations.slice(0, 3)
        : automations;

  return (
    <PageShell
      eyebrow="SMART CONTRACT AUTOMATION"
      title="Preview delivery-triggered releases, renewal reminders, and compliance holds."
      body="Frontend-only automation UI for the future smart contract layer. It shows rules, triggers, actions, and simulated execution state."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {visible.map((rule) => (
          <section
            key={rule.id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200"
          >
            <div className="mb-4 flex items-center justify-between">
              <Workflow className="size-5 text-emerald-700" />
              <AutomationBadge
                status={running[rule.id] ? "Ready" : rule.status}
              />
            </div>
            <p className="font-mono text-xs text-neutral-500">{rule.id}</p>
            <h2 className="mt-2 text-lg font-bold text-neutral-950">
              {rule.name}
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <InfoBlock label="Trigger" value={rule.trigger} />
              <InfoBlock label="Action" value={rule.action} />
            </div>
            <button
              type="button"
              onClick={() =>
                setRunning((current) => ({ ...current, [rule.id]: true }))
              }
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              <Play className="size-4" />
              Simulate run
            </button>
            {running[rule.id] && (
              <p className="mt-3 text-sm font-medium text-emerald-700">
                Automation simulated successfully.
              </p>
            )}
          </section>
        ))}
      </div>
    </PageShell>
  );
}

export function LanguageReadinessCenter({ role }: { role: Role }) {
  return (
    <PageShell
      eyebrow="MULTI-LANGUAGE READINESS"
      title="Preview localization coverage, language selection, and translated marketplace copy."
      body="Inspect six launch locales, validate translated product experiences, review missing strings, and confirm regional formatting and RTL behavior before rollout."
    >
      <LocalizationWorkspace role={role} />
    </PageShell>
  );
}

export function NationalExpansionCenter({ role }: { role: Role }) {
  return (
    <PageShell
      eyebrow="NATIONAL EXPANSION"
      title="Show national-scale region coverage, pilot partners, facilities, and transaction volume."
      body="Compare six priority corridors, inspect Mapbox-powered facility coverage, and manage partner, transaction, and launch-readiness signals from one national workspace."
    >
      <NationalExpansionWorkspace role={role} />
    </PageShell>
  );
}

export function MobileAccessPreviewCenter({ role }: { role: Role }) {
  return (
    <PageShell
      eyebrow="MOBILE ACCESS"
      title="Preview the mobile experience for marketplace search, tracking, signatures, and alerts."
      body="Interactive responsive-web prototype for validating the highest-value mobile workflows before expanding the native application."
    >
      <MobileAccessPreview role={role} />
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
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
            Interactive workspace
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function TraceBadge({
  status,
  inverted = false,
}: {
  status: ChainStatus;
  inverted?: boolean;
}) {
  const tone = {
    Verified: "bg-emerald-100 text-emerald-700",
    "Pending attestation": "bg-blue-100 text-blue-700",
    Disputed: "bg-red-100 text-red-700",
  }[status];
  return (
    <Badge
      label={status}
      className={inverted ? "bg-white/15 text-white" : tone}
    />
  );
}

function AutomationBadge({ status }: { status: AutomationStatus }) {
  const tone = {
    Ready: "bg-emerald-100 text-emerald-700",
    Paused: "bg-neutral-100 text-neutral-700",
    "Needs review": "bg-amber-100 text-amber-800",
  }[status];
  return <Badge label={status} className={tone} />;
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

export const phaseThreeNav = [
  {
    label: "Blockchain Traceability",
    href: "blockchain-traceability",
    icon: Blocks,
  },
  { label: "Smart Contracts", href: "smart-contracts", icon: Workflow },
  { label: "Language", href: "language", icon: Languages },
  { label: "National Expansion", href: "national-expansion", icon: Rocket },
  { label: "Mobile Access", href: "mobile-access", icon: MonitorSmartphone },
] as const;
