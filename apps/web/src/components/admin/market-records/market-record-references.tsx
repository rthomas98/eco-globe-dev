"use client";

import Link from "next/link";
import { fetchMarketReferences } from "@/lib/api-market-references";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { MarketReferenceItem } from "./market-reference-list";

const border = { border: "1px solid #E0E0E0" };

/** Reference PDFs linked to one internal record, with original downloads. */
export function MarketRecordReferences({ recordId }: { recordId: number }) {
  const state = useBackendData(
    () => fetchMarketReferences(recordId),
    [recordId],
    "Linked reference PDFs could not be loaded.",
  );

  return (
    <section aria-labelledby="record-references-heading" className="mt-4 min-w-0 rounded-2xl bg-white p-4 sm:p-6" style={border}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="record-references-heading" className="text-base font-bold text-neutral-900">
          Reference PDFs
        </h2>
        <Link href={`/admin/market-records/references?recordId=${recordId}`} className="text-sm text-sky-800 underline">
          Open in reference library
        </Link>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        Internal research material linked to this record. Not supplier-issued SDS and not a verification of this
        company or its figures.
      </p>
      <DataBoundary
        state={state}
        isEmpty={(references) => references.length === 0}
        empty={{
          title: "No reference PDFs linked",
          description: "Add one in the reference library with this record's ID.",
        }}
        loadingLabel="Loading reference PDFs…"
      >
        {(references) => (
          <ul className="flex flex-col gap-3">
            {references.map((reference) => (
              <MarketReferenceItem key={reference.id} reference={reference} highlightRecordId={recordId} />
            ))}
          </ul>
        )}
      </DataBoundary>
    </section>
  );
}
