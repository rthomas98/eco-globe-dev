"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import {
  archiveMarketRecord,
  fetchMarketRecord,
  marketRecordErrorDetails,
  restoreMarketRecord,
  reviewMarketRecordField,
  updateMarketRecord,
  type MarketRecord,
  type MarketRecordInput,
  type MarketReview,
  type MarketReviewField,
  type MarketReviewStatus,
} from "@/lib/api-market-records";
import {
  describeResearchPrice,
  describeResearchVolume,
  formatAddressLine,
  formatReviewStamp,
  safeHttpUrl,
} from "@/lib/market-record-format";
import { DataBoundary, ErrorState, useBackendData } from "@/components/shared/data-state";
import {
  AddressPurposeBadge,
  ArchivedBadge,
  FieldStatusBadge,
  RoleBadge,
  SourceCheckedBadge,
  SourceRecordTypeBadge,
} from "./market-record-badges";
import { diffMarketRecordInput, recordToInput } from "./market-record-draft";
import { MarketRecordForm } from "./market-record-form";
import { MarketRecordHistory } from "./market-record-history";
import { MarketRecordReasonDialog } from "./market-record-reason-dialog";
import { MarketRecordReviewDialog } from "./market-record-review-dialog";
import { MarketRecordShell } from "./market-record-shell";

const border = { border: "1px solid #E0E0E0" };

/** Citation text; linked only when it is an absolute http(s) URL. */
export function Citation({ value }: { value: string | null }) {
  if (!value) return <span className="text-neutral-500">No citation</span>;
  const href = safeHttpUrl(value);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-sky-800 underline">
      {value}
    </a>
  ) : (
    <span className="break-words">{value}</span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-neutral-900">{children}</dd>
    </div>
  );
}

function Section({
  title,
  review,
  action,
  children,
}: {
  title: string;
  review?: { field: string; value: MarketReview };
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl bg-white p-4 sm:p-6" style={border}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      <dl className="divide-y divide-neutral-100">
        {children}
        {review && (
          <>
            <Row label="Review status">
              <FieldStatusBadge status={review.value.status} />
            </Row>
            <Row label="Reviewed by">
              {formatReviewStamp(review.value.reviewedByUserName, review.value.reviewedAt)}
            </Row>
            <Row label={`${review.field} citation`}>
              <Citation value={review.value.citation} />
            </Row>
          </>
        )}
      </dl>
    </section>
  );
}

type Dialog = { kind: "archive" } | { kind: "restore" } | { kind: "review"; field: MarketReviewField } | null;

function RecordView({ initial, onReload }: { initial: MarketRecord; onReload: () => void }) {
  const [record, setRecord] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const archived = record.status === "archived";

  const staleMessage = (
    <>
      Someone else changed this record after you opened it, so nothing was saved.{" "}
      <button type="button" onClick={onReload} className="font-semibold underline">
        Load the latest version
      </button>{" "}
      (this discards your unsaved edits; copy anything you need first).
    </>
  );

  const save = async (input: MarketRecordInput, reason: string | null) => {
    if (busy || !reason) return;
    const baseline = recordToInput(record);
    const changes = baseline ? diffMarketRecordInput(baseline, input) : input;
    if (Object.keys(changes).length === 0) {
      setFormError("Nothing changed, so there is nothing to save.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const updated = await updateMarketRecord(record.id, record.version, changes, reason);
      setRecord(updated);
      setEditing(false);
      setNotice("Changes saved.");
    } catch (caught) {
      const details = marketRecordErrorDetails(caught);
      setFieldErrors(details.fieldErrors);
      setFormError(
        details.code === "stale_version" || (details.status === 409 && details.code !== "duplicate_identity")
          ? staleMessage
          : `${describeBackendError(caught, "The changes could not be saved.")} Your edits are still in the form.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const runDialog = async (action: () => Promise<MarketRecord>, done: string) => {
    if (busy) return;
    setBusy(true);
    setDialogError(null);
    try {
      setRecord(await action());
      setDialog(null);
      setNotice(done);
    } catch (caught) {
      const details = marketRecordErrorDetails(caught);
      setDialogError(
        details.code === "stale_version"
          ? "This record changed since you opened it. Close this dialog and load the latest version."
          : describeBackendError(caught, "The change could not be saved."),
      );
    } finally {
      setBusy(false);
    }
  };

  const openDialog = (next: Dialog) => {
    setDialogError(null);
    setNotice(null);
    setDialog(next);
  };

  const reviewAction = (field: MarketReviewField) =>
    archived ? undefined : (
      <Button type="button" variant="secondary" size="sm" style={border} onClick={() => openDialog({ kind: "review", field })}>
        Review
      </Button>
    );

  const price = describeResearchPrice(record.price);
  const volume = describeResearchVolume(record.volume);
  const title = record.facilityName ? `${record.companyName} · ${record.facilityName}` : record.companyName;

  return (
    <MarketRecordShell
      title={title}
      description={`Record #${record.id}`}
      backHref="/admin/market-records"
      backLabel="Market records"
      actions={
        editing ? undefined : (
          <>
            {!archived && (
              <Button type="button" size="sm" onClick={() => { setNotice(null); setFormError(null); setEditing(true); }}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit
              </Button>
            )}
            {archived ? (
              <Button type="button" variant="secondary" size="sm" style={border} onClick={() => openDialog({ kind: "restore" })}>
                <ArchiveRestore className="size-4" aria-hidden="true" />
                Restore
              </Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" style={border} onClick={() => openDialog({ kind: "archive" })}>
                <Archive className="size-4" aria-hidden="true" />
                Archive
              </Button>
            )}
          </>
        )
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <RoleBadge role={record.role} />
        <SourceRecordTypeBadge code={record.sourceRecordType} />
        <SourceCheckedBadge checked={record.sourceChecked} />
        {archived && <ArchivedBadge />}
      </div>
      <p role="status" className="mb-4 text-sm text-emerald-800 empty:hidden">
        {notice}
      </p>
      {archived && (
        <p className="mb-4 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-800">
          Archived {record.archivedAt ? new Date(record.archivedAt).toLocaleDateString("en-US") : ""} by{" "}
          {record.archivedByUserName ?? "unknown admin"}
          {record.archiveReason ? `: ${record.archiveReason}` : ""}. Restore it to edit or review.
        </p>
      )}

      {editing ? (
        <MarketRecordForm
          key={record.version}
          record={record}
          mode="edit"
          busy={busy}
          error={formError}
          serverFieldErrors={fieldErrors}
          onSubmit={(input, reason) => void save(input, reason)}
          onCancel={() => {
            setEditing(false);
            setFormError(null);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Section title="Company and source">
            <Row label="Company">{record.companyName}</Row>
            <Row label="Facility">{record.facilityName ?? "Unknown"}</Row>
            <Row label="Source check claim">
              <SourceCheckedBadge checked={record.sourceChecked} />
              <p className="mt-1 text-xs text-neutral-500">
                What the source states. It does not confirm any field below and is not KYC.
              </p>
            </Row>
            <Row label="Original source checker">
              {record.sourceCheckedBy ?? "Not stated by the source"}
              {record.sourceCheckedAt ? ` · ${new Date(record.sourceCheckedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}` : ""}
            </Row>
            <Row label="Source citation">
              <Citation value={record.sourceCitation} />
            </Row>
          </Section>

          <Section title="Feedstock">
            <Row label="Feedstock">{record.feedstock}</Row>
            <Row label="Feedstock group">{record.feedstockGroup ?? "Unknown"}</Row>
            {record.role === "buyer" && <Row label="Buyer need">{record.buyerNeed ?? "Not stated"}</Row>}
          </Section>

          <Section title="Address" review={{ field: "Address", value: record.addressReview }} action={reviewAction("address")}>
            <Row label="Address">{formatAddressLine(record.address)}</Row>
            <Row label="Address role">
              <AddressPurposeBadge purpose={record.address.purpose} />
            </Row>
            <Row label="Address source">
              <Citation value={record.addressSource} />
            </Row>
          </Section>

          <Section title="Annual volume" review={{ field: "Volume", value: record.volume }} action={reviewAction("volume")}>
            <Row label="Annual volume">{volume.label}</Row>
          </Section>

          <Section title="Research price" review={{ field: "Price", value: record.price }} action={reviewAction("price")}>
            <Row label="Research price">
              {price.label}
              {price.kind === "gate_fee" && (
                <p className="mt-1 text-xs text-neutral-500">The seller pays to dispose of this material.</p>
              )}
            </Row>
          </Section>

          <Section title="Provenance">
            <Row label="Import">{record.importBatchId ?? "Entered directly"}</Row>
            <Row label="Source row">{record.sourceRowRef ?? "—"}</Row>
            <Row label="Created">
              {new Date(record.createdAt).toLocaleString("en-US")} by {record.createdByUserName ?? `user #${record.createdByUserId}`}
            </Row>
            <Row label="Last updated">
              {new Date(record.updatedAt).toLocaleString("en-US")} by {record.updatedByUserName ?? `user #${record.updatedByUserId}`}
            </Row>
          </Section>
        </div>
      )}

      <MarketRecordHistory recordId={record.id} refreshKey={record.version} />

      {dialog?.kind === "archive" && (
        <MarketRecordReasonDialog
          title="Archive this record?"
          description="It leaves the active list but keeps its ID and history. You can restore it later."
          confirmLabel="Archive"
          reasonRequired
          busy={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(reason) =>
            void runDialog(() => archiveMarketRecord(record.id, record.version, reason), "Record archived.")
          }
        />
      )}
      {dialog?.kind === "restore" && (
        <MarketRecordReasonDialog
          title="Restore this record?"
          description="It returns to the active list with the same ID."
          confirmLabel="Restore"
          reasonRequired
          busy={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(reason) =>
            void runDialog(() => restoreMarketRecord(record.id, record.version, reason), "Record restored.")
          }
        />
      )}
      {dialog?.kind === "review" && (
        <MarketRecordReviewDialog
          field={dialog.field}
          currentStatus={reviewOf(record, dialog.field).status}
          currentCitation={reviewOf(record, dialog.field).citation}
          valuePresent={valuePresent(record, dialog.field)}
          busy={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(input: { status: MarketReviewStatus; citation: string | null; reason: string }) =>
            void runDialog(
              () => reviewMarketRecordField(record.id, dialog.field, { expectedVersion: record.version, ...input }),
              "Review saved.",
            )
          }
        />
      )}
    </MarketRecordShell>
  );
}

function reviewOf(record: MarketRecord, field: MarketReviewField): MarketReview {
  return field === "address" ? record.addressReview : record[field];
}

/** Mirrors the backend's completeness rule for a confirmed review. */
function valuePresent(record: MarketRecord, field: MarketReviewField) {
  if (field === "price")
    return record.price.value !== null && record.price.currencyCode !== null && record.price.perUnit !== null;
  if (field === "volume") return record.volume.value !== null && record.volume.unit !== null;
  const a = record.address;
  return Boolean(a.street && a.city && a.postalCode && a.countryCode);
}

export function MarketRecordDetailPage({ id }: { id: string }) {
  const recordId = /^\d+$/.test(id) ? Number(id) : null;
  const state = useBackendData(
    () => (recordId === null ? Promise.reject(new Error("Invalid record ID.")) : fetchMarketRecord(recordId)),
    [recordId],
    "This record could not be loaded.",
  );

  if (recordId === null)
    return (
      <MarketRecordShell title="Record not found" backHref="/admin/market-records" backLabel="Market records">
        <ErrorState message="This record ID is not valid." />
      </MarketRecordShell>
    );

  return (
    <DataBoundary state={state} empty={{ title: "Record not found" }} loadingLabel="Loading record…">
      {(record) => <RecordView key={record.version} initial={record} onReload={state.reload} />}
    </DataBoundary>
  );
}
