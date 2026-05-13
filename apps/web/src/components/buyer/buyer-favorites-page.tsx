"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { Badge, Button } from "@eco-globe/ui";
import { BuyerLayout } from "./buyer-layout";
import { listings, type Listing } from "../public/browse-listings";

const FAVORITES_KEY = "ecoglobe.favoriteListings";

export function BuyerFavoritesPage() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY) ?? "[]";
      setIds(JSON.parse(raw) as string[]);
    } catch {
      setIds([]);
    }
    const onStorage = () => {
      try {
        const raw = localStorage.getItem(FAVORITES_KEY) ?? "[]";
        setIds(JSON.parse(raw) as string[]);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = (id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const favorites: Listing[] = ids
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is Listing => !!l);

  return (
    <BuyerLayout>
      <div className="px-8 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Saved listings</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {favorites.length} listing{favorites.length === 1 ? "" : "s"} you&apos;ve
              hearted across the marketplace.
            </p>
          </div>
          <Link href="/buyer/browse">
            <Button variant="secondary" size="md">
              <Search className="size-4" />
              Browse marketplace
            </Button>
          </Link>
        </div>

        {favorites.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((l) => (
              <FavoriteCard key={l.id} listing={l} onToggle={() => toggle(l.id)} />
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center" style={{ border: "1px solid #F0F0F0" }}>
      <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
        <Heart className="size-7" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-neutral-900">No favorites yet</h2>
      <p className="mt-2 max-w-[420px] text-sm text-neutral-500">
        Tap the heart icon on any listing detail page to save it here for quick
        access — handy when you&apos;re comparing feedstock across regions.
      </p>
      <Link href="/buyer/browse" className="mt-6">
        <Button variant="primary" size="md">
          <Search className="size-4" />
          Find listings
        </Button>
      </Link>
    </div>
  );
}

function FavoriteCard({ listing, onToggle }: { listing: Listing; onToggle: () => void }) {
  return (
    <div className="group overflow-hidden rounded-xl bg-white" style={{ border: "1px solid #F0F0F0" }}>
      <Link href={`/buyer/browse/${listing.id}`} className="block">
        <div className="relative h-48 overflow-hidden">
          <img
            src={listing.image}
            alt={listing.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggle();
            }}
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/95 shadow"
            aria-label="Remove from favorites"
          >
            <Heart className="size-4 fill-red-500 text-red-500" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold text-neutral-900 line-clamp-2">
            {listing.title}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">{listing.location}</p>
          <div className="mt-2 flex gap-1.5">
            <Badge>MOQ: {listing.moq}</Badge>
            <Badge>{listing.co2}</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-base font-semibold text-neutral-900">{listing.price}</span>
            <span className="text-xs text-neutral-500">{listing.unit}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
