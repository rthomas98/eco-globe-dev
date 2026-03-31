"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SlidersHorizontal, Heart, Share2, ArrowRight, Minus, Plus, ChevronRight, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { Button, Badge } from "@eco-globe/ui";
import { SearchBar } from "./search-bar";
import { Footer } from "./footer";
import { CartButton } from "@/components/cart/cart-panel";
import { useCart } from "@/components/cart/cart-context";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const product = {
  title: "Wood Sawdust Industrial Grade A",
  location: "Denham Springs, LA",
  distance: "2.4 mi",
  moq: "3 tons",
  co2: "300 kg CO₂e",
  price: 200,
  minOrder: 2,
  shipping: 50,
  images: [
    "/images/product/main.png",
    "/images/product/thumb-1.png",
    "/images/product/thumb-2.png",
    "/images/product/thumb-3.png",
    "/images/product/thumb-4.png",
    "/images/product/thumb-5.png",
  ],
  specs: [
    { label: "Storage Type", value: "In dry place" },
    { label: "Specification", value: "Export Standard" },
    { label: "Shelf Life", value: "12 months" },
    { label: "Composition", value: "Rice Husk" },
    { label: "Address", value: "Baton Rouge, United State" },
    { label: "Manufacturer", value: "Baton Rouge" },
  ],
  overview: "For a limited time only pick up a Caracal Car816 A2 piston rifle with 500 rounds of Federal soft point ammo! Just add the firearm to cart and the ammo case will automatically be applied to cart with discount!\n\nThe CAR816 A2 is chambered in 5.56×45mm NATO. The short-stroke push rod gas piston design is controlled by a three-position gas valve. It's manufactured with the best materials such as a Carpenter 158 bolt housed in an anti-tilt carrier, 4150 CMV barrel and aircraft-grade aluminum.",
  seller: { name: "Acme Corp", verified: true, location: "Denham Springs, LA", type: "Manufacture" },
  sellerCoords: { lng: -90.96, lat: 30.49 },
};

function SellerMap({ lng, lat }: { lng: number; lat: number }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 12,
    });
    m.addControl(new mapboxgl.NavigationControl(), "top-right");
    const el = document.createElement("div");
    el.style.cssText = "width:24px;height:24px;border-radius:50%;background:#378853;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);";
    new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(m);
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, [lng, lat]);

  return <div ref={mapContainer} className="h-[280px] w-full rounded-xl" />;
}

export function ProductDetailPage() {
  const [qty, setQty] = useState(3);
  const [selectedImg, setSelectedImg] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const { addItem } = useCart();

  const itemSubtotal = product.price * qty;
  const subtotal = itemSubtotal + product.shipping;

  const handleAddToCart = () => {
    addItem({
      id: "wood-sawdust-1",
      title: product.title,
      location: product.location,
      price: product.price,
      unit: "/ton",
      moq: product.minOrder,
      image: product.images[0],
      quantity: qty,
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
              <button className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md">
                <Share2 className="size-4 text-neutral-700" />
              </button>
              <button className="absolute right-4 top-16 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md">
                <Heart className="size-4 text-neutral-700" />
              </button>
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
              <button className="flex h-[72px] w-[80px] items-center justify-center rounded-lg bg-neutral-100">
                <ArrowRight className="size-5 text-neutral-500" />
              </button>
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

            {/* Seller map */}
            <div className="mb-10">
              <SellerMap lng={product.sellerCoords.lng} lat={product.sellerCoords.lat} />
            </div>

            {/* Carbon Analytics Tool */}
            <h2 className="mb-4 text-xl font-bold text-neutral-900">Carbon Analytics Tool</h2>
            <div className="mb-6 rounded-xl bg-neutral-50 p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-neutral-900">Your Address</label>
                <input
                  type="text"
                  placeholder="enter address"
                  className="w-full rounded-lg bg-white px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                  style={{ border: "1px solid #E0E0E0" }}
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-neutral-900">Transport Type</label>
                <select
                  className="w-full appearance-none rounded-lg bg-white px-4 py-3 text-sm text-neutral-500 outline-none"
                  style={{ border: "1px solid #E0E0E0" }}
                >
                  <option>-- Choose --</option>
                  <option>Truck</option>
                  <option>Rail</option>
                  <option>Ship</option>
                </select>
              </div>
              <Button variant="primary" size="md">Calculate</Button>
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
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900">${product.price}</p>
              <p className="mb-4 text-sm text-neutral-700" style={{ borderBottom: "1px solid #F0F0F0", paddingBottom: "16px" }}>
                Minimum order quantity: {product.minOrder} tons
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
                <span className="text-neutral-900">${itemSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm" style={{ borderBottom: "1px solid #F0F0F0" }}>
                <span className="text-neutral-700">Shipping total</span>
                <span className="text-neutral-900">${product.shipping}</span>
              </div>
              <div className="flex items-center justify-between py-3 text-sm font-bold">
                <span className="text-neutral-900">Subtotal</span>
                <span className="text-neutral-900">${subtotal.toFixed(2)}</span>
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={handleAddToCart}>
                Add to Cart
              </Button>
              <button className="mt-2 w-full text-center text-sm font-medium text-neutral-700 underline">
                Buy Now
              </button>
            </div>

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

        {/* CTA Banner */}
        <div className="my-10 flex items-center justify-between rounded-2xl bg-neutral-50 px-10 py-8">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">📋</div>
            <div>
              <p className="text-lg font-bold text-neutral-900">Do you want to have more details?</p>
              <p className="text-sm text-neutral-500">Sign up in our Marketplace</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="md">Sign up</Button>
            <Button variant="primary" size="md">Login</Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
