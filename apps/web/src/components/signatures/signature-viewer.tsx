"use client";

import { CheckCircle2, FileText, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  serviceContracts,
  signatureComplianceRules,
  type SignatureAuditEvent,
  type SignatureEnvelope,
  type SignatureSigner,
} from "../contracts/contracts-demo-data";

export function SignatureStatusPill({ status }: { status: SignatureEnvelope["status"] }) {
  const tone =
    status === "Completed"
      ? "bg-green-50 text-green-700"
      : status === "Declined"
        ? "bg-red-50 text-red-700"
        : status === "Draft"
          ? "bg-neutral-100 text-neutral-600"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function SignerList({ signers }: { signers: SignatureSigner[] }) {
  return (
    <div className="space-y-3">
      {signers.map((signer) => (
        <div key={`${signer.role}-${signer.email}`} className="rounded-xl bg-neutral-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {signer.name} · {signer.role}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{signer.email}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
              signer.status === "Signed" ? "bg-green-50 text-green-700" : signer.status === "Viewed" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
            }`}>
              {signer.status}
            </span>
          </div>
          {signer.signedAt && <p className="mt-2 text-xs text-neutral-500">Signed {signer.signedAt}</p>}
        </div>
      ))}
    </div>
  );
}

export function ContractViewer({
  envelope,
  selectedRole,
  consent,
  onConsentChange,
  onSign,
  signDisabled,
  signedLabel,
}: {
  envelope: SignatureEnvelope;
  selectedRole: "Buyer" | "Seller";
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  onSign: () => void;
  signDisabled: boolean;
  signedLabel: string;
}) {
  const contract = serviceContracts.find((item) => item.id === envelope.contractId) ?? serviceContracts[0];

  return (
    <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Browser signing room</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Secure contract viewer for {selectedRole.toLowerCase()} e-signature.
          </p>
        </div>
        <SignatureStatusPill status={envelope.status} />
      </div>

      <div className="rounded-2xl bg-neutral-950 p-4 text-white">
        <div className="mb-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <FileText className="size-5" />
            <div>
              <p className="text-sm font-semibold">{envelope.subject}</p>
              <p className="text-xs text-white/60">{envelope.contractId} · {contract.template}</p>
            </div>
          </div>
          <LockKeyhole className="size-5 text-green-300" />
        </div>

        <div className="rounded-xl bg-white p-6 text-neutral-900">
          <div className="mb-5 flex items-center justify-between border-b border-neutral-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Service contract
              </p>
              <h3 className="mt-1 text-2xl font-bold">{contract.product}</h3>
            </div>
            <p className="font-mono text-sm text-neutral-500">{envelope.id}</p>
          </div>

          <div className="grid gap-4 text-sm md:grid-cols-2">
            <ViewerLine label="Buyer" value={contract.buyer} />
            <ViewerLine label="Seller" value={contract.seller} />
            <ViewerLine label="Supply commitment" value={contract.volume} />
            <ViewerLine label="Commercial terms" value={`${contract.price} · ${contract.term}`} />
            <ViewerLine label="Payment terms" value={contract.paymentTerms} />
            <ViewerLine label="Delivery frequency" value={contract.deliveryFrequency} />
          </div>

          <div className="mt-5 rounded-xl bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">Signature field</p>
            <p className="mt-1 text-sm text-neutral-600">
              By signing as {selectedRole}, I confirm authority to execute this agreement,
              accept electronic signature terms, and agree to the listed contract terms.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
              <p className="font-serif text-2xl text-neutral-900">{signedLabel}</p>
              <p className="mt-1 text-xs text-neutral-500">{selectedRole} authorized signature</p>
            </div>
          </div>
        </div>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
          className="mt-1"
        />
        I agree to sign electronically and understand this creates an auditable signature record.
      </label>

      <Button
        type="button"
        variant={signDisabled ? "secondary" : "primary"}
        size="md"
        disabled={signDisabled}
        onClick={onSign}
        className="mt-4 w-full"
      >
        {signDisabled ? "Signature recorded" : `Apply ${selectedRole.toLowerCase()} signature`}
      </Button>
    </section>
  );
}

export function EmailDeliveryPanel({
  envelope,
  onSend,
  sent,
}: {
  envelope: SignatureEnvelope;
  onSend: () => void;
  sent: boolean;
}) {
  return (
    <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-4 flex items-center gap-2">
        <Mail className="size-5 text-neutral-500" />
        <h2 className="text-xl font-bold text-neutral-900">Email delivery</h2>
      </div>
      <p className="text-sm text-neutral-500">
        Send secure signing links to every required buyer and seller recipient.
      </p>
      <div className="mt-4 space-y-3">
        {envelope.signers.map((signer) => (
          <div key={signer.email} className="rounded-xl bg-neutral-50 p-3">
            <p className="text-sm font-semibold text-neutral-900">{signer.email}</p>
            <p className="mt-1 text-xs text-neutral-500">{signer.role} signer · {signer.status}</p>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant={sent ? "secondary" : "primary"}
        size="md"
        onClick={onSend}
        className="mt-4 w-full"
      >
        {sent ? "Email package sent" : "Send signature email"}
      </Button>
    </section>
  );
}

export function AuditTrail({ events }: { events: SignatureAuditEvent[] }) {
  return (
    <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      <h2 className="text-xl font-bold text-neutral-900">Audit trail</h2>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <div key={`${event.time}-${event.event}`} className="flex gap-3 rounded-xl bg-neutral-50 p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-neutral-500" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">{event.event}</p>
              <p className="mt-1 text-sm text-neutral-600">{event.detail}</p>
              <p className="mt-2 text-xs text-neutral-500">{event.actor} · {event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ComplianceChecklist({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="size-5 text-green-700" />
        <h2 className="text-xl font-bold text-neutral-900">Compliance tracking</h2>
      </div>
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {signatureComplianceRules.map((rule) => (
          <div key={rule} className="flex items-start gap-3 rounded-xl bg-green-50 p-3 text-green-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p className="text-sm font-medium">{rule}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ViewerLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-medium text-neutral-900">{value}</p>
    </div>
  );
}
