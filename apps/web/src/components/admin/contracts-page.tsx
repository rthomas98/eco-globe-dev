"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  History,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button, Select } from "@eco-globe/ui";
import {
  contractAdminSummary,
  contractTemplates,
  serviceContracts,
  signatureEnvelopes,
  type ServiceContract,
} from "../contracts/contracts-demo-data";

export function AdminContractsPage() {
  const [selected, setSelected] = useState<ServiceContract>(serviceContracts[0]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [escalatedContracts, setEscalatedContracts] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [contractFilter, setContractFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(2);
  const pendingSignatureCount = serviceContracts.filter(
    (contract) => contract.signatureStatus !== "Fully signed",
  ).length;
  const filterContracts = (query: string, filter: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    return serviceContracts.filter((contract) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "signature" && contract.signatureStatus !== "Fully signed") ||
        (filter === "renewal" && contract.status === "Renewal due") ||
        (filter === "risk" && contract.risk !== "Low");
      const searchableText = [
        contract.id,
        contract.product,
        contract.buyer,
        contract.seller,
        contract.template,
        contract.status,
        contract.signatureStatus,
        contract.volume,
        contract.price,
      ].join(" ").toLowerCase();

      return matchesFilter && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  };
  const filteredContracts = filterContracts(searchQuery, contractFilter);
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const hasMatchingContracts = filteredContracts.length > 0;
  const paginatedContracts = filteredContracts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const firstResult = filteredContracts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastResult = Math.min(safePage * pageSize, filteredContracts.length);
  const selectedEnvelope = signatureEnvelopes.find(
    (envelope) => envelope.contractId === selected.id,
  );
  const escalationOwner = escalatedContracts[selected.id];
  const auditEvents = [
    {
      title: "Contract created",
      actor: selected.seller,
      detail: `${selected.template} created for ${selected.product}.`,
      time: selected.startDate,
    },
    {
      title: "Payment terms recorded",
      actor: "EcoGlobe",
      detail: selected.paymentTerms,
      time: "Contract setup",
    },
    ...selected.milestones.map((milestone) => ({
      title: milestone.label,
      actor: "Milestone tracker",
      detail: `Status: ${milestone.status}`,
      time: milestone.due,
    })),
    ...(selectedEnvelope
      ? selectedEnvelope.auditTrail.map((event) => ({
          title: event.event,
          actor: event.actor,
          detail: event.detail,
          time: event.time,
        }))
      : []),
    ...(escalationOwner
      ? [{
          title: "Admin review escalated",
          actor: escalationOwner,
          detail: "Operations review queue opened with legal, signature, and milestone checks.",
          time: "Just now",
        }]
      : []),
  ];

  const handleEscalateReview = () => {
    setEscalatedContracts((current) => ({
      ...current,
      [selected.id]: "Anabea · Operations lead",
    }));
  };

  const updateSearch = (value: string) => {
    const nextContracts = filterContracts(value, contractFilter);
    setSearchQuery(value);
    setCurrentPage(1);
    if (nextContracts[0]) {
      setSelected(nextContracts[0]);
      setAuditOpen(false);
    }
  };

  const updateFilter = (value: string) => {
    const nextContracts = filterContracts(searchQuery, value);
    setContractFilter(value);
    setCurrentPage(1);
    if (nextContracts[0]) {
      setSelected(nextContracts[0]);
      setAuditOpen(false);
    }
  };

  const updatePageSize = (value: string) => {
    const nextSize = Number(value);
    setPageSize(nextSize);
    setCurrentPage(1);
  };

  const clearTableControls = () => {
    setSearchQuery("");
    setContractFilter("all");
    setCurrentPage(1);
    setSelected(serviceContracts[0]);
    setAuditOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50">
      <div className="px-8 py-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              Contract control center
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">
              Platform oversight for contracts, signatures, milestones, templates, and renewals.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Admin view for monitoring recurring supply agreements, resolving stalled
              negotiations, auditing e-signature status, and managing reusable contract templates.
            </p>
          </div>
          <Button variant="primary" size="md">Create template</Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Active contracts" value={String(contractAdminSummary.activeContracts)} icon={FileText} />
          <Metric label="Pending signatures" value={String(pendingSignatureCount)} icon={FileSignature} />
          <Metric label="Renewal queue" value={String(contractAdminSummary.renewalQueue)} icon={CalendarClock} />
          <Metric label="At-risk contracts" value={String(contractAdminSummary.atRiskContracts)} icon={AlertTriangle} />
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Platform contracts</h2>
                <p className="text-sm text-neutral-500">
                  Monitor every contract across buyer and seller workflows.
                </p>
              </div>
              <div className="flex flex-1 flex-wrap justify-end gap-3">
                <div className="relative min-w-[240px] max-w-[320px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    id="admin-contract-search"
                    value={searchQuery}
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder="Search contracts, materials, companies"
                    className="w-full rounded-lg bg-white py-3 pl-10 pr-4 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
                    style={{ border: "1px solid #E0E0E0" }}
                  />
                </div>
                <Select
                  id="admin-contract-filter"
                  value={contractFilter}
                  onChange={(event) => updateFilter(event.target.value)}
                  className="min-w-[190px] text-sm"
                  options={[
                    { value: "all", label: "All contracts" },
                    { value: "signature", label: "Signature pending" },
                    { value: "renewal", label: "Renewal due" },
                    { value: "risk", label: "At risk" },
                  ]}
                />
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-sm text-neutral-600">
                Showing <span className="font-semibold text-neutral-900">{firstResult}-{lastResult}</span>{" "}
                of <span className="font-semibold text-neutral-900">{filteredContracts.length}</span> contracts
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="admin-contract-page-size" className="text-sm text-neutral-500">
                  Rows
                </label>
                <Select
                  id="admin-contract-page-size"
                  value={String(pageSize)}
                  onChange={(event) => updatePageSize(event.target.value)}
                  className="min-w-[90px] py-2 text-sm"
                  options={[
                    { value: "2", label: "2" },
                    { value: "4", label: "4" },
                  ]}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="text-left text-sm text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
                    <th className="pb-3 font-medium">Contract</th>
                    <th className="pb-3 font-medium">Material</th>
                    <th className="pb-3 font-medium">Counterparties</th>
                    <th className="pb-3 font-medium">Value terms</th>
                    <th className="pb-3 font-medium">Renewal</th>
                    <th className="pb-3 font-medium">Signature</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.map((contract) => (
                    <tr
                      key={contract.id}
                      onClick={() => {
                        setSelected(contract);
                        setAuditOpen(false);
                      }}
                      className={`cursor-pointer text-sm hover:bg-neutral-50 ${
                        selected.id === contract.id ? "bg-neutral-50" : ""
                      }`}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                    >
                      <td className="py-4 font-mono text-neutral-900">{contract.id}</td>
                      <td className="py-4 text-neutral-700">{contract.product}</td>
                      <td className="py-4 text-neutral-700">{contract.seller} to {contract.buyer}</td>
                      <td className="py-4 text-neutral-700">{contract.volume} · {contract.price}</td>
                      <td className="py-4 text-neutral-700">{contract.renewalDate}</td>
                      <td className="py-4 text-neutral-700">{contract.signatureStatus}</td>
                      <td className="py-4">
                        <StatusPill status={contract.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredContracts.length === 0 && (
                <div className="rounded-xl bg-neutral-50 p-8 text-center">
                  <p className="font-semibold text-neutral-900">No contracts found</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Adjust the search term or filter to see more contracts.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={clearTableControls}
                  >
                    Clear search and filters
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-500">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">Contract detail</h2>
              {hasMatchingContracts && (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  Risk: {selected.risk}
                </span>
              )}
            </div>
            {hasMatchingContracts ? (
              <div className="space-y-4 text-sm">
                <Detail label="Template" value={selected.template} />
                <Detail label="Payment terms" value={selected.paymentTerms} />
                <Detail label="Next action" value={selected.nextAction} />
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setAuditOpen(true)}
                  >
                    Open audit log
                  </Button>
                  <Button
                    type="button"
                    variant={escalationOwner ? "secondary" : "primary"}
                    size="sm"
                    onClick={handleEscalateReview}
                  >
                    {escalationOwner ? "Review escalated" : "Escalate review"}
                  </Button>
                </div>
                {escalationOwner && (
                  <div className="rounded-xl bg-amber-50 p-4 text-amber-800">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="size-4" />
                      Review escalated
                    </div>
                    <p className="mt-1">
                      Assigned to {escalationOwner}. Legal terms, e-signature status,
                      escrow dependency, and milestone health are now in the review queue.
                    </p>
                    <div className="mt-3 grid gap-2 text-xs font-semibold sm:grid-cols-2">
                      <span className="rounded-full bg-white px-3 py-1">SLA: 24 hours</span>
                      <span className="rounded-full bg-white px-3 py-1">Priority: {selected.risk}</span>
                    </div>
                  </div>
                )}
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="mb-3 font-semibold text-neutral-900">Milestone health</p>
                  <div className="space-y-2">
                    {selected.milestones.map((milestone) => (
                      <div key={milestone.label} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                        <span className="text-neutral-700">{milestone.label}</span>
                        <span className="text-xs font-semibold text-neutral-500">{milestone.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-neutral-50 p-6 text-center">
                <p className="font-semibold text-neutral-900">No contract selected</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Clear the search or choose another filter to load contract details.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h2 className="text-xl font-bold text-neutral-900">Template library</h2>
            <div className="mt-4 grid gap-3">
              {contractTemplates.map((template) => (
                <div key={template.name} className="rounded-xl bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">{template.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">{template.purpose}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                      {template.usage} active
                    </span>
                  </div>
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
            <h2 className="text-xl font-bold text-neutral-900">System configuration</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Demo controls for signature providers, renewal triggers, and compliance oversight.
            </p>
            <div className="mt-5 space-y-4">
              <Rule icon={FileSignature} title="E-signature provider" detail="Connected to demo signature workflow with buyer and seller signers." />
              <Rule icon={CalendarClock} title="Automated renewal reminders" detail="Notify both sides 60, 30, and 7 days before renewal deadline." />
              <Rule icon={ShieldCheck} title="Escrow release dependency" detail="Contract milestones can block release until required terms are met." />
              <Rule icon={Settings2} title="Admin override" detail="Operations can escalate, pause, or force review on stalled contracts." />
              <Rule icon={CheckCircle2} title="Compliance oversight" detail="Audit trail stores template, signer, milestone, and renewal activity." />
            </div>
          </section>
        </div>
      </div>
      {auditOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close audit log"
            className="absolute inset-0 bg-black/30"
            onClick={() => setAuditOpen(false)}
          />
          <aside
            className="relative z-10 flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-2xl"
            style={{ borderLeft: "1px solid #E0E0E0" }}
          >
            <div className="sticky top-0 z-10 bg-white p-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
                    Audit log
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-neutral-900">
                    {selected.id} · {selected.product}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Contract, signature, milestone, and compliance activity.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close audit log"
                  onClick={() => setAuditOpen(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <section className="rounded-2xl bg-neutral-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="size-5 text-green-700" />
                  <h3 className="font-bold text-neutral-900">Compliance summary</h3>
                </div>
                <div className="grid gap-3 text-sm">
                  <Detail label="Signature status" value={selected.signatureStatus} />
                  <Detail label="Escrow dependency" value={selected.paymentTerms} />
                  <Detail label="Renewal date" value={selected.renewalDate} />
                  <Detail label="Risk" value={selected.risk} />
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4" style={{ border: "1px solid #F0F0F0" }}>
                <div className="mb-4 flex items-center gap-2">
                  <History className="size-5 text-neutral-500" />
                  <h3 className="font-bold text-neutral-900">Activity timeline</h3>
                </div>
                <div className="space-y-3">
                  {auditEvents.map((event) => (
                    <div key={`${event.title}-${event.time}-${event.actor}`} className="flex gap-3 rounded-xl bg-neutral-50 p-4">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-neutral-500" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{event.title}</p>
                        <p className="mt-1 text-sm text-neutral-600">{event.detail}</p>
                        <p className="mt-2 text-xs text-neutral-500">{event.actor} · {event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => setAuditOpen(false)}>
                  Close
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleEscalateReview}>
                  Escalate from log
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

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
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-neutral-900">{value}</p>
    </div>
  );
}

function Rule({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4">
      <Icon className="mt-0.5 size-5 text-neutral-500" />
      <div>
        <p className="font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-sm text-neutral-500">{detail}</p>
      </div>
    </div>
  );
}
