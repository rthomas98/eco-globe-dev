"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SlidersHorizontal, Heart, Share2, ArrowRight, Minus, Plus, ChevronRight, ThumbsUp, ThumbsDown, CheckCircle, FileText, AlertTriangle, Lock } from "lucide-react";
import { Button, Badge } from "@eco-globe/ui";
import { SearchBar } from "./search-bar";
import { Footer } from "./footer";
import { CartButton } from "@/components/cart/cart-panel";
import { useCart } from "@/components/cart/cart-context";
import { getProductDetailById } from "./product-detail-data";
import { listings as ALL_LISTINGS } from "./browse-listings";
import { useDemoUser } from "@/lib/demo-user";
import { CarbonCalculatorButton } from "@/components/buyer/carbon-calculator-button";
import { ListingMap } from "./listing-map";

const FAVORITES_KEY = "ecoglobe.favoriteListings";

function SellerMap({ lng, lat, title }: { lng: number; lat: number; title?: string }) {
  const [radius, setRadius] = useState<number>(0);
  const mapListing = {
    id: "seller-location",
    title: title ?? "Seller location",
    location: "",
    price: "",
    unit: "",
    moq: "",
    co2: "",
    lng,
    lat,
  };

  return (
    <div className="relative h-[280px] w-full">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs shadow"
        style={{ border: "1px solid #E0E0E0" }}>
        <span className="font-semibold text-neutral-700">Radius</span>
        <select
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value, 10))}
          className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs outline-none"
        >
          <option value={0}>Off</option>
          <option value={2}>2 mi</option>
          <option value={5}>5 mi</option>
          <option value={10}>10 mi</option>
          <option value={25}>25 mi</option>
          <option value={50}>50 mi</option>
        </select>
      </div>
      <ListingMap
        listings={[mapListing]}
        origin={{ lng, lat, label: title }}
        radiusMiles={radius > 0 ? radius : undefined}
      />
    </div>
  );
}

export function ProductDetailPage() {
  const params = useParams<{ id?: string }>();
  const product = useMemo(
    () => getProductDetailById(typeof params.id === "string" ? params.id : undefined),
    [params.id],
  );
  const [qty, setQty] = useState(3);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const { addItem } = useCart();
  const user = useDemoUser();
  const isMember = !!user;
  const matchedListing = useMemo(
    () =>
      ALL_LISTINGS.find(
        (l) => l.id === (typeof params.id === "string" ? params.id : ""),
      ),
    [params.id],
  );
  const hasSds = !!matchedListing?.sdsUrl;
  const purchaseDisabled = !isMember || !hasSds;

  useEffect(() => {
    setQty(product.minOrder);
    setSelectedImg(0);
    setShowFullOverview(false);
    setShareStatus("");
    setFavoriteStatus("");
    setShareUrl("");
    setIsSharePanelOpen(false);
  }, [product.id, product.minOrder]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[];
      setIsFavorite(saved.includes(product.id));
    } catch {
      setIsFavorite(false);
    }
  }, [product.id]);

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

  const itemSubtotal = product.price * qty;
  const subtotal = itemSubtotal + product.shipping;
  const formatMoney = (value: number) => `${product.currencySymbol}${value.toFixed(2)}`;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      location: product.location,
      price: product.price,
      unit: product.unit,
      moq: product.minOrder,
      image: product.images[0],
      quantity: qty,
    });
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    setShareUrl(shareUrl);
    setIsSharePanelOpen(true);
    setFavoriteStatus("");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("Link copied");
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(input);
      setShareStatus(copied ? "Link copied" : "Share link ready");
    }
  };

  const handleFavorite = () => {
    setShareStatus("");
    setIsSharePanelOpen(false);
    setIsFavorite((current) => {
      const next = !current;
      try {
        const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[];
        const updated = next
          ? Array.from(new Set([...saved, product.id]))
          : saved.filter((id) => id !== product.id);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch {
        // Keep the visible state responsive even if storage is unavailable.
      }
      setFavoriteStatus(next ? "Added to favorites" : "Removed from favorites");
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-white px-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
        <Link href="/" className="mr-4 shrink-0">
          <img src="/logo.svg" alt="EcoGlobe" width={100} height={28} className="invert" />
        </Link>
        <div className="flex items-center gap-3">
          <SearchBar />
          <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-900" style={{ border: "1px solid #E0E0E0" }}>
            <SlidersHorizontal className="size-4" />
            Filters
          </button>
        </div>
        <div className="flex items-center gap-4">
          <CartButton />
          <Link href="/login" className="text-base font-bold text-neutral-900">Login</Link>
          <Button variant="secondary" size="md">Sign Up</Button>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-[135px] py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
          <Link href="/browse" className="hover:text-neutral-900">Browse</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-neutral-900">Product details</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left column */}
          <div className="flex-1 order-2 lg:order-1">
            {/* Title */}
            <h1 className="mb-3 text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">{product.title}</h1>
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-neutral-700">{product.location}</span>
              <span className="text-neutral-400">·</span>
              <span className="text-sm text-neutral-700">{product.distance}</span>
              <span className="text-neutral-400">·</span>
              <Badge>MOQ: {product.moq}</Badge>
              <Badge>{product.co2}</Badge>
            </div>

            {/* Main image */}
            <div className="relative mb-4 h-[250px] sm:h-[350px] lg:h-[400px] overflow-hidden rounded-2xl">
              <img src={product.images[selectedImg]} alt={product.title} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Copy share link"
                onClick={handleShare}
                className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
              >
                <Share2 className="size-4 text-neutral-700" />
              </button>
              <button
                type="button"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
                onClick={handleFavorite}
                className="absolute right-4 top-16 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
              >
                <Heart
                  className={`size-4 ${
                    isFavorite ? "fill-red-500 text-red-500" : "text-neutral-700"
                  }`}
                />
              </button>
              {favoriteStatus && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute right-4 top-[112px] rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                >
                  {favoriteStatus}
                </div>
              )}
              {isSharePanelOpen && shareUrl && (
                <div
                  role="dialog"
                  aria-label="Share listing"
                  className="absolute right-4 top-[112px] w-[min(320px,calc(100%-2rem))] rounded-xl bg-white p-4 text-sm shadow-xl"
                  style={{ border: "1px solid #E0E0E0" }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-neutral-900">Share listing</p>
                    <button
                      type="button"
                      onClick={() => setIsSharePanelOpen(false)}
                      className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                    >
                      Close
                    </button>
                  </div>
                  <input
                    readOnly
                    aria-label="Share URL"
                    value={shareUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    className="mb-3 w-full rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700 outline-none"
                    style={{ border: "1px solid #E0E0E0" }}
                  />
                  {shareStatus && (
                    <p role="status" aria-live="polite" className="mb-3 text-xs font-semibold text-green-700">
                      {shareStatus}
                    </p>
                  )}
                  <a
                    href={`mailto:?subject=${encodeURIComponent(product.title)}&body=${encodeURIComponent(shareUrl)}`}
                    className="inline-flex w-full items-center justify-center rounded-full bg-neutral-900 px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                  >
                    Share by email
                  </a>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="mb-10 flex gap-3 overflow-x-auto flex-nowrap">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  className={`h-[72px] w-[80px] overflow-hidden rounded-lg ${i === selectedImg ? "ring-2 ring-neutral-900 ring-offset-2" : "opacity-70 hover:opacity-100"}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              {product.images.length > 4 && (
                <button className="flex h-[72px] w-[80px] items-center justify-center rounded-lg bg-neutral-100">
                  <ArrowRight className="size-5 text-neutral-500" />
                </button>
              )}
            </div>

            {/* Map */}
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Map</h2>
            <div className="mb-10">
              <SellerMap lng={product.sellerCoords.lng} lat={product.sellerCoords.lat} />
            </div>

            {/* Specifications */}
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Specifications</h2>
            <div className="mb-10">
              {product.specs.map((spec, i) => (
                <div key={i} className="flex py-3 text-sm" style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <span className="w-48 text-neutral-700">{spec.label}</span>
                  <span className="text-neutral-900">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Overview */}
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Overview</h2>
            <div className="mb-10">
              <p className={`text-sm leading-7 text-neutral-700 ${!showFullOverview ? "line-clamp-4" : ""}`}>
                {product.overview}
              </p>
              <button onClick={() => setShowFullOverview(!showFullOverview)} className="mt-2 text-sm font-bold text-neutral-900 underline">
                {showFullOverview ? "Show Less" : "Read More"}
              </button>
            </div>

            {/* Seller */}
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Seller</h2>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-700">
                A
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{product.seller.name}</span>
                  {product.seller.verified && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700" style={{ backgroundColor: "#DCFCE7" }}>
                      verified <CheckCircle className="size-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">{product.seller.location} · {product.seller.type}</p>
              </div>
            </div>

            {/* Carbon Analytics Tool */}
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Carbon Analytics Tool</h2>
            <div className="mb-6 rounded-xl bg-neutral-50 p-6">
              <p className="mb-4 text-sm text-neutral-700">
                Estimate transportation footprint, compare scenarios, and see
                annualized impact for {product.title}.
              </p>
              {isMember ? (
                <CarbonCalculatorButton
                  listingId={matchedListing?.id}
                  variant="primary"
                  label="Open Carbon Calculator"
                />
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  <Lock className="size-3.5" />
                  Sign in to use the Calculator
                </Link>
              )}
            </div>

            {/* Feedback */}
            <div className="mb-10 flex items-center justify-between rounded-xl bg-neutral-50 px-6 py-4">
              <p className="text-sm text-neutral-700">Was this tool helpful, give us your feedback here</p>
              <div className="flex gap-3">
                <button className="text-neutral-500 hover:text-neutral-900"><ThumbsUp className="size-5" /></button>
                <button className="text-neutral-500 hover:text-neutral-900"><ThumbsDown className="size-5" /></button>
              </div>
            </div>
          </div>

          {/* Right sidebar - Price card */}
          <div className="w-full lg:w-[300px] shrink-0 order-first lg:order-none">
            <div className="sticky top-8 rounded-xl bg-white p-6" style={{ border: "1px solid #E0E0E0" }}>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">{formatMoney(product.price)}</p>
              <p className="mb-4 text-sm text-neutral-700" style={{ borderBottom: "1px solid #F0F0F0", paddingBottom: "16px" }}>
                Minimum order quantity: {product.minimumOrderLabel}
              </p>

              {/* Quantity stepper */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-neutral-700">Quantity</span>
                <div className="flex items-center rounded-full" style={{ border: "1px solid #E0E0E0" }}>
                  <button onClick={() => setQty(Math.max(product.minOrder, qty - 1))} className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900">
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-neutral-900">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {/* Pricing */}
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-neutral-700">Item subtotal</span>
                <span className="text-neutral-900">{formatMoney(itemSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px solid #F0F0F0" }}>
                <span className="text-neutral-700">Shipping total</span>
                <span className="text-neutral-900">{formatMoney(product.shipping)}</span>
              </div>
              <div className="flex items-center justify-between py-3 text-sm font-bold">
                <span className="text-neutral-900">Subtotal</span>
                <span className="text-neutral-900">{formatMoney(subtotal)}</span>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={purchaseDisabled}
                style={
                  purchaseDisabled
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : undefined
                }
              >
                Add to Cart
              </Button>
              {!isMember && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-neutral-500">
                  <Lock className="size-3" />
                  <Link href="/login" className="font-medium text-neutral-900 underline">
                    Sign in
                  </Link>{" "}
                  to purchase
                </p>
              )}
              {isMember && !hasSds && (
                <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  Seller hasn&apos;t uploaded the SDS yet — purchase blocked.
                </p>
              )}
              <button
                className="mt-2 w-full text-center text-sm font-medium text-neutral-700 underline"
                disabled={purchaseDisabled}
                style={
                  purchaseDisabled
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : undefined
                }
              >
                Buy Now
              </button>
            </div>

            {/* Member tools — Carbon Calculator + SDS */}
            {isMember && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl bg-white p-4" style={{ border: "1px solid #E0E0E0" }}>
                <CarbonCalculatorButton
                  listingId={matchedListing?.id}
                  variant="primary"
                  label="Open Carbon Calculator"
                />
                {hasSds ? (
                  <a
                    href={matchedListing?.sdsUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                    style={{ border: "1px solid #E0E0E0" }}
                  >
                    <FileText className="size-4" />
                    Download SDS
                  </a>
                ) : (
                  <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                    SDS pending — request from seller before purchase.
                  </p>
                )}
              </div>
            )}

            {/* Know more card */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 p-5">
              <div>
                <p className="text-sm font-bold text-neutral-900">Do you want to know more?</p>
                <p className="text-xs text-neutral-500">Here is how it works</p>
              </div>
              <ArrowRight className="size-5 text-neutral-700" />
            </div>
          </div>
        </div>

        {/* CTA Banner — only for anonymous visitors */}
        {!isMember && (
        <div className="my-10 flex items-center justify-between rounded-2xl bg-neutral-50 px-10 py-8">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">📋</div>
            <div>
              <p className="text-lg font-bold text-neutral-900">Do you want to have more details?</p>
              <p className="text-sm text-neutral-500">Sign up in our Marketplace</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/register">
              <Button variant="secondary" size="md">Sign up</Button>
            </Link>
            <Link href="/login">
              <Button variant="primary" size="md">Login</Button>
            </Link>
          </div>
        </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
