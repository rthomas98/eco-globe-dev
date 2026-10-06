"use client";

import { useState } from "react";
import { createWantedListing } from "@/lib/api-portal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import { UNIT_OPTIONS } from "@/components/seller/listing-form";
import { useDemoUser } from "@/lib/demo-user";
import { describeBackendError } from "@/lib/backend-client";
import { describeUnit } from "@/lib/listing-format";
import { validateRfqDraft } from "@/lib/rfq-request";
import { formatCompanyLocation, useCompanyLocations } from "@/lib/use-company-locations";

const CATEGORIES = [
  "Biomass & wood",
  "Plastics",
  "Oils & liquids",
  "Rubber",
  "Refinery byproducts",
  "Chemicals",
  "Industrial byproducts",
  "Used products",
  "Other",
];

// Same unambiguous unit codes sellers list with, so requests match listings exactly.
const UNITS = UNIT_OPTIONS;

const RECURRENCE = [
  "One-time",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Bi-monthly",
  "Quarterly",
  "Semi-annually",
];


const MATERIAL_TYPE_BY_CATEGORY: Record<string, string> = {
  "Biomass & wood": "certified_feedstock",
  Plastics: "industrial_byproduct",
  "Oils & liquids": "certified_feedstock",
  Rubber: "used_product",
  "Refinery byproducts": "industrial_byproduct",
  Chemicals: "industrial_byproduct",
  "Industrial byproducts": "industrial_byproduct",
  // Used equipment and products (e.g. transformers) use the saved used_product type.
  "Used products": "used_product",
  Other: "industrial_byproduct",
};

export function BuyerRfqNewPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyId = useDemoUser()?.activeCompanyId;
  const facilities = useCompanyLocations(companyId);
  // null = use the default saved facility; "manual" = buyer enters country/region.
  const [facilityChoice, setFacilityChoice] = useState<string | null>(null);
  const [manualCountry, setManualCountry] = useState("");
  const [manualRegion, setManualRegion] = useState("");
  const savedFacilities = facilities.status === "ready" ? facilities.locations : [];
  const defaultFacility =
    savedFacilities.find((l) => l.locationTypeCode === "delivery" && l.isDefault) ??
    savedFacilities.find((l) => l.locationTypeCode === "delivery") ??
    savedFacilities.find((l) => l.isDefault) ??
    savedFacilities[0];
  const effectiveChoice = facilityChoice ?? (defaultFacility ? String(defaultFacility.id) : "manual");
  const chosenFacility =
    effectiveChoice === "manual"
      ? undefined
      : savedFacilities.find((l) => String(l.id) === effectiveChoice);
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    description: "",
    quantity: "",
    unit: UNITS[0]!.value,
    recurrence: RECURRENCE[0],
    needBy: "",
    budget: "",
    notes: "",
  });

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const canSubmit =
    form.title.trim() && form.quantity.trim() && form.needBy.trim();

  const handleSubmit = async () => {
    if (submitting) return;
    const checked = validateRfqDraft({
      title: form.title,
      quantity: form.quantity,
      targetPrice: form.budget,
      countryCode: chosenFacility ? chosenFacility.countryCode : manualCountry,
      stateProvince: chosenFacility ? (chosenFacility.stateProvince ?? "") : manualRegion,
    });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createWantedListing({
        title: checked.value.title,
        materialTypeCode:
          MATERIAL_TYPE_BY_CATEGORY[form.category] ?? "industrial_byproduct",
        quantity: checked.value.quantity,
        quantityUnit: form.unit,
        targetPricePerUnit: checked.value.targetPricePerUnit,
        countryCode: checked.value.countryCode,
        stateProvince: checked.value.stateProvince,
        notes:
          [form.description, form.notes, `Need by ${form.needBy}`, form.recurrence]
            .filter(Boolean)
            .join(" — ") || undefined,
      });
      router.push("/buyer/rfq");
    } catch (err) {
      // Stay on the form so nothing the buyer typed is lost.
      setError(describeBackendError(err, "Your request for quote was not posted. Please try again."));
      setSubmitting(false);
    }
  };

  return (
    <BuyerLayout>
      <div className="px-8 py-8">
        <Link
          href="/buyer/rfq"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Back to requests for quote
        </Link>

        <h1 className="text-3xl font-bold text-neutral-900">New request for quote</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sellers on EcoGlobe can respond with a quote from a matching listing.
          Responses appear under Requests for quote.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Section title="Feedstock">
              <Field label="Title">
                <Input
                  label=""
                  id="rfq-title"
                  placeholder="e.g. Recycled HDPE flakes, food-contact grade"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Need by">
                  <Input
                    label=""
                    id="rfq-needby"
                    type="date"
                    value={form.needBy}
                    onChange={(e) => setField("needBy", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Specifications / description">
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Composition, grade, color, moisture, contamination limits, certifications, etc."
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </Field>
            </Section>

            <Section title="Quantity">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Quantity">
                  <Input
                    label=""
                    id="rfq-qty"
                    placeholder="e.g. 50"
                    value={form.quantity}
                    onChange={(e) => setField("quantity", e.target.value)}
                  />
                </Field>
                <Field label="Unit">
                  <select
                    value={form.unit}
                    onChange={(e) => setField("unit", e.target.value)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Recurrence">
                  <select
                    value={form.recurrence}
                    onChange={(e) => setField("recurrence", e.target.value)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                  >
                    {RECURRENCE.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Logistics">
              <Field label="Deliver to">
                {facilities.status === "loading" ? (
                  <p className="text-sm text-neutral-500">Loading your saved facilities…</p>
                ) : (
                  <select
                    aria-label="Delivery facility"
                    value={effectiveChoice}
                    onChange={(e) => setFacilityChoice(e.target.value)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                  >
                    {savedFacilities.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.name} — {formatCompanyLocation(l)}
                      </option>
                    ))}
                    <option value="manual">Enter delivery country and region</option>
                  </select>
                )}
              </Field>
              {facilities.status === "error" && (
                <p className="text-xs text-amber-700">
                  Saved facilities could not be loaded; enter the delivery country and region instead.
                </p>
              )}
              {effectiveChoice === "manual" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Delivery country (2-letter code)">
                    <Input
                      label=""
                      id="rfq-country"
                      placeholder="e.g. US"
                      maxLength={2}
                      value={manualCountry}
                      onChange={(e) => setManualCountry(e.target.value.toUpperCase())}
                    />
                  </Field>
                  <Field label="State / region (optional)">
                    <Input
                      label=""
                      id="rfq-region"
                      placeholder="e.g. LA"
                      value={manualRegion}
                      onChange={(e) => setManualRegion(e.target.value)}
                    />
                  </Field>
                </div>
              )}
              <Field label={`Target price per ${describeUnit(form.unit).singular} (optional)`}>
                <Input
                  label=""
                  id="rfq-budget"
                  inputMode="decimal"
                  placeholder="e.g. 425"
                  value={form.budget}
                  onChange={(e) => setField("budget", e.target.value)}
                />
              </Field>
              <Field label="Notes">
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Anything else sellers should know — payment terms, paperwork, on-site contacts, etc."
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </Field>
            </Section>

          </div>

          <aside className="flex flex-col gap-6">
            <Section title="Submission">
              <div className="flex flex-col gap-3 text-sm text-neutral-700">
                <p>
                  Your request is posted to the marketplace, where sellers can respond with a
                  quote. Response times depend on the sellers.
                </p>
              </div>
              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button
                variant="primary"
                size="md"
                className="mt-4 w-full"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                style={!canSubmit || submitting ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
              >
                <Send className="size-4" />
                {submitting ? "Submitting…" : "Submit request for quote"}
              </Button>
            </Section>
            <Section title="Tips for clearer requests">
              <ul className="list-disc pl-5 text-sm text-neutral-700">
                <li>Be specific about grade, purity, and any required certifications.</li>
                <li>List documents you need from the seller, such as an SDS, in the notes.</li>
                <li>State your delivery cadence.</li>
              </ul>
            </Section>
          </aside>
        </div>
      </div>
    </BuyerLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-900">{label}</label>
      {children}
    </div>
  );
}
