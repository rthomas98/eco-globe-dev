"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SlidersHorizontal, Heart, Share2, ArrowRight, Minus, Plus, ChevronRight, ThumbsUp, ThumbsDown, CheckCircle, FileText, AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { Button, Badge } from "@eco-globe/ui";
import { SearchBar } from "./search-bar";
import { Footer } from "./footer";
import { CartButton } from "@/components/cart/cart-panel";
import { useCart } from "@/components/cart/cart-context";
import { buildProductDetail } from "./product-detail-data";
import { useDemoUser } from "@/lib/demo-user";
import { useListing } from "@/lib/use-listings";
import { CarbonCalculatorButton } from "@/components/buyer/carbon-calculator-button";
import { SellerLocationMap } from "./seller-location-map";
import { HeaderUserMenu } from "@/components/auth/header-user-menu";
import { formatMoney, describeUnit } from "@/lib/listing-format";
import { ListingAnalysis } from "@/components/lab-testing/listing-analysis";
import { RequestSampleModal } from "@/components/samples/request-sample-modal";
import { recordListingInterest } from "@/lib/api-listings";
import { fetchFavorites, setFavorite } from "@/lib/api-account";
import { documentTypeLabel } from "@/components/seller/listing-documents";

const FAVORITES_KEY = "ecoglobe.favoriteListings";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-16 items-center justify-between bg-white px-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
        <Link href="/" className="mr-4 shrink-0"><img src="/logo.svg" alt="EcoGlobe" width={100} height={28} className="invert" /></Link>
        <div className="flex items-center gap-3">
          <SearchBar />
          <Link href="/browse" className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900" style={{ border: "1px solid #E0E0E0" }}><SlidersHorizontal className="size-4" />Filters</Link>
        </div>
        <div className="flex items-center gap-4"><CartButton /><HeaderUserMenu /></div>
      </header>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 lg:px-[135px]">
        <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/browse" className="hover:text-neutral-900">Browse</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-neutral-900">Product details</span>
        </div>
        {children}
      </div>
      <Footer />
    </div>
  );
}

export function ProductDetailPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  const detail = useListing(id, "public");
  const user = useDemoUser();
  const isMember = !!user;
  const { addItem } = useCart();
  const listing = detail.listing;
  const product = useMemo(() => (listing ? buildProductDetail(listing) : null), [listing]);

  const [qty, setQty] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);

  const backendId = listing?.backendId;

  // Aggregate interest signal for the seller — never identifies the viewer.
  useEffect(() => {
    recordListingInterest(backendId, "detail_view");
  }, [backendId]);

  useEffect(() => {
    if (!product) return;
    setSampleOpen(false);
    setQty(product.minOrder);
    setSelectedImg(0);
    setShowFullOverview(false);
    setShareStatus("");
    setFavoriteStatus("");
    setShareUrl("");
    setIsSharePanelOpen(false);
  }, [product?.id, product?.minOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!product) return;
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[];
      setIsFavorite(saved.includes(product.id));
    } catch {
      setIsFavorite(false);
    }
    // Signed-in members: the backend favorite wins over local storage.
    if (user && backendId) {
      let cancelled = false;
      fetchFavorites()
        .then((favorites) => {
          if (cancelled) return;
          setIsFavorite(favorites.some((f) => f.listingId === backendId));
        })
        .catch(() => {
          // Local storage already reflects the last known state.
        });
      return () => {
        cancelled = true;
      };
    }
  }, [product?.id, backendId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shareStatus) return;
    const timer = window.setTimeout(() => setShareStatus(""), 2500);
    return () => window.clearTimeout(timer);
  }, [shareStatus]);

  useEffect(() => {
    if (!favoriteStatus) return;
    const timer = window.setTimeout(() => setFavoriteStatus(""), 2500);
    return () => window.clearTimeout(timer);
  }, [favoriteStatus]);

  if (detail.status === "loading") {
    return <PageShell><p className="py-24 text-center text-sm text-neutral-600" role="status">Loading listing…</p></PageShell>;
  }
  if (detail.status === "not-found" || !product || !listing) {
    return (
      <PageShell>
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-lg font-bold text-neutral-900">Listing not found</p>
          <p className="mt-2 max-w-[420px] text-sm text-neutral-500">There is no published listing with id <code className="rounded bg-neutral-100 px-1.5 py-0.5">{id}</code>. It may be unpublished, closed, or the link may be wrong.</p>
          <Link href="/browse" className="mt-6"><Button variant="primary" size="md">Browse listings</Button></Link>
        </div>
      </PageShell>
    );
  }
  if (detail.status === "error") {
    return (
      <PageShell>
        <div className="mx-auto max-w-[520px] rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
          <p>{detail.error}</p>
          <button type="button" onClick={detail.reload} className="mt-2 inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="size-3" /> Retry</button>
        </div>
      </PageShell>
    );
  }

  const unit = describeUnit(product.quantityUnit);
  const hasSds = !!product.sdsUrl;
  const priceKnown = product.price !== null;
  const exceedsStock = product.available !== null && qty > product.available;
  const purchaseDisabled = !isMember || !hasSds || !priceKnown || exceedsStock;
  const itemSubtotal = priceKnown ? product.price! * qty : null;
  const money = (n: number | null) => (n === null ? "—" : (formatMoney(n, product.currencyCode) ?? "—"));
  const clampQty = (next: number) => {
    let value = Math.max(product.minOrder, Number.isFinite(next) ? next : product.minOrder);
    if (product.available !== null) value = Math.min(value, Math.max(product.minOrder, product.available));
    return value;
  };
  const isOwner = !!user?.activeCompanyId && user.activeCompanyId === listing.sellerCompanyId;
  const canRequest = !!user?.activeCompanyId && !isOwner;
  const labListing = { id: listing.backendId, title: product.title, sellerCompanyName: product.seller.name, location: product.location };
  // TDS / SDS / COA and certifications buyers can download; photos are shown in the gallery.
  const attachments = product.documents.filter((doc) => doc.typeCode !== "photo");

  const handleAddToCart = () => {
    if (!priceKnown) return;
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
    recordListingInterest(backendId, "cart_add");
  };

  const handleShare = async () => {
    const url = window.location.href;
    setShareUrl(url);
    setIsSharePanelOpen(true);
    setFavoriteStatus("");
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied");
    } catch {
      setShareStatus("Share link ready");
    }
  };

  const handleFavorite = () => {
    setShareStatus("");
    setIsSharePanelOpen(false);
    setIsFavorite((current) => {
      const next = !current;
      try {
        const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[];
        const updated = next ? Array.from(new Set([...saved, product.id])) : saved.filter((x) => x !== product.id);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch {
        // Keep the visible state responsive even if storage is unavailable.
      }
      setFavoriteStatus(next ? "Added to favorites" : "Removed from favorites");
      // Signed-in members persist favorites to their account.
      if (user && backendId) {
        void setFavorite(backendId, next).catch(() => {
          // Best-effort; the local list already reflects the change.
        });
      }
      return next;
    });
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="order-2 flex-1 lg:order-1">
          <h1 className="mb-3 text-xl font-bold text-neutral-900 sm:text-2xl lg:text-3xl">{product.title}</h1>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-700">{product.location}</span>
            <span className="text-neutral-400">·</span>
            <Badge>MOQ: {product.moq}</Badge>
            <Badge>{listing.hasCarbonData ? product.co2 : "Carbon data not provided"}</Badge>
          </div>

          <div className="relative mb-4 h-[250px] overflow-hidden rounded-2xl bg-neutral-100 sm:h-[350px] lg:h-[400px]">
            {product.images.length > 0 ? (
              <img src={product.images[selectedImg] ?? product.images[0]} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-500">The seller has not uploaded photos for this listing.</div>
            )}
            <button type="button" aria-label="Copy share link" onClick={handleShare} className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"><Share2 className="size-4 text-neutral-700" /></button>
            <button type="button" aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={isFavorite} onClick={handleFavorite} className="absolute right-4 top-16 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"><Heart className={`size-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-neutral-700"}`} /></button>
            {favoriteStatus && <div role="status" aria-live="polite" className="absolute right-4 top-[112px] rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">{favoriteStatus}</div>}
            {isSharePanelOpen && shareUrl && (
              <div role="dialog" aria-label="Share listing" className="absolute right-4 top-[112px] w-[min(320px,calc(100%-2rem))] rounded-xl bg-white p-4 text-sm shadow-xl" style={{ border: "1px solid #E0E0E0" }}>
                <div className="mb-3 flex items-center justify-between gap-3"><p className="font-semibold text-neutral-900">Share listing</p><button type="button" onClick={() => setIsSharePanelOpen(false)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">Close</button></div>
                <input readOnly aria-label="Share URL" value={shareUrl} onFocus={(event) => event.currentTarget.select()} className="mb-3 w-full rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700 outline-none" style={{ border: "1px solid #E0E0E0" }} />
                {shareStatus && <p role="status" aria-live="polite" className="mb-3 text-xs font-semibold text-green-700">{shareStatus}</p>}
                <a href={`mailto:?subject=${encodeURIComponent(product.title)}&body=${encodeURIComponent(shareUrl)}`} className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-3 py-2 text-xs font-bold text-white hover:opacity-90">Share by email</a>
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="mb-10 flex flex-nowrap gap-3 overflow-x-auto">
              {product.images.map((img, i) => (
                <button key={img} onClick={() => setSelectedImg(i)} className={`h-[72px] w-[80px] shrink-0 overflow-hidden rounded-lg ${i === selectedImg ? "ring-2 ring-neutral-900 ring-offset-2" : "opacity-70 hover:opacity-100"}`}><img src={img} alt="" className="h-full w-full object-cover" /></button>
              ))}
            </div>
          )}

          <h2 className="mb-4 text-xl font-bold text-neutral-900">Map</h2>
          <div className="mb-10">
            {product.sellerCoords ? (
              <SellerLocationMap lng={product.sellerCoords.lng} lat={product.sellerCoords.lat} />
            ) : (
              <p className="rounded-xl bg-neutral-50 p-6 text-sm text-neutral-600">The seller&apos;s facility has no saved coordinates, so it cannot be shown on the map.</p>
            )}
          </div>

          <h2 className="mb-4 text-xl font-bold text-neutral-900">Specifications</h2>
          <div className="mb-10">
            {product.specs.map((spec) => (
              <div key={spec.label} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:gap-4" style={{ borderBottom: "1px solid #F0F0F0" }}><span className="text-neutral-700 sm:w-48 sm:shrink-0">{spec.label}</span><span className="min-w-0 break-words text-neutral-900">{spec.value}</span></div>
            ))}
          </div>

          <ListingAnalysis listing={labListing} viewer={{ signedIn: isMember, canRequest, isOwner }} />

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
                <span className="text-sm font-semibold text-neutral-900">{product.seller.name ?? (product.teaser ? "Shown to members" : "Seller name unavailable")}</span>
                {product.seller.verified && <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700" style={{ backgroundColor: "#DCFCE7" }}>verified <CheckCircle className="size-3" /></span>}
              </div>
              <p className="text-xs text-neutral-500">{product.seller.location} · {product.seller.type}</p>
            </div>
          </div>

          <h2 className="mb-4 text-xl font-bold text-neutral-900">Carbon Analytics Tool</h2>
          <div className="mb-6 rounded-xl bg-neutral-50 p-6">
            <p className="mb-4 text-sm text-neutral-700">Estimate transportation footprint, compare scenarios, and estimate your savings for {product.title}.</p>
            {isMember ? (
              <div className="flex flex-wrap gap-3">
                <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="primary" label="Open Carbon Calculator" />
                <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="primary" label="Estimate savings" startAt="value-recovery" />
              </div>
            ) : (
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:opacity-90"><Lock className="size-3.5" />Sign in to use the Calculator</Link>
            )}
          </div>

          <div className="mb-10 flex items-center justify-between rounded-xl bg-neutral-50 px-6 py-4">
            <p className="text-sm text-neutral-700">Was this tool helpful, give us your feedback here</p>
            <div className="flex gap-3"><button className="text-neutral-500 hover:text-neutral-900"><ThumbsUp className="size-5" /></button><button className="text-neutral-500 hover:text-neutral-900"><ThumbsDown className="size-5" /></button></div>
          </div>
        </div>

        <div className="order-first w-full shrink-0 lg:order-none lg:w-[300px]">
          <div className="sticky top-8 rounded-xl bg-white p-6" style={{ border: "1px solid #E0E0E0" }}>
            <p className="text-xl font-bold text-neutral-900 sm:text-2xl lg:text-3xl">{product.priceLabel}{priceKnown && <span className="ml-1 text-base font-normal text-neutral-500">{product.unit}</span>}</p>
            {!priceKnown && !product.teaser && <p className="mt-1 text-xs text-neutral-500">The seller has not published a price for this listing.</p>}
            {product.teaser && (
              <p className="mt-1 text-xs text-neutral-600" role="note">
                Pricing, minimum order, seller details, specifications and documents are available to marketplace members.{" "}
                {isMember ? (
                  <Link href={user?.role === "seller" ? "/seller/onboarding" : "/buyer/onboarding"} className="font-semibold text-neutral-900 underline">Complete company onboarding</Link>
                ) : (
                  <Link href="/login" className="font-semibold text-neutral-900 underline">Sign in</Link>
                )}{" "}
                to unlock the full listing.
              </p>
            )}
            {product.priceIsZero && <p className="mt-1 text-xs text-neutral-500">Offered at no charge by the seller.</p>}
            <p className="mb-4 mt-2 text-sm text-neutral-700" style={{ borderBottom: "1px solid #F0F0F0", paddingBottom: "16px" }}>Minimum Order Quantity (MOQ): {product.minimumOrderLabel}</p>

            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-neutral-700">Quantity ({unit.plural})</span>
              <div className="flex items-center rounded-full" style={{ border: "1px solid #E0E0E0" }}>
                <button aria-label="Decrease quantity" onClick={() => setQty(clampQty(qty - 1))} className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900"><Minus className="size-4" /></button>
                <input aria-label="Quantity" type="number" min={product.minOrder} max={product.available ?? undefined} value={qty} onChange={(e) => setQty(clampQty(Number(e.target.value)))} className="w-16 bg-transparent text-center text-sm font-semibold text-neutral-900 outline-none" />
                <button aria-label="Increase quantity" onClick={() => setQty(clampQty(qty + 1))} className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900"><Plus className="size-4" /></button>
              </div>
            </div>
            <p className="mb-3 text-xs text-neutral-500">{product.availableLabel}{exceedsStock ? " — requested quantity exceeds availability." : ""}</p>

            <div className="flex items-center justify-between py-1.5 text-sm"><span className="text-neutral-700">Item subtotal</span><span className="text-neutral-900">{money(itemSubtotal)}</span></div>
            <div className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px solid #F0F0F0" }}><span className="text-neutral-700">Shipping</span><span className="text-neutral-500">Quoted per order</span></div>
            <div className="flex items-center justify-between py-3 text-sm font-bold"><span className="text-neutral-900">Subtotal (excl. shipping)</span><span className="text-neutral-900">{money(itemSubtotal)}</span></div>

            <Button variant="primary" size="lg" className="w-full" onClick={handleAddToCart} disabled={purchaseDisabled} style={purchaseDisabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>Add to Cart</Button>
            {!isMember && <p className="mt-2 flex items-center justify-center gap-1 text-xs text-neutral-500"><Lock className="size-3" /><Link href="/login" className="font-medium text-neutral-900 underline">Sign in</Link> to purchase</p>}
            {canRequest && (
              <button type="button" onClick={() => setSampleOpen(true)} className="mt-3 w-full rounded-full bg-white py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900/40" style={{ border: "1px solid #E0E0E0" }}>
                Request a Sample (5–10 lb)
              </button>
            )}
            {isMember && !hasSds && !product.teaser && <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 size-3 shrink-0" />Seller hasn&apos;t uploaded the SDS yet — purchase blocked.</p>}
            {isMember && !priceKnown && !product.teaser && <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 size-3 shrink-0" />No price recorded — request a quote from the seller.</p>}
          </div>

          {isMember && (
            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-white p-4" style={{ border: "1px solid #E0E0E0" }}>
              <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="primary" label="Open Carbon Calculator" />
              <CarbonCalculatorButton listing={listing} portal="buyer" initialQuantity={qty} variant="ghost" label="Estimate savings" startAt="value-recovery" />
              {product.teaser ? (
                <p className="flex items-start gap-1.5 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600"><Lock className="mt-0.5 size-3 shrink-0" />Documents are shown once your company onboarding is complete.</p>
              ) : hasSds ? (
                <a href={product.sdsUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50" style={{ border: "1px solid #E0E0E0" }}><FileText className="size-4" />Download SDS</a>
              ) : (
                <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 size-3 shrink-0" />SDS pending — request from seller before purchase.</p>
              )}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="mt-4 rounded-xl bg-white p-4" style={{ border: "1px solid #E0E0E0" }}>
              <p className="mb-3 text-sm font-bold text-neutral-900">Documents</p>
              <div className="flex flex-col gap-2">
                {attachments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ border: "1px solid #F0F0F0" }}>
                    <FileText className="size-4 shrink-0 text-neutral-500" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                        <span className="truncate">{documentTypeLabel(doc.typeCode)}</span>
                        {doc.verificationStatusCode === "verified" && <span className="shrink-0 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">Verified</span>}
                      </p>
                      <p className="truncate text-xs text-neutral-500">{doc.fileName}</p>
                    </div>
                    {isMember ? (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-neutral-900 underline">Download</a>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-neutral-400"><Lock className="size-3" /> Members</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 p-5">
            <div><p className="text-sm font-bold text-neutral-900">Do you want to know more?</p><p className="text-xs text-neutral-500">Here is how it works</p></div>
            <ArrowRight className="size-5 text-neutral-700" />
          </div>
        </div>
      </div>

      {sampleOpen && <RequestSampleModal listing={labListing} onClose={() => setSampleOpen(false)} />}

      {!isMember && (
        <div className="my-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-6 py-8 sm:flex-row sm:items-center sm:px-10">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">📋</div>
            <div><p className="text-lg font-bold text-neutral-900">Do you want to have more details?</p><p className="text-sm text-neutral-500">Sign up in our Marketplace</p></div>
          </div>
          <div className="flex gap-3"><Link href="/register"><Button variant="secondary" size="md">Sign up</Button></Link><Link href="/login"><Button variant="primary" size="md">Login</Button></Link></div>
        </div>
      )}
    </PageShell>
  );
}
