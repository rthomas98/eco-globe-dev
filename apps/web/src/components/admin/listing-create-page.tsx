"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { DataBoundary, useBackendData } from "@/components/shared/data-state";
import { describeBackendError } from "@/lib/backend-client";
import { fetchCompanies } from "@/lib/api-portal";
import { createListing } from "@/lib/listings-api";
import { describeUnit, parseOptionalNumber } from "@/lib/listing-format";
import {
  CATEGORY_OPTIONS,
  CURRENCY_OPTIONS,
  MATERIAL_TYPE_OPTIONS,
  emptyListingForm,
  formToWriteBody,
  unitOptionsFor,
  validateDraft,
  type ListingForm,
} from "@/components/seller/listing-form";
import { ListingLocationPicker, useCompanyLocations } from "@/components/seller/listing-location-picker";
import { AdminDetailPage } from "./admin-detail-page";

const SECTION_CLASS = "rounded-xl bg-white p-6";
const SECTION_STYLE = { border: "1px solid #F0F0F0" };

/**
 * Admin: create a draft listing for any seller company. Drafts need no SDS or
 * facility; the edit page that follows adds the SDS, location and status.
 */
export function AdminListingCreatePage() {
  const router = useRouter();
  const companies = useBackendData(fetchCompanies, [], "Seller companies could not be loaded.");
  const sellers = useMemo(
    () =>
      (companies.data ?? [])
        .filter((c) => c.companyTypeCode === "seller" || c.companyTypeCode === "both")
        .sort((a, b) => a.legalName.localeCompare(b.legalName)),
    [companies.data],
  );
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [form, setForm] = useState<ListingForm>(emptyListingForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const locations = useCompanyLocations(companyId ?? undefined);
  const unit = describeUnit(form.unit);

  const q = companyQuery.trim().toLowerCase();
  const matches = q ? sellers.filter((c) => c.legalName.toLowerCase().includes(q) || String(c.id) === q) : sellers;
  const selected = sellers.find((c) => c.id === companyId) ?? null;
  // Keep the chosen company selectable even when the search hides it.
  const options = selected && !matches.includes(selected) ? [selected, ...matches] : matches;

  const setField = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setForm((prev) => ({ ...prev, [k]: v }));
  const chooseCompany = (id: number | null) => {
    setCompanyId(id);
    // A facility belongs to one company; never carry it over to another.
    setField("locationId", "");
  };

  const handleCreate = async () => {
    const issues = validateDraft(form).map((i) => i.message);
    if (!companyId) issues.unshift("Choose the seller company this listing belongs to.");
    const qty = parseOptionalNumber(form.qty);
    const moq = parseOptionalNumber(form.moq);
    if (qty !== null && moq !== null && moq > qty) issues.push("Minimum order quantity cannot exceed the available quantity.");
    if (issues.length > 0 || !companyId) {
      setError(issues.join(" "));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await createListing(formToWriteBody(form, { sellerCompanyId: companyId, listingStatusCode: "draft" }));
      router.push(`/admin/listings/LS-${created.id}/edit?created=1#sds`);
    } catch (err) {
      setError(describeBackendError(err, "The listing could not be created. Your entries are still on screen; try again."));
      setSaving(false);
    }
  };

  return (
    <AdminDetailPage
      breadcrumbs={[{ label: "Listings", href: "/admin/listings" }, { label: "New listing" }]}
      title="New listing"
      subtitle="Creates a draft for the chosen seller. You will add the Safety Data Sheet (SDS) and publish on the next screen."
    >
      <DataBoundary state={companies} empty={{ title: "No companies" }} loadingLabel="Loading seller companies…">
        {() => (
          <div className="flex max-w-3xl flex-col gap-6">
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

            <section className={SECTION_CLASS} style={SECTION_STYLE}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900"><Building2 className="size-5" aria-hidden />Seller company</h2>
              {sellers.length === 0 ? (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">No seller companies exist yet. A company must be registered as a seller before it can have listings.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2" style={{ border: "1px solid #E0E0E0" }}>
                    <Search className="size-4 text-neutral-400" aria-hidden />
                    <input
                      type="search"
                      aria-label="Search seller companies"
                      placeholder="Search by company name or id"
                      value={companyQuery}
                      onChange={(e) => setCompanyQuery(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="seller-company" className="mb-1.5 block text-sm font-medium text-neutral-900">Company</label>
                    <select
                      id="seller-company"
                      value={companyId ?? ""}
                      onChange={(e) => chooseCompany(Number(e.target.value) || null)}
                      className="w-full rounded-lg bg-white px-3 py-2 text-sm"
                      style={{ border: "1px solid #E0E0E0" }}
                    >
                      <option value="">{options.length ? `Choose a seller company (${options.length})…` : "No companies match your search"}</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>{c.legalName} · #{c.id}{c.verificationStatusCode === "verified" ? "" : ` · ${c.verificationStatusCode.replace(/_/g, " ")}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </section>

            <section className={SECTION_CLASS} style={SECTION_STYLE}>
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
                  <textarea id="description" rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none" style={{ border: "1px solid #E0E0E0" }} />
                </div>
              </div>
            </section>

            <section className={SECTION_CLASS} style={SECTION_STYLE}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Pricing & supply</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Quantity unit" id="unit" options={unitOptionsFor(form.unit)} value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
                <Select label="Currency" id="currency" options={CURRENCY_OPTIONS} value={form.currencyCode} onChange={(e) => setField("currencyCode", e.target.value)} />
                <Input label={`Unit price (${form.currencyCode || "currency"} per ${form.unit ? unit.singular : "unit"})`} id="price" inputMode="decimal" value={form.price} onChange={(e) => setField("price", e.target.value)} />
                <Input label={`Minimum Order Quantity (MOQ) in ${form.unit ? unit.plural : "the chosen unit"}`} id="moq" inputMode="decimal" value={form.moq} onChange={(e) => setField("moq", e.target.value)} />
                <Input label={`Quantity available in ${form.unit ? unit.plural : "the chosen unit"}`} id="qty" inputMode="decimal" value={form.qty} onChange={(e) => setField("qty", e.target.value)} />
              </div>
              <p className="mt-2 text-xs text-neutral-500">Optional for a draft. Publishing later needs quantity, MOQ, price, currency and unit.</p>
            </section>

            <section className={SECTION_CLASS} style={SECTION_STYLE}>
              <h2 className="mb-1 text-lg font-semibold text-neutral-900">Ships from <span className="text-sm font-normal text-neutral-500">(optional)</span></h2>
              <p className="mb-4 text-xs text-neutral-500">Facilities saved for the selected seller company. Required before publishing.</p>
              {companyId ? (
                <ListingLocationPicker companyId={companyId} value={form.locationId} onChange={(id) => setField("locationId", id)} locations={locations} />
              ) : (
                <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-700">Choose the seller company first.</p>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" size="md" onClick={() => router.push("/admin/listings")} disabled={saving}>Cancel</Button>
              <Button variant="primary" size="md" onClick={() => void handleCreate()} disabled={saving} aria-busy={saving}>
                {saving ? "Creating…" : "Create draft & add SDS"}
              </Button>
            </div>
          </div>
        )}
      </DataBoundary>
    </AdminDetailPage>
  );
}
