"use client";

import { useEffect, useState } from "react";

/**
 * Browser-only listing drafts.
 *
 * Earlier builds stored complete "custom listings" in localStorage instead of
 * saving them to the backend. Those records are preserved here, never deleted
 * silently, and surfaced in the seller listings page so the seller can resume
 * them into a real backend listing or discard them deliberately.
 *
 * New drafts written by the add-listing flow use the same storage with the
 * `form` payload so an interrupted session can be resumed.
 */

const KEY = "ecoglobe.customListings";
const EVENT = "ecoglobe.customListings.changed";

export interface LocalListingDraftForm {
  name: string;
  category: string;
  materialTypeCode: string;
  images: string[];
  material: string;
  listingType: string;
  grade: string;
  color: string;
  shelfLife: string;
  storage: string;
  pkg: string;
  weight: string;
  usage: string;
  origin: string;
  price: string;
  currencyCode: string;
  moq: string;
  qty: string;
  unit: string;
  description: string;
  claims: string[];
  /** Custom claims already saved on the record, preserved entry by entry. */
  customClaims: string[];
  otherClaim: string;
  sustainNotes: string;
  sameAsCompany: boolean;
  originLocation: string;
  quality: string;
  composition: string;
  frequency: string;
  state: string;
  availabilityFrom: string;
  availabilityTo: string;
  additionalSpecs: Array<{ label: string; value: string }>;
  locationId: string;
  sdsName: string;
}

export interface LocalListingDraft {
  /** Local-only identifier (`custom-<timestamp>` or `draft-<timestamp>`). */
  id: string;
  title: string;
  savedAt: string;
  /** Present for drafts written by the current add-listing flow. */
  form?: Partial<LocalListingDraftForm>;
  /** Legacy fields from the previous browser-only listing format. */
  legacy?: Record<string, unknown>;
}

function normalize(raw: unknown): LocalListingDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  if (!id) return null;
  if (record.form && typeof record.form === "object") {
    return {
      id,
      title:
        typeof record.title === "string" && record.title
          ? record.title
          : "Untitled draft",
      savedAt: typeof record.savedAt === "string" ? record.savedAt : "",
      form: record.form as Partial<LocalListingDraftForm>,
    };
  }
  // Legacy browser-only listing: keep every field for a later import.
  return {
    id,
    title: typeof record.title === "string" ? record.title : "Untitled draft",
    savedAt: typeof record.savedAt === "string" ? record.savedAt : "",
    legacy: record,
  };
}

export function readLocalListingDrafts(): LocalListingDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalize)
      .filter((draft): draft is LocalListingDraft => draft !== null);
  } catch {
    return [];
  }
}

function writeAll(drafts: LocalListingDraft[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(drafts.map((d) => (d.legacy ? d.legacy : d))));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function saveLocalListingDraft(
  form: Partial<LocalListingDraftForm>,
  existingId?: string,
): LocalListingDraft {
  const drafts = readLocalListingDrafts();
  const id = existingId ?? `draft-${Date.now()}`;
  const draft: LocalListingDraft = {
    id,
    title: form.name?.trim() || "Untitled draft",
    savedAt: new Date().toISOString(),
    form,
  };
  const next = [draft, ...drafts.filter((d) => d.id !== id)];
  writeAll(next);
  return draft;
}

export function getLocalListingDraft(id: string) {
  return readLocalListingDrafts().find((d) => d.id === id) ?? null;
}

/** Explicit removal after the seller confirms or after a successful backend save. */
export function removeLocalListingDraft(id: string) {
  writeAll(readLocalListingDrafts().filter((d) => d.id !== id));
}

/** Map a legacy browser-only listing into the add-listing form shape. */
export function legacyDraftToForm(draft: LocalListingDraft): Partial<LocalListingDraftForm> {
  if (draft.form) return draft.form;
  const legacy = draft.legacy ?? {};
  const str = (key: string) =>
    typeof legacy[key] === "string" ? (legacy[key] as string) : "";
  const num = (key: string) =>
    typeof legacy[key] === "number" && Number.isFinite(legacy[key])
      ? String(legacy[key])
      : "";
  const priceRaw = str("price").replace(/[^\d.]/g, "");
  return {
    name: str("title"),
    category: str("category"),
    images: Array.isArray(legacy.images)
      ? (legacy.images as string[])
      : str("image") && !str("image").startsWith("/products/")
        ? [str("image")]
        : [],
    price: priceRaw || num("priceNum"),
    currencyCode: str("price").trim().startsWith("€") ? "EUR" : str("price").trim().startsWith("$") ? "USD" : "",
    moq: str("moq").replace(/[^\d.]/g, ""),
    qty: num("qtyNum"),
    unit: str("unit") === "/unit" ? "unit" : str("unit") === "/ton" ? "ton" : "",
    quality: str("quality"),
    composition: str("composition"),
    frequency: str("frequency"),
    state: str("state"),
    availabilityFrom: str("availabilityFrom"),
    availabilityTo: str("availabilityTo"),
    additionalSpecs: Array.isArray(legacy.additionalSpecs)
      ? (legacy.additionalSpecs as Array<{ label: string; value: string }>)
      : [],
    originLocation: str("location"),
    sdsName: "",
  };
}

/** React hook — returns preserved local drafts and re-renders on change. */
export function useLocalListingDrafts(): LocalListingDraft[] {
  const [items, setItems] = useState<LocalListingDraft[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(readLocalListingDrafts());
    setMounted(true);
    const refresh = () => setItems(readLocalListingDrafts());
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
