"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import {
  createWantedListing,
  updateWantedListing,
  type ApiWantedListing,
} from "@/lib/api-portal";
import { CURRENCY_OPTIONS, unitOptionsFor } from "@/components/seller/listing-form";
import { useDemoUser } from "@/lib/demo-user";
import { describeBackendError } from "@/lib/backend-client";
import { describeUnit } from "@/lib/listing-format";
import {
  initialRfqFormState,
  rfqCategoryOptions,
  rfqFormInput,
  validateRfqForm,
  type RfqFormState,
} from "@/lib/rfq-request";
import { isViewOnlyMember } from "@/lib/wanted-listing-format";
import {
  DEMO_PRICE_ESTIMATE_LABEL,
  DEMO_REQUEST_POST_BLOCKED,
  DEMO_VOLUME_ESTIMATE_LABEL,
  readDemoEstimates,
} from "@/lib/demo-estimates";
import { DemoEstimateBadge } from "@/components/shared/demo-estimate-badges";
import { formatCompanyLocation, useCompanyLocations } from "@/lib/use-company-locations";

const RECURRENCE = ["One-time", "Weekly", "Bi-weekly", "Monthly", "Bi-monthly", "Quarterly", "Semi-annually"];

const SELECT_CLASS =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20";

function currencyOptionsFor(current: string) {
  if (!current || CURRENCY_OPTIONS.some((o) => o.value === current)) return CURRENCY_OPTIONS;
  return [...CURRENCY_OPTIONS, { value: current, label: `${current} (as recorded)` }];
}

/**
 * Request-for-quote form. Without `existing` it creates a request; with an
 * existing private draft it resumes it. Nothing is preselected on a new
 * request and missing saved values stay "Not specified", so they are saved as
 * null rather than defaulted.
 */
export function BuyerRfqForm({ existing }: { existing?: ApiWantedListing }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const user = useDemoUser();
  const viewOnly = isViewOnlyMember(user);
  const facilities = useCompanyLocations(user?.activeCompanyId);
  const savedFacilities = facilities.status === "ready" ? facilities.locations : [];
  const categories = rfqCategoryOptions(existing);
  const [form, setForm] = useState<RfqFormState>(() => initialRfqFormState(existing));
  const chosenFacility = savedFacilities.find((l) => String(l.id) === form.facilityChoice);
  const demo = readDemoEstimates(form.notes);

  const setField = <K extends keyof RfqFormState>(k: K, v: RfqFormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const save = async (mode: "draft" | "publish") => {
    if (busy) return;
    if (mode === "publish" && demo.marker) {
      setError(DEMO_REQUEST_POST_BLOCKED);
      setNotice(null);
      return;
    }
    const checked = validateRfqForm(rfqFormInput(form, categories, chosenFacility), mode);
    if (!checked.ok) {
      setError(checked.error);
      setNotice(null);
      return;
    }
    setBusy(mode);
    setError(null);
    setNotice(null);
    try {
      if (existing) {
        await updateWantedListing(existing.id, mode === "publish" ? { ...checked.value, statusCode: "open" } : checked.value);
        if (mode === "draft") {
          setNotice("Draft saved. It stays private to your company until it is submitted.");
          setBusy(null);
          return;
        }
      } else {
        // Omitting statusCode posts an open request, as before.
        await createWantedListing(mode === "draft" ? { ...checked.value, statusCode: "draft" } : checked.value);
      }
      router.push("/buyer/rfq");
    } catch (err) {
      // Stay on the form so nothing the buyer typed is lost.
      setError(
        describeBackendError(
          err,
          mode === "draft"
            ? "Your draft was not saved. Please try again."
            : "Your request for quote was not posted. Please try again.",
        ),
      );
      setBusy(null);
    }
  };

  if (viewOnly) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24 text-center sm:px-8">
        <p className="text-lg font-bold text-neutral-900">View-only access</p>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Your role in this company can view requests for quote but cannot create, edit or submit them. Ask a
          company owner or admin to change your access.
        </p>
        <Link href="/buyer/rfq" className="mt-6">
          <Button variant="primary" size="md">Back to requests for quote</Button>
        </Link>
      </div>
    );
  }

  const unitLabel = form.unit ? describeUnit(form.unit).singular : "unit";

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href="/buyer/rfq"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="size-4" />
        Back to requests for quote
      </Link>

      <h1 className="text-3xl font-bold text-neutral-900">
        {existing ? "Resume draft request" : "New request for quote"}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Save a private draft while details are still being confirmed, or submit it so sellers on
        EcoGlobe can respond with a quote. Drafts are visible only to your company.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Section title="Feedstock">
            <Field label="Title" htmlFor="rfq-title">
              <Input
                label=""
                id="rfq-title"
                placeholder="e.g. Recycled HDPE flakes, food-contact grade"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="rfq-category">
                <select
                  id="rfq-category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className={SELECT_CLASS}
                >
                  {categories.map((c) => (
                    <option key={c.label}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Need by" htmlFor="rfq-needby">
                <Input
                  label=""
                  id="rfq-needby"
                  type="date"
                  value={form.needBy}
                  onChange={(e) => setField("needBy", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Requirements and notes" htmlFor="rfq-notes">
              <textarea
                id="rfq-notes"
                rows={6}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Composition, grade, moisture, contamination limits, certifications, documents such as an SDS, payment terms, on-site contacts, etc."
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
            </Field>
          </Section>

          <Section title="Quantity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Quantity" htmlFor="rfq-qty">
                <Input
                  label=""
                  id="rfq-qty"
                  inputMode="decimal"
                  placeholder="e.g. 50"
                  value={form.quantity}
                  onChange={(e) => setField("quantity", e.target.value)}
                />
                {demo.volume && <div><DemoEstimateBadge label={DEMO_VOLUME_ESTIMATE_LABEL} /></div>}
              </Field>
              <Field label="Unit" htmlFor="rfq-unit">
                <select
                  id="rfq-unit"
                  value={form.unit}
                  onChange={(e) => setField("unit", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Not specified</option>
                  {unitOptionsFor(form.unit).map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delivery cadence" htmlFor="rfq-recurrence">
                <select
                  id="rfq-recurrence"
                  value={form.recurrence}
                  onChange={(e) => setField("recurrence", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Not specified</option>
                  {RECURRENCE.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Logistics">
            <Field label="Deliver to" htmlFor="rfq-facility">
              {facilities.status === "loading" ? (
                <p className="text-sm text-neutral-500">Loading your saved facilities…</p>
              ) : (
                <select
                  id="rfq-facility"
                  aria-label="Delivery facility"
                  value={form.facilityChoice}
                  onChange={(e) => setField("facilityChoice", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Not specified</option>
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
            {form.facilityChoice === "manual" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Delivery country (2-letter code)" htmlFor="rfq-country">
                  <Input
                    label=""
                    id="rfq-country"
                    placeholder="e.g. US"
                    maxLength={2}
                    value={form.manualCountry}
                    onChange={(e) => setField("manualCountry", e.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="State / region (optional)" htmlFor="rfq-region">
                  <Input
                    label=""
                    id="rfq-region"
                    placeholder="e.g. LA"
                    value={form.manualRegion}
                    onChange={(e) => setField("manualRegion", e.target.value)}
                  />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={`Target price per ${unitLabel} (optional)`} htmlFor="rfq-budget">
                <Input
                  label=""
                  id="rfq-budget"
                  inputMode="decimal"
                  placeholder="e.g. 425"
                  value={form.budget}
                  onChange={(e) => setField("budget", e.target.value)}
                />
                {demo.price && <div><DemoEstimateBadge label={DEMO_PRICE_ESTIMATE_LABEL} /></div>}
              </Field>
              <Field label="Currency" htmlFor="rfq-currency">
                <select
                  id="rfq-currency"
                  value={form.currencyCode}
                  onChange={(e) => setField("currencyCode", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Not specified</option>
                  {currencyOptionsFor(form.currencyCode).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Section title="Submission">
            <p className="text-sm text-neutral-700">
              A draft is private to your company and can be resumed later. Submitting posts the request to
              the marketplace; it needs a quantity and unit, a currency, a delivery country and a need-by date.
            </p>
            {demo.marker && (
              <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {DEMO_REQUEST_POST_BLOCKED} You can still save it as a draft.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {notice}
              </p>
            )}
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => void save("draft")}
              disabled={busy !== null}
            >
              <Save className="size-4" />
              {busy === "draft" ? "Saving draft…" : "Save draft"}
            </Button>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => void save("publish")}
              disabled={busy !== null || demo.marker}
              style={busy !== null || demo.marker ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              <Send className="size-4" />
              {busy === "publish" ? "Submitting…" : "Submit request for quote"}
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
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 sm:p-6" style={{ border: "1px solid #F0F0F0" }}>
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      {children}
    </div>
  );
}
