"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, Edit, Info, RefreshCw, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { SellerLayout } from "./seller-layout";
import { ListingMap, type MapListing } from "../public/listing-map";
import { useDemoUser } from "@/lib/demo-user";
import { useListing } from "@/lib/use-listings";
import { formatLocationAddress } from "@/lib/listing-view";
import { formatQuantity, formatQuantityWithUnitName } from "@/lib/listing-format";
import { describeBackendError } from "@/lib/backend-client";
import {
  DEMO_LISTING_SUBMIT_BLOCKED,
  DEMO_PRICE_ESTIMATE_LABEL,
  DEMO_VOLUME_ESTIMATE_LABEL,
  listingQuantityLabel,
  readDemoEstimates,
  type DemoEstimateFields,
} from "@/lib/demo-estimates";
import { DemoEstimateBadge, DemoEstimateBadges } from "@/components/shared/demo-estimate-badges";
import { closeListing, updateListing } from "@/lib/listings-api";
import {
  CLOSE_LISTING_CONFIRMATION,
  CLOSED_LISTING_NOTICE,
  PENDING_REVIEW_NOTICE,
  canCloseListing,
  canRestoreListing,
  isClosedListing,
} from "@/lib/listing-lifecycle";
import { CarbonCalculatorButton } from "@/components/buyer/carbon-calculator-button";
import { StatusBadge } from "./listings-page";
import { DocumentRow } from "./listing-documents";
import { ListingLabReports } from "@/components/lab-testing/listing-lab-reports";
import type { Listing } from "../public/browse-listings";
import type { BackendListing } from "@/lib/listings-api";

function NotFound({ id }: { id: string }) {
  return (
    <SellerLayout title="Listing not found">
      <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
        <p className="text-lg font-bold text-neutral-900">Listing not found</p>
        <p className="mt-2 text-sm text-neutral-500">
          No listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code> belongs to your company.
        </p>
        <Link href="/seller/listings" className="mt-6"><Button variant="primary" size="md">Back to listings</Button></Link>
      </div>
    </SellerLayout>
  );
}

export function SellerListingDetailPage({ id }: { id: string }) {
  const user = useDemoUser();
  const detail = useListing(id, "owned", { enabled: !!user });
  const [tab, setTab] = useState<"overview" | "documents" | "activity">("overview");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const inFlight = useRef(false);

  if (!user) {
    return <SellerLayout title="Listing detail"><p className="p-8 text-sm text-neutral-600">Sign in to view this listing.</p></SellerLayout>;
  }
  if (detail.status === "loading") {
    return <SellerLayout title="Listing detail"><p className="p-8 text-sm text-neutral-600" role="status">Loading listing…</p></SellerLayout>;
  }
  if (detail.status === "not-found") return <NotFound id={id} />;
  if (detail.status === "error" || !detail.listing || !detail.record) {
    return (
      <SellerLayout title="Listing detail">
        <div className="m-8 rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{detail.error}</p>
          <button type="button" onClick={detail.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" /> Retry</button>
        </div>
      </SellerLayout>
    );
  }

  const listing = detail.listing;
  const record = detail.record;

  // One status mutation at a time: the ref blocks a second click that lands
  // before the disabled state re-renders.
  const runMutation = async (mutate: () => Promise<BackendListing>, failure: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError("");
    try {
      detail.replace(await mutate());
      setConfirmingClose(false);
    } catch (error) {
      setActionError(describeBackendError(error, failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const changeStatus = (statusCode: "pending_review" | "paused" | "draft") =>
    runMutation(() => updateListing(record.id, { listingStatusCode: statusCode }), "The status could not be changed.");
  const confirmClose = () => runMutation(() => closeListing(record.id), "The listing could not be closed.");
  const restoreToDraft = () => runMutation(() => updateListing(record.id, { listingStatusCode: "draft" }), "The listing could not be restored.");

  const demo = readDemoEstimates(record.description);

  return (
    <SellerLayout title="Listing detail">
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/seller/listings" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900"><ArrowLeft className="size-4" />Back to listings</Link>
          <div className="flex flex-wrap items-center gap-2">
            {listing.statusCode === "draft" && (
              <Button variant="secondary" size="md" disabled={busy || !listing.sdsDocument || !record.locationId || demo.marker} onClick={() => void changeStatus("pending_review")} title={demo.marker ? DEMO_LISTING_SUBMIT_BLOCKED : !record.locationId ? "Choose a facility before submitting" : listing.sdsDocument ? undefined : "Upload the SDS before submitting"}>Submit for review</Button>
            )}
            {listing.statusCode === "published" && (
              <Button variant="secondary" size="md" disabled={busy} onClick={() => void changeStatus("paused")}>Pause</Button>
            )}
            {listing.statusCode === "paused" && (
              <Button variant="secondary" size="md" disabled={busy || !record.locationId || demo.marker} onClick={() => void changeStatus("pending_review")} title={demo.marker ? DEMO_LISTING_SUBMIT_BLOCKED : record.locationId ? undefined : "Choose a facility before resubmitting"}>Resubmit</Button>
            )}
            {canRestoreListing(listing.statusCode) && (
              <Button variant="secondary" size="md" disabled={busy} onClick={() => void restoreToDraft()}><RotateCcw className="size-4" />{busy ? "Restoring…" : "Restore to draft"}</Button>
            )}
            <Link href={`/seller/listings/${listing.id}/edit`}><Button variant="secondary" size="md"><Edit className="size-4" />Edit listing</Button></Link>
            {canCloseListing(listing.statusCode) && !confirmingClose && (
              <Button variant="secondary" size="md" disabled={busy} onClick={() => { setActionError(""); setConfirmingClose(true); }}><Archive className="size-4" />Close listing</Button>
            )}
          </div>
        </div>
        {confirmingClose && canCloseListing(listing.statusCode) && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-4 sm:px-5" style={{ border: "1px solid #FDE68A" }} role="group" aria-labelledby="close-listing-title" aria-describedby="close-listing-body">
            <p id="close-listing-title" className="text-sm font-semibold text-neutral-900">Close “{listing.title}”?</p>
            <p id="close-listing-body" className="mt-1 text-sm text-neutral-700">{CLOSE_LISTING_CONFIRMATION}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" size="md" disabled={busy} onClick={() => void confirmClose()}>{busy ? "Closing…" : "Close listing"}</Button>
              <Button variant="secondary" size="md" disabled={busy} onClick={() => setConfirmingClose(false)}>Keep listing open</Button>
            </div>
          </div>
        )}
        {listing.statusCode === "pending_review" && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status"><Info className="mt-0.5 size-4 shrink-0" />{PENDING_REVIEW_NOTICE}</p>
        )}
        {isClosedListing(listing.statusCode) && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-700" role="status"><Archive className="mt-0.5 size-4 shrink-0" />{CLOSED_LISTING_NOTICE}</p>
        )}
        {demo.marker && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status"><Info className="mt-0.5 size-4 shrink-0" />{DEMO_LISTING_SUBMIT_BLOCKED} You can still edit and save it as a draft.</p>
        )}
        {actionError && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{actionError}</p>}

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {listing.image ? <img src={listing.image} alt={listing.title} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-xs text-neutral-400">No photo</div>}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-neutral-900">{listing.title}</h1><StatusBadge status={listing.statusCode} /></div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
              <span>{listing.location || "No facility"}</span>
              <span>·</span>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">{listingQuantityLabel(formatQuantity(listing.qtyNum, listing.quantityUnit), demo)}</span>
              <span>·</span>
              <span className="font-semibold text-neutral-900">{listing.price}{listing.priceNum !== null ? listing.unit : ""}</span>
              <span>·</span>
              <span>#{listing.id} · {listing.slug}</span>
              <DemoEstimateBadges fields={demo} />
            </div>
            {!listing.sdsDocument && <p className="flex items-center gap-2 text-xs text-amber-700"><AlertTriangle className="size-3" />No SDS uploaded. Buyers cannot purchase and the listing cannot be submitted for review.</p>}
          </div>
        </header>

        <div className="mb-6 flex gap-6" style={{ borderBottom: "1px solid #F0F0F0" }}>
          {(["overview", "documents", "activity"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`-mb-px pb-3 text-sm font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-neutral-900 text-neutral-900" : "text-neutral-400 hover:text-neutral-700"}`}>
              {t === "activity" ? "Activity log" : t}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab listing={listing} record={record} demo={demo} />}
        {tab === "documents" && (
          <div className="flex flex-col gap-3">
            {(record.documents ?? []).length === 0 ? (
              <p className="rounded-xl bg-white p-6 text-sm text-neutral-500">No documents uploaded. Add the SDS, certifications and photos from the edit page.</p>
            ) : (
              (record.documents ?? []).map((doc) => <DocumentRow key={doc.id} document={doc} />)
            )}
            <section className="mt-4" aria-labelledby="seller-lab-reports-heading">
              <h3 id="seller-lab-reports-heading" className="mb-2 text-sm font-semibold text-neutral-900">Independent lab reports</h3>
              <ListingLabReports listingId={record.id} emptyText="No shared lab report on this listing. Buyers may request independent testing; reports appear here when they consent to sharing." />
            </section>
          </div>
        )}
        {tab === "activity" && <ActivityTab record={record} />}
      </div>
    </SellerLayout>
  );
}

function OverviewTab({ listing, record, demo }: { listing: Listing; record: BackendListing; demo: DemoEstimateFields }) {
  const specs = Object.entries(listing.specifications);
  const mapListing: MapListing | null =
    listing.lng !== null && listing.lat !== null
      ? { id: listing.id, title: listing.title, location: listing.location, price: listing.price, unit: listing.unit, moq: listing.moq, co2: listing.co2, lng: listing.lng, lat: listing.lat, image: listing.image ?? undefined }
      : null;
  const rawSpecs: unknown = record.specifications;
  const savedSpecs = rawSpecs && typeof rawSpecs === "object" ? (rawSpecs as Record<string, unknown>) : {};
  const savedState = typeof savedSpecs.state === "string" ? savedSpecs.state.trim() : "";
  const savedComposition = typeof savedSpecs.composition === "string" ? savedSpecs.composition.trim() : "";
  const currencyCode = typeof record.currencyCode === "string" ? record.currencyCode.trim().toUpperCase() : "";
  const extraCandidates: Array<[string, string]> = [
    ["Quality", listing.quality ?? ""],
    ["Composition", savedComposition],
    ["Feedstock state", savedState],
    ["Frequency", listing.frequency ?? ""],
    ["Available from", listing.availabilityFrom ?? ""],
    ["Available to", listing.availabilityTo ?? ""],
    ...(listing.additionalSpecs ?? []).map<[string, string]>((s) => [s.label, s.value]),
  ];
  const extra = extraCandidates.filter(([, v]) => !!v);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Listing info</h3>
          <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="mb-4 grid grid-cols-2 gap-y-4">
              <div><p className="text-xs font-semibold text-neutral-500">Listing category</p><p className="text-sm text-neutral-900">{listing.category}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Listing price</p><p className="text-sm text-neutral-900">{listing.price}{listing.priceNum !== null ? ` ${listing.unit}` : ""}{currencyCode ? ` (${currencyCode})` : ""}</p>{demo.price && <DemoEstimateBadge label={DEMO_PRICE_ESTIMATE_LABEL} />}</div>
              <div><p className="text-xs font-semibold text-neutral-500">Minimum Order Quantity (MOQ)</p><p className="text-sm text-neutral-900">{formatQuantityWithUnitName(listing.moqNum, listing.quantityUnit) ?? "Not set"}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">{demo.volume ? "Quantity" : "Available quantity"}</p><p className="text-sm text-neutral-900">{formatQuantityWithUnitName(listing.qtyNum, listing.quantityUnit) ?? "Not set"}</p>{demo.volume && <DemoEstimateBadge label={DEMO_VOLUME_ESTIMATE_LABEL} />}</div>
            </div>
            {listing.images.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto">{listing.images.map((img) => <div key={img} className="size-20 shrink-0 overflow-hidden rounded-lg"><img src={img} alt="" className="size-full object-cover" /></div>)}</div>
            ) : (
              <p className="text-xs text-neutral-500">No photos uploaded.</p>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Specifications</h3>
          <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            {specs.length + extra.length === 0 ? (
              <p className="text-sm text-neutral-500">No specifications recorded.</p>
            ) : (
              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
                {[...specs, ...extra].map(([k, v]) => (
                  <div key={k}><p className="text-xs font-semibold text-neutral-500">{k}</p><p className="text-sm text-neutral-900">{v}</p></div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Description</h3>
          <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{listing.description ?? "No description recorded."}</p>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Location</h3>
          <p className="mb-2 text-sm text-neutral-700">{record.location ? `${record.location.name ?? "Facility"} — ${formatLocationAddress(record.location)}` : "No facility linked."}</p>
          <div className="h-[300px] overflow-hidden rounded-xl"><ListingMap listings={mapListing ? [mapListing] : []} activeId={mapListing?.id} /></div>
          {!mapListing && <p className="mt-2 text-xs text-neutral-500">This facility has no saved coordinates, so it cannot be pinned on the map.</p>}
        </section>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Carbon analytics</h3>
          <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
            <div className="flex flex-col gap-3">
              <div><p className="text-xs font-semibold text-neutral-500">Carbon intensity</p><p className="text-sm text-neutral-900">{listing.hasCarbonData ? `${listing.co2} / ${listing.quantityUnit}` : "Not provided"}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Sustainability claims</p><p className="text-sm text-neutral-900">{listing.claims.length > 0 ? listing.claims.join(", ") : "None recorded"}</p></div>
              <div><p className="text-xs font-semibold text-neutral-500">Certifications</p><p className="text-sm text-neutral-900">{listing.documents.filter((d) => d.typeCode === "certification").length || "None uploaded"}</p></div>
              <div className="mt-2 flex flex-col gap-2">
                <CarbonCalculatorButton listing={listing} portal="seller" variant="primary" label="Open Carbon Calculator" />
                <CarbonCalculatorButton listing={listing} portal="seller" variant="ghost" label="Estimate value recovery" startAt="value-recovery" />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">Seller</h3>
          <div className="rounded-xl bg-white p-5 text-sm" style={{ border: "1px solid #F0F0F0" }}>
            <p className="font-semibold text-neutral-900">{listing.sellerCompanyName ?? "Company name unavailable"}</p>
            <p className="mt-1 text-xs text-neutral-500">{listing.sellerVerified ? "Verified account" : `Verification: ${record.sellerVerificationStatusCode?.replace(/_/g, " ") ?? "not verified"}`}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityTab({ record }: { record: BackendListing }) {
  const events = [
    record.createdAt ? { e: "Listing created", d: new Date(record.createdAt).toLocaleString() } : null,
    record.updatedAt && record.updatedAt !== record.createdAt ? { e: "Last updated", d: new Date(record.updatedAt).toLocaleString() } : null,
    { e: `Current status: ${record.listingStatusCode.replace(/_/g, " ")}`, d: "" },
  ].filter((x): x is { e: string; d: string } => x !== null);
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0" }}>
      {events.map((item, i) => (
        <div key={item.e} className="flex gap-4">
          <div className="flex flex-col items-center"><div className="size-3 rounded-full bg-green-500" />{i < events.length - 1 && <div className="w-0.5 flex-1 bg-green-500" />}</div>
          <div className="flex flex-1 items-center justify-between pb-5"><span className="text-sm font-medium text-neutral-900">{item.e}</span>{item.d && <span className="text-xs text-neutral-500">{item.d}</span>}</div>
        </div>
      ))}
      <p className="text-xs text-neutral-500">Only server-recorded timestamps are shown.</p>
    </div>
  );
}
