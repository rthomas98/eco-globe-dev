"use client";

import { Download, FlaskConical } from "lucide-react";
import { labReportDownloadUrl, type LabReport } from "@/lib/lab-testing-api";
import { describeTestedBadge, formatHeadlineResult } from "@/lib/lab-testing";
import { formatBytes } from "@/components/seller/listing-documents";

/**
 * One batch report: "Independently tested — <lab>, <date>", headline
 * results, batch context, and an authorized download. The link goes through
 * the proxy so the backend enforces private/shared visibility.
 */
export function LabReportCard({ report, compact = false }: { report: LabReport; compact?: boolean }) {
  const badge = describeTestedBadge(report);
  const shown = report.results.slice(0, 4);
  const more = report.results.length - shown.length;
  const size = formatBytes(report.byteLength);
  return (
    <article className="rounded-xl bg-emerald-50/60 p-4" style={{ border: "1px solid #BBF7D0" }} aria-label={`${badge.headline}: ${badge.detail}`}>
      <div className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-900">{badge.headline}</p>
          <p className="text-xs text-neutral-700">{badge.detail}</p>
          <p className="text-xs text-neutral-500">{badge.batch}</p>
          <p className="text-[11px] text-neutral-500">
            {report.sharing === "shared" && report.published
              ? "Shared on the listing"
              : report.sharing === "shared"
                ? "Sharing consented · not yet published by EcoGlobe"
                : "Private to the requesting company only"}
          </p>
        </div>
      </div>
      {!compact && shown.length > 0 && (
        <dl className="mt-3 rounded-lg bg-white px-4 py-2" style={{ border: "1px solid #E0E0E0" }}>
          {shown.map((result, index) => (
            <div key={`${result.label}-${index}`} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <dt className="text-neutral-700">{result.label}</dt>
              <dd className="font-semibold text-neutral-900">{formatHeadlineResult(result)}</dd>
            </div>
          ))}
          {more > 0 && <p className="py-1 text-xs text-neutral-500">+ {more} more in the full report</p>}
        </dl>
      )}
      <a
        href={labReportDownloadUrl(report)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-neutral-900/40 sm:w-auto"
      >
        <Download className="size-4" aria-hidden="true" /> Download full report{size ? ` (${size})` : ""}
      </a>
    </article>
  );
}
