"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button, Badge } from "@eco-globe/ui";

const listings = [
  {
    title: "Shredded, Refined Sugar Bagasse",
    location: "Port Allen, LA",
    distance: "3 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$48",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80",
  },
  {
    title: "Scrap Polymer Blend with Impurities",
    location: "Plaquemine, LA",
    distance: "3 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "€60",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&q=80",
  },
  {
    title: "High-Quality Recycled Pyrolysis Pitch",
    location: "Baker, LA",
    distance: "2.1 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$300",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=80",
  },
  {
    title: "Harvested and Baled Corn Stover",
    location: "Walker, LA",
    distance: "2.5 mi",
    moq: "3 tons",
    co2: "300 kg CO₂e",
    price: "$42",
    unit: "/ton",
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=80",
  },
];

function ListingCard({ listing }: { listing: (typeof listings)[0] }) {
  return (
    <div className="cursor-pointer">
      <div className="mb-3 h-[200px] overflow-hidden rounded-xl">
        <img
          src={listing.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <h3 className="text-base font-medium text-neutral-900">
        {listing.title}
      </h3>
      <p className="mt-1 text-sm text-neutral-700">
        {listing.location} · {listing.distance}
      </p>
      <div className="mt-2 flex gap-2">
        <Badge>MOQ: {listing.moq}</Badge>
        <Badge>{listing.co2}</Badge>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-lg font-semibold text-neutral-900">
          {listing.price}
        </span>
        <span className="text-sm text-neutral-700">{listing.unit}</span>
      </div>
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-neutral-200">
      <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <svg className="mx-auto mb-2 size-12 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="text-sm font-medium">Map View</p>
          <p className="text-xs text-neutral-400">Interactive map coming soon</p>
        </div>
      </div>
      {/* Sample tooltip */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-lg bg-white p-4 shadow-lg" style={{ width: 220 }}>
        <p className="text-sm font-semibold text-neutral-900">Corn Stover</p>
        <p className="text-xs text-neutral-700">Monroe, LA · Delivery in 48 hours</p>
        <div className="mt-1 flex gap-1">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">MOQ: 3 tons</span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">300 kg CO₂e</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-neutral-900">$42 <span className="text-xs font-normal text-neutral-500">/ ton</span></p>
      </div>
    </div>
  );
}

export function BrowsePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Search header */}
      <header className="flex h-16 items-center gap-4 bg-white px-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt="EcoGlobe" width={100} height={28} priority />
        </Link>

        <div className="mx-auto flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2">
          <input
            type="text"
            placeholder="Feedstocks"
            className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          <div className="h-5 w-px bg-neutral-300" />
          <input
            type="text"
            placeholder="Location"
            className="w-28 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
          <button className="flex size-8 items-center justify-center rounded-full bg-neutral-900 text-white">
            <Search className="size-4" />
          </button>
        </div>

        <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neutral-900" style={{ border: "1px solid #E0E0E0" }}>
          <SlidersHorizontal className="size-4" />
          Filters
        </button>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold text-neutral-900">Login</Link>
          <Button variant="primary" size="sm">Sign Up</Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1">
        {/* Listings panel */}
        <div className="w-[55%] overflow-y-auto p-6">
          <p className="mb-6 text-sm font-medium text-neutral-700">127 listings</p>
          <div className="grid grid-cols-2 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.title} listing={listing} />
            ))}
          </div>
        </div>

        {/* Map panel */}
        <div className="w-[45%] p-2">
          <MapPlaceholder />
        </div>
      </div>
    </div>
  );
}
