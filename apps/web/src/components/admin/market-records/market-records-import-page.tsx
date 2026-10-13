"use client";

import { Suspense, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import {
  MAX_IMPORT_BYTES,
  commitMarketRecordImport,
  fetchMarketRecordImport,
  marketRecordErrorDetails,
  previewMarketRecordImport,
  type MarketCommitResult,
  type MarketDiagnostic,
  type MarketPreview,
  type MarketPreviewRow,
} from "@/lib/api-market-records";
import {
  describeResearchPrice,
  describeResearchVolume,
  formatAddressLine,
  sourceCheckedLabel,
  sourceRecordTypeLabel,
} from "@/lib/market-record-format";
import { DataBoundary, LoadingState, useBackendData } from "@/components/shared/data-state";
import { FieldStatusBadge, RoleBadge } from "./market-record-badges";
import { MarketRecordShell } from "./market-record-shell";

/*
 * Workbook import: the server parses the raw .xlsx into an immutable preview
 * bound to this admin; nothing is written until an explicit, acknowledged
 * commit. Commit is replay-safe: the same intent reuses one idempotency key,
 * so retrying after a lost response returns the stored result.
 */

const border = { border: "1px solid #E0E0E0" };

/** A preview read back after commit carries the stored outcome in `result`. */
type PreviewState = MarketPreview;

const SEVERITY_STYLE: Record<MarketDiagnostic["severity"], { icon: typeof Info; tone: string; label: string }> = {
  error: { icon: XCircle, tone: "text-red-800", label: "Error" },
  warning: { icon: AlertTriangle, tone: "text-amber-900", label: "Warning" },
  info: { icon: Info, tone: "text-neutral-700", label: "Note" },
};

const DECISION_LABELS: Record<MarketPreviewRow["decision"], string> = {
  create: "Will be created",
  skip: "Skipped",
  error: "Error, must be excluded",
};

function uploadErrorMessage(error: unknown) {
  const details = marketRecordErrorDetails(error);
  if (details.code === "file_too_large" || details.status === 413)
    return `${describeBackendError(error, "The workbook exceeds the import limits.")} Limits: 2 MB file, 2,000 data rows. Split it or remove extra content.`;
  if (details.code === "unsupported_format" || details.status === 415)
    return `${describeBackendError(error, "The file is not a supported workbook.")} Use the .xlsx research template with Sellers and Buyers sheets. Macros, formulas, embedded objects and external workbook links are rejected; plain http(s) citation text in cells is allowed.`;
  return describeBackendError(error, "The workbook could not be previewed.");
}

function Diagnostics({ items }: { items: MarketDiagnostic[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {items.map((item, index) => {
        const style = SEVERITY_STYLE[item.severity];
        const Icon = style.icon;
        return (
          <li key={`${item.code}-${index}`} className={`flex items-start gap-1.5 text-xs ${style.tone}`}>
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">
              <span className="font-semibold">{style.label}:</span> {item.field ? `${item.field}: ` : ""}
              {item.message}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function PreviewRowItem({
  row,
  included,
  onToggle,
  disabled,
}: {
  row: MarketPreviewRow;
  included: boolean;
  onToggle: (next: boolean) => void;
  disabled: boolean;
}) {
  const record = row.proposedRecord;
  const checkboxId = useId();
  return (
    <li className="rounded-xl bg-white p-3 sm:p-4" style={border}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-neutral-500">
            {row.sheet} row {row.rowNumber} · {DECISION_LABELS[row.decision]}
            {row.duplicateOfId !== null && (
              <>
                {" "}
                · duplicate of{" "}
                <Link href={`/admin/market-records/${row.duplicateOfId}`} className="underline">
                  record #{row.duplicateOfId}
                </Link>
              </>
            )}
          </p>
          {record ? (
            <p className="break-words font-semibold text-neutral-900">
              {record.companyName}
              {record.facilityName ? ` · ${record.facilityName}` : ""}
            </p>
          ) : (
            <p className="text-sm italic text-neutral-600">No record (note or blank row)</p>
          )}
        </div>
        {row.decision === "create" && (
          <label htmlFor={checkboxId} className="inline-flex items-center gap-2 text-sm">
            <input
              id={checkboxId}
              type="checkbox"
              checked={included}
              disabled={disabled}
              onChange={(event) => onToggle(event.target.checked)}
            />
            Include
          </label>
        )}
        {row.decision === "error" && <span className="text-xs font-semibold text-red-800">Excluded</span>}
      </div>
      {record && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-700">
          <RoleBadge role={record.role} />
          <span>{sourceRecordTypeLabel(record.sourceRecordType)}</span>
          <span aria-hidden="true">·</span>
          <span>{sourceCheckedLabel(record.sourceChecked)}</span>
          <span aria-hidden="true">·</span>
          <span className="break-words">{record.feedstock}</span>
          <span aria-hidden="true">·</span>
          <span className="break-words">{formatAddressLine(record.address)}</span>
          <span aria-hidden="true">·</span>
          <span>Volume {describeResearchVolume(record.volume).label}</span>
          <FieldStatusBadge status={record.volume.status} />
          <span>Price {describeResearchPrice(record.price).label}</span>
          <FieldStatusBadge status={record.price.status} />
        </div>
      )}
      <Diagnostics items={row.diagnostics} />
    </li>
  );
}

function CommitOutcome({ result }: { result: MarketCommitResult }) {
  return (
    <section aria-labelledby="mr-import-result" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
      <h2 id="mr-import-result" className="flex items-center gap-2 text-lg font-bold text-neutral-900">
        <CheckCircle2 className="size-5 text-emerald-700" aria-hidden="true" />
        Import complete
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Records were created as internal research records only. Field values stay Estimate or Not confirmed until an admin
        reviews them; nothing was listed or shown to buyers or sellers.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Created", result.totals.created],
            ["Duplicates skipped", result.totals.duplicates],
            ["Excluded", result.totals.excluded],
            ["Ignored rows", result.totals.ignored],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-neutral-50 px-3 py-2">
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="text-xl font-bold text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>
      {result.skippedRows.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-neutral-800">
            {result.skippedRows.length} skipped row{result.skippedRows.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {result.skippedRows.map((row) => (
              <li key={row.rowKey} className="break-words text-neutral-700">
                <span className="font-mono text-xs">{row.rowKey}</span>: {row.code.replace(/_/g, " ")}
                {row.duplicateOfId !== null && (
                  <>
                    {" "}
                    (
                    <Link href={`/admin/market-records/${row.duplicateOfId}`} className="underline">
                      record #{row.duplicateOfId}
                    </Link>
                    )
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/admin/market-records?importBatchId=${encodeURIComponent(result.importId)}`}
          className="rounded-full bg-neutral-900 px-4 py-2 font-bold text-white"
        >
          View imported records
        </Link>
        <Link href="/admin/market-records/import" className="rounded-full bg-white px-4 py-2 font-bold text-neutral-900" style={border}>
          Import another workbook
        </Link>
      </div>
    </section>
  );
}

function PreviewReview({ preview, onCommitted }: { preview: PreviewState; onCommitted: (result: MarketCommitResult) => void }) {
  const [excludedCreates, setExcludedCreates] = useState<Set<string>>(() => new Set());
  const [sheet, setSheet] = useState("all");
  const [decision, setDecision] = useState("all");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  // One idempotency key per commit intent; a retry of the same intent reuses it.
  const keys = useRef(new Map<string, string>());

  const sheets = useMemo(() => [...new Set(preview.rows.map((row) => row.sheet))], [preview.rows]);
  const errorKeys = preview.rows.filter((row) => row.decision === "error").map((row) => row.rowKey);
  const createRows = preview.rows.filter((row) => row.decision === "create");
  const toCreate = createRows.filter((row) => !excludedCreates.has(row.rowKey)).length;
  const expired = new Date(preview.expiresAt).getTime() <= Date.now();
  const visible = preview.rows.filter(
    (row) => (sheet === "all" || row.sheet === sheet) && (decision === "all" || row.decision === decision),
  );
  // A duplicate-only reimport may complete with zero new records so the
  // stored no-op outcome is visible; an empty workbook cannot.
  const canCommit = acknowledged && reason.trim() !== "" && preview.totals.sourceRows > 0 && !busy && !expired;

  const commit = async () => {
    if (!canCommit) return;
    const excludedRowKeys = [...errorKeys, ...createRows.filter((r) => excludedCreates.has(r.rowKey)).map((r) => r.rowKey)].sort();
    const intent = JSON.stringify([excludedRowKeys, reason.trim()]);
    let idempotencyKey = keys.current.get(intent);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      keys.current.set(intent, idempotencyKey);
    }
    setBusy(true);
    setError(null);
    setUncertain(false);
    try {
      const result = await commitMarketRecordImport(preview.previewId, {
        idempotencyKey,
        excludedRowKeys,
        reason: reason.trim(),
      });
      onCommitted(result);
    } catch (caught) {
      const details = marketRecordErrorDetails(caught);
      if (details.code === "preview_expired" || details.status === 410)
        setError("This preview expired before it was committed. Nothing was imported. Upload the workbook again.");
      else if (details.code === "idempotency_conflict")
        setError("This preview was already committed with different choices. Reload this page to see that result.");
      else if (details.code === "invalid_rows_not_excluded")
        setError("Some error rows were not excluded. Reload this page and preview again.");
      else if (details.status === null || details.status >= 500 || details.status === 408 || details.status === 504) {
        setUncertain(true);
        setError(
          `${describeBackendError(caught, "The import response was lost.")} The import may or may not have completed. Retrying is safe: the same request returns the stored result instead of importing twice.`,
        );
      } else setError(describeBackendError(caught, "The import could not be committed."));
    } finally {
      setBusy(false);
    }
  };

  const tiles = [
    ["Source rows", preview.totals.sourceRows],
    ["Will be created", preview.totals.createRows],
    ["Duplicates", preview.totals.duplicateRows],
    ["Errors", preview.totals.errorRows],
    ["Ignored", preview.totals.ignoredRows],
  ] as const;
  const selectClass = "w-full rounded-lg bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20";

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="mr-preview-summary" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
        <h2 id="mr-preview-summary" className="text-lg font-bold text-neutral-900">
          Preview
        </h2>
        <p className="mt-1 break-all text-xs text-neutral-500">
          Workbook SHA-256 {preview.fileSha256} · preview {expired ? "expired" : "expires"}{" "}
          {new Date(preview.expiresAt).toLocaleTimeString("en-US")}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Nothing has been saved yet. Imported values are never marked confirmed: prices and volumes become Estimate when
          present, addresses stay Not confirmed, and a source &quot;checked&quot; column is kept only as the source&apos;s claim.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-neutral-50 px-3 py-2">
              <dt className="text-xs text-neutral-500">{label}</dt>
              <dd className="text-xl font-bold text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="mr-preview-rows">
        <h2 id="mr-preview-rows" className="mb-3 text-lg font-bold text-neutral-900">
          Rows
        </h2>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="mr-preview-sheet" className="mb-1 block text-xs font-medium text-neutral-700">
              Sheet
            </label>
            <select id="mr-preview-sheet" value={sheet} onChange={(e) => setSheet(e.target.value)} className={selectClass} style={border}>
              <option value="all">All sheets</option>
              {sheets.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mr-preview-decision" className="mb-1 block text-xs font-medium text-neutral-700">
              Outcome
            </label>
            <select id="mr-preview-decision" value={decision} onChange={(e) => setDecision(e.target.value)} className={selectClass} style={border}>
              <option value="all">All outcomes</option>
              <option value="create">Will be created</option>
              <option value="skip">Skipped</option>
              <option value="error">Errors</option>
            </select>
          </div>
        </div>
        <p className="mb-2 text-sm text-neutral-600" aria-live="polite">
          Showing {visible.length} of {preview.rows.length} rows
        </p>
        <ul className="flex flex-col gap-2">
          {visible.map((row) => (
            <PreviewRowItem
              key={row.rowKey}
              row={row}
              disabled={busy}
              included={!excludedCreates.has(row.rowKey)}
              onToggle={(include) =>
                setExcludedCreates((prev) => {
                  const next = new Set(prev);
                  if (include) next.delete(row.rowKey);
                  else next.add(row.rowKey);
                  return next;
                })
              }
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="mr-commit" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
        <h2 id="mr-commit" className="text-lg font-bold text-neutral-900">
          Commit import
        </h2>
        <label htmlFor="mr-commit-reason" className="mb-1 mt-3 block text-sm font-medium text-neutral-900">
          Reason (required)
        </label>
        <textarea
          id="mr-commit-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          maxLength={1000}
          disabled={busy}
          className={selectClass}
          style={border}
        />
        <label className="mt-4 flex items-start gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={acknowledged}
            disabled={busy}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>
            I reviewed this preview. {toCreate} record{toCreate === 1 ? "" : "s"} will be created as internal research
            records. {errorKeys.length} error row{errorKeys.length === 1 ? "" : "s"}, {createRows.length - toCreate} excluded row
            {createRows.length - toCreate === 1 ? "" : "s"} and all duplicate or ignored rows will not be imported.
          </span>
        </label>
        {expired && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            This preview has expired. Upload the workbook again to import it.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" disabled={!canCommit} aria-busy={busy} onClick={() => void commit()}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {busy
              ? "Importing…"
              : uncertain
                ? "Retry import safely"
                : toCreate === 0
                  ? "Complete import (0 new records)"
                  : `Import ${toCreate} record${toCreate === 1 ? "" : "s"}`}
          </Button>
        </div>
      </section>
    </div>
  );
}

function UploadStep({ onPreview }: { onPreview: (preview: PreviewState) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (next: File | null) => {
    setError(null);
    if (next && !/\.xlsx$/i.test(next.name)) {
      setFile(null);
      setError("Choose an .xlsx workbook.");
      return;
    }
    if (next && next.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setError("This file is larger than 2 MB, the import limit.");
      return;
    }
    setFile(next);
  };

  const upload = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      onPreview(await previewMarketRecordImport(file));
    } catch (caught) {
      setError(uploadErrorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="mr-upload" className="rounded-2xl bg-white p-4 sm:p-6" style={border}>
      <h2 id="mr-upload" className="text-lg font-bold text-neutral-900">
        Choose workbook
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        The server checks the Sellers and Buyers sheets and shows every row with its diagnostics. Nothing is saved until you
        commit.
      </p>
      <label htmlFor="mr-upload-file" className="mb-1 mt-4 block text-sm font-medium text-neutral-900">
        Workbook (.xlsx, up to 2 MB)
      </label>
      <input
        id="mr-upload-file"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={busy}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" disabled={!file || busy} aria-busy={busy} onClick={() => void upload()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
          {busy ? "Checking workbook…" : "Preview import"}
        </Button>
      </div>
    </section>
  );
}

function StoredPreview({ previewId, onCommitted }: { previewId: string; onCommitted: (result: MarketCommitResult) => void }) {
  const state = useBackendData(
    () => fetchMarketRecordImport(previewId),
    [previewId],
    "This preview could not be loaded. It may have expired; upload the workbook again.",
  );
  return (
    <DataBoundary state={state} empty={{ title: "Preview not found" }} loadingLabel="Loading preview…">
      {(preview) =>
        preview.state === "committed" && preview.result ? (
          <CommitOutcome result={preview.result} />
        ) : (
          <PreviewReview preview={preview} onCommitted={onCommitted} />
        )
      }
    </DataBoundary>
  );
}

/**
 * State is scoped to one preview ID, so "Import another workbook" starts
 * clean. After an upload the preview ID goes into the URL and the stored
 * preview is read back, which is the same path a page reload takes.
 */
function ImportStep({ previewId }: { previewId: string | null }) {
  const router = useRouter();
  const [result, setResult] = useState<MarketCommitResult | null>(null);

  if (result) return <CommitOutcome result={result} />;
  if (previewId) return <StoredPreview previewId={previewId} onCommitted={setResult} />;
  return (
    <UploadStep
      onPreview={(preview) =>
        router.replace(`/admin/market-records/import?preview=${encodeURIComponent(preview.previewId)}`, {
          scroll: false,
        })
      }
    />
  );
}

function ImportFlow() {
  const previewId = useSearchParams().get("preview");
  const body = <ImportStep key={previewId ?? "new"} previewId={previewId} />;

  return (
    <MarketRecordShell
      title="Import research workbook"
      description="Preview the workbook, review every row and explicitly commit valid new records."
      backHref="/admin/market-records"
      backLabel="Market records"
    >
      {body}
    </MarketRecordShell>
  );
}

export function MarketRecordsImportPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading import…" />}>
      <ImportFlow />
    </Suspense>
  );
}
