import { listings, type Listing } from "./browse-listings";

export interface ProductDetailModel {
  id: string;
  title: string;
  location: string;
  distance: string;
  moq: string;
  co2: string;
  price: number;
  currencySymbol: "$" | "€";
  unit: string;
  minOrder: number;
  minimumOrderLabel: string;
  shipping: number;
  images: string[];
  specs: Array<{ label: string; value: string }>;
  overview: string;
  seller: {
    name: string;
    verified: boolean;
    location: string;
    type: string;
  };
  sellerCoords: {
    lng: number;
    lat: number;
  };
  availableLabel: string;
  delivery: string;
}

const MIN_ORDER_PATTERN = /(\d+(?:\.\d+)?)/;

function getMinimumOrderValue(moq: string) {
  const match = moq.match(MIN_ORDER_PATTERN);
  return match ? Number(match[1]) : 1;
}

function getCurrencySymbol(price: string): "$" | "€" {
  return price.trim().startsWith("€") ? "€" : "$";
}

function getQuantityLabel(listing: Listing) {
  return `${listing.qtyNum} ${listing.unit === "/unit" ? "units" : "tons"} available`;
}

function getDeliveryLabel(listing: Listing) {
  if (listing.category === "Used products") {
    return "Inspection and pickup scheduling available";
  }
  if (listing.category === "Oils & Liquid Feedstocks") {
    return "Delivery in 72 hrs";
  }
  return "Delivery in 48 hrs";
}

function buildOverview(listing: Listing) {
  const carbonText = listing.hasCarbonData
    ? `Current carbon intensity is listed at ${listing.co2}.`
    : "Carbon intensity data is still being finalized by the seller.";

  return `${listing.title} is listed in EcoGlobe's ${listing.category.toLowerCase()} marketplace and is currently available from ${listing.location}. This material is offered at ${listing.price}${listing.unit} with a minimum order of ${listing.moq}.\n\n${carbonText} Buyers can use this detail page to review fit, confirm availability, and coordinate the next steps with the seller before checkout.`;
}

function buildSpecs(listing: Listing) {
  return [
    { label: "Category", value: listing.category },
    { label: "Marketplace grade", value: listing.grade },
    { label: "Minimum order", value: listing.moq },
    {
      label: "Carbon profile",
      value: listing.hasCarbonData ? listing.co2 : "Carbon data pending",
    },
    { label: "Available quantity", value: getQuantityLabel(listing) },
    { label: "Pickup location", value: listing.location },
  ];
}

function buildSellerName(listing: Listing) {
  const [siteName] = listing.location.split(",");
  return `${siteName.trim()} Resource Co.`;
}

function buildGalleryImages(listing: Listing) {
  const detailImage = listing.image.replace(".png", "-detail.png");
  return [listing.image, detailImage];
}

export function getListingById(id?: string) {
  return listings.find((listing) => listing.id === id) ?? listings[0];
}

export function getProductDetailById(id?: string): ProductDetailModel {
  const listing = getListingById(id);

  return {
    id: listing.id,
    title: listing.title,
    location: listing.location,
    distance: listing.distance,
    moq: listing.moq,
    co2: listing.co2,
    price: listing.priceNum,
    currencySymbol: getCurrencySymbol(listing.price),
    unit: listing.unit,
    minOrder: getMinimumOrderValue(listing.moq),
    minimumOrderLabel: listing.moq,
    shipping: Math.max(25, Math.round(listing.priceNum * 0.15)),
    images: buildGalleryImages(listing),
    specs: buildSpecs(listing),
    overview: buildOverview(listing),
    seller: {
      name: buildSellerName(listing),
      verified: true,
      location: listing.location,
      type: listing.category,
    },
    sellerCoords: {
      lng: listing.lng,
      lat: listing.lat,
    },
    availableLabel: getQuantityLabel(listing),
    delivery: getDeliveryLabel(listing),
  };
}
