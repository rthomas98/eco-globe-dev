import { apiFetch } from "./backend-client";
export type TrackerRecord = {
  id: number;
  listingId: number;
  status: string;
  createdAt: string;
  deadline?: string | null;
  carrier?: string | null;
  service?: string | null;
  tracking?: string | null;
  cents?: number | null;
  mode?: string | null;
  box?: string | null;
  label?: number | null;
  refund?: string | null;
  callAt?: string | null;
  shippingStatus?: string | null;
  shipmentId?: number | null;
  paid?: number;
};
export type TrackerFile = { id: number; listingId: number; name: string };
export type TrackerListing = {
  id: number;
  title: string;
  quantity: number;
  unit: string;
  price: number;
  currency: string;
  status: string;
  seller: string;
  city: string;
  region: string;
  createdAt: string;
  interestCount: number;
};
export type TrackerData = {
  account: {
    name: string;
    verification: string;
    canExecute: boolean;
    approvalLimit: number | null;
    licence: string | null;
    payout: string | null;
  };
  listings: TrackerListing[];
  samples: TrackerRecord[];
  labs: TrackerRecord[];
  pilots: TrackerRecord[];
  orders: TrackerRecord[];
  files: TrackerFile[];
  reports: TrackerFile[];
  sites: { id: number; city: string; region: string; verified: number }[];
};
export const getTracker = (role: "buyer" | "seller") =>
  apiFetch<TrackerData>(`/api/tracker?role=${role}`);
export const buyerStages = [
  "Interested",
  "Sample",
  "Testing",
  "Pilot",
  "Order",
  "In transit",
  "Delivered",
];
export const sellerStages = [
  "Listed",
  "Approved",
  "Interest",
  "Sample",
  "Testing",
  "Pilot",
  "Shipping",
  "Delivered",
  "Paid",
];
export function stageEvidence(
  role: "buyer" | "seller",
  listing: TrackerListing,
  data: TrackerData,
) {
  const has = (rows: TrackerRecord[]) =>
    rows.some((r) => r.listingId === listing.id);
  const delivered = data.orders.some(
    (r) =>
      r.listingId === listing.id &&
      (r.status === "delivered" || r.shippingStatus === "delivered"),
  );
  const shipping = data.orders.some(
    (r) =>
      r.listingId === listing.id &&
      ["in_transit", "delivered"].includes(r.shippingStatus ?? ""),
  );
  return role === "buyer"
    ? [
        true,
        has(data.samples),
        has(data.labs),
        has(data.pilots),
        has(data.orders),
        shipping,
        delivered,
      ]
    : [
        true,
        listing.status === "published",
        listing.interestCount > 0 ||
          has(data.samples) ||
          has(data.pilots) ||
          has(data.orders),
        has(data.samples),
        has(data.labs),
        has(data.pilots),
        shipping,
        delivered,
        data.orders.some((r) => r.listingId === listing.id && r.paid === 1),
      ];
}
