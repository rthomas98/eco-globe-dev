"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Download,
  FileClock,
  Filter,
  Fingerprint,
  History,
  KeyRound,
  Link2,
  LockKeyhole,
  MonitorSmartphone,
  RefreshCcw,
  Search,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type AuditSeverity = "Info" | "Warning" | "Critical";
type AuditCategory =
  | "Authentication"
  | "Listings"
  | "Transactions"
  | "Escrow"
  | "Identity"
  | "Settings"
  | "Governance";
type AuditTab = "Event context" | "Changes" | "Security" | "Integrity";

interface AuditChange {
  field: string;
  before: string;
  after: string;
  impact: string;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  actorType: "Admin" | "System" | "User";
  category: AuditCategory;
  action: string;
  summary: string;
  resource: string;
  resourceType: string;
  resourceHref: string;
  severity: AuditSeverity;
  outcome: "Success" | "Blocked" | "Review";
  ip: string;
  location: string;
  session: string;
  userAgent: string;
  requestId: string;
  source: string;
  integrityHash: string;
  previousHash: string;
  reason: string;
  changes: AuditChange[];
  related: Array<{ label: string; value: string; href: string }>;
  timeline: Array<{ title: string; detail: string; date: string }>;
}

const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "AUD-90031",
    timestamp: "Jul 16, 2026 · 11:42:08 AM",
    actor: "Katarina Jenkins",
    actorRole: "Marketplace Integrity Manager",
    actorType: "Admin",
    category: "Listings",
    action: "Approved listing moderation case",
    summary:
      "Approved Bio-based Resin Pellets after sustainability claim and seller eligibility review.",
    resource: "MOD-24031",
    resourceType: "Moderation case",
    resourceHref: "/admin/moderation/MOD-24031",
    severity: "Info",
    outcome: "Success",
    ip: "10.0.4.18",
    location: "Baton Rouge, Louisiana",
    session: "SES-7A91-F2D4",
    userAgent: "Chrome 139 · macOS 15.5",
    requestId: "REQ-7210041",
    source: "Admin governance workspace",
    integrityHash: "0xe9ad…71c42",
    previousHash: "0x37bf…802ad",
    reason: "Certificate issuer and renewable-content claim were validated.",
    changes: [
      {
        field: "moderation.status",
        before: "Pending",
        after: "Approved",
        impact: "Listing became eligible for marketplace publication.",
      },
      {
        field: "listing.visibility",
        before: "Hidden",
        after: "Verified buyers",
        impact: "Product is now searchable by eligible buyers.",
      },
    ],
    related: [
      {
        label: "Moderation",
        value: "MOD-24031",
        href: "/admin/moderation/MOD-24031",
      },
      {
        label: "Listing",
        value: "LIST-11071",
        href: "/admin/listings/LIST-11071",
      },
      {
        label: "Seller",
        value: "S-00231",
        href: "/admin/sellers/S-00231",
      },
    ],
    timeline: [
      {
        title: "Request authenticated",
        detail: "Admin session and Marketplace Integrity role validated.",
        date: "11:42:07 AM",
      },
      {
        title: "Policy checks evaluated",
        detail: "All required listing checks passed.",
        date: "11:42:08 AM",
      },
      {
        title: "Decision committed",
        detail: "Case and listing visibility updated atomically.",
        date: "11:42:08 AM",
      },
    ],
  },
  {
    id: "AUD-90030",
    timestamp: "Jul 16, 2026 · 11:18:32 AM",
    actor: "Katarina Jenkins",
    actorRole: "Marketplace Integrity Manager",
    actorType: "Admin",
    category: "Escrow",
    action: "Released protected escrow funds",
    summary:
      "Recorded escrow release after delivery confirmation and the inspection window closed.",
    resource: "ESC-50012",
    resourceType: "Escrow record",
    resourceHref: "/admin/accounting/escrow/ESC-50012",
    severity: "Info",
    outcome: "Success",
    ip: "10.0.4.18",
    location: "Baton Rouge, Louisiana",
    session: "SES-7A91-F2D4",
    userAgent: "Chrome 139 · macOS 15.5",
    requestId: "REQ-7210018",
    source: "Admin escrow operations",
    integrityHash: "0x37bf…802ad",
    previousHash: "0x12ae…80fc1",
    reason:
      "Buyer confirmed delivery and no dispute was filed inside 48 hours.",
    changes: [
      {
        field: "escrow.status",
        before: "Ready to release",
        after: "Released",
        impact: "Seller payout became available for settlement.",
      },
      {
        field: "escrow.amountHeld",
        before: "$4,990.00",
        after: "$0.00",
        impact: "$4,890.20 seller payout scheduled after fees.",
      },
    ],
    related: [
      {
        label: "Escrow",
        value: "ESC-50012",
        href: "/admin/accounting/escrow/ESC-50012",
      },
      {
        label: "Transaction",
        value: "TX-50012",
        href: "/admin/accounting/transactions/TX-50012",
      },
      {
        label: "Payment",
        value: "PAY-8038",
        href: "/admin/accounting/payments/PAY-8038",
      },
    ],
    timeline: [
      {
        title: "Release policy evaluated",
        detail: "Delivery and inspection conditions passed.",
        date: "11:18:31 AM",
      },
      {
        title: "Admin release confirmed",
        detail: "Katarina Jenkins approved the protected-fund movement.",
        date: "11:18:32 AM",
      },
      {
        title: "Settlement scheduled",
        detail: "Seller payout queued through Stripe Connect.",
        date: "11:18:32 AM",
      },
    ],
  },
  {
    id: "AUD-90029",
    timestamp: "Jul 16, 2026 · 10:55:21 AM",
    actor: "EcoGlobe Risk Engine",
    actorRole: "Automated control",
    actorType: "System",
    category: "Transactions",
    action: "Flagged a high-value transaction",
    summary:
      "Placed transaction TX-50021 in manual review after a protected-value and quantity anomaly.",
    resource: "TX-50021",
    resourceType: "Transaction",
    resourceHref: "/admin/accounting/transactions/TX-50021",
    severity: "Warning",
    outcome: "Review",
    ip: "system",
    location: "US Central · automated workload",
    session: "SYS-RISK-042",
    userAgent: "Risk engine v4.8",
    requestId: "EVT-8891042",
    source: "Transaction risk policy",
    integrityHash: "0x12ae…80fc1",
    previousHash: "0xa61e…b0231",
    reason:
      "Protected value exceeded the corridor threshold and the delivery quantity differed by 8%.",
    changes: [
      {
        field: "transaction.risk",
        before: "Low",
        after: "High",
        impact: "Manual admin review is required before funds can release.",
      },
      {
        field: "transaction.status",
        before: "In escrow",
        after: "Flagged",
        impact: "Automated settlement paused.",
      },
    ],
    related: [
      {
        label: "Transaction",
        value: "TX-50021",
        href: "/admin/accounting/transactions/TX-50021",
      },
      {
        label: "Dispute",
        value: "DSP-2041",
        href: "/admin/disputes/DSP-2041",
      },
      {
        label: "Escrow",
        value: "ESC-50021",
        href: "/admin/accounting/escrow/ESC-50021",
      },
    ],
    timeline: [
      {
        title: "Risk rule matched",
        detail: "High-value and delivery-variance controls triggered.",
        date: "10:55:20 AM",
      },
      {
        title: "Settlement paused",
        detail: "Escrow automation received a hold instruction.",
        date: "10:55:21 AM",
      },
      {
        title: "Admin review created",
        detail: "Resolution Operations was notified.",
        date: "10:55:21 AM",
      },
    ],
  },
  {
    id: "AUD-90028",
    timestamp: "Jul 16, 2026 · 10:14:05 AM",
    actor: "Anabea Costa",
    actorRole: "Identity Operations Lead",
    actorType: "Admin",
    category: "Identity",
    action: "Approved seller verification",
    summary:
      "Approved EcoPack Co. after registry, ownership, representative, and banking checks.",
    resource: "KYC-9211",
    resourceType: "KYC verification",
    resourceHref: "/admin/kyc/KYC-9211",
    severity: "Info",
    outcome: "Success",
    ip: "10.0.4.42",
    location: "New Orleans, Louisiana",
    session: "SES-80BA-320C",
    userAgent: "Safari 19 · macOS 15.5",
    requestId: "REQ-7209941",
    source: "Admin identity workspace",
    integrityHash: "0xa61e…b0231",
    previousHash: "0x4fb1…c9218",
    reason: "All identity and ownership requirements were satisfied.",
    changes: [
      {
        field: "verification.status",
        before: "In review",
        after: "Approved",
        impact: "Seller renewal remains active through May 2027.",
      },
    ],
    related: [
      { label: "KYC", value: "KYC-9211", href: "/admin/kyc/KYC-9211" },
      {
        label: "Seller",
        value: "S-00231",
        href: "/admin/sellers/S-00231",
      },
    ],
    timeline: [
      {
        title: "Manual identity check completed",
        detail: "Representative address comparison passed.",
        date: "10:13:41 AM",
      },
      {
        title: "Verification approved",
        detail: "Seller access and renewal dates updated.",
        date: "10:14:05 AM",
      },
    ],
  },
  {
    id: "AUD-90027",
    timestamp: "Jul 16, 2026 · 9:30:48 AM",
    actor: "Anabea Costa",
    actorRole: "Identity Operations Lead",
    actorType: "Admin",
    category: "Governance",
    action: "Rejected listing evidence",
    summary:
      "Rejected origin evidence for Natural Rutile Sand Concentrate because required issuer details were missing.",
    resource: "MOD-24025",
    resourceType: "Moderation case",
    resourceHref: "/admin/moderation/MOD-24025",
    severity: "Warning",
    outcome: "Blocked",
    ip: "10.0.4.42",
    location: "New Orleans, Louisiana",
    session: "SES-80BA-320C",
    userAgent: "Safari 19 · macOS 15.5",
    requestId: "REQ-7209880",
    source: "Admin moderation workspace",
    integrityHash: "0x4fb1…c9218",
    previousHash: "0x8a50…85ba2",
    reason:
      "Origin document did not identify the source facility or authorized issuer.",
    changes: [
      {
        field: "moderation.status",
        before: "Pending",
        after: "Rejected",
        impact: "Listing remains unavailable to marketplace buyers.",
      },
    ],
    related: [
      {
        label: "Moderation",
        value: "MOD-24025",
        href: "/admin/moderation/MOD-24025",
      },
      {
        label: "Listing",
        value: "LIST-11049",
        href: "/admin/listings/LIST-11049",
      },
    ],
    timeline: [
      {
        title: "Evidence review completed",
        detail: "Required origin fields were absent.",
        date: "9:29:58 AM",
      },
      {
        title: "Listing rejected",
        detail: "Seller received a replacement-evidence request.",
        date: "9:30:48 AM",
      },
    ],
  },
  {
    id: "AUD-90026",
    timestamp: "Jul 15, 2026 · 6:22:11 PM",
    actor: "EcoGlobe Auth Guard",
    actorRole: "Automated security control",
    actorType: "System",
    category: "Authentication",
    action: "Blocked repeated login attempts",
    summary:
      "Temporarily blocked authentication attempts after the failed-login threshold was reached.",
    resource: "B-00184",
    resourceType: "Buyer account",
    resourceHref: "/admin/buyers/B-00184",
    severity: "Warning",
    outcome: "Blocked",
    ip: "203.0.113.42",
    location: "Unverified network",
    session: "No authenticated session",
    userAgent: "Chrome 138 · Windows 11",
    requestId: "SEC-551008",
    source: "Authentication rate control",
    integrityHash: "0x8a50…85ba2",
    previousHash: "0x9ed8…107a1",
    reason: "Seven failed attempts occurred inside a five-minute window.",
    changes: [
      {
        field: "auth.ipRestriction",
        before: "None",
        after: "15-minute block",
        impact: "New authentication attempts from the source IP are denied.",
      },
    ],
    related: [
      { label: "Buyer", value: "B-00184", href: "/admin/buyers/B-00184" },
    ],
    timeline: [
      {
        title: "Failure threshold reached",
        detail: "Seven invalid credential submissions detected.",
        date: "6:22:10 PM",
      },
      {
        title: "Source temporarily blocked",
        detail: "Rate-control policy applied for 15 minutes.",
        date: "6:22:11 PM",
      },
    ],
  },
  {
    id: "AUD-90025",
    timestamp: "Jul 15, 2026 · 3:05:00 PM",
    actor: "Katarina Jenkins",
    actorRole: "Platform Administrator",
    actorType: "Admin",
    category: "Settings",
    action: "Updated the platform fee schedule",
    summary:
      "Changed the standard marketplace fee for new industrial-feedstock transactions.",
    resource: "FEE-STANDARD-01",
    resourceType: "Finance configuration",
    resourceHref: "/admin/settings/payments",
    severity: "Critical",
    outcome: "Success",
    ip: "10.0.4.18",
    location: "Baton Rouge, Louisiana",
    session: "SES-902F-128A",
    userAgent: "Chrome 139 · macOS 15.5",
    requestId: "REQ-7209400",
    source: "Admin system settings",
    integrityHash: "0x9ed8…107a1",
    previousHash: "0x2a16…bb449",
    reason: "Approved Q3 marketplace fee adjustment.",
    changes: [
      {
        field: "fees.standardIndustrial",
        before: "1.8%",
        after: "2.0%",
        impact: "Applies to newly created eligible transactions.",
      },
    ],
    related: [
      {
        label: "Payments",
        value: "Fee settings",
        href: "/admin/settings/payments",
      },
    ],
    timeline: [
      {
        title: "Step-up authentication passed",
        detail: "Sensitive settings confirmation completed.",
        date: "3:04:48 PM",
      },
      {
        title: "Fee configuration updated",
        detail: "New fee applies to future transactions only.",
        date: "3:05:00 PM",
      },
    ],
  },
  {
    id: "AUD-90024",
    timestamp: "Jul 15, 2026 · 11:48:09 AM",
    actor: "Anabea Costa",
    actorRole: "Platform Administrator",
    actorType: "Admin",
    category: "Settings",
    action: "Granted an administrator role",
    summary:
      "Added the Marketplace Integrity role to an internal operations user.",
    resource: "U-00038",
    resourceType: "Admin user",
    resourceHref: "/admin/settings/system/users",
    severity: "Critical",
    outcome: "Success",
    ip: "10.0.4.42",
    location: "New Orleans, Louisiana",
    session: "SES-1D20-BC88",
    userAgent: "Safari 19 · macOS 15.5",
    requestId: "REQ-7208812",
    source: "Admin user management",
    integrityHash: "0x2a16…bb449",
    previousHash: "0xb980…a202c",
    reason: "Role approved for marketplace moderation coverage.",
    changes: [
      {
        field: "user.roles",
        before: "Support Specialist",
        after: "Support Specialist, Marketplace Integrity",
        impact: "User can review and decide listing moderation cases.",
      },
    ],
    related: [
      {
        label: "Admin users",
        value: "U-00038",
        href: "/admin/settings/system/users",
      },
    ],
    timeline: [
      {
        title: "Permission check completed",
        detail: "Actor has Platform Administrator privileges.",
        date: "11:47:58 AM",
      },
      {
        title: "Role granted",
        detail: "New permissions became active immediately.",
        date: "11:48:09 AM",
      },
    ],
  },
];

const CATEGORIES = [
  "All categories",
  "Authentication",
  "Listings",
  "Transactions",
  "Escrow",
  "Identity",
  "Settings",
  "Governance",
] as const;
const SEVERITIES = ["All severity", "Info", "Warning", "Critical"] as const;
const ACTOR_TYPES = ["All actors", "Admin", "System", "User"] as const;

function severityTone(severity: AuditSeverity) {
  return severity === "Critical"
    ? "bg-red-50 text-red-700"
    : severity === "Warning"
      ? "bg-amber-50 text-amber-700"
      : "bg-neutral-100 text-neutral-600";
}

function outcomeTone(outcome: AuditEvent["outcome"]) {
  return outcome === "Success"
    ? "bg-emerald-50 text-emerald-700"
    : outcome === "Blocked"
      ? "bg-red-50 text-red-700"
      : "bg-blue-50 text-blue-700";
}

function downloadAuditCsv(records: AuditEvent[]) {
  const header = [
    "Audit ID",
    "Timestamp",
    "Actor",
    "Category",
    "Action",
    "Resource",
    "Severity",
    "Outcome",
    "IP",
  ];
  const rows = records.map((record) => [
    record.id,
    record.timestamp,
    record.actor,
    record.category,
    record.action,
    record.resource,
    record.severity,
    record.outcome,
    record.ip,
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ecoglobe-audit-log.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function AdminAuditCenter({ eventId }: { eventId?: string }) {
  const event = eventId
    ? (AUDIT_EVENTS.find((item) => item.id === eventId) ?? AUDIT_EVENTS[0])
    : undefined;
  return event ? <AuditEventDetail event={event} /> : <AuditOperations />;
}

function AuditOperations() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("All categories");
  const [severity, setSeverity] =
    useState<(typeof SEVERITIES)[number]>("All severity");
  const [actorType, setActorType] =
    useState<(typeof ACTOR_TYPES)[number]>("All actors");
  const [notice, setNotice] = useState("");
  const visible = useMemo(
    () =>
      AUDIT_EVENTS.filter((event) => {
        const categoryMatch =
          category === "All categories" || event.category === category;
        const severityMatch =
          severity === "All severity" || event.severity === severity;
        const actorMatch =
          actorType === "All actors" || event.actorType === actorType;
        const text =
          `${event.id} ${event.actor} ${event.action} ${event.resource} ${event.summary}`.toLowerCase();
        return (
          categoryMatch &&
          severityMatch &&
          actorMatch &&
          text.includes(query.toLowerCase())
        );
      }),
    [actorType, category, query, severity],
  );
  const critical = AUDIT_EVENTS.filter(
    (event) => event.severity === "Critical",
  ).length;
  const automated = AUDIT_EVENTS.filter(
    (event) => event.actorType === "System",
  ).length;

  const exportVisible = () => {
    downloadAuditCsv(visible);
    setNotice(`${visible.length} filtered audit events exported successfully.`);
  };

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1560px] space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              <Fingerprint className="size-4" /> Audit and accountability
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">
              Trace every sensitive platform action
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Investigate actor, resource, session, permission, and field-level
              changes through EcoGlobe&apos;s tamper-evident governance history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setNotice("Audit integrity scan completed with no chain gaps.")
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700"
            >
              <RefreshCcw className="size-4" /> Verify integrity
            </button>
            <button
              type="button"
              onClick={exportVisible}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white"
            >
              <Download className="size-4" /> Export audit log
            </button>
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AuditMetric
            icon={FileClock}
            label="Recorded events"
            value="24,891"
            detail="Across the retained audit window"
          />
          <AuditMetric
            icon={ShieldAlert}
            label="Critical changes"
            value={String(critical)}
            detail="Sensitive configuration or roles"
          />
          <AuditMetric
            icon={ServerCog}
            label="Automated controls"
            value={String(automated)}
            detail="Risk and authentication events"
          />
          <AuditMetric
            icon={BadgeCheck}
            label="Chain integrity"
            value="100%"
            detail="No missing or altered events"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-100 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-neutral-950">
                    Audit event stream
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    {visible.length} events in the current view
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex h-10 min-w-64 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm">
                    <Search className="size-4 text-neutral-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search actor, action, or resource"
                      className="min-w-0 flex-1 bg-transparent outline-none"
                    />
                  </label>
                  <label className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm">
                    <Filter className="size-4 text-neutral-400" />
                    <select
                      aria-label="Audit category"
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target.value as (typeof CATEGORIES)[number],
                        )
                      }
                      className="bg-transparent font-medium outline-none"
                    >
                      {CATEGORIES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <select
                    aria-label="Audit severity"
                    value={severity}
                    onChange={(event) =>
                      setSeverity(
                        event.target.value as (typeof SEVERITIES)[number],
                      )
                    }
                    className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium outline-none"
                  >
                    {SEVERITIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Audit actor type"
                    value={actorType}
                    onChange={(event) =>
                      setActorType(
                        event.target.value as (typeof ACTOR_TYPES)[number],
                      )
                    }
                    className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium outline-none"
                  >
                    {ACTOR_TYPES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-100">
              {visible.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => router.push(`/admin/audit/${event.id}`)}
                  className="grid w-full gap-4 p-5 text-left transition hover:bg-neutral-50 lg:grid-cols-[minmax(0,1fr)_170px_150px_110px_24px] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">
                        {event.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityTone(event.severity)}`}
                      >
                        {event.severity}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${outcomeTone(event.outcome)}`}
                      >
                        {event.outcome}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-sm font-bold text-neutral-950">
                      {event.action}
                    </h3>
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {event.timestamp}
                    </p>
                  </div>
                  <AuditField label="Actor" value={event.actor} />
                  <AuditField label="Resource" value={event.resource} />
                  <AuditField label="Category" value={event.category} />
                  <ChevronRight className="size-4 text-neutral-300" />
                </button>
              ))}
            </div>
            {visible.length === 0 && (
              <div className="p-10 text-center">
                <Search className="mx-auto size-7 text-neutral-300" />
                <p className="mt-3 text-sm font-semibold text-neutral-700">
                  No audit events match this view.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("All categories");
                    setSeverity("All severity");
                    setActorType("All actors");
                  }}
                  className="mt-2 text-sm font-semibold text-emerald-700"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          <AuditSidebar onOpen={(id) => router.push(`/admin/audit/${id}`)} />
        </section>
      </div>
    </div>
  );
}

function AuditSidebar({ onOpen }: { onOpen: (id: string) => void }) {
  const priority = AUDIT_EVENTS.find((event) => event.severity === "Critical")!;
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl bg-neutral-950 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
          Sensitive change
        </p>
        <h2 className="mt-2 text-xl font-bold">{priority.action}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          {priority.summary}
        </p>
        <div className="mt-4 rounded-xl bg-white/10 p-3">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">
            Actor
          </p>
          <p className="mt-1 text-sm font-bold">{priority.actor}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(priority.id)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-neutral-950"
        >
          Inspect sensitive event <ArrowUpRight className="size-4" />
        </button>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-emerald-700" />
          <h2 className="font-bold text-neutral-950">Integrity healthy</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          The displayed audit chain has continuous event hashes and complete
          actor context.
        </p>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-blue-700" />
          <h2 className="font-bold text-neutral-950">Activity signal</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Governance and escrow changes account for 38% of sensitive admin
          activity this week.
        </p>
      </div>
    </aside>
  );
}

function AuditEventDetail({ event }: { event: AuditEvent }) {
  const router = useRouter();
  const [tab, setTab] = useState<AuditTab>("Event context");
  const [notice, setNotice] = useState("");

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <button
          type="button"
          onClick={() => router.push("/admin/audit")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-950"
        >
          <ArrowLeft className="size-4" /> Back to audit log
        </button>
        <section className="overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Fingerprint className="size-4" /> {event.id}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityTone(event.severity)}`}
                >
                  {event.severity}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${outcomeTone(event.outcome)}`}
                >
                  {event.outcome}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                {event.action}
              </h1>
              <p className="mt-2 text-sm text-neutral-400">
                {event.timestamp} · {event.category}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-300">
                {event.summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setNotice(
                    "Investigation workspace opened with this event as the anchor.",
                  )
                }
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
              >
                Open investigation
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadAuditCsv([event]);
                  setNotice("Selected audit event exported successfully.");
                }}
                className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-neutral-950"
              >
                Export event
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
            <DetailHero label="Actor" value={event.actor} />
            <DetailHero label="Resource" value={event.resource} />
            <DetailHero label="Source" value={event.source} />
            <DetailHero label="Request" value={event.requestId} />
          </div>
        </section>

        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex overflow-x-auto border-b border-neutral-200">
          {(
            ["Event context", "Changes", "Security", "Integrity"] as AuditTab[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === item ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500"}`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Event context" && <EventContext event={event} />}
        {tab === "Changes" && <EventChanges event={event} />}
        {tab === "Security" && <SecurityContext event={event} />}
        {tab === "Integrity" && (
          <IntegrityContext event={event} onAction={setNotice} />
        )}
      </div>
    </div>
  );
}

function EventContext({ event }: { event: AuditEvent }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-950">Event context</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AuditDetail label="Actor role" value={event.actorRole} />
          <AuditDetail label="Actor type" value={event.actorType} />
          <AuditDetail label="Resource type" value={event.resourceType} />
          <AuditDetail label="Outcome" value={event.outcome} />
          <AuditDetail label="Request ID" value={event.requestId} />
          <AuditDetail label="Source workspace" value={event.source} />
        </div>
        <div className="mt-6 rounded-xl bg-neutral-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            Decision reason
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            {event.reason}
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {event.related.map((item) => (
            <AuditLink key={`${item.label}-${item.value}`} {...item} />
          ))}
        </div>
      </section>
      <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-950">
          Processing timeline
        </h2>
        <div className="mt-6">
          {event.timeline.map((item, index) => (
            <div key={`${item.title}-${item.date}`} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <History className="size-4" />
                </span>
                {index < event.timeline.length - 1 && (
                  <span className="h-14 w-px bg-neutral-200" />
                )}
              </div>
              <div className="pb-7">
                <p className="text-sm font-bold text-neutral-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  {item.detail}
                </p>
                <p className="mt-1 text-[11px] font-medium text-neutral-400">
                  {item.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function EventChanges({ event }: { event: AuditEvent }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 p-5">
        <h2 className="text-lg font-bold text-neutral-950">
          Field-level changes
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Recorded before and after values for this event.
        </p>
      </div>
      <div className="divide-y divide-neutral-100">
        {event.changes.map((change) => (
          <div
            key={change.field}
            className="grid gap-4 p-5 lg:grid-cols-[190px_minmax(0,1fr)_40px_minmax(0,1fr)] lg:items-center"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                Field
              </p>
              <p className="mt-1 font-mono text-xs font-bold text-neutral-900">
                {change.field}
              </p>
            </div>
            <ChangeValue label="Before" value={change.before} />
            <ChevronRight className="hidden size-4 text-neutral-300 lg:block" />
            <ChangeValue label="After" value={change.after} positive />
            <p className="text-xs leading-5 text-neutral-500 lg:col-start-2 lg:col-span-3">
              {change.impact}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SecurityContext({ event }: { event: AuditEvent }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-neutral-950">
            Authentication context
          </h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AuditDetail label="Session ID" value={event.session} />
          <AuditDetail label="Actor role" value={event.actorRole} />
          <AuditDetail label="Source IP" value={event.ip} />
          <AuditDetail label="Location" value={event.location} />
        </div>
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="size-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-neutral-950">
            Request context
          </h2>
        </div>
        <div className="mt-5 space-y-4">
          <AuditDetail label="Client" value={event.userAgent} />
          <AuditDetail label="Request ID" value={event.requestId} />
          <AuditDetail label="Source service" value={event.source} />
        </div>
      </section>
    </div>
  );
}

function IntegrityContext({
  event,
  onAction,
}: {
  event: AuditEvent;
  onAction: (message: string) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <LockKeyhole className="size-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-neutral-950">
            Tamper-evident chain
          </h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AuditDetail label="Event hash" value={event.integrityHash} />
          <AuditDetail label="Previous event hash" value={event.previousHash} />
          <AuditDetail label="Sequence" value={event.id.replace("AUD-", "")} />
          <AuditDetail label="Verification" value="Hash chain verified" />
        </div>
        <button
          type="button"
          onClick={() =>
            onAction(
              "Event payload, previous hash, and current integrity hash verified successfully.",
            )
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white"
        >
          <ShieldCheck className="size-4" /> Verify this event
        </button>
      </section>
      <aside className="rounded-2xl bg-neutral-950 p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
          Integrity result
        </p>
        <CheckCircle2 className="mt-6 size-10 text-emerald-400" />
        <h2 className="mt-4 text-xl font-bold">Event verified</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          The event payload matches its stored hash and connects to the previous
          audit record without a gap.
        </p>
      </aside>
    </div>
  );
}

function AuditMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-neutral-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function AuditField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-medium text-neutral-700">
        {value}
      </p>
    </div>
  );
}

function DetailHero({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 p-5 sm:border-r last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-neutral-900">
        {value}
      </p>
    </div>
  );
}

function AuditLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-neutral-900">{value}</span>
        <Link2 className="size-4 text-neutral-400" />
      </div>
    </Link>
  );
}

function ChangeValue({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${positive ? "border-emerald-100 bg-emerald-50" : "border-neutral-200 bg-neutral-50"}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-neutral-900">{value}</p>
    </div>
  );
}
