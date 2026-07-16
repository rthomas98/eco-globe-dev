"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  ShieldCheck,
  X,
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
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}
    >
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
        <p className="text-sm font-semibold text-neutral-900">
          {milestone.label}
        </p>
        <p className="mt-1 text-xs text-neutral-500">Due: {milestone.due}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
        {milestone.status}
      </span>
    </div>
  );
}

const initialBuyerContracts = serviceContracts.filter((contract) =>
  [
    "GreenHarvest Co.",
    "BrightFuture Corp",
    "NutriFeed Industries",
    "AgriCorp Solutions",
  ].includes(contract.buyer),
);

interface ContractForm {
  template: string;
  product: string;
  seller: string;
  volume: string;
  price: string;
  term: string;
  startDate: string;
  renewalDate: string;
  deliveryFrequency: string;
  paymentTerms: string;
}

const emptyContractForm: ContractForm = {
  template: contractTemplates[0].name,
  product: "",
  seller: "",
  volume: "",
  price: "",
  term: "12 months",
  startDate: "Aug 1, 2026",
  renewalDate: "Jul 15, 2027",
  deliveryFrequency: "Monthly",
  paymentTerms: "Escrow funded per delivery window",
};

function defaultNegotiationNotes(contract: ServiceContract) {
  return `Buyer requested ${contract.volume} with ${contract.deliveryFrequency.toLowerCase()} and escrow-backed release terms.`;
}

export function BuyerContractsPage() {
  const [contracts, setContracts] = useState<ServiceContract[]>(
    initialBuyerContracts,
  );
  const [selectedId, setSelectedId] = useState(initialBuyerContracts[0].id);
  const [createOpen, setCreateOpen] = useState(false);
  const [contractForm, setContractForm] =
    useState<ContractForm>(emptyContractForm);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({});
  const [redlineRequested, setRedlineRequested] = useState<
    Record<string, boolean>
  >({});
  const [signatureSent, setSignatureSent] = useState<Record<string, boolean>>(
    {},
  );
  const selected =
    contracts.find((contract) => contract.id === selectedId) ?? contracts[0];
  const activeCount = contracts.filter(
    (contract) =>
      contract.status !== "Draft" && contract.status !== "Renewal due",
  ).length;
  const pendingSignatureCount = contracts.filter(
    (contract) => contract.status === "Signature pending",
  ).length;
  const renewalCount = contracts.filter(
    (contract) => contract.status === "Renewal due",
  ).length;

  const updateContract = (id: string, updates: Partial<ServiceContract>) => {
    setContracts((current) =>
      current.map((contract) =>
        contract.id === id ? { ...contract, ...updates } : contract,
      ),
    );
  };

  const openCreateContract = (template = contractTemplates[0].name) => {
    setContractForm({ ...emptyContractForm, template });
    setCreateOpen(true);
  };

  const createContract = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !contractForm.product.trim() ||
      !contractForm.seller.trim() ||
      !contractForm.volume.trim() ||
      !contractForm.price.trim()
    ) {
      return;
    }

    const newContract: ServiceContract = {
      id: `CTR-${1100 + contracts.length}`,
      template: contractForm.template,
      product: contractForm.product.trim(),
      buyer: "GreenHarvest Co.",
      seller: contractForm.seller.trim(),
      volume: contractForm.volume.trim(),
      price: contractForm.price.trim(),
      term: contractForm.term,
      startDate: contractForm.startDate,
      renewalDate: contractForm.renewalDate,
      status: "Draft",
      signatureStatus: "Not sent",
      paymentTerms: contractForm.paymentTerms,
      deliveryFrequency: contractForm.deliveryFrequency,
      nextAction:
        "Review negotiation notes and send the contract for signature.",
      risk: "Low",
      milestones: [
        { label: "Draft created", due: "Today", status: "Complete" },
        { label: "Terms review", due: "Jul 20, 2026", status: "Due soon" },
        {
          label: "Counterparty signatures",
          due: "Jul 24, 2026",
          status: "Open",
        },
        {
          label: "Initial escrow funding",
          due: contractForm.startDate,
          status: "Open",
        },
      ],
    };

    setContracts((current) => [newContract, ...current]);
    setSelectedId(newContract.id);
    setCreateOpen(false);
  };

  const saveNegotiationNotes = () => {
    setSavedNotes((current) => ({ ...current, [selected.id]: true }));
  };

  const requestRedline = () => {
    setRedlineRequested((current) => ({ ...current, [selected.id]: true }));
    updateContract(selected.id, {
      status: "Negotiating",
      nextAction: "Redline requested from the seller. Awaiting revised terms.",
      milestones: [
        ...selected.milestones,
        { label: "Seller redline requested", due: "Today", status: "Due soon" },
      ],
    });
  };

  const sendForSignature = () => {
    setSignatureSent((current) => ({ ...current, [selected.id]: true }));
    updateContract(selected.id, {
      status: "Signature pending",
      nextAction: "Signature packet sent to buyer and seller recipients.",
      milestones: selected.milestones.map((milestone) =>
        milestone.label === "Counterparty signatures" ||
        milestone.label === "Signature packet"
          ? { ...milestone, status: "Due soon" }
          : milestone,
      ),
    });
  };

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              Contract management
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">
              Manage recurring supply terms, signatures, milestones, and
              renewals.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Buyer workspace for turning negotiated feedstock supply into
              service contracts with escrow-backed terms, e-signature status,
              and renewal tracking.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => openCreateContract()}
          >
            Create contract
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric
            label="Active contracts"
            value={String(activeCount)}
            icon={FileText}
          />
          <Metric
            label="Pending signatures"
            value={String(pendingSignatureCount)}
            icon={FileSignature}
          />
          <Metric
            label="Renewals due"
            value={String(renewalCount)}
            icon={CalendarClock}
          />
          <Metric
            label="Escrow-backed"
            value={String(contracts.length)}
            icon={ShieldCheck}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">
                  Contract pipeline
                </h2>
                <p className="text-sm text-neutral-500">
                  Select a contract to view terms and actions.
                </p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                Sample data
              </span>
            </div>
            <div className="space-y-3">
              {contracts.map((contract) => (
                <button
                  key={contract.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(contract.id);
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
                    <SmallMetric
                      label="Delivery"
                      value={contract.deliveryFrequency}
                    />
                    <SmallMetric
                      label="Signature"
                      value={contract.signatureStatus}
                    />
                    <SmallMetric label="Renewal" value={contract.renewalDate} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">
                  Terms workspace
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {selected.template}
                </p>
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
                <label
                  htmlFor="contract-negotiation-notes"
                  className="font-semibold text-neutral-900"
                >
                  Negotiation notes
                </label>
                <textarea
                  id="contract-negotiation-notes"
                  className="mt-3 min-h-24 w-full rounded-xl bg-white p-3 text-sm outline-none"
                  style={{ border: "1px solid #E0E0E0" }}
                  value={
                    notesById[selected.id] ?? defaultNegotiationNotes(selected)
                  }
                  onChange={(event) => {
                    setNotesById((current) => ({
                      ...current,
                      [selected.id]: event.target.value,
                    }));
                    setSavedNotes((current) => ({
                      ...current,
                      [selected.id]: false,
                    }));
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={saveNegotiationNotes}
                >
                  {savedNotes[selected.id] ? "Notes saved" : "Save notes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={requestRedline}
                  disabled={redlineRequested[selected.id]}
                >
                  {redlineRequested[selected.id]
                    ? "Redline requested"
                    : "Request redline"}
                </Button>
                <Button
                  type="button"
                  variant={signatureSent[selected.id] ? "secondary" : "primary"}
                  size="sm"
                  onClick={sendForSignature}
                  disabled={signatureSent[selected.id]}
                >
                  {signatureSent[selected.id]
                    ? "Signature sent"
                    : "Send for signature"}
                </Button>
              </div>
              {(savedNotes[selected.id] ||
                redlineRequested[selected.id] ||
                signatureSent[selected.id]) && (
                <div
                  role="status"
                  className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                >
                  {signatureSent[selected.id]
                    ? "Signature recipients have been notified and the milestone tracker was updated."
                    : redlineRequested[selected.id]
                      ? "The seller was notified that revised contract terms are required."
                      : "Negotiation notes saved for this contract."}
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <h2 className="text-xl font-bold text-neutral-900">
              Contract templates
            </h2>
            <div className="mt-4 space-y-3">
              {contractTemplates.slice(0, 3).map((template) => (
                <button
                  type="button"
                  key={template.name}
                  onClick={() => openCreateContract(template.name)}
                  className="w-full rounded-xl bg-neutral-50 p-4 text-left transition hover:bg-neutral-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {template.name}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {template.purpose}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                      {template.usage} uses
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid #F0F0F0" }}
          >
            <h2 className="text-xl font-bold text-neutral-900">
              Milestone tracking
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Contract milestones can trigger escrow funding, delivery checks,
              and renewal tasks.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {selected.milestones.map((milestone) => (
                <Milestone key={milestone.label} milestone={milestone} />
              ))}
            </div>
          </section>
        </div>

        {createOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close contract creation"
              onClick={() => setCreateOpen(false)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[1px]"
            />
            <dialog
              open
              aria-modal="true"
              aria-labelledby="create-contract-title"
              className="relative z-10 m-0 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-0 shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-100 bg-white px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                    New service contract
                  </p>
                  <h2
                    id="create-contract-title"
                    className="mt-1 text-2xl font-bold text-neutral-950"
                  >
                    Create contract
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close contract creation"
                  onClick={() => setCreateOpen(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={createContract} className="space-y-5 px-6 py-6">
                <div>
                  <label
                    htmlFor="contract-template"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Contract template
                  </label>
                  <select
                    id="contract-template"
                    value={contractForm.template}
                    onChange={(event) =>
                      setContractForm((current) => ({
                        ...current,
                        template: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none"
                  >
                    {contractTemplates.map((template) => (
                      <option key={template.name} value={template.name}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ContractInput
                    id="contract-product"
                    label="Product or material"
                    value={contractForm.product}
                    onChange={(product) =>
                      setContractForm((current) => ({ ...current, product }))
                    }
                    placeholder="Black Gypsum"
                    autoFocus
                  />
                  <ContractInput
                    id="contract-seller"
                    label="Seller"
                    value={contractForm.seller}
                    onChange={(seller) =>
                      setContractForm((current) => ({ ...current, seller }))
                    }
                    placeholder="Supplier company"
                  />
                  <ContractInput
                    id="contract-volume"
                    label="Committed volume"
                    value={contractForm.volume}
                    onChange={(volume) =>
                      setContractForm((current) => ({ ...current, volume }))
                    }
                    placeholder="200 tons / month"
                  />
                  <ContractInput
                    id="contract-price"
                    label="Price"
                    value={contractForm.price}
                    onChange={(price) =>
                      setContractForm((current) => ({ ...current, price }))
                    }
                    placeholder="$52 / ton"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ContractSelect
                    id="contract-term"
                    label="Contract term"
                    value={contractForm.term}
                    onChange={(term) =>
                      setContractForm((current) => ({ ...current, term }))
                    }
                    options={["6 months", "9 months", "12 months"]}
                  />
                  <ContractSelect
                    id="contract-frequency"
                    label="Delivery frequency"
                    value={contractForm.deliveryFrequency}
                    onChange={(deliveryFrequency) =>
                      setContractForm((current) => ({
                        ...current,
                        deliveryFrequency,
                      }))
                    }
                    options={[
                      "Monthly",
                      "Monthly, first week",
                      "Quarterly",
                      "Single delivery",
                    ]}
                  />
                  <ContractSelect
                    id="contract-start"
                    label="Start date"
                    value={contractForm.startDate}
                    onChange={(startDate) =>
                      setContractForm((current) => ({
                        ...current,
                        startDate,
                      }))
                    }
                    options={["Aug 1, 2026", "Sep 1, 2026", "Oct 1, 2026"]}
                  />
                  <ContractSelect
                    id="contract-renewal"
                    label="Renewal date"
                    value={contractForm.renewalDate}
                    onChange={(renewalDate) =>
                      setContractForm((current) => ({
                        ...current,
                        renewalDate,
                      }))
                    }
                    options={["Jan 15, 2027", "Apr 15, 2027", "Jul 15, 2027"]}
                  />
                </div>

                <ContractSelect
                  id="contract-payment"
                  label="Payment terms"
                  value={contractForm.paymentTerms}
                  onChange={(paymentTerms) =>
                    setContractForm((current) => ({
                      ...current,
                      paymentTerms,
                    }))
                  }
                  options={[
                    "Escrow funded per delivery window",
                    "25% deposit, balance after delivery",
                    "Monthly invoice with escrow protection",
                  ]}
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={
                      !contractForm.product.trim() ||
                      !contractForm.seller.trim() ||
                      !contractForm.volume.trim() ||
                      !contractForm.price.trim()
                    }
                  >
                    Create draft contract
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </dialog>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}

function ContractInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-neutral-800"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
      />
    </div>
  );
}

function ContractSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-neutral-800"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
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
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid #F0F0F0" }}
    >
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
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-neutral-900">{value}</p>
    </div>
  );
}
