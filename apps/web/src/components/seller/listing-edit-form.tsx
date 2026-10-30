"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { describeBackendError } from "@/lib/backend-client";
import { fetchListing, updateListing, type BackendListing, type ListingDocument, type ListingStatusCode } from "@/lib/listings-api";
import { describeUnit, parseOptionalNumber } from "@/lib/listing-format";
import {
  createListingStatusSync,
  requiresSubmissionValidation,
  type ListingStatusState,
  type SubmissionValidationPolicy,
} from "@/lib/listing-edit-status";
import {
  DEMO_LISTING_SUBMIT_BLOCKED,
  DEMO_PRICE_ESTIMATE_LABEL,
  DEMO_VOLUME_ESTIMATE_LABEL,
  listingStatusAllowedWithDemo,
  readDemoEstimates,
} from "@/lib/demo-estimates";
import { DemoEstimateBadge } from "@/components/shared/demo-estimate-badges";
import {
  CATEGORY_OPTIONS,
  CLAIM_OPTIONS,
  CURRENCY_OPTIONS,
  GRADE_OPTIONS,
  LISTING_TYPE_OPTIONS,
  MATERIAL_TYPE_OPTIONS,
  unitOptionsFor,
  formFromRecord,
  formToWriteBody,
  validateForSubmission,
  validateDraft,
  type ListingForm,
} from "./listing-form";
import { ListingDocumentUploader } from "./listing-documents";
import { ListingLocationPicker, useCompanyLocations } from "./listing-location-picker";

export interface ListingStatusChoice {
  value: ListingStatusCode;
  label: string;
}

export interface ListingEditFormProps {
  record: BackendListing;
  onSaved: (record: BackendListing) => void;
  onCancel: () => void;
  /** Status radio options, in display order. */
  statusChoices: ListingStatusChoice[];
  /** Statuses this editor may write; picking any other leaves the saved status unchanged. */
  writableStatuses: readonly ListingStatusCode[];
  /** Moving into one of these statuses runs the full submission checks (including the SDS). */
  submissionStatuses: readonly ListingStatusCode[];
  /** When the submission checks run; defaults to only on a move into a submission status. */
  submissionValidation?: SubmissionValidationPolicy;
  statusHelp: string;
  /** Header back link; omit when the surrounding page already provides one. */
  backLink?: { href: string; label: string };
  /** Page heading; omit when the surrounding page already renders one. */
  title?: string;
  className?: string;
}

/** Listing edit form shared by the seller and admin portals; callers supply the layout. */
export function ListingEditForm({
  record,
  onSaved,
  onCancel,
  statusChoices,
  writableStatuses,
  submissionStatuses,
  submissionValidation = "on-change",
  statusHelp,
  backLink,
  title,
  className = "px-4 py-6 sm:px-8 sm:py-8",
}: ListingEditFormProps) {
  const [form, setForm] = useState<ListingForm>(() => formFromRecord(record));
  const [documents, setDocuments] = useState<ListingDocument[]>(record.documents ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Document uploads and removals can change the listing status server-side; the sync blocks
  // Save from the start of each request until the re-read after it confirms the baseline.
  const [statusState, setStatusState] = useState<ListingStatusState | null>(null);
  const [statusSync] = useState(() =>
    createListingStatusSync({
      initialStatus: record.listingStatusCode,
      fetchServerStatus: async () => (await fetchListing(String(record.id), "owned"))?.listingStatusCode,
      choices: statusChoices,
      writableStatuses,
      submissionStatuses,
      onChange: setStatusState,
    }),
  );
  const { selected: status, notice: statusNotice, sync } = statusState ?? statusSync.getState();
  const statusConfirmed = sync === "idle";
  // Owned listings are never teasers, so the seller company id is always present.
  const sellerCompanyId = record.sellerCompanyId ?? undefined;
  const locations = useCompanyLocations(sellerCompanyId);
  const unit = describeUnit(form.unit);
  const hasSds = documents.some((d) => d.documentTypeCode === "sds");
  const demo = readDemoEstimates(form.description);

  useEffect(() => { setDocuments(record.documents ?? []); }, [record.documents]);
  // SDS-request notifications link to #sds; the form mounts after the listing loads.
  useEffect(() => { if (window.location.hash === "#sds") document.getElementById("sds")?.scrollIntoView({ block: "start" }); }, []);

  const setField = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setForm((prev) => ({ ...prev, [k]: v }));

  // Unsaved form fields are left untouched; only the status baseline is re-read.
  const documentUploaderProps = {
    listingId: record.id,
    documents,
    onChange: setDocuments,
    onMutationStart: statusSync.beginMutation,
    onMutationSettled: () => void statusSync.endMutation(),
  };
  const toggleClaim = (c: string) => setField("claims", form.claims.includes(c) ? form.claims.filter((x) => x !== c) : [...form.claims, c]);

  const handleSave = async () => {
    const decision = statusSync.decideSave();
    if (!decision.ok) return;
    const { target, serverStatus, listingStatusCode } = decision;
    if (!listingStatusAllowedWithDemo(target, demo)) {
      setError(`${DEMO_LISTING_SUBMIT_BLOCKED} Choose Draft to save your edits.`);
      return;
    }
    const submitting = requiresSubmissionValidation({ target, serverStatus, submissionStatuses, policy: submissionValidation });
    const issues = submitting ? validateForSubmission(form, hasSds) : validateDraft(form);
    if (issues.length > 0) {
      setError(issues.map((i) => i.message).join(" "));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = formToWriteBody(form, { listingStatusCode: listingStatusCode as ListingStatusCode | undefined });
      onSaved(await updateListing(record.id, body));
    } catch (err) {
      setError(describeBackendError(err, "The listing could not be saved. Your changes are still on screen; try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className={className}>
        <div className={`mb-6 flex flex-wrap items-center gap-4 ${backLink ? "justify-between" : "justify-end"}`}>
          {backLink && <Link href={backLink.href} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"><ArrowLeft className="size-4" />{backLink.label}</Link>}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="md" onClick={() => void handleSave()} disabled={saving || !statusConfirmed} style={saving || !statusConfirmed ? { opacity: 0.6, cursor: "not-allowed" } : undefined}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        {title && <h1 className="mb-6 text-3xl font-bold text-neutral-900">{title}</h1>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Basics</h2>
              <div className="flex flex-col gap-4">
                <Input label="Listing name" id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select label="Category" id="category" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => setField("category", e.target.value)} />
                  <Select label="Material type" id="material-type" options={MATERIAL_TYPE_OPTIONS} value={form.materialTypeCode} onChange={(e) => setField("materialTypeCode", e.target.value)} />
                </div>
                {form.category === "Others" && <Input label="Describe the material" id="material-other" value={form.material} onChange={(e) => setField("material", e.target.value)} />}
                <div>
                  <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-neutral-900">Description</label>
                  <textarea id="description" rows={5} value={form.description} onChange={(e) => setField("description", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Pricing & supply</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Quantity unit" id="unit" options={unitOptionsFor(form.unit)} value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
                <Select label="Currency" id="currency" options={CURRENCY_OPTIONS} value={form.currencyCode} onChange={(e) => setField("currencyCode", e.target.value)} />
                <div>
                  <Input label={`Unit price (${form.currencyCode || "currency"} per ${form.unit ? unit.singular : "unit"})`} id="price" inputMode="decimal" value={form.price} onChange={(e) => setField("price", e.target.value)} />
                  {demo.price && <div className="mt-1"><DemoEstimateBadge label={DEMO_PRICE_ESTIMATE_LABEL} /></div>}
                </div>
                <Input label={`Minimum Order Quantity (MOQ) in ${form.unit ? unit.plural : "the chosen unit"}`} id="moq" inputMode="decimal" value={form.moq} onChange={(e) => setField("moq", e.target.value)} />
                <div>
                  <Input label={`${demo.volume ? "Quantity" : "Quantity available"} in ${form.unit ? unit.plural : "the chosen unit"}`} id="qty" inputMode="decimal" value={form.qty} onChange={(e) => setField("qty", e.target.value)} />
                  {demo.volume && <div className="mt-1"><DemoEstimateBadge label={DEMO_VOLUME_ESTIMATE_LABEL} /></div>}
                </div>
              </div>
              {(() => { const q = parseOptionalNumber(form.qty); const m = parseOptionalNumber(form.moq); return q !== null && m !== null && m > q ? <p className="mt-2 text-xs text-red-700">MOQ cannot exceed the available quantity.</p> : null; })()}
              <p className="mt-2 text-xs text-neutral-500">Blank price means no price yet; enter 0 only if the material is offered at no charge.</p>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Specifications</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Composition" id="composition" value={form.composition} onChange={(e) => setField("composition", e.target.value)} />
                <Input label="Quality" id="quality" value={form.quality} onChange={(e) => setField("quality", e.target.value)} />
                <Select label="Feedstock state" id="state" options={[{ value: "Solid", label: "Solid" }, { value: "Liquid", label: "Liquid" }, { value: "Gas", label: "Gas" }]} value={form.state} onChange={(e) => setField("state", e.target.value)} />
                <Select label="Frequency" id="frequency" options={["One-time", "Weekly", "Biweekly", "Monthly", "Bimonthly", "Twice a year", "Quarterly", "Yearly"].map((v) => ({ value: v, label: v }))} value={form.frequency} onChange={(e) => setField("frequency", e.target.value)} />
                <Input label="Available from" id="from" type="date" value={form.availabilityFrom} onChange={(e) => setField("availabilityFrom", e.target.value)} />
                <Input label="Available to" id="to" type="date" value={form.availabilityTo} onChange={(e) => setField("availabilityTo", e.target.value)} />
                <Input label="Material composition (detail)" id="material" value={form.material} onChange={(e) => setField("material", e.target.value)} />
                <Select label="Listing type" id="lt" options={LISTING_TYPE_OPTIONS} value={form.listingType} onChange={(e) => setField("listingType", e.target.value)} />
                <Select label="Grade / purity" id="grade" options={GRADE_OPTIONS} value={form.grade} onChange={(e) => setField("grade", e.target.value)} />
                <Input label="Color" id="color" value={form.color} onChange={(e) => setField("color", e.target.value)} />
                <Input label="Shelf life" id="shelf" value={form.shelfLife} onChange={(e) => setField("shelfLife", e.target.value)} />
                <Input label="Storage & handling" id="storage" value={form.storage} onChange={(e) => setField("storage", e.target.value)} />
                <Input label="Package" id="package" value={form.pkg} onChange={(e) => setField("pkg", e.target.value)} />
                <Input label="Weight" id="weight" value={form.weight} onChange={(e) => setField("weight", e.target.value)} />
                <Input label="Usage" id="usage" value={form.usage} onChange={(e) => setField("usage", e.target.value)} />
                <Input label="Place of origin" id="origin" value={form.origin} onChange={(e) => setField("origin", e.target.value)} />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-neutral-900">Additional specs</p>
                <div className="flex flex-col gap-2">
                  {form.additionalSpecs.map((spec, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" placeholder="Label" aria-label={`Spec ${i + 1} label`} value={spec.label} onChange={(e) => setField("additionalSpecs", form.additionalSpecs.map((s, idx) => (idx === i ? { ...s, label: e.target.value } : s)))} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
                      <input type="text" placeholder="Value" aria-label={`Spec ${i + 1} value`} value={spec.value} onChange={(e) => setField("additionalSpecs", form.additionalSpecs.map((s, idx) => (idx === i ? { ...s, value: e.target.value } : s)))} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
                      <button type="button" aria-label="Remove spec" onClick={() => setField("additionalSpecs", form.additionalSpecs.filter((_, idx) => idx !== i))} className="flex size-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setField("additionalSpecs", [...form.additionalSpecs, { label: "", value: "" }])} className="flex items-center gap-2 self-start text-sm font-semibold text-neutral-900 hover:underline"><Plus className="size-4" />Add spec</button>
                </div>
              </div>
            </section>

            <section id="sds" className="scroll-mt-6 rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-neutral-900"><FileText className="size-5" />Safety Data Sheet (SDS)</h2>
              <p className="mb-4 text-xs text-neutral-600">Required before the listing can be submitted for review or purchased.</p>
              <ListingDocumentUploader {...documentUploaderProps} typeCode="sds" multiple={false} required />
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Sustainability claims & certifications</h2>
              <div className="grid grid-cols-2 gap-3">
                {CLAIM_OPTIONS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.claims.includes(c)} onChange={() => toggleClaim(c)} className="size-4 rounded accent-neutral-900" /> {c}</label>
                ))}
              </div>
              {form.customClaims.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {form.customClaims.map((claim) => (
                    <li key={claim} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-800">
                      {claim}
                      <button type="button" aria-label={`Remove claim ${claim}`} onClick={() => setField("customClaims", form.customClaims.filter((c) => c !== claim))} className="text-neutral-500 hover:text-red-600">×</button>
                    </li>
                  ))}
                </ul>
              )}
              {form.claims.includes("Others") && <div className="mt-3"><Input label="Describe the other claim" id="other-claim" value={form.otherClaim} onChange={(e) => setField("otherClaim", e.target.value)} /></div>}
              <div className="mt-4"><ListingDocumentUploader {...documentUploaderProps} typeCode="certification" title="Certifications" /></div>
              <div className="mt-4">
                <label htmlFor="sustain-notes" className="mb-1.5 block text-sm font-medium text-neutral-900">Sustainability notes</label>
                <textarea id="sustain-notes" rows={3} value={form.sustainNotes} onChange={(e) => setField("sustainNotes", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-2 text-lg font-semibold text-neutral-900">Technical documents</h2>
              <p className="mb-4 text-xs text-neutral-600">Optional TDS and COA files buyers can download from the product page.</p>
              <div className="flex flex-col gap-4">
                <ListingDocumentUploader {...documentUploaderProps} typeCode="tds" multiple={false} title="Technical Data Sheet (TDS)" />
                <ListingDocumentUploader {...documentUploaderProps} typeCode="coa" multiple={false} title="Certificate of Analysis (COA)" />
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Photos</h2>
              <ListingDocumentUploader {...documentUploaderProps} typeCode="photo" />
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Status</h2>
              <div className="flex flex-col gap-2">
                {statusChoices.map((s) => (
                  <label key={s.value} className="flex cursor-pointer items-center gap-3">
                    <input type="radio" name="status" checked={status === s.value} onChange={() => statusSync.select(s.value)} disabled={!statusConfirmed || !listingStatusAllowedWithDemo(s.value, demo)} className="size-4 accent-neutral-900" />
                    <span className={`text-sm ${listingStatusAllowedWithDemo(s.value, demo) ? "text-neutral-900" : "text-neutral-400"}`}>{s.label}</span>
                  </label>
                ))}
              </div>
              {sync === "pending" && <p className="mt-3 text-xs text-neutral-500" role="status">Checking listing status…</p>}
              {sync === "failed" && (
                <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                  <p>Could not confirm the listing status after the document change, so saving is paused. Retry, or reload the page.</p>
                  <button type="button" onClick={() => void statusSync.refresh()} className="mt-1 font-semibold underline">Retry</button>
                </div>
              )}
              {statusNotice && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">{statusNotice}</p>}
              <p className="mt-3 text-xs text-neutral-500">{statusHelp}</p>
              {demo.marker && <p className="mt-2 text-xs text-amber-800" role="status">{DEMO_LISTING_SUBMIT_BLOCKED} Drafts can still be saved.</p>}
            </section>
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Ships from</h2>
              <ListingLocationPicker companyId={sellerCompanyId} value={form.locationId} onChange={(id) => setField("locationId", id)} locations={locations} />
            </section>
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Listing ID</h2>
              <p className="rounded-lg bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700">#{record.id} · {record.slug}</p>
            </section>
          </aside>
        </div>
      </div>
  );
}
