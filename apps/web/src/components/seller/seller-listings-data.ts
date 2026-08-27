export type SellerListingStatus = "Draft" | "Pending" | "Approved";
export type SellerSustainability = "Verified" | "Partial";

export interface SellerListing {
  name: string;
  id: string;
  category: string;
  available: number;
  price: string;
  sustainability: SellerSustainability;
  status: SellerListingStatus;
  location: string;
  image: string;
}

export const sellerListings: SellerListing[] = [
  { name: "Wood Sawdust Industrial High Quality", id: "EG-PROD-00023", category: "Polymer", available: 3500, price: "$400/ton", sustainability: "Verified", status: "Draft", location: "Baton Rouge, LA", image: "/products/wood-chips.png" },
  { name: "Household Cleaning Tools & Accessories Wood Chips Shavings Sawdust for Effective Cleaning", id: "EG-PROD-00024", category: "Refinery", available: 1400, price: "$400/ton", sustainability: "Verified", status: "Pending", location: "Lake Charles, LA", image: "/products/wood-shavings.png" },
  { name: "Natural Rutile Sand Concentrate 90%/95% TiO2 Wholesale for Titanium", id: "EG-PROD-00025", category: "Waste", available: 2000, price: "$400/ton", sustainability: "Verified", status: "Approved", location: "New Orleans, LA", image: "/products/rutile-sand.png" },
  { name: "Natural Zeolite Powder for Barn Odor Control, Ammonia Absorber", id: "EG-PROD-00026", category: "Plastic", available: 1700, price: "$400/ton", sustainability: "Partial", status: "Approved", location: "Monroe, LA", image: "/products/zeolite-powder.png" },
  { name: "Molecular Sieve Zeolite 13X for Drying Petrochemical Feedstocks of...", id: "EG-PROD-00027", category: "Plastic", available: 2300, price: "$400/ton", sustainability: "Partial", status: "Approved", location: "Shreveport, LA", image: "/products/molecular-sieve.png" },
  { name: "CBO Coal Tar Carbon Black Oil Feedstock", id: "EG-PROD-00028", category: "Plastic", available: 2300, price: "$400/ton", sustainability: "Partial", status: "Approved", location: "Lafayette, LA", image: "/products/coal-tar.png" },
  { name: "Granules Polypropylene Factory Plastic Raw Material Pellets", id: "EG-PROD-00029", category: "Plastic", available: 200, price: "$400/ton", sustainability: "Verified", status: "Approved", location: "Baton Rouge, LA", image: "/products/red-granules.png" },
];

export function getSellerListingById(id: string): SellerListing | undefined {
  return sellerListings.find((l) => l.id === id);
}

/* ── Live listing lookup (Phase 6B) ── */

/**
 * Resolve a seller listing by UI id. Static demo ids resolve locally;
 * EG-<n> ids fetch the live listing from the backend.
 */
export async function resolveSellerListing(
  id: string,
): Promise<SellerListing | undefined> {
  const local = getSellerListingById(id);
  if (local) return local;

  const match = /^EG-(\d+)$/.exec(id);
  if (!match) return undefined;
  try {
    const response = await fetch(`/api/backend/api/listings/${match[1]}`, {
      credentials: "same-origin",
    });
    if (!response.ok) return undefined;
    const body = (await response.json()) as {
      ok: boolean;
      listing?: {
        id: number;
        title: string;
        materialTypeCode: string;
        quantity: number;
        quantityUnit: string;
        pricePerUnit: number | null;
        listingStatusCode: string;
        locationCity: string | null;
        locationStateProvince: string | null;
      };
    };
    const l = body.listing;
    if (!l) return undefined;
    return {
      name: l.title,
      id: `EG-${l.id}`,
      category: l.materialTypeCode.replace(/_/g, " "),
      available: Number(l.quantity),
      price: l.pricePerUnit != null ? `$${l.pricePerUnit}/ton` : "—",
      sustainability: "Verified",
      status:
        l.listingStatusCode === "draft"
          ? "Draft"
          : l.listingStatusCode === "pending_review"
            ? "Pending"
            : "Approved",
      location: [l.locationCity, l.locationStateProvince].filter(Boolean).join(", "),
      image: "/products/generated/bagasse.png",
    };
  } catch {
    return undefined;
  }
}

/** Persist edits to a live listing (EG-<n>); no-op for demo ids. */
export async function saveSellerListing(
  id: string,
  form: { name: string; available: string; price: string; description?: string },
): Promise<boolean> {
  const match = /^EG-(\d+)$/.exec(id);
  if (!match) return false;
  const priceNumber = parseFloat(form.price.replace(/[^0-9.]/g, ""));
  const response = await fetch(`/api/backend/api/listings/${match[1]}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: form.name,
      quantity: Number(form.available) || undefined,
      pricePerUnit: Number.isFinite(priceNumber) ? priceNumber : undefined,
      description: form.description,
    }),
  });
  return response.ok;
}
