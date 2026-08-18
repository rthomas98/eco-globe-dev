"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileSignature, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { useDemoUser } from "@/lib/demo-user";
import {
  createDocusignSigningView,
  loadSignatureWorkspace,
  sendContractForDocusign,
  type BackendContract,
  type BackendSignature,
} from "@/lib/docusign-client";

type WorkspaceRole = "buyer" | "seller";

const statusLabels: Record<string, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
};

export function LiveSignatureWorkspace({ role }: { role: WorkspaceRole }) {
  const user = useDemoUser();
  const [contracts, setContracts] = useState<BackendContract[]>([]);
  const [signatures, setSignatures] = useState<BackendSignature[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const refresh = useCallback(async () => {
    setError(undefined);
    try {
      const result = await loadSignatureWorkspace();
      setContracts(result.contracts);
      setSignatures(result.signatures);
      setSelectedContractId((current) => current ?? result.contracts[0]?.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load signature requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("docusign") !== "return") return;
    const event = params.get("event");
    setNotice(
      event === "decline"
        ? "You returned from DocuSign without signing. EcoGlobe will refresh the signer status when DocuSign confirms it."
        : event === "cancel" || event === "session_timeout" || event === "ttl_expired"
          ? "The DocuSign session ended before completion. You can open a new signing session after the status refreshes."
          : "DocuSign received your action. EcoGlobe is waiting for secure confirmation before marking the signature complete.",
    );
    const firstRefresh = window.setTimeout(() => { void refresh(); }, 2_000);
    const secondRefresh = window.setTimeout(() => { void refresh(); }, 6_000);
    return () => {
      window.clearTimeout(firstRefresh);
      window.clearTimeout(secondRefresh);
    };
  }, [refresh]);

  const selectedContract = contracts.find((contract) => contract.id === selectedContractId);
  const selectedSignatures = useMemo(
    () => signatures.filter((signature) => signature.contractId === selectedContractId),
    [selectedContractId, signatures],
  );
  const mySignature = selectedSignatures.find((signature) => signature.signerUserId === user?.id);
  const buyerSigners = selectedContract
    ? selectedSignatures.filter((signature) => signature.signerCompanyId === selectedContract.buyerCompanyId)
    : [];
  const sellerSigners = selectedContract
    ? selectedSignatures.filter((signature) => signature.signerCompanyId === selectedContract.sellerCompanyId)
    : [];
  const signersReady =
    buyerSigners.length === 1 &&
    sellerSigners.length === 1 &&
    selectedSignatures.every((signature) => signature.signatureStatusCode === "not_sent");
  const contractCanSend =
    Boolean(selectedContract) &&
    !selectedContract?.providerEnvelopeId &&
    ["draft", "signature_pending"].includes(selectedContract?.contractStatusCode ?? "") &&
    signersReady;
  const signedCount = signatures.filter((signature) => signature.signatureStatusCode === "signed").length;
  const waitingCount = signatures.filter((signature) => ["sent", "viewed"].includes(signature.signatureStatusCode)).length;

  async function sendEnvelope() {
    if (!selectedContract) return;
    setBusy("send");
    setError(undefined);
    setNotice(undefined);
    try {
      await sendContractForDocusign(selectedContract.id);
      setNotice("DocuSign emailed the buyer and seller. Their signing buttons are now available.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send the DocuSign envelope.");
    } finally {
      setBusy(undefined);
    }
  }

  async function openSigning() {
    if (!mySignature) return;
    setBusy("sign");
    setError(undefined);
    try {
      const returnUrl = `${window.location.origin}/${role}/e-signatures?docusign=return`;
      const result = await createDocusignSigningView(mySignature.id, returnUrl);
      window.location.assign(result.signingUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open DocuSign.");
      setBusy(undefined);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700">DocuSign eSignature</p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Send, sign, and track agreements securely.</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          DocuSign handles the signing ceremony. EcoGlobe updates the contract only after a verified DocuSign event and retains the completed agreement and certificate.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="Contracts" value={String(contracts.length)} icon={FileSignature} />
        <Metric label="Waiting on signatures" value={String(waitingCount)} icon={Clock3} />
        <Metric label="Completed signatures" value={String(signedCount)} icon={ShieldCheck} />
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</div>}

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-sm text-neutral-500">Loading contracts and signers…</div>
      ) : contracts.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid #F0F0F0" }}>
          <FileSignature className="mx-auto size-8 text-neutral-400" />
          <h2 className="mt-3 text-lg font-bold text-neutral-900">No contracts are ready for signature</h2>
          <p className="mt-2 text-sm text-neutral-500">Create the contract and assign one buyer and one seller signer first.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-neutral-900">Contracts</h2>
              <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 size-4" /> Refresh</Button>
            </div>
            <div className="mt-4 space-y-3">
              {contracts.map((contract) => (
                <button key={contract.id} type="button" onClick={() => setSelectedContractId(contract.id)}
                  className={`w-full rounded-xl border p-4 text-left ${selectedContractId === contract.id ? "border-green-500 bg-green-50" : "border-neutral-200 bg-white"}`}>
                  <p className="font-semibold text-neutral-900">{contract.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{contract.buyerCompanyName} ↔ {contract.sellerCompanyName}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">{contract.contractStatusCode.replaceAll("_", " ")}</p>
                </button>
              ))}
            </div>
          </section>

          {selectedContract && (
            <section className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Contract #{selectedContract.id}</p><h2 className="mt-2 text-2xl font-bold text-neutral-900">{selectedContract.title}</h2></div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-700">
                  {selectedContract.providerEnvelopeId ? "DocuSign sent" : selectedContract.contractStatusCode.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {selectedSignatures.length === 0 && (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    Assign one buyer signer and one seller signer before sending this contract.
                  </p>
                )}
                {selectedSignatures.map((signature) => (
                  <div key={signature.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-4">
                    <div><p className="text-sm font-semibold text-neutral-900">{signature.signerUserName}</p><p className="mt-1 text-xs text-neutral-500">{signature.signerCompanyName}</p></div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700">{statusLabels[signature.signatureStatusCode] || signature.signatureStatusCode}</span>
                  </div>
                ))}
              </div>

              {!selectedContract.providerEnvelopeId && !contractCanSend && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  {!["draft", "signature_pending"].includes(selectedContract.contractStatusCode)
                    ? "This contract is not in a sendable state. Only draft or signature-pending contracts can start a DocuSign envelope."
                    : "DocuSign requires exactly one buyer signer and one seller signer, both marked Not sent."}
                </p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="primary" size="md" disabled={!contractCanSend || busy === "send"} onClick={() => void sendEnvelope()}>
                  <Send className="mr-2 size-4" />{selectedContract.providerEnvelopeId ? "Envelope sent" : !contractCanSend ? "Not ready to send" : busy === "send" ? "Sending…" : "Send with DocuSign"}
                </Button>
                <Button type="button" variant="secondary" size="md" disabled={!mySignature?.providerEnvelopeId || mySignature.signatureStatusCode === "signed" || busy === "sign"} onClick={() => void openSigning()}>
                  <FileSignature className="mr-2 size-4" />{mySignature?.signatureStatusCode === "signed" ? "Signature complete" : busy === "sign" ? "Opening…" : "Sign with DocuSign"}
                </Button>
              </div>

              {selectedContract.signedDocumentUrl && selectedContract.providerName === "docusign" && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-green-800"><CheckCircle2 className="size-4" />Completed and archived</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <a className="font-semibold text-green-800 underline" href={`/api/backend/api/contracts/${selectedContract.id}/docusign-documents/agreement`} target="_blank" rel="noreferrer">Signed agreement</a>
                    {selectedContract.completionCertificateUrl && <a className="font-semibold text-green-800 underline" href={`/api/backend/api/contracts/${selectedContract.id}/docusign-documents/certificate`} target="_blank" rel="noreferrer">Certificate</a>}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}><div className="mb-4 flex items-center justify-between"><span className="text-sm text-neutral-500">{label}</span><Icon className="size-5 text-neutral-400" /></div><p className="text-2xl font-bold text-neutral-900">{value}</p></div>;
}
