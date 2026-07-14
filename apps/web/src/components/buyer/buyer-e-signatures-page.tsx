"use client";

import { useState } from "react";
import { FileSignature, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { BuyerLayout } from "./buyer-layout";
import {
  signatureEnvelopes,
  type SignatureEnvelope,
  type SignatureAuditEvent,
} from "../contracts/contracts-demo-data";
import {
  AuditTrail,
  ComplianceChecklist,
  ContractViewer,
  SignerList,
  SignatureStatusPill,
} from "../signatures/signature-viewer";

export function BuyerESignaturesPage() {
  const buyerEnvelopes = signatureEnvelopes.filter((envelope) =>
    envelope.signers.some((signer) => signer.role === "Buyer"),
  );
  const [selected, setSelected] = useState<SignatureEnvelope>(buyerEnvelopes[0]);
  const [consent, setConsent] = useState(false);
  const [signed, setSigned] = useState<Record<string, boolean>>({});

  const dynamicEvents: SignatureAuditEvent[] = signed[selected.id]
    ? [
        ...selected.auditTrail,
        {
          time: "Just now",
          actor: "Buyer signer",
          event: "Browser signature completed",
          detail: "Buyer signed in the EcoGlobe browser signing room.",
        },
      ]
    : selected.auditTrail;

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-neutral-50 p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
            Electronic signatures
          </p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            View contracts, sign in-browser, and track every signature event.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Buyer signing room for contract emails, secure browser viewing, electronic consent,
            audit trails, and compliance-ready completion records.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric label="Awaiting buyer" value="1" icon={FileSignature} />
          <Metric label="Viewed links" value="2" icon={UserCheck} />
          <Metric label="Email packages" value="3" icon={Mail} />
          <Metric label="Compliant records" value="2" icon={ShieldCheck} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <h2 className="text-xl font-bold text-neutral-900">Signature requests</h2>
            <div className="mt-4 space-y-3">
              {buyerEnvelopes.map((envelope) => (
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
                      <p className="mt-1 text-sm text-neutral-500">{envelope.id} · expires {envelope.expiresAt}</p>
                    </div>
                    <SignatureStatusPill status={signed[envelope.id] ? "Completed" : envelope.status} />
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-bold text-neutral-900">Recipients</h3>
              <SignerList signers={selected.signers} />
            </div>
          </section>

          <ContractViewer
            envelope={selected}
            selectedRole="Buyer"
            consent={consent}
            onConsentChange={setConsent}
            onSign={() => setSigned((current) => ({ ...current, [selected.id]: true }))}
            signDisabled={!consent || signed[selected.id]}
            signedLabel={signed[selected.id] ? "Buyer Signed" : "Buyer Signature"}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AuditTrail events={dynamicEvents} />
          <ComplianceChecklist compact />
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
