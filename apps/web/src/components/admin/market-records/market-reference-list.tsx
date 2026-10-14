"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileText, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import { downloadNotice } from "@/lib/browser-download";
import { downloadMarketReference, type MarketReference } from "@/lib/api-market-references";
import { formatReferenceSize } from "@/lib/market-reference-format";

const border = { border: "1px solid #E0E0E0" };

/** Shown wherever reference PDFs appear; they are context, never supplier documents. */
export function ReferenceLibraryNotice() {
  return (
    <p
      className="mb-6 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950"
      style={{ border: "1px solid #FCD34D" }}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Internal reference library. These PDFs are research material only: they are not supplier-issued
        safety data sheets, do not verify or approve any supplier, and are never shown to buyers, sellers or
        on listings. A linked market record means the document is relevant material context, nothing more.
      </span>
    </p>
  );
}

type DownloadState = { state: "pending" | "handed" | "error"; message: string } | null;

function ReferenceDownload({ reference }: { reference: MarketReference }) {
  const [status, setStatus] = useState<DownloadState>(null);
  const label = `“${reference.fileName}”`;
  const pending = status?.state === "pending";

  const download = async () => {
    if (pending) return;
    setStatus({ state: "pending", message: downloadNotice("pending", label) });
    try {
      await downloadMarketReference(reference);
      setStatus({ state: "handed", message: downloadNotice("handed", label) });
    } catch (error) {
      setStatus({
        state: "error",
        message: downloadNotice("error", label, describeBackendError(error, "Please try again.")),
      });
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        style={border}
        disabled={pending}
        aria-busy={pending}
        onClick={() => void download()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        Download original
        <span className="sr-only"> {reference.fileName}</span>
      </Button>
      <p
        role={status?.state === "error" ? "alert" : "status"}
        className={`text-xs empty:hidden ${status?.state === "error" ? "text-red-700" : "text-neutral-600"}`}
      >
        {status?.message}
      </p>
    </div>
  );
}

/** One reference with its metadata, linked records and original download. */
export function MarketReferenceItem({
  reference,
  highlightRecordId,
}: {
  reference: MarketReference;
  /** On a record page, that record is already in view; it is labelled rather than linked. */
  highlightRecordId?: number;
}) {
  return (
    <li id={`reference-${reference.id}`} className="min-w-0 rounded-xl bg-white p-4" style={border}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-start gap-2 break-words font-semibold text-neutral-900">
            <FileText className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden="true" />
            <span className="min-w-0">{reference.title}</span>
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">Reference #{reference.id}</p>
        </div>
        <ReferenceDownload reference={reference} />
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[140px_1fr]">
        <dt className="text-neutral-500">Material</dt>
        <dd className="min-w-0 break-words">{reference.material}</dd>
        <dt className="text-neutral-500">Original file</dt>
        <dd className="min-w-0 break-all">
          {reference.fileName} <span className="text-neutral-500">· {formatReferenceSize(reference.sizeBytes)}</span>
        </dd>
        <dt className="text-neutral-500">Added</dt>
        <dd className="min-w-0 break-words">
          {new Date(reference.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })} by{" "}
          {reference.uploadedByUserName ?? `user #${reference.uploadedByUserId}`}
        </dd>
        {reference.notes && (
          <>
            <dt className="text-neutral-500">Notes</dt>
            <dd className="min-w-0 whitespace-pre-line break-words">{reference.notes}</dd>
          </>
        )}
        <dt className="text-neutral-500">Linked records</dt>
        <dd className="min-w-0">
          {reference.recordIds.length === 0 ? (
            <span className="text-neutral-500">Not linked to a market record</span>
          ) : (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {reference.recordIds.map((id) => (
                <li key={id}>
                  {id === highlightRecordId ? (
                    <span className="font-medium">#{id} (this record)</span>
                  ) : (
                    <Link href={`/admin/market-records/${id}`} className="text-sky-800 underline">
                      Record #{id}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
      <details className="mt-2 text-xs text-neutral-500">
        <summary className="cursor-pointer">SHA-256</summary>
        <span className="mt-1 block break-all font-mono">{reference.sha256}</span>
      </details>
    </li>
  );
}
