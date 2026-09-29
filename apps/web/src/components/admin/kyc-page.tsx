"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shield, Filter, FileText, Download } from "lucide-react";
import { portalDate } from "@/lib/api-portal";
import { describeBackendError } from "@/lib/backend-client";
import {
  decideVerification,
  fetchCompanyVerification,
  fetchVerificationQueue,
  type VerificationDecision,
  type VerificationQueueRow,
} from "@/lib/api-verification";
import { downloadVaultDocument } from "@/lib/api-documents";
import { DataBoundary, ErrorState, LoadingState, useBackendData } from "@/components/shared/data-state";

type Stage = "Pending" | "Verified" | "Suspended" | "Other";

const STAGES: Array<Stage | "All"> = ["All", "Pending", "Verified", "Suspended", "Other"];

function stageOf(row: VerificationQueueRow): Stage {
  if (row.status === "pending_verification") return "Pending";
  if (row.status === "verified") return "Verified";
  if (row.status === "suspended") return "Suspended";
  return "Other";
}

const STAGE_LABEL: Record<Stage, string> = {
  Pending: "Pending verification",
  Verified: "Verified",
  Suspended: "Suspended",
  Other: "Other",
};

export function AdminKycPage() {
  const queue = useBackendData(fetchVerificationQueue, [], "The verification queue could not be loaded.");
  const [filter, setFilter] = useState<Stage | "All">("Pending");
  const [openId, setOpenId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result: Record<Stage, number> = { Pending: 0, Verified: 0, Suspended: 0, Other: 0 };
    for (const row of queue.data ?? []) result[stageOf(row)] += 1;
    return result;
  }, [queue.data]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">KYC verifications</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Review submitted company evidence. Approval requires uploaded evidence and a review
              note; decisions are saved before they appear here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-neutral-500" />
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filter === s ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                  style={filter !== s ? { border: "1px solid #E0E0E0" } : undefined}
                >
                  {s}
                  {s !== "All" && queue.data ? ` (${counts[s]})` : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        {notice && (
          <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          <DataBoundary
            state={queue}
            loadingLabel="Loading verification queue…"
            isEmpty={(rows) => rows.filter((r) => filter === "All" || stageOf(r) === filter).length === 0}
            empty={{
              title: filter === "All" ? "No companies yet" : `No ${filter.toLowerCase()} companies`,
              description: "Companies appear here once they register on EcoGlobe.",
            }}
          >
            {(rows) => {
              const visible = rows.filter((r) => filter === "All" || stageOf(r) === filter);
              return visible.map((row, i) => (
                <div key={row.companyId} style={{ borderBottom: i === visible.length - 1 ? undefined : "1px solid #F4F4F5" }}>
                  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
                    <Shield className="mt-1 hidden size-5 text-neutral-500 sm:block" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-neutral-500">CO-{row.companyId}</span>
                        <StageBadge stage={stageOf(row)} />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">{row.companyName}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {row.documentCount} evidence document{row.documentCount === 1 ? "" : "s"}
                        {row.submittedAt ? ` · last upload ${portalDate(row.submittedAt)}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-expanded={openId === row.companyId}
                      onClick={() => setOpenId(openId === row.companyId ? null : row.companyId)}
                      className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
                      style={{ border: "1px solid #E0E0E0" }}
                    >
                      {openId === row.companyId ? "Close review" : "Review"}
                    </button>
                  </div>
                  {openId === row.companyId && (
                    <ReviewPanel
                      row={row}
                      onDecided={(message) => {
                        setNotice(message);
                        setOpenId(null);
                        queue.reload();
                      }}
                    />
                  )}
                </div>
              ));
            }}
          </DataBoundary>
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({ row, onDecided }: { row: VerificationQueueRow; onDecided: (message: string) => void }) {
  const evidence = useBackendData(
    () => fetchCompanyVerification(row.companyId),
    [row.companyId],
    "Evidence could not be loaded.",
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: VerificationDecision) => {
    if (!note.trim()) {
      setError("Add a review note before recording a decision.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await decideVerification(row.companyId, decision, note.trim());
      onDecided(
        `${row.companyName}: ${
          decision === "approved" ? "verified" : decision === "rejected" ? "rejected" : "more information requested"
        }.`,
      );
    } catch (err) {
      setError(describeBackendError(err, "The decision was not saved."));
    } finally {
      setBusy(false);
    }
  };

  const detailHref = `/admin/sellers/${row.companyId}`;
  return (
    <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4">
      <h3 className="text-sm font-semibold text-neutral-900">Submitted evidence</h3>
      {evidence.status === "loading" && <LoadingState label="Loading evidence…" />}
      {evidence.status === "error" && <ErrorState message={evidence.error ?? ""} onRetry={evidence.reload} />}
      {evidence.data && evidence.data.evidence.length === 0 && (
        <p className="mt-2 text-sm text-neutral-500">No evidence has been uploaded. Approval is not possible yet.</p>
      )}
      {evidence.data && evidence.data.evidence.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {evidence.data.evidence.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-neutral-200">
              <FileText className="size-4 text-neutral-400" />
              <span className="min-w-0 flex-1 truncate">{doc.fileName}</span>
              <span className="text-xs capitalize text-neutral-500">{doc.evidenceType}</span>
              <span className="text-xs text-neutral-500">{portalDate(doc.createdAt)}</span>
              <button
                type="button"
                aria-label={`Download ${doc.fileName}`}
                onClick={() =>
                  void downloadVaultDocument(doc).catch((err) =>
                    setError(describeBackendError(err, "The download failed.")),
                  )
                }
                className="flex size-7 items-center justify-center rounded-full ring-1 ring-neutral-200 hover:bg-neutral-100"
              >
                <Download className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="mt-4 flex flex-col gap-1 text-xs font-medium text-neutral-700">
        Review note (required)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-neutral-200"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => void decide("needs_information")} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 ring-1 ring-neutral-300 disabled:opacity-50">
          Request information
        </button>
        <button type="button" disabled={busy} onClick={() => void decide("rejected")} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50">
          Reject
        </button>
        <button
          type="button"
          disabled={busy || !evidence.data || evidence.data.evidence.length === 0}
          onClick={() => void decide("approved")}
          className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : "Approve"}
        </button>
        <Link href={detailHref} className="ml-auto text-xs font-semibold text-neutral-700 underline">
          Company record
        </Link>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  const tone: Record<Stage, { bg: string; fg: string }> = {
    Pending: { bg: "#DBEAFE", fg: "#1E40AF" },
    Verified: { bg: "#DCFCE7", fg: "#166534" },
    Suspended: { bg: "#FEE2E2", fg: "#991B1B" },
    Other: { bg: "#F4F4F5", fg: "#3F3F46" },
  };
  const t = tone[stage];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>
      {STAGE_LABEL[stage]}
    </span>
  );
}
