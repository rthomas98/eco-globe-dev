"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSignature,
  Mail,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { Button, Select } from "@eco-globe/ui";
import {
  signatureComplianceRules,
  signatureEnvelopes,
  type SignatureEnvelope,
} from "../contracts/contracts-demo-data";
import {
  AuditTrail,
  SignerList,
  SignatureStatusPill,
} from "../signatures/signature-viewer";

export function AdminESignaturesPage() {
  const [selected, setSelected] = useState<SignatureEnvelope>(signatureEnvelopes[0]);
  const [rechecked, setRechecked] = useState(false);
  const pendingCount = signatureEnvelopes.filter((item) => item.status !== "Completed").length;
  const reviewCount = signatureEnvelopes.filter((item) => item.compliance === "Review needed").length;

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50">
      <div className="px-8 py-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              E-signature control center
            </p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">
              Monitor email delivery, browser signing, audit trails, and compliance evidence.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-600">
              Platform oversight for electronic signature envelopes across buyer and seller
              contract workflows, including provider health and compliance retention.
            </p>
          </div>
          <Button variant="primary" size="md">Configure provider</Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Open envelopes" value={String(pendingCount)} icon={FileSignature} />
          <Metric label="Email deliveries" value="18" icon={Mail} />
          <Metric label="Compliance review" value={String(reviewCount)} icon={AlertTriangle} />
          <Metric label="Provider uptime" value="99.98%" icon={RadioTower} />
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Signature envelopes</h2>
                <p className="text-sm text-neutral-500">All buyer and seller signing packets.</p>
              </div>
              <Select
                id="admin-signature-filter"
                className="min-w-[190px]"
                options={[
                  { value: "all", label: "All envelopes" },
                  { value: "pending", label: "Pending signatures" },
                  { value: "review", label: "Compliance review" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="text-left text-sm text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
                    <th className="pb-3 font-medium">Envelope</th>
                    <th className="pb-3 font-medium">Contract</th>
                    <th className="pb-3 font-medium">Subject</th>
                    <th className="pb-3 font-medium">Sent</th>
                    <th className="pb-3 font-medium">Compliance</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signatureEnvelopes.map((envelope) => (
                    <tr
                      key={envelope.id}
                      onClick={() => setSelected(envelope)}
                      className={`cursor-pointer text-sm hover:bg-neutral-50 ${
                        selected.id === envelope.id ? "bg-neutral-50" : ""
                      }`}
                      style={{ borderBottom: "1px solid #F8F8F8" }}
                    >
                      <td className="py-4 font-mono text-neutral-900">{envelope.id}</td>
                      <td className="py-4 text-neutral-700">{envelope.contractId}</td>
                      <td className="py-4 text-neutral-700">{envelope.subject}</td>
                      <td className="py-4 text-neutral-700">{envelope.sentAt}</td>
                      <td className="py-4 text-neutral-700">{envelope.compliance}</td>
                      <td className="py-4"><SignatureStatusPill status={envelope.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">Envelope detail</h2>
              <SignatureStatusPill status={selected.status} />
            </div>
            <div className="space-y-4 text-sm">
              <Detail label="Provider" value={selected.provider} />
              <Detail label="IP and device" value={`${selected.ipAddress} · ${selected.device}`} />
              <Detail label="Expires" value={selected.expiresAt} />
              <SignerList signers={selected.signers} />
              <Button
                type="button"
                variant={rechecked ? "secondary" : "primary"}
                size="md"
                onClick={() => setRechecked(true)}
                className="w-full"
              >
                {rechecked ? "Compliance recheck complete" : "Re-run compliance check"}
              </Button>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AuditTrail events={selected.auditTrail} />
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="size-5 text-green-700" />
              <h2 className="text-xl font-bold text-neutral-900">Compliance controls</h2>
            </div>
            <div className="space-y-3">
              {signatureComplianceRules.map((rule) => (
                <div key={rule} className="flex items-start gap-3 rounded-xl bg-green-50 p-3 text-green-800">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <p className="text-sm font-medium">{rule}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
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
