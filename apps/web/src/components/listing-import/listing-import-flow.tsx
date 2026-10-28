"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileUp, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { useCompanyLocations } from "@/lib/use-company-locations";
import { ImportedDetailsForm } from "./imported-details-form";
import { describeBackendError } from "@/lib/backend-client";
import { handBlobToBrowser } from "@/lib/browser-download";
import { formatMoney, formatQuantity } from "@/lib/listing-format";
import { fetchListings, updateListing, uploadListingDocument, type BackendListing, type CompanyLocation } from "@/lib/listings-api";
import {
  commitListingImport,
  downloadListingImportTemplate,
  fetchListingImport,
  importCommitKey,
  previewListingImport,
  type ListingImportPreview,
  type ListingImportPreviewRow,
  type ListingImportResult,
} from "@/lib/api-listing-imports";
import {
  LISTING_IMPORT_MAX_ROWS,
  canCommitImport,
  filterImportRows,
  importSummary,
  importedListingNext,
  importedNextLabel,
  importedProgress,
  matchSdsFiles,
  missingSubmissionFields,
  workbookFileProblem,
  type ImportedListingState,
  type ListingImportRowFilter,
} from "@/lib/listing-import-format";

export type ListingImportMode = "seller" | "admin";

export interface ListingImportFlowProps {
  mode: ListingImportMode;
  sellerCompanyId: number;
  /** Current preview, read from the URL so a reload resumes the same import. */
  previewId: string | null;
  /** URL for this page with (or without) a preview, e.g. `/seller/listings/import?preview=…`. */
  hrefFor: (previewId: string | null) => string;
  /** Where to open one imported listing (seller edit page, admin listing page). */
  editHref: (listingId: number) => string;
  listingsHref: string;
}

const border = { border: "1px solid #E0E0E0" };

const STATUS_STYLE = {
  ready: { icon: CheckCircle2, tone: "text-green-700", label: "Ready" },
  warning: { icon: AlertTriangle, tone: "text-amber-700", label: "Warning" },
  error: { icon: XCircle, tone: "text-red-700", label: "Error" },
} as const;

/** Spreadsheet import: template → upload → preview → import as drafts → SDS and submit. */
export function ListingImportFlow(props: ListingImportFlowProps) {
  const router = useRouter();
  const go = (previewId: string | null) => router.replace(props.hrefFor(previewId), { scroll: false });

  if (props.previewId)
    return <StoredPreview key={props.previewId} {...props} previewId={props.previewId} onStartOver={() => go(null)} />;
  return <StartStep {...props} onPreview={(preview) => go(preview.previewId)} />;
}

/* ── Step 1: template and upload ── */

function StartStep({ sellerCompanyId, onPreview }: ListingImportFlowProps & { onPreview: (preview: ListingImportPreview) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"template" | "upload" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const template = async () => {
    setBusy("template");
    setError(null);
    setNotice(null);
    try {
      const { blob, fileName } = await downloadListingImportTemplate(sellerCompanyId);
      handBlobToBrowser(blob, fileName ?? "ecoglobe-listing-import-template.xlsx");
      setNotice("Download started for the listing template. Check your browser downloads.");
    } catch (caught) {
      setError(describeBackendError(caught, "The template could not be downloaded."));
    } finally {
      setBusy(null);
    }
  };

  const choose = (next: File | null) => {
    setError(null);
    const problem = next ? workbookFileProblem(next) : null;
    setFile(problem ? null : next);
    if (problem) setError(problem);
  };

  const upload = async () => {
    if (!file || busy) return;
    setBusy("upload");
    setError(null);
    try {
      onPreview(await previewListingImport(sellerCompanyId, file));
    } catch (caught) {
      setError(describeBackendError(caught, "The spreadsheet could not be checked."));
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby="import-template" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Step 1</p>
        <h2 id="import-template" className="mt-1 text-lg font-bold text-neutral-900">Download the template</h2>
        <p className="mt-1 text-sm text-neutral-600">
          One row per listing. The template has drop-down lists for material type, unit, currency and your facilities, and an
          Instructions sheet. Up to {LISTING_IMPORT_MAX_ROWS} listings per file.
        </p>
        <Button type="button" variant="secondary" size="sm" className="mt-4 rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" style={border} disabled={busy !== null} aria-busy={busy === "template"} onClick={() => void template()}>
          {busy === "template" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          {busy === "template" ? "Preparing template…" : "Download template (.xlsx)"}
        </Button>
        {notice && <p role="status" className="mt-3 text-sm text-neutral-700">{notice}</p>}
      </section>

      <section aria-labelledby="import-upload" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Step 2</p>
        <h2 id="import-upload" className="mt-1 text-lg font-bold text-neutral-900">Upload your spreadsheet</h2>
        <p className="mt-1 text-sm text-neutral-600">
          EcoGlobe checks every row and shows you the result. Nothing is saved until you confirm the import.
        </p>
        <label htmlFor="import-file" className="mb-1 mt-4 block text-sm font-medium text-neutral-900">
          Spreadsheet (.xlsx, up to 2 MB)
        </label>
        <input
          id="import-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy !== null}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium"
        />
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!file || busy !== null} aria-busy={busy === "upload"} onClick={() => void upload()}>
            {busy === "upload" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            {busy === "upload" ? "Checking spreadsheet…" : "Check spreadsheet"}
          </Button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 lg:col-span-2">
          {error}
        </p>
      )}

      <aside className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700 lg:col-span-2">
        Imported listings are saved as <strong>drafts</strong>. Each one needs a safety data sheet (SDS) PDF before it can be
        submitted for review; you can upload them on the next screen.
      </aside>
    </div>
  );
}

/* ── Step 2: preview ── */

function StoredPreview(
  props: ListingImportFlowProps & {
    previewId: string;
    onStartOver: () => void;
  },
) {
  // A commit made on this screen is shown straight away; a reload reads the
  // stored result back from the preview instead.
  const [committed, setCommitted] = useState<ListingImportResult | null>(null);
  const state = useBackendData(
    () => fetchListingImport(props.sellerCompanyId, props.previewId),
    [props.sellerCompanyId, props.previewId],
    "This import could not be loaded. It may have expired; upload the spreadsheet again.",
  );
  if (committed) return <ImportedListings {...props} result={committed} />;
  return (
    <>
    {state.status === "error" && (
      <div className="mb-3 flex justify-end">
        <Button type="button" size="sm" className="rounded-full px-4 py-2" onClick={props.onStartOver}>
          <FileSpreadsheet className="size-4" aria-hidden /> Start a new import
        </Button>
      </div>
    )}
    <DataBoundary state={state} empty={{ title: "Import not found" }} loadingLabel="Loading import…">
      {(preview) =>
        preview.committed && preview.result ? (
          <ImportedListings {...props} result={preview.result} />
        ) : (
          <PreviewReview {...props} preview={preview} onCommitted={setCommitted} />
        )
      }
    </DataBoundary>
    </>
  );
}

function money(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  return currency ? formatMoney(amount, currency) : String(amount);
}

function PreviewReview({
  preview,
  onCommitted,
  onStartOver,
}: ListingImportFlowProps & {
  preview: ListingImportPreview;
  onCommitted: (result: ListingImportResult) => void;
  onStartOver: () => void;
}) {
  const [filter, setFilter] = useState<ListingImportRowFilter>(preview.counts.error > 0 ? "error" : "all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = filterImportRows(preview.rows, filter);
  const importable = canCommitImport(preview.counts);

  const commit = async () => {
    if (!importable || busy) return;
    setBusy(true);
    setError(null);
    try {
      onCommitted(await commitListingImport(preview.sellerCompanyId, preview.previewId, importCommitKey(preview.previewId)));
    } catch (caught) {
      // A lost response (timeout, network) may hide a commit that succeeded:
      // read the preview back before reporting failure. Retrying reuses the
      // same idempotency key, so it can never create the listings twice.
      try {
        const stored = await fetchListingImport(preview.sellerCompanyId, preview.previewId);
        if (stored.committed && stored.result) {
          onCommitted(stored.result);
          return;
        }
      } catch {
        // Fall through to the original error.
      }
      setError(describeBackendError(caught, "The listings could not be imported. Nothing was saved; please try again."));
      setBusy(false);
    }
  };

  const tabs: Array<{ key: ListingImportRowFilter; label: string; count: number }> = [
    { key: "all", label: "All rows", count: preview.counts.total },
    { key: "error", label: "Errors", count: preview.counts.error },
    { key: "warning", label: "Warnings", count: preview.counts.warning },
  ];

  return (
    <section aria-labelledby="import-preview" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="import-preview" className="text-lg font-bold text-neutral-900">Check the rows</h2>
          <p className="mt-1 text-sm text-neutral-600">
            For {preview.sellerCompanyName}. This check expires {new Date(preview.expiresAt).toLocaleString()}.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" style={border} disabled={busy} onClick={onStartOver}>
          <FileSpreadsheet className="size-4" aria-hidden /> Upload a different file
        </Button>
      </div>

      <p
        role="status"
        className={`mt-4 rounded-lg px-3 py-2 text-sm ${preview.counts.error > 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}
      >
        {importSummary(preview.counts)}
      </p>

      <div role="tablist" aria-label="Filter rows" className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${filter === tab.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-3 sm:hidden" aria-label="Spreadsheet rows">
        {rows.map((row) => (
          <PreviewCard key={row.rowNumber} row={row} />
        ))}
        {rows.length === 0 && <li className="py-6 text-center text-sm text-neutral-500">No rows in this view.</li>}
      </ul>

      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
              <th scope="col" className="py-2 pr-3">Row</th>
              <th scope="col" className="py-2 pr-3">Listing</th>
              <th scope="col" className="py-2 pr-3">Quantity</th>
              <th scope="col" className="py-2 pr-3">Min. order</th>
              <th scope="col" className="py-2 pr-3">Price</th>
              <th scope="col" className="py-2 pr-3">Facility</th>
              <th scope="col" className="py-2">Check</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PreviewRow key={row.rowNumber} row={row} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-500">No rows in this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {!importable && preview.counts.error > 0 && (
          <p className="text-sm text-neutral-600">Fix the rows with errors in your spreadsheet, then upload it again.</p>
        )}
        <Button type="button" size="md" className="rounded-full px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-40" disabled={!importable || busy} aria-busy={busy} onClick={() => void commit()}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {busy ? "Importing…" : `Import ${preview.counts.total} ${preview.counts.total === 1 ? "listing" : "listings"} as drafts`}
        </Button>
      </div>
    </section>
  );
}

function quantityText(amount: number | null, unit: string | null) {
  return amount === null ? "—" : formatQuantity(amount, unit) ?? String(amount);
}

function RowCheck({ row }: { row: ListingImportPreviewRow }) {
  const style = STATUS_STYLE[row.status];
  const Icon = style.icon;
  return (
    <>
      <span className={`inline-flex items-center gap-1.5 font-medium ${style.tone}`}>
        <Icon className="size-4" aria-hidden /> {style.label}
      </span>
      {row.diagnostics.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-neutral-700">
          {row.diagnostics.map((d, index) => (
            <li key={index} className={d.severity === "error" ? "text-red-800" : "text-amber-900"}>
              {d.field ? <strong>{d.field}: </strong> : null}
              {d.message}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RowTitle({ row }: { row: ListingImportPreviewRow }) {
  const l = row.listing;
  return (
    <>
      <p className="font-medium text-neutral-900">{l.title ?? <span className="text-neutral-400">No title</span>}</p>
      <p className="text-xs text-neutral-500">{l.materialTypeLabel ?? l.materialTypeCode ?? "No material type"}</p>
    </>
  );
}

function PreviewRow({ row }: { row: ListingImportPreviewRow }) {
  const l = row.listing;
  return (
    <tr className="align-top" style={{ borderBottom: "1px solid #F0F0F0" }}>
      <td className="py-3 pr-3 text-neutral-500">{row.rowNumber}</td>
      <td className="max-w-[240px] py-3 pr-3"><RowTitle row={row} /></td>
      <td className="py-3 pr-3">{quantityText(l.quantity, l.quantityUnit)}</td>
      <td className="py-3 pr-3">{quantityText(l.minimumOrderQuantity, l.quantityUnit)}</td>
      <td className="py-3 pr-3">{money(l.pricePerUnit, l.currencyCode)}</td>
      <td className="py-3 pr-3">{l.locationName ?? "—"}</td>
      <td className="py-3"><RowCheck row={row} /></td>
    </tr>
  );
}

/** Phone layout of one spreadsheet row. */
function PreviewCard({ row }: { row: ListingImportPreviewRow }) {
  const l = row.listing;
  return (
    <li className="rounded-xl p-3 text-sm" style={border}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><RowTitle row={row} /></div>
        <span className="shrink-0 text-xs text-neutral-500">Row {row.rowNumber}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-neutral-500">Quantity</dt><dd>{quantityText(l.quantity, l.quantityUnit)}</dd>
        <dt className="text-neutral-500">Min. order</dt><dd>{quantityText(l.minimumOrderQuantity, l.quantityUnit)}</dd>
        <dt className="text-neutral-500">Price</dt><dd>{money(l.pricePerUnit, l.currencyCode)}</dd>
        <dt className="text-neutral-500">Facility</dt><dd>{l.locationName ?? "—"}</dd>
      </dl>
      <div className="mt-2"><RowCheck row={row} /></div>
    </li>
  );
}

/* ── Step 3: imported drafts — SDS and submit ── */

function liveState(listing: BackendListing): ImportedListingState {
  return {
    listingStatusCode: String(listing.listingStatusCode),
    hasSds: (listing.documents ?? []).some((d) => d.documentTypeCode === "sds"),
    quantity: listing.quantity,
    quantityUnit: listing.quantityUnit,
    minimumOrderQuantity: listing.minimumOrderQuantity,
    pricePerUnit: listing.pricePerUnit,
    currencyCode: listing.currencyCode,
    locationId: listing.locationId,
  };
}

function ImportedListings({
  mode,
  sellerCompanyId,
  result,
  editHref,
  listingsHref,
  onStartOver,
}: ListingImportFlowProps & { result: ListingImportResult; onStartOver: () => void }) {
  const createdIds = useMemo(() => new Set(result.created.map((c) => c.listingId)), [result]);
  const listings = useBackendData(
    async () => (await fetchListings("owned", { sellerCompanyId })).filter((l) => createdIds.has(l.id)),
    [sellerCompanyId, result.importId],
    "The imported listings could not be loaded.",
  );
  const locations = useCompanyLocations(sellerCompanyId);
  return (
    <section aria-labelledby="import-done" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="import-done" className="flex items-center gap-2 text-lg font-bold text-neutral-900">
            <CheckCircle2 className="size-5 text-green-600" aria-hidden />
            {result.created.length} {result.created.length === 1 ? "listing" : "listings"} imported as drafts
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Upload an SDS for each listing, then {mode === "admin" ? "publish" : "submit"} the ones that are ready.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" style={border} onClick={onStartOver}>
            <FileSpreadsheet className="size-4" aria-hidden /> Import another file
          </Button>
          <Link href={listingsHref}>
            <Button type="button" variant="secondary" size="sm" className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" style={border}>Go to listings</Button>
          </Link>
        </div>
      </div>
      <div className="mt-4">
        <DataBoundary state={listings} empty={{ title: "No imported listings found" }} isEmpty={(rows) => rows.length === 0} loadingLabel="Loading imported listings…">
          {(rows) => <ImportedTable mode={mode} rows={rows} result={result} editHref={editHref} locations={locations.locations} reload={listings.reload} />}
        </DataBoundary>
      </div>
    </section>
  );
}

function ImportedTable({
  mode,
  rows,
  result,
  editHref,
  locations,
  reload,
}: {
  mode: ListingImportMode;
  rows: BackendListing[];
  result: ListingImportResult;
  editHref: (listingId: number) => string;
  locations: CompanyLocation[];
  reload: () => void;
}) {
  // One details form for both layouts (phone cards and table), so its draft
  // survives a breakpoint change and there is only ever one Save button.
  const [editing, setEditing] = useState<number | null>(null);
  const detailsPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing !== null) detailsPanel.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [editing]);
  const rowNumber = useMemo(() => new Map(result.created.map((c) => [c.listingId, c.rowNumber])), [result]);
  const ordered = useMemo(() => [...rows].sort((a, b) => (rowNumber.get(a.id) ?? 0) - (rowNumber.get(b.id) ?? 0)), [rows, rowNumber]);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const bulkInput = useRef<HTMLInputElement>(null);
  const progress = importedProgress(ordered.map(liveState));
  const ready = ordered.filter((l) => importedListingNext(liveState(l)) === "submit");
  const editingListing = editing === null ? null : ordered.find((l) => l.id === editing) ?? null;
  const targetStatus = mode === "admin" ? "published" : "pending_review";
  const submitVerb = mode === "admin" ? "Publish" : "Submit for review";

  const run = async (label: string, work: () => Promise<{ done: string[]; failed: string[] }>) => {
    setBusy(label);
    setMessages([]);
    setErrors([]);
    try {
      const { done, failed } = await work();
      setMessages(done);
      setErrors(failed);
    } finally {
      setBusy(null);
      reload();
    }
  };

  const uploadSds = (listing: BackendListing, file: File) =>
    run(`sds-${listing.id}`, async () => {
      try {
        await uploadListingDocument({ listingId: listing.id, documentTypeCode: "sds", file });
        return { done: [`SDS uploaded for ${listing.title}.`], failed: [] };
      } catch (caught) {
        return { done: [], failed: [`${listing.title}: ${describeBackendError(caught, "the SDS could not be uploaded.")}`] };
      }
    });

  const uploadMany = (files: File[]) =>
    run("sds-bulk", async () => {
      const waiting = ordered.filter((l) => !liveState(l).hasSds);
      const match = matchSdsFiles(files.map((f) => f.name), waiting);
      const done: string[] = [];
      const failed: string[] = [];
      for (const { fileIndex, listingId } of match.matches) {
        const listing = waiting.find((l) => l.id === listingId)!;
        try {
          await uploadListingDocument({ listingId, documentTypeCode: "sds", file: files[fileIndex]! });
          done.push(`SDS uploaded for ${listing.title}.`);
        } catch (caught) {
          failed.push(`${files[fileIndex]!.name}: ${describeBackendError(caught, "could not be uploaded.")}`);
        }
      }
      for (const index of match.ambiguous)
        failed.push(`${files[index]!.name}: more than one listing has this title. Upload it on the right row.`);
      for (const index of match.unmatched)
        failed.push(`${files[index]!.name}: no listing still needing an SDS has this title. Rename the file to the listing title, or upload it on its row.`);
      return { done, failed };
    });

  const submit = (targets: BackendListing[]) =>
    run(targets.length === 1 ? `submit-${targets[0]!.id}` : "submit-all", async () => {
      const done: string[] = [];
      const failed: string[] = [];
      for (const listing of targets) {
        try {
          await updateListing(listing.id, { listingStatusCode: targetStatus });
          done.push(`${listing.title} ${mode === "admin" ? "published" : "submitted for review"}.`);
        } catch (caught) {
          failed.push(`${listing.title}: ${describeBackendError(caught, "could not be submitted.")}`);
        }
      }
      return { done, failed };
    });

  return (
    <>
      <ul className="flex flex-wrap gap-2 text-sm" aria-label="Import progress">
        <li className="rounded-full bg-neutral-100 px-3 py-1">Need details: {progress.completeDetails}</li>
        <li className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">Need SDS: {progress.addSds}</li>
        <li className="rounded-full bg-green-50 px-3 py-1 text-green-800">Ready: {progress.ready}</li>
        <li className="rounded-full bg-neutral-100 px-3 py-1">{mode === "admin" ? "Published or in review" : "Submitted"}: {progress.done}</li>
      </ul>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-700">
          Upload several SDS PDFs at once: each file is matched to the listing with the same title (for example
          “Biochar SDS.pdf” → Biochar).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={bulkInput}
            type="file"
            accept="application/pdf"
            multiple
            hidden
            aria-label="SDS PDFs to match by listing title"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) void uploadMany(files);
            }}
          />
          <Button type="button" variant="secondary" size="sm" className="rounded-full bg-white px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" style={border} disabled={busy !== null || progress.addSds === 0} aria-busy={busy === "sds-bulk"} onClick={() => bulkInput.current?.click()}>
            {busy === "sds-bulk" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
            Upload SDS files
          </Button>
          <Button type="button" size="sm" className="rounded-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={busy !== null || ready.length === 0} aria-busy={busy === "submit-all"} onClick={() => void submit(ready)}>
            {busy === "submit-all" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitVerb} all ready ({ready.length})
          </Button>
        </div>
      </div>

      {(messages.length > 0 || errors.length > 0) && (
        <div className="mt-3 space-y-2" aria-live="polite">
          {messages.length > 0 && (
            <ul role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              {messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
          {errors.length > 0 && (
            <ul role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {errors.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-3 sm:hidden" aria-label="Imported listings">
        {ordered.map((listing) => {
          const state = liveState(listing);
          const next = importedListingNext(state);
          return (
            <li key={listing.id} className="rounded-xl p-3 text-sm" style={border}>
              <div className="flex items-start justify-between gap-3">
                <Link href={editHref(listing.id)} className="min-w-0 font-medium text-neutral-900 underline-offset-2 hover:underline">
                  {listing.title}
                </Link>
                <span className="shrink-0 text-xs text-neutral-500">Row {rowNumber.get(listing.id) ?? "—"}</span>
              </div>
              <p className="text-xs text-neutral-500">{state.hasSds ? "SDS on file" : "No SDS yet"}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className={nextTone(next)}>{importedNextLabel(next, missingSubmissionFields(state))}</span>
                <RowAction
                  listing={listing}
                  next={next}
                  busy={busy}
                  submitVerb={submitVerb}
                  onSds={(file) => void uploadSds(listing, file)}
                  onSubmit={() => void submit([listing])}
                  onEdit={() => setEditing(listing.id)}
                  inputSuffix="card"
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
              <th scope="col" className="py-2 pr-3">Row</th>
              <th scope="col" className="py-2 pr-3">Listing</th>
              <th scope="col" className="py-2 pr-3">Next step</th>
              <th scope="col" className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((listing) => {
              const state = liveState(listing);
              const next = importedListingNext(state);
              return (
                <tr key={listing.id} style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <td className="py-3 pr-3 text-neutral-500">{rowNumber.get(listing.id) ?? "—"}</td>
                  <td className="max-w-[260px] py-3 pr-3">
                    <Link href={editHref(listing.id)} className="font-medium text-neutral-900 underline-offset-2 hover:underline">
                      {listing.title}
                    </Link>
                    <p className="text-xs text-neutral-500">{state.hasSds ? "SDS on file" : "No SDS yet"}</p>
                  </td>
                  <td className={`py-3 pr-3 ${nextTone(next)}`}>
                    {importedNextLabel(next, missingSubmissionFields(state))}
                  </td>
                  <td className="py-3 text-right">
                    <RowAction
                      listing={listing}
                      next={next}
                      busy={busy}
                      submitVerb={submitVerb}
                      onSds={(file) => void uploadSds(listing, file)}
                      onSubmit={() => void submit([listing])}
                      onEdit={() => setEditing(listing.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingListing && (
        <div ref={detailsPanel} className="mt-4 scroll-mt-4">
          <ImportedDetailsForm
            key={editingListing.id}
            listingId={editingListing.id}
            title={editingListing.title}
            state={liveState(editingListing)}
            locations={locations}
            onSavingChange={(saving) => setBusy(saving ? `details-${editingListing.id}` : null)}
            onCancel={() => setEditing(null)}
            onSaved={(savedId) => {
              // Only close the form that was saved; editing cannot switch
              // while a save runs, but never discard another draft.
              setEditing((current) => (current === savedId ? null : current));
              setMessages([`Details saved for ${editingListing.title}.`]);
              setErrors([]);
              reload();
            }}
          />
        </div>
      )}
    </>
  );
}

function nextTone(next: ReturnType<typeof importedListingNext>) {
  if (next === "submit") return "text-green-800";
  return next === "complete-details" || next === "add-sds" ? "text-amber-900" : "text-neutral-700";
}

function RowAction({
  listing,
  next,
  busy,
  submitVerb,
  onSds,
  onSubmit,
  onEdit,
  inputSuffix = "row",
}: {
  listing: BackendListing;
  next: ReturnType<typeof importedListingNext>;
  busy: string | null;
  submitVerb: string;
  onSds: (file: File) => void;
  onSubmit: () => void;
  onEdit: () => void;
  /** Phone cards and table rows both render; keeps their file inputs distinct. */
  inputSuffix?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pill = "rounded-full px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40";
  if (next === "complete-details")
    return (
      <Button type="button" variant="secondary" size="sm" className={pill} style={border} disabled={busy !== null} onClick={onEdit}>
        Complete details
      </Button>
    );
  if (next === "add-sds")
    return (
      <>
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          hidden
          aria-label={`SDS PDF for ${listing.title}`}
          data-input={inputSuffix}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onSds(file);
          }}
        />
        <Button type="button" variant="secondary" size="sm" className={pill} style={border} disabled={busy !== null} aria-busy={busy === `sds-${listing.id}`} onClick={() => input.current?.click()}>
          {busy === `sds-${listing.id}` ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
          Upload SDS
        </Button>
      </>
    );
  if (next === "submit")
    return (
      <Button type="button" size="sm" className={pill} disabled={busy !== null} aria-busy={busy === `submit-${listing.id}`} onClick={onSubmit}>
        {busy === `submit-${listing.id}` && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {submitVerb}
      </Button>
    );
  return <span className="text-sm text-neutral-500">—</span>;
}
