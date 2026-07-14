"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  Handshake,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import {
  contractTemplates,
  serviceContracts,
  type ServiceContract,
} from "../contracts/contracts-demo-data";

type SellerActionState = Record<string, "Draft" | "Redline sent" | "Signature requested" | "Renewal offered">;

export function SellerContractsPage() {
  const sellerContracts = serviceContracts.filter((contract) =>
    ["EcoPack Co.", "TerraGenesis Biofuels", "Metal Reclaim LLC", "Louisiana BioMass Partners"].includes(contract.seller),
  );
  const [selected, setSelected] = useState<ServiceContract>(sellerContracts[0]);
  const [actions, setActions] = useState<SellerActionState>({
    "CTR-1048": "Draft",
    "CTR-1052": "Signature requested",
    "CTR-1057": "Redline sent",
    "CTR-1061": "Renewal offered",
  });

  const updateAction = (id: string, action: SellerActionState[string]) => {
    setActions((current) => ({ ...current, [id]: action }));
  };

  return (
    <SellerLayout title="Contracts">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
            Contract management
          </p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            Create supply agreements, negotiate terms, collect signatures, and manage renewals.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Seller workspace for recurring feedstock supply contracts, template selection,
            commercial redlines, e-signatures, milestone completion, and renewal offers.
          </p>
        </div>
        <Button variant="primary" size="md">Start new agreement</Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="Supply contracts" value="4" icon={Handshake} />
        <Metric label="Signature actions" value="2" icon={FileSignature} />
        <Metric label="Renewals" value="1" icon={CalendarClock} />
        <Metric label="Milestones due" value="3" icon={ClipboardCheck} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Seller contract queue</h2>
              <p className="text-sm text-neutral-500">
                Prioritized actions for each buyer agreement.
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              E-signature enabled
            </span>
          </div>

          <div className="space-y-3">
            {sellerContracts.map((contract) => (
              <button
                key={contract.id}
                type="button"
                onClick={() => setSelected(contract)}
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
                      {contract.buyer} · {contract.volume} · {contract.price}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {actions[contract.id] ?? "Draft"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <SmallMetric label="Status" value={contract.status} />
                  <SmallMetric label="Term" value={contract.term} />
                  <SmallMetric label="Signature" value={contract.signatureStatus} />
                  <SmallMetric label="Risk" value={contract.risk} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="text-xl font-bold text-neutral-900">Agreement actions</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {selected.id} · {selected.template}
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-900">Current terms</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Detail label="Volume" value={selected.volume} />
                <Detail label="Price" value={selected.price} />
                <Detail label="Payment" value={selected.paymentTerms} />
                <Detail label="Renewal" value={selected.renewalDate} />
              </div>
            </div>

            <textarea
              className="min-h-28 w-full rounded-xl bg-white p-3 text-sm outline-none"
              style={{ border: "1px solid #E0E0E0" }}
              defaultValue={`Seller note: confirm supply availability for ${selected.volume} before signature packet is released.`}
            />

            <ActionButton
              icon={Send}
              title="Send redline"
              description="Return pricing, delivery, or quality term edits to the buyer."
              onClick={() => updateAction(selected.id, "Redline sent")}
            />
            <ActionButton
              icon={FileSignature}
              title="Request e-signature"
              description="Send the contract packet to the buyer and seller signers."
              onClick={() => updateAction(selected.id, "Signature requested")}
            />
            <ActionButton
              icon={CalendarClock}
              title="Offer renewal"
              description="Create renewal terms using current pricing and delivery history."
              onClick={() => updateAction(selected.id, "Renewal offered")}
            />

            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-4" />
                Contract controls
              </div>
              <p className="mt-1">
                Milestones can hold escrow release until delivery, inspection, and signature
                requirements are satisfied.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="text-xl font-bold text-neutral-900">Available templates</h2>
          <div className="mt-4 grid gap-3">
            {contractTemplates.map((template) => (
              <div key={template.name} className="rounded-xl bg-neutral-50 p-4">
                <p className="font-semibold text-neutral-900">{template.name}</p>
                <p className="mt-1 text-sm text-neutral-500">{template.purpose}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.terms.map((term) => (
                    <span key={term} className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="text-xl font-bold text-neutral-900">Milestone checklist</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Track the steps required before each agreement can renew, ship, or release funds.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {selected.milestones.map((milestone) => (
              <div key={milestone.label} className="rounded-xl bg-neutral-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{milestone.label}</p>
                    <p className="mt-1 text-xs text-neutral-500">{milestone.due}</p>
                    <p className="mt-2 text-xs font-semibold text-neutral-700">{milestone.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SellerLayout>
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

function ActionButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl bg-white p-4 text-left hover:bg-neutral-50"
      style={{ border: "1px solid #F0F0F0" }}
    >
      <Icon className="mt-0.5 size-5 text-neutral-500" />
      <span>
        <span className="block text-sm font-semibold text-neutral-900">{title}</span>
        <span className="mt-1 block text-sm text-neutral-500">{description}</span>
      </span>
    </button>
  );
}
