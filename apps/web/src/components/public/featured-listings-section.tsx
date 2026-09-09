"use client";

import Link from "next/link";
import { Button, Badge } from "@eco-globe/ui";
import type { Listing } from "./browse-listings";
import { useListings } from "@/lib/use-listings";

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/browse/${listing.id}`} className="group flex cursor-pointer flex-col gap-3">
      <div className="h-[240px] overflow-hidden rounded-xl bg-neutral-100">
        {listing.image ? (
          <img src={listing.image} alt={listing.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">No photo yet</div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-medium leading-6 text-neutral-900 group-hover:underline">{listing.title}</p>
          <p className="text-sm text-neutral-800">{listing.location || "Location not provided"}</p>
          <Badge className="w-fit">MOQ: {listing.moq}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-semibold text-neutral-900">{listing.price}</span>
          {listing.priceNum !== null && <span className="text-sm text-neutral-700">{listing.unit}</span>}
        </div>
      </div>
    </Link>
  );
}

/** Homepage featured listings: the most recent published listings from the backend. */
export function FeaturedListingsSection() {
  const published = useListings("public");
  const featured = published.listings.slice(0, 8);

  return (
    <section className="py-16 lg:py-[120px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[135px]">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center lg:mb-[60px]">
          <h2 className="text-2xl font-bold text-heading sm:text-4xl lg:text-5xl">Featured Listings</h2>
          <Link href="/browse"><Button variant="secondary" size="md">View All Listings</Button></Link>
        </div>
        {published.status === "loading" ? (
          <p className="text-sm text-neutral-600" role="status">Loading listings…</p>
        ) : published.status === "error" ? (
          <p className="rounded-xl bg-neutral-50 p-6 text-sm text-neutral-600" role="alert">Listings are temporarily unavailable. {published.error}</p>
        ) : featured.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-6 text-sm text-neutral-600">No published listings yet. Check back soon or <Link href="/register" className="font-semibold underline">register as a seller</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-[30px] lg:gap-y-10">
            {featured.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        )}
      </div>
    </section>
  );
}
