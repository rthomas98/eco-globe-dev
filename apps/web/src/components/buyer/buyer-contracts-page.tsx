"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import {
  contractTemplates,
  serviceContracts,
  type ContractMilestone,
  type ServiceContract,
} from "../contracts/contracts-demo-data";

function StatusPill({ status }: { status: ServiceContract["status"] }) {
  const tone =
    status === "Active"
      ? "bg-green-50 text-green-700"
      : status === "At risk"
        ? "bg-red-50 text-red-700"
        : status === "Renewal due"
          ? "bg-blue-50 text-blue-700"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

function Milestone({ milestone }: { milestone: ContractMilestone }) {
  const tone =
    milestone.status === "Complete"
      ? "bg-green-50 text-green-700"
      : milestone.status === "Blocked"
        ? "bg-red-50 text-red-700"
        : milestone.status === "Due soon"
          ? "bg-amber-50 text-amber-700"
          : "bg-neutral-100 text-neutral-600";

  return (
    <div className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3">
      <CheckCircle2 className="mt-0.5 size-4 text-neutral-500" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-neutral-900">{milestone.label}</p>
        <p className="mt-1 text-xs text-neutral-500">Due: {milestone.due}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
        {milestone.status}
      </span>
    </div>
  );
}

export function BuyerContractsPage() {
  const buyerContracts = serviceContracts.filter((contract) =>
    ["GreenHarvest Co.", "BrightFuture Corp", "NutriFeed Industries", "AgriCorp Solutions"].includes(contract.buyer),
  );
  const [selected, setSelected] = useState<ServiceContract>(buyerContracts[0]);
  const [signatureSent, setSignatureSent] = useState(false);

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              Contract management
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">
              Manage recurring supply terms, signatures, milestones, and renewals.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Buyer workspace for turning negotiated feedstock supply into service contracts
              with escrow-backed terms, e-signature status, and renewal tracking.
            </p>
          </div>
          <Button variant="primary" size="md">Create contract</Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Active contracts" value="3" icon={FileText} />
          <Metric label="Pending signatures" value="1" icon={FileSignature} />
          <Metric label="Renewals due" value="1" icon={CalendarClock} />
          <Metric label="Escrow-backed" value="4" icon={ShieldCheck} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Contract pipeline</h2>
                <p className="text-sm text-neutral-500">Select a contract to view terms and actions.</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                Sample data
              </span>
            </div>
            <div className="space-y-3">
              {buyerContracts.map((contract) => (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => {
                    setSelected(contract);
                    setSignatureSent(false);
                  }}
                  className={`w-full rounded-2xl p-4 text-left transition hover:bg-neutral-50 ${
                    selected.id === contract.id ? "bg-neutral-50" : "bg-white"
                  }`}
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-neutral-900">
                        {contract.id} · {contract.product}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {contract.seller} · {contract.volume} · {contract.term}
                      </p>
                    </div>
                    <StatusPill status={contract.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <SmallMetric label="Price" value={contract.price} />
                    <SmallMetric label="Delivery" value={contract.deliveryFrequency} />
                    <SmallMetric label="Signature" value={contract.signatureStatus} />
                    <SmallMetric label="Renewal" value={contract.renewalDate} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Terms workspace</h2>
                <p className="mt-1 text-sm text-neutral-500">{selected.template}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>

            <div className="space-y-4 text-sm">
              <Detail label="Payment terms" value={selected.paymentTerms} />
              <Detail label="Next action" value={selected.nextAction} />
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Start date" value={selected.startDate} />
                <Detail label="Renewal date" value={selected.renewalDate} />
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="font-semibold text-neutral-900">Negotiation notes</p>
                <textarea
                  className="mt-3 min-h-24 w-full rounded-xl bg-white p-3 text-sm outline-none"
                  style={{ border: "1px solid #E0E0E0" }}
                  defaultValue={`Buyer requested ${selected.volume} with ${selected.deliveryFrequency.toLowerCase()} and escrow-backed release terms.`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" size="sm">Request redline</Button>
                <Button
                  type="button"
                  variant={signatureSent ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => setSignatureSent(true)}
                >
                  {signatureSent ? "Signature sent" : "Send for signature"}
                </Button>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h2 className="text-xl font-bold text-neutral-900">Contract templates</h2>
            <div className="mt-4 space-y-3">
              {contractTemplates.slice(0, 3).map((template) => (
                <div key={template.name} className="rounded-xl bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">{template.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">{template.purpose}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                      {template.usage} uses
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h2 className="text-xl font-bold text-neutral-900">Milestone tracking</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Contract milestones can trigger escrow funding, delivery checks, and renewal tasks.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {selected.milestones.map((milestone) => (
                <Milestone key={milestone.label} milestone={milestone} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </BuyerLayout>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-neutral-500">{label}</span>
        <Icon className="size-5 text-neutral-400" />
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-neutral-900">{value}</p>
    </div>
  );
}
