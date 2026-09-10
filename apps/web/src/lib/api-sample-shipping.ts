import { apiFetch } from "./backend-client";
export type SampleSite = {
  id: number;
  company: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  verified: boolean;
};
export type SampleBox = {
  code: string;
  name: string;
  maxWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};
export type SampleRate = {
  id: string;
  carrier: string;
  service: string;
  cents: number;
  deliveryDays: number | null;
};
export type SampleConfig = {
  listing: { id: number; title: string };
  locations: SampleSite[];
  boxes: SampleBox[];
  mode: string;
  eligibility: { eligible: boolean;
    code?: string; reason?: string; canRefer?: boolean };
};
export type Shipment = {
  isBuyer: boolean;
  isSeller: boolean;
  id: number;
  reference: string;
  listingId: number;
  listingTitle: string;
  buyerCompanyId: number;
  sellerCompanyId: number;
  buyerCompanyName: string;
  sellerCompanyName: string;
  state: string;
  carrier: string;
  service: string;
  shippingCents: number;
  dispatchDeadline: string | null;
  dispatchedAt: string | null;
  trackingNumber: string | null;
  refundState: string;
  labelVoidState: string;
  mode: string;
  box: SampleBox;
  destination: SampleSite;
  creditCents: number | null;
  redeemedOrderId: number | null;
  lastError: string | null;
};
export const sampleApi = <T>(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
) =>
  apiFetch<T>(`/api/sample-shipping${path}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
export const sampleMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
