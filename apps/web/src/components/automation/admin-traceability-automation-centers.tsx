"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Blocks,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  FileCheck2,
  FileText,
  Fingerprint,
  Gauge,
  History,
  Link2,
  LockKeyhole,
  Network,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TriangleAlert,
  Workflow,
  X,
  Zap,
} from "lucide-react";

type ChainStatus = "Verified" | "Pending attestation" | "Disputed";
type RuleStatus = "Active" | "Paused" | "Needs review";
type TraceTab = "Custody timeline" | "Evidence" | "Integrity" | "Activity";
type RuleTab = "Configuration" | "Run history" | "Guardrails" | "Activity";

interface TraceRecord {
  id: string;
  material: string;
  owner: string;
  status: ChainStatus;
  hash: string;
  network: string;
  batch: string;
  quantity: string;
  carbon: string;
  contract: string;
  document: string;
  shipment: string;
  custody: Array<{
    title: string;
    actor: string;
    place: string;
    time: string;
    verified: boolean;
  }>;
  evidence: Array<{ name: string; type: string; state: string }>;
}

interface AutomationRule {
  id: string;
  name: string;
  status: RuleStatus;
  trigger: string;
  action: string;
  owner: string;
  runs: number;
  success: number;
  value: string;
  lastRun: string;
  guardrails: string[];
  history: Array<{
    id: string;
    result: "Succeeded" | "Held" | "Failed";
    detail: string;
    time: string;
  }>;
}

const TRACE_RECORDS: TraceRecord[] = [
  {
    id: "CHAIN-9001",
    material: "Black Gypsum",
    owner: "EcoPack Co.",
    status: "Verified",
    hash: "0x7fa9d821...21bd",
    network: "EcoGlobe Proof Network",
    batch: "BAT-20418",
    quantity: "200 tons",
    carbon: "420 kg CO2e",
    contract: "CTR-1048",
    document: "DOC-7101",
    shipment: "SHP-50021",
    custody: [
      {
        title: "Origin batch attested",
        actor: "EcoPack Co.",
        place: "Cadiz, Spain",
        time: "May 18 · 8:20 AM",
        verified: true,
      },
      {
        title: "COA evidence anchored",
        actor: "EcoGlobe verification",
        place: "Platform review",
        time: "May 19 · 1:44 PM",
        verified: true,
      },
      {
        title: "Carrier custody accepted",
        actor: "EcoFreight",
        place: "Cadiz Port",
        time: "May 21 · 6:35 AM",
        verified: true,
      },
      {
        title: "Delivery confirmed",
        actor: "GreenHarvest Co.",
        place: "Atlanta, GA",
        time: "May 22 · 4:08 PM",
        verified: true,
      },
    ],
    evidence: [
      {
        name: "Black Gypsum COA.pdf",
        type: "Quality evidence",
        state: "Verified",
      },
      {
        name: "Scale ticket 20418.pdf",
        type: "Quantity evidence",
        state: "Verified",
      },
      {
        name: "Signed proof of delivery.pdf",
        type: "Custody evidence",
        state: "Verified",
      },
    ],
  },
  {
    id: "CHAIN-9002",
    material: "Scrap Polymer Blend",
    owner: "TerraGenesis Biofuels",
    status: "Pending attestation",
    hash: "0x2ac1f118...8ff0",
    network: "EcoGlobe Proof Network",
    batch: "BAT-20444",
    quantity: "1,000 tons",
    carbon: "82 kg CO2e",
    contract: "CTR-1052",
    document: "DOC-7103",
    shipment: "SHP-50009",
    custody: [
      {
        title: "Batch created",
        actor: "TerraGenesis Biofuels",
        place: "Plaquemine, LA",
        time: "Jul 12 · 9:10 AM",
        verified: true,
      },
      {
        title: "SDS attached",
        actor: "Admin document review",
        place: "Platform review",
        time: "Jul 12 · 2:31 PM",
        verified: true,
      },
      {
        title: "Buyer criteria pending",
        actor: "BrightFuture Corp",
        place: "Remote review",
        time: "Jul 15 · 10:18 AM",
        verified: false,
      },
    ],
    evidence: [
      {
        name: "Polymer SDS v4.pdf",
        type: "Safety evidence",
        state: "Expiring soon",
      },
      {
        name: "Composition report.pdf",
        type: "Material evidence",
        state: "Pending",
      },
    ],
  },
  {
    id: "CHAIN-9003",
    material: "Harvested Corn Stover",
    owner: "Louisiana BioMass Partners",
    status: "Disputed",
    hash: "0x9bf4a922...ab42",
    network: "EcoGlobe Proof Network",
    batch: "BAT-20391",
    quantity: "100 tons",
    carbon: "210 kg CO2e",
    contract: "CTR-1061",
    document: "DOC-7105",
    shipment: "SHP-50032",
    custody: [
      {
        title: "Farm origin logged",
        actor: "Louisiana BioMass Partners",
        place: "Opelousas, LA",
        time: "Jul 8 · 7:40 AM",
        verified: true,
      },
      {
        title: "Moisture evidence disputed",
        actor: "AgriCorp Solutions",
        place: "Receiving facility",
        time: "Jul 10 · 3:12 PM",
        verified: false,
      },
      {
        title: "Admin review opened",
        actor: "EcoGlobe operations",
        place: "Platform review",
        time: "Jul 10 · 3:28 PM",
        verified: true,
      },
    ],
    evidence: [
      {
        name: "Origin certificate.pdf",
        type: "Origin evidence",
        state: "Verified",
      },
      {
        name: "Moisture sample.csv",
        type: "Quality evidence",
        state: "Disputed",
      },
    ],
  },
];

const INITIAL_RULES: AutomationRule[] = [
  {
    id: "AUTO-3001",
    name: "Release escrow after signed POD",
    status: "Active",
    trigger: "Delivery confirmed and 48-hour dispute window closes",
    action: "Release the approved monthly escrow balance",
    owner: "Finance Operations",
    runs: 184,
    success: 98.9,
    value: "$1.42M",
    lastRun: "Today · 10:42 AM",
    guardrails: [
      "Signed POD required",
      "No open dispute",
      "Receiving inspection complete",
      "Payment amount within contract ceiling",
    ],
    history: [
      {
        id: "RUN-8412",
        result: "Succeeded",
        detail: "$18,420 released for EG-50021",
        time: "Today · 10:42 AM",
      },
      {
        id: "RUN-8398",
        result: "Held",
        detail: "Inspection evidence still pending",
        time: "Jul 15 · 4:18 PM",
      },
      {
        id: "RUN-8370",
        result: "Succeeded",
        detail: "$9,880 released for EG-49984",
        time: "Jul 14 · 1:06 PM",
      },
    ],
  },
  {
    id: "AUTO-3002",
    name: "Renew contract before expiry",
    status: "Active",
    trigger: "Active contract reaches its 30-day renewal window",
    action: "Create renewal packet and notify both counterparties",
    owner: "Contract Operations",
    runs: 62,
    success: 100,
    value: "27 renewals",
    lastRun: "Jul 15 · 8:00 AM",
    guardrails: [
      "Contract remains active",
      "No unresolved compliance hold",
      "Current pricing available",
      "Both contacts verified",
    ],
    history: [
      {
        id: "RUN-8401",
        result: "Succeeded",
        detail: "Renewal packet created for CTR-1061",
        time: "Jul 15 · 8:00 AM",
      },
      {
        id: "RUN-8312",
        result: "Succeeded",
        detail: "Renewal packet created for CTR-1029",
        time: "Jul 11 · 8:00 AM",
      },
    ],
  },
  {
    id: "AUTO-3003",
    name: "Hold payment on compliance exception",
    status: "Needs review",
    trigger: "Required document expires or asset verification fails",
    action: "Pause release and notify admin operations",
    owner: "Risk & Compliance",
    runs: 41,
    success: 95.1,
    value: "$92K protected",
    lastRun: "Today · 9:18 AM",
    guardrails: [
      "Exception severity medium or higher",
      "Evidence belongs to active record",
      "Payment has not released",
      "Admin notification delivered",
    ],
    history: [
      {
        id: "RUN-8410",
        result: "Held",
        detail: "DOC-7103 expires within 16 days",
        time: "Today · 9:18 AM",
      },
      {
        id: "RUN-8361",
        result: "Failed",
        detail: "Operations notification delivery retried",
        time: "Jul 14 · 9:18 AM",
      },
    ],
  },
  {
    id: "AUTO-3004",
    name: "Escalate stalled signature packet",
    status: "Paused",
    trigger: "Required signer remains waiting for 72 hours",
    action: "Send reminder and assign contract operations follow-up",
    owner: "Contract Operations",
    runs: 29,
    success: 96.6,
    value: "18 recovered",
    lastRun: "Jul 12 · 11:00 AM",
    guardrails: [
      "Envelope remains active",
      "Signer email delivered",
      "No decline recorded",
      "Maximum two automated reminders",
    ],
    history: [
      {
        id: "RUN-8324",
        result: "Succeeded",
        detail: "Reminder sent for ENV-70021",
        time: "Jul 12 · 11:00 AM",
      },
    ],
  },
];

export function AdminBlockchainTraceabilityCenter({
  recordId,
}: {
  recordId?: string;
}) {
  const record = TRACE_RECORDS.find((item) => item.id === recordId);
  if (recordId && record) return <TraceRecordDetail record={record} />;
  return <TraceabilityHome />;
}

function TraceabilityHome() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ChainStatus | "All">("All");
  const [notice, setNotice] = useState("");
  const visible = useMemo(
    () =>
      TRACE_RECORDS.filter(
        (record) =>
          (status === "All" || record.status === status) &&
          `${record.id} ${record.material} ${record.owner} ${record.batch} ${record.hash}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, status],
  );

  return (
    <Workspace
      title="Verify origin, custody, evidence, escrow, and delivery integrity."
      eyebrow="BLOCKCHAIN TRACEABILITY"
      body="Operate immutable-style proof records across the transaction lifecycle, resolve disputed attestations, and inspect the evidence behind every custody event."
      actions={
        <button
          type="button"
          onClick={() =>
            setNotice(
              "Traceability integrity report generated for admin review.",
            )
          }
          className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          Export integrity report
        </button>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <CommandHero
        icon={Blocks}
        eyebrow="PROOF NETWORK ONLINE"
        title="Turn marketplace history into verifiable transaction evidence."
        body="Every batch, document, contract, custody transfer, and delivery event can be inspected from one proof record."
        metrics={[
          ["3", "Proof records"],
          ["9", "Custody events"],
          ["89%", "Verified"],
          ["1", "Dispute open"],
        ]}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Proof records"
          value="3"
          detail="Across active feedstock batches"
          icon={Fingerprint}
        />
        <Metric
          label="Verified custody"
          value="8/9"
          detail="One event awaits resolution"
          icon={BadgeCheck}
        />
        <Metric
          label="Anchored evidence"
          value="7"
          detail="Documents and certificates"
          icon={FileCheck2}
        />
        <Metric
          label="Open disputes"
          value="1"
          detail="Quality evidence review"
          icon={TriangleAlert}
        />
      </div>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Trace records
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Inspect a complete chain of custody and its linked evidence.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search trace records</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search material, batch, or hash"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm"
              />
            </label>
            <select
              aria-label="Filter trace records"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ChainStatus | "All")
              }
              className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold"
            >
              <option>All</option>
              <option>Verified</option>
              <option>Pending attestation</option>
              <option>Disputed</option>
            </select>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {visible.map((record) => (
            <button
              type="button"
              key={record.id}
              onClick={() =>
                router.push(`/admin/blockchain-traceability/${record.id}`)
              }
              className="group rounded-2xl border border-neutral-200 p-5 text-left hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-950 group-hover:text-white">
                  <Network className="size-5" />
                </span>
                <ChainBadge status={record.status} />
              </div>
              <p className="mt-4 font-mono text-xs text-neutral-400">
                {record.id} · {record.batch}
              </p>
              <h3 className="mt-2 text-lg font-black text-neutral-950">
                {record.material}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">{record.owner}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <SmallMetric label="Quantity" value={record.quantity} />
                <SmallMetric
                  label="Custody"
                  value={`${record.custody.filter((event) => event.verified).length}/${record.custody.length} verified`}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="truncate font-mono text-xs text-neutral-400">
                  {record.hash}
                </span>
                <ChevronRight className="size-4 text-neutral-300" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </Workspace>
  );
}

function TraceRecordDetail({ record }: { record: TraceRecord }) {
  const router = useRouter();
  const [tab, setTab] = useState<TraceTab>("Custody timeline");
  const [status, setStatus] = useState<ChainStatus>(record.status);
  const [notice, setNotice] = useState("");
  return (
    <Workspace
      title={record.material}
      eyebrow={`${record.id} · ${record.batch}`}
      body={`${record.owner} · ${record.quantity} · ${record.network}`}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              setStatus("Disputed");
              setNotice("Proof record placed in dispute review.");
            }}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            Open dispute
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("Verified");
              setNotice("Record attested and verification proof refreshed.");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            <BadgeCheck className="size-4" />
            Attest record
          </button>
        </>
      }
      before={
        <button
          type="button"
          onClick={() => router.push("/admin/blockchain-traceability")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-neutral-600"
        >
          <ArrowLeft className="size-4" />
          Back to traceability
        </button>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Status"
          value={status}
          detail="Current proof state"
          icon={BadgeCheck}
        />
        <Metric
          label="Quantity"
          value={record.quantity}
          detail={record.batch}
          icon={Blocks}
        />
        <Metric
          label="Carbon"
          value={record.carbon}
          detail="Modeled transport impact"
          icon={Gauge}
        />
        <Metric
          label="Integrity"
          value="100%"
          detail="Hash chain validates"
          icon={LockKeyhole}
        />
      </div>
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
        {(
          ["Custody timeline", "Evidence", "Integrity", "Activity"] as const
        ).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setTab(item)}
            className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold ${tab === item ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Custody timeline" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Chain of custody
          </h2>
          <div className="mt-5 space-y-3">
            {record.custody.map((event, index) => (
              <div
                key={event.title}
                className="flex gap-4 rounded-2xl border border-neutral-200 p-4"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${event.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {event.verified ? (
                    <Check className="size-5" />
                  ) : (
                    <Clock3 className="size-5" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-neutral-950">
                        {index + 1}. {event.title}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {event.actor} · {event.place}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-neutral-400">
                      {event.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Evidence" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                Anchored evidence
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Files and records that support this proof chain.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/admin/documents/${record.document}`)}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Link2 className="size-4" />
              Open document
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {record.evidence.map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4"
              >
                <FileText className="mt-0.5 size-5 text-neutral-500" />
                <div>
                  <p className="font-bold text-neutral-900">{item.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {item.type} · {item.state}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Integrity" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="rounded-2xl bg-neutral-950 p-6 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              PROOF HASH
            </p>
            <p className="mt-4 break-all font-mono text-xl font-bold">
              {record.hash}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <DarkMetric value="Valid" label="Hash chain" />
              <DarkMetric
                value={String(record.custody.length)}
                label="Events"
              />
              <DarkMetric
                value={String(record.evidence.length)}
                label="Evidence"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setNotice("Proof hash copied to the admin review clipboard.")
              }
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-neutral-950"
            >
              <Copy className="size-4" />
              Copy proof hash
            </button>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <h2 className="font-black text-neutral-950">Linked records</h2>
            <div className="mt-4 space-y-2">
              <LinkedRecord
                label="Contract"
                value={record.contract}
                onClick={() =>
                  router.push(`/admin/contracts/${record.contract}`)
                }
              />
              <LinkedRecord
                label="Document"
                value={record.document}
                onClick={() =>
                  router.push(`/admin/documents/${record.document}`)
                }
              />
              <LinkedRecord
                label="Shipment"
                value={record.shipment}
                onClick={() =>
                  router.push(`/admin/logistics/${record.shipment}`)
                }
              />
            </div>
          </section>
        </div>
      )}
      {tab === "Activity" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Proof record activity
          </h2>
          <div className="mt-4 space-y-3">
            {record.custody.map((event) => (
              <div
                key={event.title}
                className="flex gap-3 rounded-xl bg-neutral-50 p-4"
              >
                <History className="mt-0.5 size-5 text-neutral-500" />
                <div>
                  <p className="font-bold text-neutral-900">{event.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {event.actor} · {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </Workspace>
  );
}

export function AdminSmartContractAutomationCenter({
  ruleId,
}: {
  ruleId?: string;
}) {
  const [rules, setRules] = useState(INITIAL_RULES);
  const rule = rules.find((item) => item.id === ruleId);
  if (ruleId && rule)
    return (
      <AutomationRuleDetail
        rule={rule}
        onUpdate={(updates) =>
          setRules((current) =>
            current.map((item) =>
              item.id === rule.id ? { ...item, ...updates } : item,
            ),
          )
        }
      />
    );
  return (
    <AutomationHome
      rules={rules}
      onAdd={(rule) => setRules((current) => [rule, ...current])}
    />
  );
}

function AutomationHome({
  rules,
  onAdd,
}: {
  rules: AutomationRule[];
  onAdd: (rule: AutomationRule) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RuleStatus | "All">("All");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const visible = useMemo(
    () =>
      rules.filter(
        (rule) =>
          (status === "All" || rule.status === status) &&
          `${rule.id} ${rule.name} ${rule.trigger} ${rule.action} ${rule.owner}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, rules, status],
  );
  return (
    <Workspace
      title="Automate releases, renewals, holds, and operational safeguards."
      eyebrow="SMART CONTRACT OPERATIONS"
      body="Manage trigger-driven marketplace rules, inspect every execution, validate guardrails, and keep automation under admin control."
      actions={
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus className="size-4" />
          Create automation
        </button>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <CommandHero
        icon={Workflow}
        eyebrow="AUTOMATION CONTROL ONLINE"
        title="Move trusted marketplace events into controlled action."
        body="Every rule combines a verified trigger, governed action, required guardrails, and an inspectable execution history."
        metrics={[
          [
            String(rules.filter((rule) => rule.status === "Active").length),
            "Active rules",
          ],
          [
            String(rules.reduce((sum, rule) => sum + rule.runs, 0)),
            "Total runs",
          ],
          ["98.2%", "Success"],
          ["2", "Needs action"],
        ]}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Active automations"
          value={String(
            rules.filter((rule) => rule.status === "Active").length,
          )}
          detail="Release and renewal workflows"
          icon={Zap}
        />
        <Metric
          label="Executions"
          value={String(rules.reduce((sum, rule) => sum + rule.runs, 0))}
          detail="Across all governed rules"
          icon={Activity}
        />
        <Metric
          label="Success rate"
          value="98.2%"
          detail="Successful or safely held"
          icon={CheckCircle2}
        />
        <Metric
          label="Protected value"
          value="$1.51M"
          detail="Released or held by policy"
          icon={CircleDollarSign}
        />
      </div>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Automation registry
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Open a rule to simulate, pause, review guardrails, and inspect
              runs.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search automations</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search rule or trigger"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm"
              />
            </label>
            <select
              aria-label="Filter automations"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RuleStatus | "All")
              }
              className="h-10 rounded-xl border border-neutral-200 px-3 text-sm font-semibold"
            >
              <option>All</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Needs review</option>
            </select>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visible.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => router.push(`/admin/smart-contracts/${rule.id}`)}
              className="group rounded-2xl border border-neutral-200 p-5 text-left hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-950 group-hover:text-white">
                  <Workflow className="size-5" />
                </span>
                <RuleBadge status={rule.status} />
              </div>
              <p className="mt-4 font-mono text-xs text-neutral-400">
                {rule.id}
              </p>
              <h3 className="mt-2 text-lg font-black text-neutral-950">
                {rule.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                When {rule.trigger.toLowerCase()}, {rule.action.toLowerCase()}.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <SmallMetric label="Runs" value={String(rule.runs)} />
                <SmallMetric label="Success" value={`${rule.success}%`} />
                <SmallMetric label="Value" value={rule.value} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs">
                <span className="font-semibold text-neutral-500">
                  {rule.owner}
                </span>
                <span className="font-bold text-neutral-900">
                  {rule.lastRun}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      {createOpen && (
        <CreateRuleDialog
          onClose={() => setCreateOpen(false)}
          onSave={(rule) => {
            onAdd(rule);
            setCreateOpen(false);
            setNotice(`${rule.name} created in paused review mode.`);
          }}
        />
      )}
    </Workspace>
  );
}

function AutomationRuleDetail({
  rule,
  onUpdate,
}: {
  rule: AutomationRule;
  onUpdate: (updates: Partial<AutomationRule>) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<RuleTab>("Configuration");
  const [notice, setNotice] = useState("");
  const [running, setRunning] = useState(false);
  const [guardrails, setGuardrails] = useState(
    rule.guardrails.map((label) => ({ label, enabled: true })),
  );
  const simulate = () => {
    setRunning(true);
    window.setTimeout(() => {
      setRunning(false);
      setNotice(
        "Simulation completed. Trigger matched, guardrails passed, and the action reached dry-run success.",
      );
    }, 450);
  };
  return (
    <Workspace
      title={rule.name}
      eyebrow={`${rule.id} · ${rule.owner}`}
      body={`When ${rule.trigger.toLowerCase()}, ${rule.action.toLowerCase()}.`}
      before={
        <button
          type="button"
          onClick={() => router.push("/admin/smart-contracts")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-neutral-600"
        >
          <ArrowLeft className="size-4" />
          Back to automations
        </button>
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              onUpdate({
                status: rule.status === "Paused" ? "Active" : "Paused",
              });
              setNotice(
                rule.status === "Paused"
                  ? "Automation resumed."
                  : "Automation paused for new triggers.",
              );
            }}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold"
          >
            {rule.status === "Paused" ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
            {rule.status === "Paused" ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={simulate}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {running ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {running ? "Simulating…" : "Simulate run"}
          </button>
        </>
      }
    >
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Status"
          value={rule.status}
          detail="Current execution state"
          icon={Workflow}
        />
        <Metric
          label="Total runs"
          value={String(rule.runs)}
          detail={rule.lastRun}
          icon={Activity}
        />
        <Metric
          label="Success rate"
          value={`${rule.success}%`}
          detail="Successful or safely held"
          icon={Gauge}
        />
        <Metric
          label="Governed value"
          value={rule.value}
          detail="Marketplace impact"
          icon={CircleDollarSign}
        />
      </div>
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
        {(
          ["Configuration", "Run history", "Guardrails", "Activity"] as const
        ).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setTab(item)}
            className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold ${tab === item ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Configuration" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <h2 className="text-lg font-black text-neutral-950">
              Rule configuration
            </h2>
            <div className="mt-5 space-y-4">
              <ConfigBlock label="WHEN" value={rule.trigger} icon={Sparkles} />
              <ConfigBlock label="THEN" value={rule.action} icon={Zap} />
              <ConfigBlock
                label="OWNER"
                value={rule.owner}
                icon={ShieldCheck}
              />
            </div>
          </section>
          <section className="rounded-2xl bg-neutral-950 p-5 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              DRY-RUN PREVIEW
            </p>
            <h2 className="mt-3 text-2xl font-black">Safe simulation</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              Validate trigger matching, guardrails, and action payload without
              changing a contract, payment, document, or notification.
            </p>
            <button
              type="button"
              onClick={simulate}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-neutral-950"
            >
              <Play className="size-4" />
              Run simulation
            </button>
          </section>
        </div>
      )}
      {tab === "Run history" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Execution history
          </h2>
          <div className="mt-4 space-y-3">
            {rule.history.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-neutral-400">
                      {run.id}
                    </p>
                    <RunBadge result={run.result} />
                  </div>
                  <p className="mt-2 font-bold text-neutral-900">
                    {run.detail}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">{run.time}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotice(`${run.id} execution details exported.`)
                  }
                  className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold"
                >
                  Inspect run
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Guardrails" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                Execution guardrails
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Every enabled requirement must pass before the action can
                execute.
              </p>
            </div>
            <ShieldCheck className="size-6 text-emerald-600" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {guardrails.map((guardrail) => (
              <button
                type="button"
                key={guardrail.label}
                onClick={() =>
                  setGuardrails((current) =>
                    current.map((item) =>
                      item.label === guardrail.label
                        ? { ...item, enabled: !item.enabled }
                        : item,
                    ),
                  )
                }
                className="flex items-center justify-between rounded-xl bg-neutral-50 p-4 text-left"
              >
                <span className="font-bold text-neutral-900">
                  {guardrail.label}
                </span>
                {guardrail.enabled ? (
                  <ToggleRight className="size-7 text-emerald-600" />
                ) : (
                  <ToggleLeft className="size-7 text-neutral-400" />
                )}
              </button>
            ))}
          </div>
        </section>
      )}
      {tab === "Activity" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Automation activity
          </h2>
          <div className="mt-4 space-y-3">
            {rule.history.map((run) => (
              <div
                key={run.id}
                className="flex gap-3 rounded-xl bg-neutral-50 p-4"
              >
                <History className="mt-0.5 size-5 text-neutral-500" />
                <div>
                  <p className="font-bold text-neutral-900">
                    {run.result} · {run.id}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {run.detail} · {run.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </Workspace>
  );
}

function Workspace({
  title,
  eyebrow,
  body,
  actions,
  before,
  children,
}: {
  title: string;
  eyebrow: string;
  body: string;
  actions: React.ReactNode;
  before?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {before}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
            {eyebrow}
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-neutral-950">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            {body}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}
function CommandHero({
  icon: Icon,
  eyebrow,
  title,
  body,
  metrics,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  metrics: string[][];
}) {
  return (
    <section className="mt-6 rounded-3xl bg-neutral-950 p-6 text-white shadow-xl sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_560px] xl:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            <Icon className="size-4" />
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl text-2xl font-black sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
            {body}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map(([value, label]) => (
            <DarkMetric key={label} value={value} label={label} />
          ))}
        </div>
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-neutral-950">{value}</p>
          <p className="mt-1 text-xs text-neutral-500">{detail}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
          <Icon className="size-5" />
        </span>
      </div>
    </section>
  );
}
function DarkMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
    </div>
  );
}
function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-neutral-900">{value}</p>
    </div>
  );
}
function ChainBadge({ status }: { status: ChainStatus }) {
  const tone =
    status === "Verified"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Disputed"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {status}
    </span>
  );
}
function RuleBadge({ status }: { status: RuleStatus }) {
  const tone =
    status === "Active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "Paused"
        ? "bg-neutral-200 text-neutral-700"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {status}
    </span>
  );
}
function RunBadge({
  result,
}: {
  result: AutomationRule["history"][number]["result"];
}) {
  const tone =
    result === "Succeeded"
      ? "bg-emerald-100 text-emerald-800"
      : result === "Held"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {result}
    </span>
  );
}
function LinkedRecord({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl bg-neutral-50 p-3 text-left"
    >
      <span>
        <span className="block text-[10px] font-bold uppercase text-neutral-400">
          {label}
        </span>
        <span className="mt-1 block font-mono text-sm font-bold text-neutral-900">
          {value}
        </span>
      </span>
      <ChevronRight className="size-4 text-neutral-400" />
    </button>
  );
}
function ConfigBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-700 shadow-sm">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold leading-6 text-neutral-900">
          {value}
        </p>
      </div>
    </div>
  );
}
function Notice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100"
    >
      <span className="flex items-center gap-2">
        <CheckCircle2 className="size-4" />
        {message}
      </span>
      <button type="button" aria-label="Dismiss message" onClick={onClose}>
        <X className="size-4" />
      </button>
    </div>
  );
}

function CreateRuleDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (rule: AutomationRule) => void;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");
  return (
    <dialog
      open
      aria-labelledby="create-rule-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              RULE BUILDER
            </p>
            <h2
              id="create-rule-title"
              className="mt-2 text-2xl font-black text-neutral-950"
            >
              Create automation
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close automation dialog"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-4">
          <label className="text-sm font-bold">
            Rule name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Notify on quality exception"
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3"
            />
          </label>
          <label className="text-sm font-bold">
            Trigger
            <input
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
              placeholder="Inspection result fails"
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3"
            />
          </label>
          <label className="text-sm font-bold">
            Action
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="Open admin review and notify owner"
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || !trigger.trim() || !action.trim()}
            onClick={() =>
              onSave({
                id: `AUTO-${3100 + Math.floor(Math.random() * 200)}`,
                name: name.trim(),
                status: "Paused",
                trigger: trigger.trim(),
                action: action.trim(),
                owner: "Admin Operations",
                runs: 0,
                success: 100,
                value: "New rule",
                lastRun: "Not run",
                guardrails: ["Verified trigger source", "Admin owner assigned"],
                history: [],
              })
            }
            className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            Create rule
          </button>
        </div>
      </div>
    </dialog>
  );
}
