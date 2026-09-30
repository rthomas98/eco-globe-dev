"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import { useDemoUser } from "@/lib/demo-user";
import {
  fetchRefunds,
  formatRefundDate,
  formatRefundMoney,
  isRefundsUnavailable,
  processRefundReminders,
  refundSourceLabel,
  type RefundCase,
  type RefundRole,
} from "@/lib/api-refunds";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { RefundCaseView } from "./refund-case-view";
import { refundBasePath, RefundPolicyNote, RefundStatusBadge } from "./refund-ui";

const INTRO: Record<RefundRole, string> = {
  buyer: "Refund requests your company has made, and any information EcoGlobe staff need from you.",
  seller: "Refund requests on your sales. EcoGlobe staff may ask you for information before deciding.",
  admin: "Refund cases across the marketplace, including sample-shipping cases the system opened automatically.",
};

/** Refund case list for the buyer, seller or admin portal. */
export function RefundCasesPage({ role }: { role: RefundRole }) {
  const [status, setStatus] = useState<"open" | "all">("open");
  const user = useDemoUser();
  // Company roles are scoped to the active company; re-read when it changes.
  const scope = role === "admin" ? "admin" : (user?.activeCompanyId ?? null);
  const list = useBackendData(() => fetchRefunds(role, status), [role, status, scope], "Refund cases could not be loaded.");
  const unavailable = list.status === "error" && isRefundsUnavailable(list.rawError);
  const base = refundBasePath(role);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
              {role === "admin" ? "Refund queue" : "Refunds"}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-500">{INTRO[role]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {role === "admin" && <ProcessRemindersButton onDone={list.reload} />}
            <div className="flex rounded-full bg-neutral-100 p-1" role="group" aria-label="Case status">
              {(["open", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    status === s ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                  }`}
                >
                  {s === "open" ? "Open" : "All"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <RefundPolicyNote role={role} />
        </div>

        <div className="rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
          {unavailable ? (
            <p className="px-6 py-12 text-center text-sm text-neutral-600">
              Refund cases are not available in this environment yet.
            </p>
          ) : (
            <DataBoundary
              state={list}
              loadingLabel="Loading refund cases…"
              isEmpty={(data) => data.refunds.length === 0}
              empty={{
                title: status === "open" ? "No open refund cases" : "No refund cases recorded",
                description:
                  role === "buyer" ? "To request a refund, open a paid order from My Orders." : undefined,
              }}
            >
              {(data) => (
                <>
                  <ul className="divide-y divide-neutral-100">
                    {data.refunds.map((r) => (
                      <CaseRow key={r.id} refund={r} href={`${base}/${r.id}`} role={role} />
                    ))}
                  </ul>
                  {data.hasMore && (
                    <p className="px-5 py-3 text-xs text-neutral-500">
                      Showing the most recent cases. Older cases are not listed here.
                    </p>
                  )}
                </>
              )}
            </DataBoundary>
          )}
        </div>
      </div>
    </div>
  );
}

function CaseRow({ refund, href, role }: { refund: RefundCase; href: string; role: RefundRole }) {
  const counterpart =
    role === "buyer"
      ? `Seller: ${refund.sellerCompanyName}`
      : role === "seller"
        ? `Buyer: ${refund.buyerCompanyName}`
        : `${refund.buyerCompanyName} → ${refund.sellerCompanyName}`;
  return (
    <li>
      <Link
        href={href}
        className="grid grid-cols-1 gap-2 px-5 py-4 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none md:grid-cols-[1.4fr_1fr_1.3fr_1fr] md:items-center md:gap-4"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">
            Case #{refund.id} · {refundSourceLabel(refund)}
          </p>
          <p className="truncate text-xs text-neutral-500">{counterpart}</p>
        </div>
        <div className="text-sm text-neutral-900">
          {formatRefundMoney(refund.amountCents, refund.currencyCode)}
          <span className="block text-xs text-neutral-500">
            of {formatRefundMoney(refund.paidCents, refund.currencyCode)} paid
          </span>
        </div>
        <div className="flex flex-col items-start gap-1">
          <RefundStatusBadge status={refund.status} />
          {refund.canRespond && role !== "admin" && (
            <span className="text-xs font-semibold text-orange-700">Your response is needed</span>
          )}
          {refund.actionDueAt && (
            <span className="text-xs text-neutral-500">Due {formatRefundDate(refund.actionDueAt)}</span>
          )}
        </div>
        <div className="text-xs text-neutral-500 md:text-right">Updated {formatRefundDate(refund.updatedAt)}</div>
      </Link>
    </li>
  );
}

function ProcessRemindersButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const processed = await processRefundReminders();
      setFailed(false);
      setMessage(
        processed === 0
          ? "No email jobs were due."
          : `${processed} email job${processed === 1 ? "" : "s"} processed. Check each case for its delivery state.`,
      );
    } catch (error) {
      setFailed(true);
      setMessage(describeBackendError(error, "The reminder processor did not run."));
    } finally {
      setBusy(false);
      onDone();
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" onClick={run} disabled={busy}>
        {busy ? "Processing…" : "Process due emails now"}
      </Button>
      {message && (
        <p role={failed ? "alert" : "status"} className={`max-w-xs text-right text-xs ${failed ? "text-red-700" : "text-neutral-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

/** One refund case, with a link back to its portal's list. */
export function RefundCasePage({ role, id }: { role: RefundRole; id: string }) {
  const caseId = /^\d+$/.test(id) ? Number(id) : null;
  const base = refundBasePath(role);
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <Link
          href={base}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to {role === "admin" ? "refund queue" : "refunds"}
        </Link>
        <h1 className="mb-5 text-2xl font-bold text-neutral-900 sm:text-3xl">Refund case #{caseId ?? id}</h1>
        {caseId === null ? (
          <p role="alert" className="text-sm text-red-700">
            This is not a valid refund case reference.
          </p>
        ) : (
          <RefundCaseView id={caseId} role={role} />
        )}
      </div>
    </div>
  );
}
