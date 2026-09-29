"use client";

import { useDemoUser } from "@/lib/demo-user";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSignature, Search } from "lucide-react";
import { loadSignatureWorkspace, type BackendContract, type BackendSignature } from "@/lib/docusign-client";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";

type LedgerRole = "buyer" | "admin";

const CONTRACT_STATUS: Record<string, string> = {
  draft: "Draft",
  signature_pending: "Signature pending",
  active: "Active",
  renewal_due: "Renewal due",
  declined: "Declined",
  voided: "Voided",
  expired: "Expired",
};

const SIGNATURE_STATUS: Record<string, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
};

function label(map: Record<string, string>, code: string) {
  return map[code] ?? code.replace(/_/g, " ");
}

function date(value?: string) {
  return value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

/**
 * Contracts and signer status recorded by the backend (DocuSign sandbox
 * envelopes included). Signing itself happens in the E-signatures workspace.
 */
export function ContractsLedger({
  role,
  view,
  highlightId,
}: {
  role: LedgerRole;
  view: "contracts" | "signatures";
  highlightId?: string;
}) {
  const companyId = useDemoUser()?.activeCompanyId;
  const workspace = useBackendData(loadSignatureWorkspace, [companyId], "Contracts could not be loaded.");
  const [query, setQuery] = useState("");

  const signaturesByContract = useMemo(() => {
    const map = new Map<number, BackendSignature[]>();
    for (const s of workspace.data?.signatures ?? []) map.set(s.contractId, [...(map.get(s.contractId) ?? []), s]);
    return map;
  }, [workspace.data]);

  const q = query.trim().toLowerCase();
  const contracts = (workspace.data?.contracts ?? []).filter(
    (c) => !q || `CTR-${c.id} ${c.title} ${c.buyerCompanyName} ${c.sellerCompanyName}`.toLowerCase().includes(q),
  );
  const signatures = (workspace.data?.signatures ?? []).filter(
    (s) => !q || `CTR-${s.contractId} ${s.signerUserName} ${s.signerCompanyName}`.toLowerCase().includes(q),
  );

  const title = view === "contracts" ? "Contracts" : "E-signatures";
  const signingHref = role === "buyer" ? "/buyer/e-signatures" : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
              {view === "contracts" ? "CONTRACTS" : "SIGNATURES"}
            </p>
            <h1 className="text-3xl font-bold text-neutral-950">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              {view === "contracts"
                ? "Agreements recorded for marketplace orders and their signing status."
                : "Signer status for every agreement sent through DocuSign."}
              {workspace.data && !workspace.data.ready && " DocuSign is not configured in this environment."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[220px] items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-neutral-200">
              <Search className="size-4 text-neutral-400" />
              <input
                type="search"
                aria-label={`Search ${title.toLowerCase()}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
            {signingHref && (
              <Link
                href={signingHref}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white"
              >
                <FileSignature className="size-4" />
                Open signing workspace
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-neutral-200">
          <DataBoundary
            state={workspace}
            loadingLabel="Loading contracts…"
            isEmpty={() => (view === "contracts" ? contracts.length === 0 : signatures.length === 0)}
            empty={{
              title:
                (view === "contracts" ? workspace.data?.contracts : workspace.data?.signatures)?.length === 0
                  ? view === "contracts"
                    ? "No contracts yet"
                    : "No signature requests yet"
                  : "Nothing matches your search",
              description:
                view === "contracts" ? "Contracts appear when a seller prepares an agreement for an order." : undefined,
            }}
          >
            {() =>
              view === "contracts" ? (
                <ContractTable contracts={contracts} signaturesByContract={signaturesByContract} highlightId={highlightId} />
              ) : (
                <SignatureTable signatures={signatures} highlightId={highlightId} />
              )
            }
          </DataBoundary>
        </div>
      </div>
    </div>
  );
}

function ContractTable({
  contracts,
  signaturesByContract,
  highlightId,
}: {
  contracts: BackendContract[];
  signaturesByContract: Map<number, BackendSignature[]>;
  highlightId?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <th className="px-5 py-3">Contract</th>
            <th className="px-5 py-3">Buyer</th>
            <th className="px-5 py-3">Seller</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Signers</th>
            <th className="px-5 py-3">Archive</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => {
            const signers = signaturesByContract.get(c.id) ?? [];
            const signed = signers.filter((s) => s.signatureStatusCode === "signed").length;
            return (
              <tr
                key={c.id}
                style={{ borderBottom: "1px solid #F8F8F8" }}
                className={highlightId === String(c.id) || highlightId === `CTR-${c.id}` ? "bg-emerald-50" : "hover:bg-neutral-50"}
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium text-neutral-900">{c.title}</p>
                  <p className="font-mono text-xs text-neutral-500">CTR-{c.id}</p>
                </td>
                <td className="px-5 py-3.5 text-neutral-700">{c.buyerCompanyName}</td>
                <td className="px-5 py-3.5 text-neutral-700">{c.sellerCompanyName}</td>
                <td className="px-5 py-3.5 text-neutral-700">
                  {label(CONTRACT_STATUS, c.contractStatusCode)}
                  {c.completedAt && <span className="block text-xs text-neutral-500">Completed {date(c.completedAt)}</span>}
                </td>
                <td className="px-5 py-3.5 text-neutral-700">
                  {signers.length ? `${signed} of ${signers.length} signed` : "Not sent"}
                </td>
                <td className="px-5 py-3.5">
                  {c.signedDocumentUrl && c.providerName === "docusign" ? (
                    <div className="flex flex-col gap-1">
                      <a className="inline-flex items-center gap-1 font-semibold text-green-800 underline" href={`/api/backend/api/contracts/${c.id}/docusign-documents/agreement`} target="_blank" rel="noreferrer">
                        <CheckCircle2 className="size-3.5" /> Signed agreement
                      </a>
                      {c.completionCertificateUrl && (
                        <a className="font-semibold text-green-800 underline" href={`/api/backend/api/contracts/${c.id}/docusign-documents/certificate`} target="_blank" rel="noreferrer">
                          Certificate
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SignatureTable({ signatures, highlightId }: { signatures: BackendSignature[]; highlightId?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <th className="px-5 py-3">Contract</th>
            <th className="px-5 py-3">Signer</th>
            <th className="px-5 py-3">Company</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Sent</th>
            <th className="px-5 py-3">Signed</th>
          </tr>
        </thead>
        <tbody>
          {signatures.map((s) => (
            <tr
              key={s.id}
              style={{ borderBottom: "1px solid #F8F8F8" }}
              className={highlightId === String(s.id) ? "bg-emerald-50" : "hover:bg-neutral-50"}
            >
              <td className="px-5 py-3.5 font-mono text-xs text-neutral-700">CTR-{s.contractId}</td>
              <td className="px-5 py-3.5 text-neutral-900">{s.signerUserName}</td>
              <td className="px-5 py-3.5 text-neutral-700">{s.signerCompanyName}</td>
              <td className="px-5 py-3.5 text-neutral-700">{label(SIGNATURE_STATUS, s.signatureStatusCode)}</td>
              <td className="px-5 py-3.5 text-neutral-700">{date(s.sentAt)}</td>
              <td className="px-5 py-3.5 text-neutral-700">{s.signedAt ? date(s.signedAt) : s.declinedAt ? `Declined ${date(s.declinedAt)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
