"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import {
  getSellerListingById,
  type SellerListing,
  type SellerListingStatus,
} from "./seller-listings-data";

const STATUSES: SellerListingStatus[] = ["Draft", "Pending", "Approved"];

export function SellerListingEditPage({ id }: { id: string }) {
  const router = useRouter();
  const listing = getSellerListingById(id);

  if (!listing) {
    return (
      <SellerLayout title="Edit listing">
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <p className="text-lg font-bold text-neutral-900">Listing not found</p>
          <p className="mt-2 text-sm text-neutral-500">
            We couldn&apos;t find a listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code>.
          </p>
          <Link href="/seller/listings" className="mt-6">
            <Button variant="primary" size="md">
              Back to listings
            </Button>
          </Link>
        </div>
      </SellerLayout>
    );
  }

  return <EditForm listing={listing} onCancel={() => router.push(`/seller/listings/${id}`)} />;
}

function EditForm({
  listing,
  onCancel,
}: {
  listing: SellerListing;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: listing.name,
    category: listing.category,
    location: listing.location,
    available: String(listing.available),
    price: listing.price,
    status: listing.status,
    description:
      "Verified industrial feedstock with documented composition, certified origin, and full chain-of-custody from facility to delivery.",
    composition: "Rice Husk",
    grade: "Export Standard",
    package: "123 lb / PP Bag",
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Demo: simulate a save.
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    router.push(`/seller/listings/${listing.id}`);
  };

  return (
    <SellerLayout title="Edit listing">
      <div className="px-8 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href={`/seller/listings/${listing.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" />
            Back to listing
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={saving}
              style={saving ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        <h1 className="mb-6 text-3xl font-bold text-neutral-900">Edit listing</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Basics</h2>
              <div className="flex flex-col gap-4">
                <Field label="Product name">
                  <Input
                    label=""
                    id="name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Category">
                    <select
                      value={form.category}
                      onChange={(e) => setField("category", e.target.value)}
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                    >
                      {["Polymer", "Refinery", "Waste", "Plastic", "Biomass", "Oil"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Location">
                    <Input
                      label=""
                      id="location"
                      value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Quantity available">
                    <Input
                      label=""
                      id="available"
                      type="number"
                      value={form.available}
                      onChange={(e) => setField("available", e.target.value)}
                    />
                  </Field>
                  <Field label="Price">
                    <Input
                      label=""
                      id="price"
                      value={form.price}
                      onChange={(e) => setField("price", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Specifications</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Composition">
                  <Input
                    label=""
                    id="composition"
                    value={form.composition}
                    onChange={(e) => setField("composition", e.target.value)}
                  />
                </Field>
                <Field label="Grade / purity">
                  <Input
                    label=""
                    id="grade"
                    value={form.grade}
                    onChange={(e) => setField("grade", e.target.value)}
                  />
                </Field>
                <Field label="Package">
                  <Input
                    label=""
                    id="package"
                    value={form.package}
                    onChange={(e) => setField("package", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-5 text-lg font-semibold text-neutral-900">Images</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[listing.image, listing.image, listing.image, listing.image].map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg">
                    <img src={src} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-neutral-700 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50"
                  style={{ border: "1px dashed #D4D4D8" }}
                >
                  <Upload className="size-5" />
                  Add image
                </button>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Status</h2>
              <div className="flex flex-col gap-2">
                {STATUSES.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="status"
                      checked={form.status === s}
                      onChange={() => setField("status", s)}
                      className="size-4 accent-neutral-900"
                    />
                    <span className="text-sm text-neutral-900">{s}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Listing ID</h2>
              <p className="rounded-lg bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700">
                {listing.id}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </SellerLayout>
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
