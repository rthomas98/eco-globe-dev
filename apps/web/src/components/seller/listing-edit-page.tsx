"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, RefreshCw, FileText } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { useDemoUser } from "@/lib/demo-user";
import { useListing } from "@/lib/use-listings";
import { describeBackendError } from "@/lib/backend-client";
import { updateListing, type BackendListing, type ListingDocument } from "@/lib/listings-api";
import { describeUnit, parseOptionalNumber } from "@/lib/listing-format";
import {
  CATEGORY_OPTIONS,
  CLAIM_OPTIONS,
  CURRENCY_OPTIONS,
  GRADE_OPTIONS,
  LISTING_TYPE_OPTIONS,
  MATERIAL_TYPE_OPTIONS,
  UNIT_OPTIONS,
  formFromRecord,
  formToWriteBody,
  validateForSubmission,
  validateDraft,
  type ListingForm,
} from "./listing-form";
import { ListingDocumentUploader } from "./listing-documents";
import { ListingLocationPicker, useCompanyLocations } from "./listing-location-picker";

export function SellerListingEditPage({ id }: { id: string }) {
  const router = useRouter();
  const user = useDemoUser();
  const detail = useListing(id, "owned", { enabled: !!user });

  if (!user) return <SellerLayout title="Edit listing"><p className="p-8 text-sm text-neutral-600">Sign in to edit this listing.</p></SellerLayout>;
  if (detail.status === "loading") return <SellerLayout title="Edit listing"><p className="p-8 text-sm text-neutral-600" role="status">Loading listing…</p></SellerLayout>;
  if (detail.status === "not-found") {
    return (
      <SellerLayout title="Edit listing">
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <p className="text-lg font-bold text-neutral-900">Listing not found</p>
          <p className="mt-2 text-sm text-neutral-500">No listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code> belongs to your company.</p>
          <Link href="/seller/listings" className="mt-6"><Button variant="primary" size="md">Back to listings</Button></Link>
        </div>
      </SellerLayout>
    );
  }
  if (detail.status === "error" || !detail.record) {
    return (
      <SellerLayout title="Edit listing">
        <div className="m-8 rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{detail.error}</p>
          <button type="button" onClick={detail.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" /> Retry</button>
        </div>
      </SellerLayout>
    );
  }
  return <EditForm key={detail.record.id} record={detail.record} onSaved={(saved) => { detail.replace(saved); router.push(`/seller/listings/${saved.id}`); }} onCancel={() => router.push(`/seller/listings/${id}`)} />;
}

function EditForm({ record, onSaved, onCancel }: { record: BackendListing; onSaved: (record: BackendListing) => void; onCancel: () => void }) {
  const [form, setForm] = useState<ListingForm>(() => formFromRecord(record));
  const [documents, setDocuments] = useState<ListingDocument[]>(record.documents ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string>(record.listingStatusCode);
  const locations = useCompanyLocations(record.sellerCompanyId);
  const unit = describeUnit(form.unit);
  const hasSds = documents.some((d) => d.documentTypeCode === "sds");

  useEffect(() => { setDocuments(record.documents ?? []); }, [record.documents]);

  const setField = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setForm((prev) => ({ ...prev, [k]: v }));
  const toggleClaim = (c: string) => setField("claims", form.claims.includes(c) ? form.claims.filter((x) => x !== c) : [...form.claims, c]);

  const handleSave = async () => {
    const wantsReview = status === "pending_review" && record.listingStatusCode !== "pending_review";
    const issues = wantsReview ? validateForSubmission(form, hasSds) : validateDraft(form);
    if (issues.length > 0) {
      setError(issues.map((i) => i.message).join(" "));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const nextStatus =
        status !== record.listingStatusCode && status !== "published"
          ? (status as "draft" | "pending_review" | "paused" | "closed")
          : undefined;
      const body = formToWriteBody(form, { listingStatusCode: nextStatus });
      onSaved(await updateListing(record.id, body));
    } catch (err) {
      setError(describeBackendError(err, "The listing could not be saved. Your changes are still on screen; try again."));
    } finally {
      setSaving(false);
    }
  };

  const statusChoices = [
    { value: "draft", label: "Draft" },
    { value: "pending_review", label: "Pending review (submit)" },
    { value: "paused", label: "Paused" },
    { value: "closed", label: "Closed" },
  ];
  if (record.listingStatusCode === "published") statusChoices.unshift({ value: "published", label: "Published (edits return to review)" });

  return (
    <SellerLayout title="Edit listing">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href={`/seller/listings/${record.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"><ArrowLeft className="size-4" />Back to listing</Link>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="md" onClick={() => void handleSave()} disabled={saving} style={saving ? { opacity: 0.6, cursor: "not-allowed" } : undefined}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <h1 className="mb-6 text-3xl font-bold text-neutral-900">Edit listing</h1>

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
                <Select label="Quantity unit" id="unit" options={UNIT_OPTIONS} value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
                <Select label="Currency" id="currency" options={CURRENCY_OPTIONS} value={form.currencyCode} onChange={(e) => setField("currencyCode", e.target.value)} />
                <Input label={`Unit price (${form.currencyCode || "currency"} per ${form.unit ? unit.singular : "unit"})`} id="price" inputMode="decimal" value={form.price} onChange={(e) => setField("price", e.target.value)} />
                <Input label={`Minimum Order Quantity (MOQ) in ${form.unit ? unit.plural : "the chosen unit"}`} id="moq" inputMode="decimal" value={form.moq} onChange={(e) => setField("moq", e.target.value)} />
                <Input label={`Quantity available in ${form.unit ? unit.plural : "the chosen unit"}`} id="qty" inputMode="decimal" value={form.qty} onChange={(e) => setField("qty", e.target.value)} />
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
                      <input type="text" placeholder="Label" value={spec.label} onChange={(e) => setField("additionalSpecs", form.additionalSpecs.map((s, idx) => (idx === i ? { ...s, label: e.target.value } : s)))} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
                      <input type="text" placeholder="Value" value={spec.value} onChange={(e) => setField("additionalSpecs", form.additionalSpecs.map((s, idx) => (idx === i ? { ...s, value: e.target.value } : s)))} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
                      <button type="button" aria-label="Remove spec" onClick={() => setField("additionalSpecs", form.additionalSpecs.filter((_, idx) => idx !== i))} className="flex size-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setField("additionalSpecs", [...form.additionalSpecs, { label: "", value: "" }])} className="flex items-center gap-2 self-start text-sm font-semibold text-neutral-900 hover:underline"><Plus className="size-4" />Add spec</button>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-neutral-900"><FileText className="size-5" />Safety Data Sheet (SDS)</h2>
              <p className="mb-4 text-xs text-neutral-600">Required before the listing can be submitted for review or purchased.</p>
              <ListingDocumentUploader listingId={record.id} typeCode="sds" documents={documents} onChange={setDocuments} multiple={false} required />
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
              <div className="mt-4"><ListingDocumentUploader listingId={record.id} typeCode="certification" documents={documents} onChange={setDocuments} title="Certifications" /></div>
              <div className="mt-4">
                <label htmlFor="sustain-notes" className="mb-1.5 block text-sm font-medium text-neutral-900">Sustainability notes</label>
                <textarea id="sustain-notes" rows={3} value={form.sustainNotes} onChange={(e) => setField("sustainNotes", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Photos</h2>
              <ListingDocumentUploader listingId={record.id} typeCode="photo" documents={documents} onChange={setDocuments} />
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Status</h2>
              <div className="flex flex-col gap-2">
                {statusChoices.map((s) => (
                  <label key={s.value} className="flex cursor-pointer items-center gap-3">
                    <input type="radio" name="status" checked={status === s.value} onChange={() => setStatus(s.value)} className="size-4 accent-neutral-900" />
                    <span className="text-sm text-neutral-900">{s.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-neutral-500">Only EcoGlobe admins can publish. Submitting requires an SDS on file.</p>
            </section>
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Ships from</h2>
              <ListingLocationPicker companyId={record.sellerCompanyId} value={form.locationId} onChange={(id) => setField("locationId", id)} locations={locations} />
            </section>
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Listing ID</h2>
              <p className="rounded-lg bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700">#{record.id} · {record.slug}</p>
            </section>
          </aside>
        </div>
      </div>
    </SellerLayout>
  );
}
