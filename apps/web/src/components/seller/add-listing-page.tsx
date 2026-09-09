"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Plus, FileText, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { ListingMap, type MapListing } from "../public/listing-map";
import { useDemoUser } from "@/lib/demo-user";
import { CarbonCalculatorButton } from "@/components/buyer/carbon-calculator-button";
import {
  getLocalListingDraft,
  legacyDraftToForm,
  removeLocalListingDraft,
  saveLocalListingDraft,
} from "@/lib/custom-listings";
import { describeBackendError } from "@/lib/backend-client";
import {
  createListing,
  updateListing,
  type BackendListing,
  type ListingDocument,
} from "@/lib/listings-api";
import { toListing } from "@/lib/listing-view";
import {
  describePrice,
  formatQuantityWithUnitName,
  describeUnit,
  parseOptionalNumber,
} from "@/lib/listing-format";
import {
  CATEGORY_OPTIONS,
  CLAIM_OPTIONS,
  CURRENCY_OPTIONS,
  GRADE_OPTIONS,
  LISTING_TYPE_OPTIONS,
  MATERIAL_TYPE_OPTIONS,
  unitOptionsFor,
  emptyListingForm,
  formToWriteBody,
  mergeListingForm,
  validateDraft,
  validateForSubmission,
  type ListingForm,
} from "./listing-form";
import { ListingDocumentUploader } from "./listing-documents";
import {
  ListingLocationPicker,
  formatCompanyLocation,
  useCompanyLocations,
} from "./listing-location-picker";

/** Reads a File as raw base64 (no data-URL prefix). */
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL = 7;

function StepLayout({
  step,
  children,
  onBack,
  onNext,
  onSave,
  nextLabel,
  notice,
  busy,
}: {
  step: Step;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSave?: () => void;
  nextLabel?: string;
  notice?: React.ReactNode;
  busy?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
        <h2 className="text-base font-bold text-neutral-900">Add Listing</h2>
        <button type="button" aria-label="Close" onClick={() => router.push("/seller/listings")} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
      </header>
      <div className="flex flex-1 justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8"><div className="w-full max-w-[600px]">{children}</div></div>
      <div className="relative">
        <div className="h-1 w-full bg-neutral-100"><div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(step / TOTAL) * 100}%` }} /></div>
        {notice && <div className="px-4 pt-3 sm:px-6">{notice}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Button variant="secondary" size="md" onClick={onBack} disabled={busy}>Back</Button>
          <Button variant="primary" size="md" onClick={onNext} disabled={busy} className="min-w-[140px] sm:min-w-[160px]">{nextLabel ?? "Next"}</Button>
          {onSave ? <Button variant="secondary" size="md" onClick={onSave} disabled={busy} className="w-full sm:w-auto">{busy ? "Saving…" : "Save as Draft"}</Button> : <div className="hidden sm:block" />}
        </div>
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 text-blue-800",
    error: "bg-red-50 text-red-700",
    success: "bg-green-50 text-green-800",
  } as const;
  return <p className={`rounded-lg px-4 py-2 text-sm ${styles[tone]}`}>{children}</p>;
}

function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-900">{label}</label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
        style={{ border: "1px solid #E0E0E0" }}
      />
    </div>
  );
}


export function AddListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useDemoUser();
  const sellerCompany = useMemo(() => {
    if (!user) return undefined;
    const companies = user.companies ?? [];
    return (
      companies.find((c) => c.id === user.activeCompanyId) ??
      companies.find((c) => c.companyTypeCode === "seller" || c.companyTypeCode === "both")
    );
  }, [user]);
  const companyId = sellerCompany?.id;
  const locations = useCompanyLocations(companyId);

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ListingForm>(emptyListingForm);
  const [record, setRecord] = useState<BackendListing | null>(null);
  const [documents, setDocuments] = useState<ListingDocument[]>([]);
  const [localDraftId, setLocalDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);

  // Resume a preserved browser-only draft when requested.
  const draftParam = searchParams.get("draft");
  useEffect(() => {
    if (!draftParam) return;
    const draft = getLocalListingDraft(draftParam);
    if (!draft) {
      setNotice({ tone: "error", text: "That local draft is no longer on this device." });
      return;
    }
    setForm(mergeListingForm(legacyDraftToForm(draft)));
    setLocalDraftId(draft.id);
    setNotice({ tone: "info", text: `Resumed "${draft.title}" from this device. It is not on EcoGlobe until you save it.` });
  }, [draftParam]);

  const up = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setForm((p) => ({ ...p, [k]: v }));
  const toggleClaim = (c: string) => up("claims", form.claims.includes(c) ? form.claims.filter((x) => x !== c) : [...form.claims, c]);
  const addSpecRow = () => up("additionalSpecs", [...form.additionalSpecs, { label: "", value: "" }]);
  const updateSpecRow = (i: number, key: "label" | "value", v: string) =>
    up("additionalSpecs", form.additionalSpecs.map((s, idx) => (idx === i ? { ...s, [key]: v } : s)));
  const removeSpecRow = (i: number) => up("additionalSpecs", form.additionalSpecs.filter((_, idx) => idx !== i));

  const selectedLocation = locations.locations.find((l) => String(l.id) === form.locationId);
  const hasSds = documents.some((d) => d.documentTypeCode === "sds");
  const unit = describeUnit(form.unit);

  /** Create or update the backend draft with the full form. Returns the saved record or null. */
  const persistDraft = async (statusCode?: "draft" | "pending_review") => {
    const issues = validateDraft(form);
    if (issues.length > 0) {
      setNotice({ tone: "error", text: issues.map((i) => i.message).join(" ") });
      return null;
    }
    if (!companyId) {
      setNotice({ tone: "error", text: "Complete seller onboarding before saving a listing." });
      return null;
    }
    setBusy(true);
    setNotice(null);
    try {
      const body = formToWriteBody(form, {
        sellerCompanyId: record ? undefined : companyId,
        listingStatusCode: statusCode,
      });
      const saved = record ? await updateListing(record.id, body) : await createListing(body);
      setRecord(saved);
      if (saved.documents) setDocuments(saved.documents);
      if (localDraftId) {
        removeLocalListingDraft(localDraftId);
        setLocalDraftId(null);
      }
      return saved;
    } catch (error) {
      const message = describeBackendError(error, "The listing could not be saved.");
      // Keep the seller's work: preserve it on this device without dropping anything.
      const local = saveLocalListingDraft(form, localDraftId ?? undefined);
      setLocalDraftId(local.id);
      setNotice({
        tone: "error",
        text: `${message} Your entries were kept on this device as a local draft; use Save as Draft to retry.`,
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDraft = async () => {
    const saved = await persistDraft("draft");
    if (saved) {
      setNotice({ tone: "success", text: `Draft saved to EcoGlobe as listing #${saved.id}. You can keep editing or return later.` });
    }
  };

  const handleSubmit = async () => {
    const issues = validateForSubmission(form, hasSds);
    if (issues.length > 0) {
      const saved = await persistDraft("draft");
      setNotice({
        tone: "error",
        text: `${saved ? "Saved as draft. " : ""}Before submitting: ${issues.map((i) => i.message).join(" ")}`,
      });
      return;
    }
    const saved = await persistDraft("pending_review");
    if (saved) router.push(`/seller/listings/${saved.id}`);
  };

  const cats = CATEGORY_OPTIONS;
  const previewListing = record ? toListing({ ...record, documents }) : null;
  const price = describePrice(parseOptionalNumber(form.price), form.currencyCode, form.unit);
  const moqLabel = formatQuantityWithUnitName(parseOptionalNumber(form.moq), form.unit);
  const qtyLabel = formatQuantityWithUnitName(parseOptionalNumber(form.qty), form.unit);
  const photos = documents.filter((d) => d.documentTypeCode === "photo");
  const previewMapListing: MapListing | null =
    selectedLocation && selectedLocation.latitude !== null && selectedLocation.longitude !== null
      ? {
          id: record ? String(record.id) : "preview",
          title: form.name || "Untitled listing",
          location: formatCompanyLocation(selectedLocation),
          price: price.label,
          unit: price.perUnit,
          moq: moqLabel ?? "—",
          co2: "—",
          lng: selectedLocation.longitude,
          lat: selectedLocation.latitude,
          image: previewListing?.image ?? undefined,
        }
      : null;

  const noticeNode = notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : undefined;
  const sharedProps = { onSave: () => void handleSaveDraft(), notice: noticeNode, busy };

  const specs: Array<[string, string]> = [
    ["Category", form.category],
    ["Material type", MATERIAL_TYPE_OPTIONS.find((m) => m.value === form.materialTypeCode)?.label ?? ""],
    ["Material composition", form.material || form.composition],
    ["Listing type", form.listingType],
    ["Grade / purity", form.grade],
    ["Color", form.color],
    ["Shelf life", form.shelfLife],
    ["Storage & handling", form.storage],
    ["Package", form.pkg],
    ["Weight", form.weight],
    ["Usage", form.usage],
    ["Place of origin", form.origin],
    ["Quality", form.quality],
    ["Feedstock state", form.state],
    ["Frequency", form.frequency],
    ["Available from", form.availabilityFrom],
    ["Available to", form.availabilityTo],
    ["Available quantity", qtyLabel ?? ""],
    ...form.additionalSpecs.map<[string, string]>((s) => [s.label, s.value]),
  ].filter(([k, v]) => k.trim() && v.trim()) as Array<[string, string]>;

  return (
    <>
      {step === 1 && (
        <StepLayout step={1} onBack={() => router.push("/seller/listings")} onNext={() => setStep(2)} {...sharedProps}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Listing information</h1>
          <div className="flex flex-col gap-6">
            {sellerCompany ? (
              <p className="text-sm text-neutral-600">
                Listing for <span className="font-semibold text-neutral-900">{sellerCompany.legalName}</span>
              </p>
            ) : (
              <Notice tone="error">No active seller company found on your session. Complete seller onboarding first.</Notice>
            )}
            <Input label="Listing name" id="name" value={form.name} onChange={(e) => up("name", e.target.value)} />
            <Select label="Listing category" id="cat" options={cats} value={form.category} onChange={(e) => up("category", e.target.value)} />
            {form.category === "Others" && (
              <Input
                label="Describe the material"
                id="material-other"
                placeholder="What is this feedstock?"
                value={form.material}
                onChange={(e) => up("material", e.target.value)}
              />
            )}
            <Select label="Material type (marketplace classification)" id="material-type" options={MATERIAL_TYPE_OPTIONS} value={form.materialTypeCode} onChange={(e) => up("materialTypeCode", e.target.value)} />
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-900">Ships from</p>
              <ListingLocationPicker companyId={companyId} value={form.locationId} onChange={(id) => up("locationId", id)} locations={locations} />
            </div>
            <ListingDocumentUploader
              listingId={record?.id ?? null}
              typeCode="photo"
              documents={documents}
              onChange={setDocuments}
              title="Listing photos"
              hint={record ? undefined : "Save as Draft first, then add photos. Accepts PNG, JPEG or WebP up to 5 MB each."}
            />
          </div>
        </StepLayout>
      )}

      {step === 2 && (
        <StepLayout step={2} onBack={() => setStep(1)} onNext={() => setStep(3)} {...sharedProps}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Specifications</h1>
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-900">Origin map preview</p>
              <div className="h-[260px] overflow-hidden rounded-xl">
                <ListingMap listings={previewMapListing ? [previewMapListing] : []} activeId={previewMapListing?.id} />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {previewMapListing
                  ? `Shipping from ${selectedLocation?.name}.`
                  : "Choose a facility with saved coordinates to preview the origin on the map."}
              </p>
            </div>
            <TextArea id="quality" label="Quality" value={form.quality} onChange={(v) => up("quality", v)} placeholder="Describe purity, grade, or quality benchmarks" />
            <TextArea id="composition" label="Composition" value={form.composition} onChange={(v) => up("composition", v)} placeholder="Material composition (e.g., C 60%, H 5%, O 20%)" />
            <Select label="Feedstock state" id="state" options={[{ value: "Solid", label: "Solid" }, { value: "Liquid", label: "Liquid" }, { value: "Gas", label: "Gas" }]} value={form.state} onChange={(e) => up("state", e.target.value)} />
            {!form.state && <p className="-mt-3 text-xs text-neutral-500">Required before submitting for review.</p>}
            <Select
              label="Frequency"
              id="freq"
              options={["One-time", "Weekly", "Biweekly", "Monthly", "Bimonthly", "Twice a year", "Quarterly", "Yearly"].map((v) => ({ value: v, label: v }))}
              value={form.frequency}
              onChange={(e) => up("frequency", e.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="availability-from" className="mb-1.5 block text-sm font-medium text-neutral-900">Available from</label>
                <input id="availability-from" type="date" value={form.availabilityFrom} onChange={(e) => up("availabilityFrom", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
              </div>
              <div>
                <label htmlFor="availability-to" className="mb-1.5 block text-sm font-medium text-neutral-900">Available to</label>
                <input id="availability-to" type="date" value={form.availabilityTo} onChange={(e) => up("availabilityTo", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-900">Additional specs</label>
              <p className="mb-3 text-xs text-neutral-500">Add anything specific to this feedstock — sulfur %, moisture %, pellet dimension, etc.</p>
              <div className="flex flex-col gap-2">
                {form.additionalSpecs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" placeholder="Label" value={spec.label} onChange={(e) => updateSpecRow(i, "label", e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0" }} />
                    <input type="text" placeholder="Value" value={spec.value} onChange={(e) => updateSpecRow(i, "value", e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0" }} />
                    <button type="button" onClick={() => removeSpecRow(i)} aria-label="Remove spec" className="flex size-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"><Trash2 className="size-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addSpecRow} className="flex items-center gap-2 self-start text-sm font-semibold text-neutral-900 hover:underline"><Plus className="size-4" />Add spec</button>
              </div>
            </div>
            <details className="rounded-lg bg-neutral-50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-neutral-700">Optional details (Listing type, Grade, Color, Shelf life, Storage, Package, Weight, Usage, Place of origin)</summary>
              <div className="mt-4 flex flex-col gap-4">
                <Input label="Material composition" id="mat" value={form.material} onChange={(e) => up("material", e.target.value)} />
                <Select label="Listing type" id="lt" options={LISTING_TYPE_OPTIONS} value={form.listingType} onChange={(e) => up("listingType", e.target.value)} />
                <Select label="Grade / purity" id="gr" options={GRADE_OPTIONS} value={form.grade} onChange={(e) => up("grade", e.target.value)} />
                <Input label="Color" id="color" value={form.color} onChange={(e) => up("color", e.target.value)} />
                <Input label="Shelf Life" id="sl" value={form.shelfLife} onChange={(e) => up("shelfLife", e.target.value)} />
                <Input label="Storage & handling" id="sh" value={form.storage} onChange={(e) => up("storage", e.target.value)} />
                <Input label="Package" id="pkg" value={form.pkg} onChange={(e) => up("pkg", e.target.value)} />
                <Input label="Weight" id="wt" value={form.weight} onChange={(e) => up("weight", e.target.value)} />
                <Input label="Usage" id="usg" value={form.usage} onChange={(e) => up("usage", e.target.value)} />
                <Input label="Place of Origin" id="poo" value={form.origin} onChange={(e) => up("origin", e.target.value)} />
              </div>
            </details>
          </div>
        </StepLayout>
      )}

      {step === 3 && (
        <StepLayout step={3} onBack={() => setStep(2)} onNext={() => setStep(4)} {...sharedProps}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Pricing & Supply</h1>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Quantity unit" id="unit" options={unitOptionsFor(form.unit)} value={form.unit} onChange={(e) => up("unit", e.target.value)} />
              <Select label="Currency" id="currency" options={CURRENCY_OPTIONS} value={form.currencyCode} onChange={(e) => up("currencyCode", e.target.value)} />
            </div>
            <div>
              <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-neutral-900">Unit price ({form.currencyCode || "currency"} per {form.unit ? unit.singular : "unit"})</label>
              <input id="price" type="text" inputMode="decimal" value={form.price} onChange={(e) => up("price", e.target.value)} placeholder="Leave blank if not set yet" className="w-full rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0" }} />
              <p className="mt-1 text-xs text-neutral-500">Blank means no price yet; enter 0 only if the material is offered at no charge. Currency and unit must be chosen explicitly before submitting.</p>
            </div>
            <div>
              <label htmlFor="moq" className="mb-1.5 block text-sm font-medium text-neutral-900">Minimum Order Quantity (MOQ) in {form.unit ? unit.plural : "the chosen unit"}</label>
              <div className="flex">
                <input id="moq" type="text" inputMode="decimal" value={form.moq} onChange={(e) => up("moq", e.target.value)} className="flex-1 rounded-l-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0", borderRight: "none" }} />
                <span className="rounded-r-lg bg-neutral-50 px-3 py-3 text-sm text-neutral-700" style={{ border: "1px solid #E0E0E0" }}>{form.unit ? unit.short : "—"}</span>
              </div>
            </div>
            <div>
              <label htmlFor="qty" className="mb-1.5 block text-sm font-medium text-neutral-900">Quantity available in {form.unit ? unit.plural : "the chosen unit"}</label>
              <div className="flex">
                <input id="qty" type="text" inputMode="decimal" value={form.qty} onChange={(e) => up("qty", e.target.value)} className="flex-1 rounded-l-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0", borderRight: "none" }} />
                <span className="rounded-r-lg bg-neutral-50 px-3 py-3 text-sm text-neutral-700" style={{ border: "1px solid #E0E0E0" }}>{form.unit ? unit.short : "—"}</span>
              </div>
              {(() => {
                const q = parseOptionalNumber(form.qty);
                const m = parseOptionalNumber(form.moq);
                return q !== null && m !== null && m > q ? (
                  <p className="mt-1 text-xs text-red-700">MOQ cannot exceed the available quantity.</p>
                ) : null;
              })()}
            </div>
          </div>
        </StepLayout>
      )}

      {step === 4 && (
        <StepLayout step={4} onBack={() => setStep(3)} onNext={() => setStep(5)} {...sharedProps}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Description</h1>
          <TextArea id="description" label="Description text" rows={8} value={form.description} onChange={(v) => up("description", v)} />
        </StepLayout>
      )}

      {step === 5 && (
        <StepLayout step={5} onBack={() => setStep(4)} onNext={() => setStep(6)} {...sharedProps}>
          <h1 className="mb-8 text-3xl font-bold text-neutral-900">Safety, Sustainability & Certifications</h1>
          <div className="flex flex-col gap-6">
            <div className="rounded-xl bg-amber-50 p-4" style={{ border: "1px solid #FDE68A" }}>
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-neutral-900">
                <FileText className="size-4" />
                Safety Data Sheet (SDS) — required to transact
              </p>
              <p className="mb-3 text-xs text-neutral-700">
                Buyers cannot purchase this feedstock until a Safety Data Sheet PDF is uploaded (EU REACH or equivalent local format).
              </p>
              <ListingDocumentUploader
                listingId={record?.id ?? null}
                typeCode="sds"
                documents={documents}
                onChange={setDocuments}
                multiple={false}
                required
                hint={record ? "Accepts PDF up to 5 MB." : "Save as Draft first, then upload the SDS PDF (up to 5 MB)."}
              />
              {hasSds && (
                <p className="mt-2 flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="size-3" /> SDS on file for this listing.</p>
              )}
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-neutral-900">Sustainability Claims</p>
              <div className="grid grid-cols-2 gap-3">
                {CLAIM_OPTIONS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input type="checkbox" checked={form.claims.includes(c)} onChange={() => toggleClaim(c)} className="size-4 rounded accent-neutral-900" /> {c}
                  </label>
                ))}
              </div>
              {form.customClaims.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {form.customClaims.map((claim) => (
                    <li key={claim} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-800">
                      {claim}
                      <button type="button" aria-label={`Remove claim ${claim}`} onClick={() => up("customClaims", form.customClaims.filter((c) => c !== claim))} className="text-neutral-500 hover:text-red-600">×</button>
                    </li>
                  ))}
                </ul>
              )}
              {form.claims.includes("Others") && (
                <div className="mt-3">
                  <Input label="Describe the other claim" id="other-claim" value={form.otherClaim} onChange={(e) => up("otherClaim", e.target.value)} />
                </div>
              )}
            </div>
            <ListingDocumentUploader
              listingId={record?.id ?? null}
              typeCode="certification"
              documents={documents}
              onChange={setDocuments}
              title="Certification upload"
              hint={record ? "Accepts PDF up to 5 MB each." : "Save as Draft first, then upload certification PDFs (up to 5 MB each)."}
            />
            <div className="rounded-xl bg-neutral-50 p-4" style={{ border: "1px solid #E7E7E7" }}>
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-neutral-900">
                <FileText className="size-4" />
                Technical documents (optional)
              </p>
              <p className="mb-3 text-xs text-neutral-700">Buyers see these on the product page. PDF up to 5 MB each.</p>
              <div className="flex flex-col gap-4">
                <ListingDocumentUploader listingId={record?.id ?? null} typeCode="tds" documents={documents} onChange={setDocuments} multiple={false} title="Technical Data Sheet (TDS)" hint={record ? "Accepts PDF up to 5 MB." : "Save as Draft first, then upload the TDS (PDF up to 5 MB)."} />
                <ListingDocumentUploader listingId={record?.id ?? null} typeCode="coa" documents={documents} onChange={setDocuments} multiple={false} title="Certificate of Analysis (COA)" hint={record ? "Accepts PDF up to 5 MB." : "Save as Draft first, then upload the COA (PDF up to 5 MB)."} />
              </div>
            </div>
            <TextArea id="sustain-notes" label="Sustainability Notes (Optional)" rows={4} value={form.sustainNotes} onChange={(v) => up("sustainNotes", v)} />
          </div>
        </StepLayout>
      )}

      {step === 6 && (
        <StepLayout step={6} onBack={() => setStep(5)} onNext={() => setStep(7)} {...sharedProps}>
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">Origin</h1>
          <p className="mb-6 text-sm text-neutral-600">Confirm the facility this listing ships from. Facilities are saved with your company profile.</p>
          <div className="flex flex-col gap-5">
            <ListingLocationPicker companyId={companyId} value={form.locationId} onChange={(id) => up("locationId", id)} locations={locations} />
            <Input label="Origin note (optional)" id="ol" placeholder="e.g. Gate 4, north yard" value={form.originLocation} onChange={(e) => up("originLocation", e.target.value)} />
            <div className="h-[300px] overflow-hidden rounded-xl"><ListingMap listings={previewMapListing ? [previewMapListing] : []} activeId={previewMapListing?.id} /></div>
          </div>
        </StepLayout>
      )}

      {step === 7 && (
        <div className="flex min-h-screen flex-col bg-white">
          <header className="flex items-center justify-between px-4 py-4 sm:px-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <h2 className="text-base font-bold text-neutral-900">Add Listing — Preview</h2>
            <button type="button" aria-label="Close" onClick={() => router.push("/seller/listings")} className="flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="size-5 text-neutral-500" /></button>
          </header>
          <div className="flex flex-1 overflow-y-auto">
            <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
              <div className="mx-auto max-w-[900px]">
                <p className="mb-4 rounded-lg bg-neutral-50 px-4 py-2 text-xs text-neutral-600">
                  This preview shows exactly what you entered{record ? ` and what is saved as listing #${record.id}` : ""}. Nothing is filled in on your behalf.
                </p>
                <h1 className="mb-1 text-2xl font-bold text-neutral-900">{form.name || "Untitled listing"}</h1>
                <p className="mb-6 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                  <span>{selectedLocation ? formatCompanyLocation(selectedLocation) : "No facility selected"}</span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">MOQ: {moqLabel ?? "not set"}</span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">Carbon data: not provided</span>
                </p>
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="relative mb-4 flex h-[380px] items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                      {previewListing?.image ? (
                        <img src={previewListing.image} alt={form.name} className="size-full object-cover" />
                      ) : (
                        <p className="px-6 text-center text-sm text-neutral-500">No photos uploaded yet. Add photos in step 1 after saving the draft.</p>
                      )}
                    </div>
                    {photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {previewListing?.images.map((img, i) => (
                          <div key={img} className={`size-16 shrink-0 overflow-hidden rounded-lg ${i === 0 ? "ring-2 ring-neutral-900" : ""}`}><img src={img} alt="" className="size-full object-cover" /></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-full shrink-0 lg:w-[300px]">
                    <div className="rounded-xl p-5" style={{ border: "1px solid #F0F0F0" }}>
                      <p className="text-3xl font-bold text-neutral-900">{price.label}{price.kind !== "unavailable" && <span className="ml-1 text-base font-normal text-neutral-500">{price.perUnit}</span>}</p>
                      <p className="mb-4 text-sm text-neutral-500">Minimum Order Quantity (MOQ): {moqLabel ?? "not set"}</p>
                      <p className="mb-2 text-sm text-neutral-700">Available: {qtyLabel ?? "not set"}</p>
                      <p className="mb-4 text-xs text-neutral-500">Shipping is quoted per order and is not included in the listed price.</p>
                      <Button variant="primary" size="lg" className="w-full" disabled>Buy Now (buyer view)</Button>
                    </div>
                    {!hasSds && (
                      <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 size-3 shrink-0" />No SDS uploaded: buyers will not be able to purchase until you add it.</p>
                    )}
                  </div>
                </div>

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Specifications</h2>
                {specs.length === 0 ? (
                  <p className="text-sm text-neutral-500">No specifications entered.</p>
                ) : (
                  <div className="flex flex-col">
                    {specs.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-3" style={{ borderBottom: "1px solid #F0F0F0" }}><span className="text-sm text-neutral-700">{k}</span><span className="text-right text-sm text-neutral-900">{v}</span></div>
                    ))}
                  </div>
                )}

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Overview</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{form.description || "No description entered."}</p>

                {(form.claims.length > 0 || form.sustainNotes) && (
                  <>
                    <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Sustainability</h2>
                    {form.claims.length > 0 && (
                      <p className="text-sm text-neutral-700">{form.claims.filter((c) => c !== "Others").concat(form.claims.includes("Others") && form.otherClaim ? [form.otherClaim] : []).join(" · ")}</p>
                    )}
                    {form.sustainNotes && <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{form.sustainNotes}</p>}
                  </>
                )}

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Documents</h2>
                {documents.length === 0 ? (
                  <p className="text-sm text-neutral-500">No documents uploaded.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm text-neutral-700">
                    {documents.map((d) => <li key={d.id}>{d.documentTypeCode.toUpperCase()}: {d.fileName}</li>)}
                  </ul>
                )}

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Seller</h2>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">{(sellerCompany?.legalName ?? "?").slice(0, 1).toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{sellerCompany?.legalName ?? "Unknown company"}{previewListing?.sellerVerified && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">VERIFIED</span>}</p>
                    <p className="text-xs text-neutral-500">{selectedLocation ? formatCompanyLocation(selectedLocation) : "No facility selected"}</p>
                  </div>
                </div>
                <div className="h-[250px] overflow-hidden rounded-xl"><ListingMap listings={previewMapListing ? [previewMapListing] : []} activeId={previewMapListing?.id} /></div>

                <h2 className="mb-3 mt-8 text-lg font-bold text-neutral-900">Carbon Analytics Tool</h2>
                <div className="rounded-xl p-6" style={{ border: "1px solid #F0F0F0" }}>
                  <p className="text-sm text-neutral-700">
                    Buyers can run a transportation-emissions estimate against this listing. As the seller you can also estimate the value recovered by selling instead of disposing.
                  </p>
                  {previewListing ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <CarbonCalculatorButton listing={previewListing} portal="seller" variant="primary" label="Open Carbon Calculator" />
                      <CarbonCalculatorButton listing={previewListing} portal="seller" variant="primary" label="Estimate value recovery" startAt="value-recovery" />
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-neutral-500">Save the draft to enable the calculators for this listing.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="h-1 w-full bg-neutral-100"><div className="h-full bg-green-500" style={{ width: "100%" }} /></div>
            {noticeNode && <div className="px-4 pt-3 sm:px-6">{noticeNode}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <Button variant="secondary" size="md" onClick={() => setStep(6)} disabled={busy}>Back</Button>
              <Button variant="primary" size="md" onClick={() => void handleSubmit()} disabled={busy} className="min-w-[160px]">{busy ? "Saving…" : "Submit for review"}</Button>
              <Button variant="secondary" size="md" onClick={() => void handleSaveDraft()} disabled={busy}>Save as Draft</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
