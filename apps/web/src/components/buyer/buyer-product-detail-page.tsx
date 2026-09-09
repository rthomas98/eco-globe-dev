"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { Heart, Share2, ArrowRight, Minus, Plus, ChevronRight, ThumbsUp, ThumbsDown, CheckCircle, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { Button, Badge } from "@eco-globe/ui";
import { buildProductDetail } from "../public/product-detail-data";
import { BuyerLayout } from "./buyer-layout";
import { CarbonCalculatorButton } from "./carbon-calculator-button";
import { SellerLocationMap } from "../public/seller-location-map";
import { useListing } from "@/lib/use-listings";
import { formatMoney, describeUnit } from "@/lib/listing-format";
import { useDemoUser } from "@/lib/demo-user";
import { ListingAnalysis } from "@/components/lab-testing/listing-analysis";
import { RequestSampleModal } from "@/components/samples/request-sample-modal";

export function BuyerProductDetailPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { addItem, setIsOpen } = useCart();
  const id = typeof params.id === "string" ? params.id : undefined;
  const detail = useListing(id, "public");
  const listing = detail.listing;
  const product = useMemo(() => (listing ? buildProductDetail(listing) : null), [listing]);
  const [qty, setQty] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const user = useDemoUser();

  useEffect(() => {
    if (!product) return;
    setSampleOpen(false);
    setQty(product.minOrder);
    setSelectedImg(0);
    setShowFullOverview(false);
  }, [product?.id, product?.minOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const shell = (children: React.ReactNode) => (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-10">
          <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
            <Link href="/buyer/browse" className="hover:text-neutral-900">Browse</Link>
            <ChevronRight className="size-3.5" />
            <span className="text-neutral-900">Product details</span>
          </div>
          {children}
        </div>
      </div>
    </BuyerLayout>
  );

  if (detail.status === "loading") return shell(<p className="py-24 text-center text-sm text-neutral-600" role="status">Loading listing…</p>);
  if (detail.status === "error") {
    return shell(
      <div className="mx-auto max-w-[520px] rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
        <p>{detail.error}</p>
        <button type="button" onClick={detail.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" /> Retry</button>
      </div>,
    );
  }
  if (!product || !listing) {
    return shell(
      <div className="flex flex-col items-center py-24 text-center">
        <p className="text-lg font-bold text-neutral-900">Listing not found</p>
        <p className="mt-2 max-w-[420px] text-sm text-neutral-500">There is no published listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code>.</p>
        <Link href="/buyer/browse" className="mt-6"><Button variant="primary" size="md">Back to browse</Button></Link>
      </div>,
    );
  }

  const unit = describeUnit(product.quantityUnit);
  const priceKnown = product.price !== null;
  const hasSds = !!product.sdsUrl;
  const exceedsStock = product.available !== null && qty > product.available;
  const itemSubtotal = priceKnown ? product.price! * qty : null;
  const money = (n: number | null) => (n === null ? "—" : (formatMoney(n, product.currencyCode) ?? "—"));
  const clampQty = (next: number) => {
    let value = Math.max(product.minOrder, Number.isFinite(next) ? next : product.minOrder);
    if (product.available !== null) value = Math.min(value, Math.max(product.minOrder, product.available));
    return value;
  };
  const buyDisabled = !priceKnown || !hasSds || exceedsStock;
  const isOwner = !!user?.activeCompanyId && user.activeCompanyId === listing.sellerCompanyId;
  const canRequest = !!user?.activeCompanyId && !isOwner;
  const labListing = { id: listing.backendId, title: product.title, sellerCompanyName: product.seller.name, location: product.location };
  const handleBuyNow = () => {
    if (buyDisabled || !priceKnown) return;
    addItem({
      id: product.id,
      title: product.title,
      location: product.location,
      price: product.price!,
      currencyCode: product.currencyCode,
      unit: product.unit,
      quantityUnit: product.quantityUnit,
      moq: product.minOrder,
      available: product.available,
      sellerName: product.seller.name,
      image: product.images[0] ?? null,
      quantity: qty,
    });
    setIsOpen(false);
    router.push(`/buyer/checkout?listing=${encodeURIComponent(product.id)}`);
  };

  return shell(
    <div className="flex flex-col gap-10 lg:flex-row">
      <div className="flex-1">
        <h1 className="mb-3 text-2xl font-bold text-neutral-900 sm:text-3xl lg:text-4xl">{product.title}</h1>
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
          <span>{product.location}</span>
          <span className="text-neutral-400">·</span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">{product.availableLabel}</span>
          <Badge>MOQ: {product.moq}</Badge>
        </div>

        <div className="relative mb-4 h-[400px] overflow-hidden rounded-2xl bg-neutral-100 sm:h-[450px] lg:h-[500px]">
          {product.images.length > 0 ? (
            <img src={product.images[selectedImg] ?? product.images[0]} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">The seller has not uploaded photos for this listing.</div>
          )}
          <button aria-label="Share" className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"><Share2 className="size-4 text-neutral-700" /></button>
          <button aria-label="Save" className="absolute right-4 top-16 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"><Heart className="size-4 text-neutral-700" /></button>
        </div>
        {product.images.length > 1 && (
          <div className="mb-10 flex flex-nowrap gap-3 overflow-x-auto">
            {product.images.map((img, i) => (
              <button key={img} onClick={() => setSelectedImg(i)} className={`h-[80px] w-[100px] shrink-0 overflow-hidden rounded-lg ${i === selectedImg ? "ring-2 ring-neutral-900 ring-offset-2" : "opacity-70 hover:opacity-100"}`}><img src={img} alt="" className="h-full w-full object-cover" /></button>
            ))}
          </div>
        )}

        <h2 className="mb-4 text-xl font-bold text-neutral-900">Map</h2>
        <div className="mb-10">
          {product.sellerCoords ? <SellerLocationMap lng={product.sellerCoords.lng} lat={product.sellerCoords.lat} heightClassName="h-[260px]" /> : <p className="rounded-xl bg-neutral-50 p-6 text-sm text-neutral-600">The seller&apos;s facility has no saved coordinates, so it cannot be shown on the map.</p>}
        </div>

        <h2 className="mb-4 text-xl font-bold text-neutral-900">Specifications</h2>
        <div className="mb-10">
          {product.specs.map((spec) => (
            <div key={spec.label} className="flex flex-col gap-1 py-3.5 text-sm sm:flex-row sm:gap-4" style={{ borderBottom: "1px solid #F0F0F0" }}><span className="text-neutral-700 sm:w-56 sm:shrink-0">{spec.label}</span><span className="min-w-0 break-words text-neutral-900">{spec.value}</span></div>
          ))}
        </div>

        <ListingAnalysis listing={labListing} viewer={{ signedIn: !!user, canRequest, isOwner }} />

        <h2 className="mb-4 text-xl font-bold text-neutral-900">Overview</h2>
        <div className="mb-10">
          {product.overview ? (
            <>
              <p className={`whitespace-pre-line text-sm leading-7 text-neutral-700 ${!showFullOverview ? "line-clamp-4" : ""}`}>{product.overview}</p>
              <button onClick={() => setShowFullOverview(!showFullOverview)} className="mt-2 text-sm font-bold text-neutral-900 underline">{showFullOverview ? "Show Less" : "Read More"}</button>
            </>
          ) : (
            <p className="text-sm text-neutral-500">The seller has not added a description yet.</p>
          )}
        </div>

        <h2 className="mb-4 text-xl font-bold text-neutral-900">Seller</h2>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-700">{(product.seller.name ?? "?").slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900">{product.seller.name ?? "Seller name unavailable"}</span>
              {product.seller.verified && <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700" style={{ backgroundColor: "#DCFCE7" }}>verified <CheckCircle className="size-3" /></span>}
            </div>
            <p className="text-xs text-neutral-500">{product.seller.location} · {product.seller.type}</p>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-bold text-neutral-900">Carbon Analytics Tool</h2>
        <div className="mb-6 rounded-xl bg-neutral-50 p-6">
          <p className="mb-4 text-sm text-neutral-700">Estimate transportation footprint, compare scenarios, and estimate your savings for {product.title}.</p>
          <div className="flex flex-wrap gap-3">
            <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="primary" label="Open Carbon Calculator" />
            <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="primary" label="Estimate savings" startAt="value-recovery" />
          </div>
        </div>

        <div className="mb-10 flex items-center justify-between rounded-xl bg-neutral-50 px-6 py-4">
          <p className="text-sm text-neutral-700">Was this tool helpful, give us your feedback here</p>
          <div className="flex gap-3"><button className="text-neutral-500 hover:text-neutral-900"><ThumbsUp className="size-5" /></button><button className="text-neutral-500 hover:text-neutral-900"><ThumbsDown className="size-5" /></button></div>
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-[380px]">
        <div className="sticky top-8 rounded-2xl bg-white p-6" style={{ border: "1px solid #F0F0F0" }}>
          <p className="text-3xl font-bold text-neutral-900">{product.priceLabel}{priceKnown && <span className="ml-1 text-base font-normal text-neutral-500">{product.unit}</span>}</p>
          {!priceKnown && <p className="mt-1 text-xs text-neutral-500">The seller has not published a price for this listing.</p>}
          {product.priceIsZero && <p className="mt-1 text-xs text-neutral-500">Offered at no charge by the seller.</p>}
          <p className="mt-1 pb-5 text-sm text-neutral-500" style={{ borderBottom: "1px solid #F0F0F0" }}>Minimum Order Quantity (MOQ): {product.minimumOrderLabel}</p>

          <div className="my-5 flex items-center justify-between">
            <span className="text-sm text-neutral-700">Quantity ({unit.plural})</span>
            <div className="flex items-center rounded-full" style={{ border: "1px solid #E0E0E0" }}>
              <button aria-label="Decrease quantity" onClick={() => setQty(clampQty(qty - 1))} className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900"><Minus className="size-4" /></button>
              <input aria-label="Quantity" type="number" min={product.minOrder} max={product.available ?? undefined} value={qty} onChange={(e) => setQty(clampQty(Number(e.target.value)))} className="w-20 bg-transparent text-center text-sm font-semibold text-neutral-900 outline-none" />
              <button aria-label="Increase quantity" onClick={() => setQty(clampQty(qty + 1))} className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900"><Plus className="size-4" /></button>
            </div>
          </div>
          <p className="mb-3 text-xs text-neutral-500">{product.availableLabel}{exceedsStock ? " — requested quantity exceeds availability." : ""}</p>

          <div className="flex flex-col gap-2.5 pb-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <div className="flex items-center justify-between text-sm"><span className="text-neutral-700">Item subtotal</span><span className="font-medium text-neutral-900">{money(itemSubtotal)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-neutral-700">Shipping</span><span className="text-neutral-500">Quoted per order</span></div>
          </div>
          <div className="mb-5 mt-3 flex items-center justify-between text-base font-bold"><span className="text-neutral-900">Subtotal (excl. shipping)</span><span className="text-neutral-900">{money(itemSubtotal)}</span></div>

          <Button variant="primary" size="lg" className="w-full" onClick={handleBuyNow} disabled={buyDisabled} style={buyDisabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>Buy Now</Button>
          {canRequest && (
            <button type="button" onClick={() => setSampleOpen(true)} className="mt-3 w-full rounded-full bg-white py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900/40" style={{ border: "1px solid #E0E0E0" }}>
              Request a Sample (5–10 lb)
            </button>
          )}
          {!hasSds && <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 size-3 shrink-0" />Seller hasn&apos;t uploaded the SDS yet — purchase blocked.</p>}
          {!priceKnown && <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 size-3 shrink-0" />No price recorded — request a quote from the seller.</p>}
          <div className="mt-4 flex flex-col gap-2">
            <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="ghost" label="Open Carbon Calculator" />
            <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="ghost" label="Estimate savings" startAt="value-recovery" />
            {hasSds && <a href={product.sdsUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-50" style={{ border: "1px solid #E0E0E0" }}><FileText className="size-3.5" />Download SDS</a>}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-neutral-50 p-5">
          <div><p className="text-sm font-bold text-neutral-900">Do you want to know more?</p><p className="text-xs text-neutral-500">Here is how it works</p></div>
          <button aria-label="Learn more" className="flex size-10 items-center justify-center rounded-lg bg-white" style={{ border: "1px solid #F0F0F0" }}><ArrowRight className="size-5 text-neutral-700" /></button>
        </div>
      </div>
      {sampleOpen && <RequestSampleModal listing={labListing} onClose={() => setSampleOpen(false)} />}
    </div>,
  );
}
