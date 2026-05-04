"use client";

import { useEffect, useState } from "react";
import type { Listing } from "@/components/public/browse-listings";

const KEY = "ecoglobe.customListings";
const EVENT = "ecoglobe.customListings.changed";

export function readCustomListings(): Listing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Listing[];
  } catch {
    return [];
  }
}

export function addCustomListing(listing: Listing) {
  if (typeof window === "undefined") return;
  const current = readCustomListings();
  const next = [listing, ...current];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearCustomListings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** React hook — returns saved custom listings + re-renders on change. */
export function useCustomListings(): Listing[] {
  const [items, setItems] = useState<Listing[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(readCustomListings());
    setMounted(true);
    const refresh = () => setItems(readCustomListings());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, refresh);
    };
  }, []);

  return mounted ? items : [];
}
