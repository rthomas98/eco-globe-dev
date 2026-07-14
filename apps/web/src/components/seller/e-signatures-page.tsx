"use client";

import { useState } from "react";
import { FileSignature, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { SellerLayout } from "./seller-layout";
import {
  signatureEnvelopes,
  type SignatureEnvelope,
  type SignatureAuditEvent,
} from "../contracts/contracts-demo-data";
import {
  AuditTrail,
  ComplianceChecklist,
  ContractViewer,
  EmailDeliveryPanel,
  SignerList,
  SignatureStatusPill,
} from "../signatures/signature-viewer";

export function SellerESignaturesPage() {
  const sellerEnvelopes = signatureEnvelopes.filter((envelope) =>
    envelope.signers.some((signer) => signer.role === "Seller"),
  );
  const [selected, setSelected] = useState<SignatureEnvelope>(sellerEnvelopes[0]);
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [signed, setSigned] = useState<Record<string, boolean>>({});

  const dynamicEvents: SignatureAuditEvent[] = [
    ...selected.auditTrail,
    ...(sent[selected.id]
      ? [{
          time: "Just now",
          actor: "Seller workspace",
          event: "Signature email sent",
          detail: "Buyer and seller recipients received secure signing links.",
        }]
      : []),
    ...(signed[selected.id]
      ? [{
          time: "Just now",
          actor: "Seller signer",
          event: "Seller browser signature completed",
          detail: "Seller signed in the EcoGlobe browser signing room.",
        }]
      : []),
  ];

  return (
    <SellerLayout title="E-signatures">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
          Electronic signatures
        </p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">
          Send signature emails, sign contracts in-browser, and retain compliance proof.
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Seller workspace for preparing signature envelopes, sending buyer and seller email links,
          signing agreements, and tracking the full audit trail.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="Draft envelopes" value="1" icon={FileSignature} />
        <Metric label="Email sent" value="2" icon={Mail} />
        <Metric label="Seller actions" value="2" icon={UserCheck} />
        <Metric label="Compliant records" value="2" icon={ShieldCheck} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
          <h2 className="text-xl font-bold text-neutral-900">Signature envelopes</h2>
          <div className="mt-4 space-y-3">
            {sellerEnvelopes.map((envelope) => (
              <button
                key={envelope.id}
                type="button"
                onClick={() => {
                  setSelected(envelope);
                  setConsent(false);
                }}
                className={`w-full rounded-2xl p-4 text-left transition hover:bg-neutral-50 ${
                  selected.id === envelope.id ? "bg-neutral-50" : "bg-white"
                }`}
                style={{ border: "1px solid #F0F0F0" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{envelope.subject}</p>
                    <p className="mt-1 text-sm text-neutral-500">{envelope.id} · {envelope.provider}</p>
                  </div>
                  <SignatureStatusPill status={sent[envelope.id] && envelope.status === "Draft" ? "Email sent" : envelope.status} />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-5">
            <h3 className="mb-3 text-sm font-bold text-neutral-900">Signer routing</h3>
            <SignerList signers={selected.signers} />
          </div>
        </section>

        <ContractViewer
          envelope={selected}
          selectedRole="Seller"
          consent={consent}
          onConsentChange={setConsent}
          onSign={() => setSigned((current) => ({ ...current, [selected.id]: true }))}
          signDisabled={!consent || signed[selected.id]}
          signedLabel={signed[selected.id] ? "Seller Signed" : "Seller Signature"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <EmailDeliveryPanel
          envelope={selected}
          sent={sent[selected.id]}
          onSend={() => setSent((current) => ({ ...current, [selected.id]: true }))}
        />
        <AuditTrail events={dynamicEvents} />
      </div>

      <div className="mt-6">
        <ComplianceChecklist />
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
