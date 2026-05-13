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
