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
  "Seller paid",
];
const ORDER_STAGES = ["Order", "Shipping", "In transit", "Delivered", "Seller paid"];
const SHIPPED = ["in_transit", "delivered"];
const nice = (value: string) => value.replaceAll("_", " ");

/** True when the record is a delivered shipment or a delivered order. */
const isDelivered = (r: TrackerRecord) => r.status === "delivered" || r.shippingStatus === "delivered";

/**
 * Records that are evidence for one stage of one listing. Order-backed stages
 * list only orders that qualify for that stage: shipments in transit or
 * delivered for Shipping / In transit, delivered shipments for Delivered and
 * recorded seller payouts for Seller paid. Order rows repeat per shipment, so
 * the Order stage lists each order once.
 */
export function stageRecords(stage: string, listingId: number, data: TrackerData): TrackerRecord[] {
  const own = (rows: TrackerRecord[]) => rows.filter((r) => r.listingId === listingId);
  if (stage === "Sample") return own(data.samples);
  if (stage === "Testing") return own(data.labs);
  if (stage === "Pilot") return own(data.pilots);
  const orders = own(data.orders);
  if (stage === "Order") return orders.filter((r, i) => orders.findIndex((o) => o.id === r.id) === i);
  if (stage === "Shipping" || stage === "In transit") return orders.filter((r) => SHIPPED.includes(r.shippingStatus ?? ""));
  if (stage === "Delivered") return orders.filter(isDelivered);
  if (stage === "Seller paid") {
    const paid = orders.filter((r) => r.paid === 1);
    return paid.filter((r, i) => paid.findIndex((o) => o.id === r.id) === i);
  }
  return [];
}

/** What a record proves at a stage, e.g. "shipment delivered" or "seller payout paid". */
export function stageRecordLabel(stage: string, r: TrackerRecord): string {
  if (!ORDER_STAGES.includes(stage)) return nice(r.shippingStatus ?? r.status);
  if (stage === "Seller paid") return "seller payout paid";
  if (stage === "Order")
    return r.shippingStatus && r.shippingStatus !== r.status
      ? `order ${nice(r.status)} · shipment ${nice(r.shippingStatus)}`
      : `order ${nice(r.status)}`;
  if (stage === "Delivered" && r.shippingStatus !== "delivered") return `order ${nice(r.status)}`;
  return `shipment${r.shipmentId ? ` SHP-${r.shipmentId}` : ""} ${nice(r.shippingStatus ?? "not recorded")}`;
}

/** Tooltip/aria summary for a stage dot, naming only that stage's evidence. */
export function stageSummary(stage: string, records: TrackerRecord[]): string {
  if (!records.length) return `${stage} — No activity`;
  if (!ORDER_STAGES.includes(stage))
    return `${stage} — ${[...new Set(records.map((r) => stageRecordLabel(stage, r)))].join(", ")}`;
  const parts = records.map((r) => `EG-${r.id} ${stageRecordLabel(stage, r)}`);
  return `${stage} — ${[...new Set(parts)].join(", ")}`;
}

export function stageEvidence(
  role: "buyer" | "seller",
  listing: TrackerListing,
  data: TrackerData,
) {
  const has = (stage: string) => stageRecords(stage, listing.id, data).length > 0;
  return role === "buyer"
    ? [true, has("Sample"), has("Testing"), has("Pilot"), has("Order"), has("In transit"), has("Delivered")]
    : [
        true,
        listing.status === "published",
        listing.interestCount > 0 || has("Sample") || has("Pilot") || has("Order"),
        has("Sample"),
        has("Testing"),
        has("Pilot"),
        has("Shipping"),
        has("Delivered"),
        has("Seller paid"),
      ];
}
