"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileSignature,
  Fingerprint,
  Link2,
  Mail,
  RadioTower,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import {
  serviceContracts,
  signatureComplianceRules,
  signatureEnvelopes,
  type SignatureEnvelope,
} from "../contracts/contracts-demo-data";
import {
  AuditTrail,
  SignerList,
  SignatureStatusPill,
} from "../signatures/signature-viewer";

type EnvelopeFilter = "all" | "pending" | "review" | "completed";
type DetailTab = "Overview" | "Signers" | "Compliance" | "Audit";

export function AdminESignaturesPage({ envelopeId }: { envelopeId?: string }) {
  const envelope = signatureEnvelopes.find((item) => item.id === envelopeId);
  if (envelopeId && envelope) return <EnvelopeDetail envelope={envelope} />;
  return <SignatureOperationsHome />;
}

function SignatureOperationsHome() {
  const router = useRouter();
  const [filter, setFilter] = useState<EnvelopeFilter>("all");
  const [query, setQuery] = useState("");
  const [providerOpen, setProviderOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const visible = useMemo(
    () =>
      signatureEnvelopes.filter((envelope) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "pending" && envelope.status !== "Completed") ||
          (filter === "review" && envelope.compliance === "Review needed") ||
          (filter === "completed" && envelope.status === "Completed");
        const haystack =
          `${envelope.id} ${envelope.contractId} ${envelope.subject} ${envelope.status} ${envelope.signers.map((signer) => signer.name).join(" ")}`.toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [filter, query],
  );
  const pendingCount = signatureEnvelopes.filter(
    (item) => item.status !== "Completed",
  ).length;
  const reviewCount = signatureEnvelopes.filter(
    (item) => item.compliance === "Review needed",
  ).length;

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
            E-SIGNATURE OPERATIONS
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-neutral-950">
            Control signature delivery, signer progress, evidence, and
            compliance.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Monitor every contract envelope from email delivery through final
            retention, resolve stalled signers, and protect the legal audit
            trail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setProviderOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Settings2 className="size-4" /> Configure provider
        </button>
      </div>

      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      <section className="mt-6 rounded-3xl bg-neutral-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_620px] xl:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              <RadioTower className="size-4" /> EcoSign provider online
            </p>
            <h2 className="mt-4 text-2xl font-black sm:text-3xl">
              Move every agreement from sent to legally complete.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
              Delivery, consent, identity, device, IP, timestamp, and completion
              evidence are retained in one operating record.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroMetric value="99.98%" label="Uptime" />
            <HeroMetric value="42 sec" label="Median send" />
            <HeroMetric value="3.8 hrs" label="Median sign" />
            <HeroMetric value="100%" label="Evidence retained" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Open envelopes"
          value={String(pendingCount)}
          icon={FileSignature}
          detail="Across buyer and seller workflows"
        />
        <Metric
          label="Email deliveries"
          value="18"
          icon={Mail}
          detail="17 delivered · 1 pending"
        />
        <Metric
          label="Compliance review"
          value={String(reviewCount)}
          icon={AlertTriangle}
          detail="Attachment evidence required"
        />
        <Metric
          label="Provider uptime"
          value="99.98%"
          icon={RadioTower}
          detail="Within operating target"
        />
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-950">
              Signature envelopes
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Open a record to manage signers, reminders, compliance, and
              evidence.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <label className="relative min-w-56 flex-1 sm:max-w-xs">
              <span className="sr-only">Search signature envelopes</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search envelope or signer"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"
              />
            </label>
            <select
              aria-label="Filter signature envelopes"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as EnvelopeFilter)
              }
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700"
            >
              <option value="all">All envelopes</option>
              <option value="pending">Pending signatures</option>
              <option value="review">Compliance review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="pb-3 font-semibold">Envelope</th>
                <th className="pb-3 font-semibold">Subject</th>
                <th className="pb-3 font-semibold">Signers</th>
                <th className="pb-3 font-semibold">Sent</th>
                <th className="pb-3 font-semibold">Compliance</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((envelope) => (
                <tr key={envelope.id} className="hover:bg-neutral-50">
                  <td className="py-4">
                    <p className="font-mono font-bold text-neutral-900">
                      {envelope.id}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {envelope.contractId}
                    </p>
                  </td>
                  <td className="py-4 font-semibold text-neutral-700">
                    {envelope.subject}
                  </td>
                  <td className="py-4 text-neutral-600">
                    {
                      envelope.signers.filter(
                        (signer) => signer.status === "Signed",
                      ).length
                    }
                    /{envelope.signers.length} signed
                  </td>
                  <td className="py-4 text-neutral-600">{envelope.sentAt}</td>
                  <td className="py-4">
                    <ComplianceBadge status={envelope.compliance} />
                  </td>
                  <td className="py-4">
                    <SignatureStatusPill status={envelope.status} />
                  </td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/e-signatures/${envelope.id}`)
                      }
                      aria-label={`Open ${envelope.id}`}
                      className="rounded-full bg-neutral-950 px-3 py-2 text-xs font-bold text-white"
                    >
                      View envelope
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="rounded-xl bg-neutral-50 p-10 text-center text-sm text-neutral-500">
              No envelopes match this search and filter.
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-black text-neutral-950">
            Delivery performance
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <DeliveryMetric
              label="Delivered"
              value="94.4%"
              detail="17 of 18 emails"
            />
            <DeliveryMetric
              label="Opened"
              value="88.9%"
              detail="16 recipient sessions"
            />
            <DeliveryMetric
              label="Completed"
              value="72.2%"
              detail="13 full packets"
            />
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            <h2 className="text-lg font-black text-neutral-950">
              Evidence policy
            </h2>
          </div>
          <div className="mt-4 space-y-2">
            {signatureComplianceRules.slice(0, 3).map((rule) => (
              <div
                key={rule}
                className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                {rule}
              </div>
            ))}
          </div>
        </section>
      </div>

      {providerOpen && (
        <ProviderDialog
          onClose={() => setProviderOpen(false)}
          onSave={() => {
            setProviderOpen(false);
            setNotice(
              "EcoSign provider settings saved and connection revalidated.",
            );
          }}
        />
      )}
    </div>
  );
}

function EnvelopeDetail({ envelope }: { envelope: SignatureEnvelope }) {
  const router = useRouter();
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [notice, setNotice] = useState("");
  const [rechecking, setRechecking] = useState(false);
  const [voided, setVoided] = useState(false);
  const contract = serviceContracts.find(
    (item) => item.id === envelope.contractId,
  );
  const signedCount = envelope.signers.filter(
    (signer) => signer.status === "Signed",
  ).length;

  const recheck = () => {
    setRechecking(true);
    window.setTimeout(() => {
      setRechecking(false);
      setNotice(
        "Compliance evidence rechecked. Identity, consent, device, IP, and retention controls passed.",
      );
    }, 400);
  };

  return (
    <div className="min-h-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.push("/admin/e-signatures")}
        className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-neutral-950"
      >
        <ArrowLeft className="size-4" />
        Back to e-signatures
      </button>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              {envelope.id}
            </p>
            <SignatureStatusPill
              status={voided ? "Declined" : envelope.status}
            />
            <ComplianceBadge status={envelope.compliance} />
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
            {envelope.subject}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {envelope.contractId} · {envelope.provider} · expires{" "}
            {envelope.expiresAt}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setVoided(true);
              setNotice(
                "Envelope voided and all active signing links disabled.",
              );
            }}
            disabled={voided || envelope.status === "Completed"}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 disabled:opacity-40"
          >
            Void envelope
          </button>
          <button
            type="button"
            onClick={() => setNotice("Reminder sent to every waiting signer.")}
            disabled={voided || envelope.status === "Completed"}
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            <Send className="size-4" />
            Send reminder
          </button>
        </div>
      </div>
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Signer progress"
          value={`${signedCount}/${envelope.signers.length}`}
          icon={UserCheck}
          detail="Required signatures complete"
        />
        <Metric
          label="Delivery"
          value={envelope.sentAt === "Not sent" ? "Draft" : "Delivered"}
          icon={Mail}
          detail={envelope.sentAt}
        />
        <Metric
          label="Compliance"
          value={envelope.compliance}
          icon={ShieldCheck}
          detail="Evidence policy result"
        />
        <Metric
          label="Device"
          value={envelope.device}
          icon={Fingerprint}
          detail={envelope.ipAddress}
        />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
        {(["Overview", "Signers", "Compliance", "Audit"] as const).map(
          (item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold ${tab === item ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-50"}`}
            >
              {item}
            </button>
          ),
        )}
      </div>

      {tab === "Overview" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <h2 className="text-lg font-black text-neutral-950">
              Envelope summary
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Detail label="Provider" value={envelope.provider} />
              <Detail label="Contract" value={envelope.contractId} />
              <Detail label="Sent" value={envelope.sentAt} />
              <Detail label="Expires" value={envelope.expiresAt} />
              <Detail label="IP address" value={envelope.ipAddress} />
              <Detail label="Device" value={envelope.device} />
            </div>
            {contract && (
              <button
                type="button"
                onClick={() => router.push(`/admin/contracts/${contract.id}`)}
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700"
              >
                <Link2 className="size-4" />
                Open linked contract
              </button>
            )}
          </section>
          <section className="rounded-2xl bg-neutral-950 p-5 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              SIGNING PROGRESS
            </p>
            <p className="mt-3 text-4xl font-black">
              {Math.round((signedCount / envelope.signers.length) * 100)}%
            </p>
            <p className="mt-2 text-sm text-neutral-300">
              {signedCount} of {envelope.signers.length} required signatures
              recorded.
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-emerald-400"
                style={{
                  width: `${(signedCount / envelope.signers.length) * 100}%`,
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setTab("Signers")}
              className="mt-5 w-full rounded-full bg-white px-4 py-2.5 text-sm font-bold text-neutral-950"
            >
              Manage signers
            </button>
          </section>
        </div>
      )}
      {tab === "Signers" && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                Required signers
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Identity, delivery, viewing, and signature state.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Secure signing links copied for authorized admin use.",
                )
              }
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700"
            >
              <Link2 className="size-3.5" />
              Copy links
            </button>
          </div>
          <div className="mt-5">
            <SignerList signers={envelope.signers} />
          </div>
        </section>
      )}
      {tab === "Compliance" && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <h2 className="text-lg font-black text-neutral-950">
              Retained evidence
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {signatureComplianceRules.map((rule) => (
                <div
                  key={rule}
                  className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
                >
                  <FileCheck2 className="mt-0.5 size-4 shrink-0" />
                  {rule}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
            <h2 className="font-black text-neutral-950">Compliance action</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Revalidate the complete evidence package against the active
              retention policy.
            </p>
            <button
              type="button"
              onClick={recheck}
              disabled={rechecking}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
            >
              <RefreshCw
                className={`size-4 ${rechecking ? "animate-spin" : ""}`}
              />
              {rechecking ? "Checking…" : "Re-run compliance"}
            </button>
          </section>
        </div>
      )}
      {tab === "Audit" && (
        <div className="mt-6">
          <AuditTrail events={envelope.auditTrail} />
        </div>
      )}
    </div>
  );
}

function ProviderDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [reminders, setReminders] = useState("48 hours");
  return (
    <dialog
      open
      aria-labelledby="provider-title"
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              PROVIDER SETTINGS
            </p>
            <h2
              id="provider-title"
              className="mt-2 text-2xl font-black text-neutral-950"
            >
              Configure EcoSign
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close provider settings"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <Detail label="Connection" value="Active · US signing region" />
          <Detail label="Retention" value="7 years after completion" />
          <label className="block text-sm font-bold text-neutral-800">
            Reminder cadence
            <select
              value={reminders}
              onChange={(event) => setReminders(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3"
            >
              <option>24 hours</option>
              <option>48 hours</option>
              <option>72 hours</option>
            </select>
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
            onClick={onSave}
            className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
          >
            Save settings
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
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

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
    </div>
  );
}
function DeliveryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs font-bold text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}
function ComplianceBadge({
  status,
}: {
  status: SignatureEnvelope["compliance"];
}) {
  const good = status === "Compliant";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${good ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
    >
      {good ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <AlertTriangle className="size-3.5" />
      )}
      {status}
    </span>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-neutral-900">{value}</p>
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
