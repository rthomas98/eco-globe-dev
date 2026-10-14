"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { fetchMarketReferences, type MarketReference } from "@/lib/api-market-references";
import { filterReferences, readReferenceRecordFilter } from "@/lib/market-reference-format";
import { DataBoundary, LoadingState, useBackendData } from "@/components/shared/data-state";
import { MarketRecordShell } from "./market-record-shell";
import { MarketReferenceItem, ReferenceLibraryNotice } from "./market-reference-list";
import { MarketReferenceUploadForm } from "./market-reference-upload-form";

const border = { border: "1px solid #E0E0E0" };

function focusReference(id: number) {
  const element = document.getElementById(`reference-${id}`);
  if (!element) return false;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
  return true;
}

function ReferencesLibrary() {
  const searchParams = useSearchParams();
  const recordId = readReferenceRecordFilter(searchParams.get("recordId"));
  const state = useBackendData(
    () => fetchMarketReferences(recordId ?? undefined),
    [recordId],
    "The reference library could not be loaded.",
  );
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const created = (reference: MarketReference) => {
    setNotice(`Reference #${reference.id} “${reference.title}” was added to the internal library.`);
    setFormKey((key) => key + 1);
    setSearch("");
    state.reload();
  };

  const showExisting = (id: number) => {
    setSearch("");
    // Wait for the cleared search to render so the existing item is in the list.
    window.setTimeout(() => {
      if (focusReference(id)) return;
      setNotice(
        recordId === null
          ? `Reference #${id} is not in the list shown. Reload the page to see it.`
          : `Reference #${id} is not linked to record #${recordId}. Show all references to find it.`,
      );
    }, 0);
  };

  return (
    <MarketRecordShell
      title="Reference library"
      description="Internal research PDFs kept as material context for market records."
      backHref="/admin/market-records"
      backLabel="Market records"
    >
      <ReferenceLibraryNotice />

      <p role="status" className="mb-4 text-sm text-emerald-800 empty:hidden">
        {notice}
      </p>

      <div className="mb-6">
        <MarketReferenceUploadForm key={formKey} onCreated={created} onDuplicate={showExisting} />
      </div>

      <section aria-labelledby="reference-list-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="reference-list-heading" className="text-lg font-bold text-neutral-900">
            {recordId === null ? "All references" : `References linked to record #${recordId}`}
          </h2>
          {recordId !== null && (
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/admin/market-records/${recordId}`} className="text-sky-800 underline">
                Open record #{recordId}
              </Link>
              <Link href="/admin/market-records/references" className="text-sky-800 underline">
                Show all references
              </Link>
            </div>
          )}
        </div>
        <div role="search" className="mb-3">
          <label htmlFor="reference-search" className="sr-only">
            Search title, material, file name or notes
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="reference-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, material, file name or notes"
              className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
              style={border}
            />
          </div>
        </div>

        <DataBoundary
          state={state}
          isEmpty={(references) => references.length === 0}
          empty={{
            title: recordId === null ? "No reference PDFs yet" : `No references linked to record #${recordId}`,
            description:
              recordId === null
                ? "Upload an original PDF above to start the internal library."
                : "Upload a PDF above with this record ID, or show all references.",
          }}
          loadingLabel="Loading reference library…"
        >
          {(references) => {
            const shown = filterReferences(references, search);
            return (
              <>
                <p className="mb-3 text-sm text-neutral-600" aria-live="polite">
                  Showing {shown.length} of {references.length} reference{references.length === 1 ? "" : "s"}
                  {state.status === "loading" ? " (refreshing…)" : ""}
                </p>
                {shown.length === 0 ? (
                  <p className="rounded-xl bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600" style={border}>
                    No references match “{search.trim()}”.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {shown.map((reference) => (
                      <MarketReferenceItem key={reference.id} reference={reference} />
                    ))}
                  </ul>
                )}
              </>
            );
          }}
        </DataBoundary>
      </section>
    </MarketRecordShell>
  );
}

export function MarketReferencesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading reference library…" />}>
      <ReferencesLibrary />
    </Suspense>
  );
}
