"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Heart,
  Share2,
  ArrowRight,
  Minus,
  Plus,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import { getProductDetailById } from "../public/product-detail-data";
import { ListingMap } from "../public/listing-map";
import { BuyerLayout } from "./buyer-layout";

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
    <div className="relative h-[260px] w-full">
      <div
        className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs shadow"
        style={{ border: "1px solid #E0E0E0" }}
      >
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

export function BuyerProductDetailPage() {
  const params = useParams<{ id?: string }>();
  const product = useMemo(
    () => getProductDetailById(typeof params.id === "string" ? params.id : undefined),
    [params.id],
  );
  const [qty, setQty] = useState(3);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);

  useEffect(() => {
    setQty(product.minOrder);
    setSelectedImg(0);
    setShowFullOverview(false);
  }, [product.id, product.minOrder]);

  const itemSubtotal = product.price * qty;
  const subtotal = itemSubtotal + product.shipping;
  const formatMoney = (value: number) => `${product.currencySymbol}${value.toFixed(2)}`;

  return (
    <BuyerLayout>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-10">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
            <Link href="/buyer/browse" className="hover:text-neutral-900">
              Browse
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-neutral-900">Product details</span>
          </div>

          <div className="flex flex-col gap-10 lg:flex-row">
            {/* Left column */}
            <div className="flex-1">
              {/* Title */}
              <h1 className="mb-3 text-2xl font-bold text-neutral-900 sm:text-3xl lg:text-4xl">
                {product.title}
              </h1>
              <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
                <span>{product.location}</span>
                <span className="text-neutral-400">·</span>
                <span>{product.delivery}</span>
                <span className="text-neutral-400">·</span>
                <span
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
                >
                  {product.availableLabel}
                </span>
              </div>

              {/* Main image */}
              <div className="relative mb-4 h-[400px] overflow-hidden rounded-2xl sm:h-[450px] lg:h-[500px]">
                <img
                  src={product.images[selectedImg]}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
                <button
                  aria-label="Share"
                  className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"
                >
                  <Share2 className="size-4 text-neutral-700" />
                </button>
                <button
                  aria-label="Save"
                  className="absolute right-4 top-16 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white"
                >
                  <Heart className="size-4 text-neutral-700" />
                </button>
              </div>

              {/* Thumbnails */}
              <div className="mb-10 flex flex-nowrap gap-3 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`h-[80px] w-[100px] shrink-0 overflow-hidden rounded-lg ${
                      i === selectedImg
                        ? "ring-2 ring-neutral-900 ring-offset-2"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
                {product.images.length > 4 && (
                  <button className="flex h-[80px] w-[100px] shrink-0 items-center justify-center rounded-lg bg-neutral-100">
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
                  <div
                    key={i}
                    className="flex py-3.5 text-sm"
                    style={{ borderBottom: "1px solid #F0F0F0" }}
                  >
                    <span className="w-56 text-neutral-700">{spec.label}</span>
                    <span className="text-neutral-900">{spec.value}</span>
                  </div>
                ))}
              </div>

              {/* Overview */}
              <h2 className="mb-4 text-xl font-bold text-neutral-900">Overview</h2>
              <div className="mb-10">
                <p
                  className={`whitespace-pre-line text-sm leading-7 text-neutral-700 ${
                    !showFullOverview ? "line-clamp-4" : ""
                  }`}
                >
                  {product.overview}
                </p>
                <button
                  onClick={() => setShowFullOverview(!showFullOverview)}
                  className="mt-2 text-sm font-bold text-neutral-900 underline"
                >
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
                    <span className="text-sm font-semibold text-neutral-900">
                      {product.seller.name}
                    </span>
                    {product.seller.verified && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700"
                        style={{ backgroundColor: "#DCFCE7" }}
                      >
                        verified <CheckCircle className="size-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {product.seller.location} · {product.seller.type}
                  </p>
                </div>
              </div>
              {/* Feedback */}
              <div className="mb-10 flex items-center justify-between rounded-xl bg-neutral-50 px-6 py-4">
                <p className="text-sm text-neutral-700">
                  Was this tool helpfull, give us your feedback here
                </p>
                <div className="flex gap-3">
                  <button className="text-neutral-500 hover:text-neutral-900">
                    <ThumbsUp className="size-5" />
                  </button>
                  <button className="text-neutral-500 hover:text-neutral-900">
                    <ThumbsDown className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-full shrink-0 lg:w-[380px]">
              <div
                className="sticky top-8 rounded-2xl bg-white p-6"
                style={{ border: "1px solid #F0F0F0" }}
              >
                <p className="text-3xl font-bold text-neutral-900">{formatMoney(product.price)}</p>
                <p
                  className="mt-1 pb-5 text-sm text-neutral-500"
                  style={{ borderBottom: "1px solid #F0F0F0" }}
                >
                  Minimum order quantity: {product.minimumOrderLabel}
                </p>

                {/* Quantity stepper */}
                <div className="my-5 flex items-center justify-between">
                  <span className="text-sm text-neutral-700">Quantity</span>
                  <div
                    className="flex items-center rounded-full"
                    style={{ border: "1px solid #E0E0E0" }}
                  >
                    <button
                      onClick={() => setQty(Math.max(product.minOrder, qty - 1))}
                      className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-neutral-900">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="flex size-9 items-center justify-center text-neutral-700 hover:text-neutral-900"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Pricing */}
                <div
                  className="flex flex-col gap-2.5 pb-4"
                  style={{ borderBottom: "1px solid #F0F0F0" }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">Item subtotal</span>
                    <span className="font-medium text-neutral-900">
                      {formatMoney(itemSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">Shipping total</span>
                    <span className="font-medium text-neutral-900">{formatMoney(product.shipping)}</span>
                  </div>
                </div>
                <div className="mb-5 mt-3 flex items-center justify-between text-base font-bold">
                  <span className="text-neutral-900">Subtotal</span>
                  <span className="text-neutral-900">{formatMoney(subtotal)}</span>
                </div>

                <Link href="/buyer/checkout" className="block">
                  <Button variant="primary" size="lg" className="w-full">
                    Buy Now
                  </Button>
                </Link>
              </div>

              {/* Know more card */}
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-neutral-50 p-5">
                <div>
                  <p className="text-sm font-bold text-neutral-900">
                    Do you want to know more?
                  </p>
                  <p className="text-xs text-neutral-500">Here is how it works</p>
                </div>
                <button
                  aria-label="Learn more"
                  className="flex size-10 items-center justify-center rounded-lg bg-white"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <ArrowRight className="size-5 text-neutral-700" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
