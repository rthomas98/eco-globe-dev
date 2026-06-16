"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Send } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";

const CATEGORIES = [
  "Biomass & wood",
  "Plastics",
  "Oils & liquids",
  "Rubber",
  "Refinery byproducts",
  "Chemicals",
  "Industrial byproducts",
  "Other",
];

const UNITS = ["Metric tons", "Short tons", "Pallets", "Barrels", "Gallons", "Kilograms"];

const RECURRENCE = [
  "One-time",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Bi-monthly",
  "Quarterly",
  "Semi-annually",
];

export function BuyerRfqNewPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    description: "",
    quantity: "",
    unit: UNITS[0],
    recurrence: RECURRENCE[0],
    needBy: "",
    deliveryLocation: "",
    budget: "",
    notes: "",
  });

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const canSubmit =
    form.title.trim() && form.quantity.trim() && form.needBy.trim();

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    router.push("/buyer/rfq");
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
          Verified sellers will respond within 48 hours with pricing, available
          quantity, and shipping options.
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
                      <option key={u}>{u}</option>
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
              <Field label="Delivery location">
                <Input
                  label=""
                  id="rfq-loc"
                  placeholder="City, state, country"
                  value={form.deliveryLocation}
                  onChange={(e) => setField("deliveryLocation", e.target.value)}
                />
              </Field>
              <Field label="Budget (optional)">
                <Input
                  label=""
                  id="rfq-budget"
                  placeholder="e.g. $400-450 / ton"
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

            <Section title="Attachments">
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-8 text-center text-sm text-neutral-500"
                style={{ border: "1px dashed #D4D4D8" }}
              >
                <Upload className="size-6" />
                <p>
                  <span className="font-medium text-neutral-900">Click to upload</span>{" "}
                  or drag and drop SDS sheets, spec PDFs, or reference photos.
                </p>
                <p className="text-xs text-neutral-400">PDF, PNG, JPG up to 25 MB</p>
              </div>
            </Section>
          </div>

          <aside className="flex flex-col gap-6">
            <Section title="Submission">
              <div className="flex flex-col gap-3 text-sm text-neutral-700">
                <p>
                  We&apos;ll send your request for quote to <strong>verified sellers</strong> in
                  matching categories who deliver to your region.
                </p>
                <p>Quotes typically arrive within 48 hours.</p>
              </div>
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
              <button className="mt-2 w-full text-sm font-medium text-neutral-700 underline">
                Save as draft
              </button>
            </Section>
            <Section title="Tips for faster responses">
              <ul className="list-disc pl-5 text-sm text-neutral-700">
                <li>Be specific about grade, purity, and any required certifications.</li>
                <li>Attach SDS or specification PDFs when available.</li>
                <li>State your delivery cadence — recurring requests get more attention.</li>
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
