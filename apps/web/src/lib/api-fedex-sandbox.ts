"use client";

import { apiFetch, apiFetchBlob, BackendApiError } from "./backend-client";

/**
 * Admin-only FedEx sandbox shipments. Every quote, label and tracking value
 * comes from the FedEx sandbox through the EcoGlobe backend; nothing here is
 * production shipping, and the UI never fills in a missing value.
 */
const BASE = "/api/admin/fedex-sandbox";

export interface FedexAddress {
  name: string;
  company?: string;
  phone?: string | null;
  street1: string;
  street2?: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  countryCode: string;
  residential?: boolean;
}

export interface FedexPackage {
  weightLb: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export interface FedexServiceOption {
  code: string;
  label: string;
  available: boolean;
  reason?: string | null;
}

export interface FedexCapabilities {
  /** False when sandbox credentials are not configured on the backend. */
  configured?: boolean;
  services: FedexServiceOption[];
  trackingMayBeVirtualized: boolean;
  notes: string[];
}

export type FedexShipmentState =
  | "quoted"
  | "quote_expired"
  | "booking"
  | "booking_unknown"
  | "booked"
  | "booking_failed"
  | "cancelling"
  | "cancelled"
  | "cancel_failed";

export interface FedexQuote {
  id: string;
  amountCents: number | null;
  currency: string | null;
  rateType: string | null;
  quotedAt: string;
  expiresAt: string | null;
}

export interface FedexTrackingEvent {
  at: string | null;
  description: string | null;
  location?: string | null;
}

export interface FedexTracking {
  status: string | null;
  description: string | null;
  lastEventAt: string | null;
  refreshedAt: string | null;
  virtualized: boolean | null;
  events?: FedexTrackingEvent[];
}

export interface FedexShipment {
  /** UUID; also the quote ID. */
  id: string;
  reference: string;
  environment: string;
  service: string;
  state: FedexShipmentState | string;
  shipper: FedexAddress;
  recipient: FedexAddress;
  package: FedexPackage;
  quote: FedexQuote | null;
  trackingNumber: string | null;
  labelAvailable: boolean;
  tracking: FedexTracking | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  bookedAt: string | null;
  cancelledAt: string | null;
}

export interface FedexQuoteRequest {
  idempotencyKey: string;
  service: string;
  shipper: FedexAddress;
  recipient: FedexAddress;
  package: FedexPackage;
}

/**
 * Mutation deadline: FedEx sandbox calls are slower than ordinary reads. It is
 * longer than the proxy's 60s bound so the proxy's 504 is what surfaces.
 */
const PROVIDER_DEADLINE_MS = 75_000;

export async function fetchFedexSandbox() {
  const body = await apiFetch<{
    environment?: string;
    capabilities?: FedexCapabilities;
    shipments?: FedexShipment[];
  }>(`${BASE}/shipments?limit=50`);
  return {
    capabilities: body.capabilities ?? null,
    shipments: Array.isArray(body.shipments) ? body.shipments : [],
  };
}

export async function fetchFedexShipment(id: string) {
  const body = await apiFetch<{ shipment: FedexShipment }>(
    `${BASE}/shipments/${encodeURIComponent(id)}`,
  );
  return body.shipment;
}

export async function requestFedexQuote(input: FedexQuoteRequest) {
  const body = await apiFetch<{ shipment: FedexShipment }>(`${BASE}/quotes`, {
    method: "POST",
    body: JSON.stringify(input),
    deadlineMs: PROVIDER_DEADLINE_MS,
  });
  return body.shipment;
}

export async function bookFedexShipment(
  id: string,
  quoteId: string,
  idempotencyKey: string,
) {
  const body = await apiFetch<{ shipment: FedexShipment }>(
    `${BASE}/shipments/${encodeURIComponent(id)}/book`,
    {
      method: "POST",
      body: JSON.stringify({ quoteId, idempotencyKey }),
      deadlineMs: PROVIDER_DEADLINE_MS,
    },
  );
  return body.shipment;
}

export async function refreshFedexTracking(id: string) {
  const body = await apiFetch<{ shipment: FedexShipment }>(
    `${BASE}/shipments/${encodeURIComponent(id)}/tracking/refresh`,
    { method: "POST", deadlineMs: PROVIDER_DEADLINE_MS },
  );
  return body.shipment;
}

export async function cancelFedexShipment(id: string, idempotencyKey: string) {
  const body = await apiFetch<{ shipment: FedexShipment }>(
    `${BASE}/shipments/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ idempotencyKey }),
      deadlineMs: PROVIDER_DEADLINE_MS,
    },
  );
  return body.shipment;
}

export function downloadFedexLabel(id: string) {
  return apiFetchBlob(`${BASE}/shipments/${encodeURIComponent(id)}/label`, {
    deadlineMs: PROVIDER_DEADLINE_MS,
  });
}

export function isFedexSandboxUnavailable(error: unknown) {
  return (
    error instanceof BackendApiError &&
    (error.status === 404 ||
      error.status === 405 ||
      error.status === 501 ||
      error.status === 503)
  );
}

/**
 * A request whose outcome the browser cannot know: it timed out or the
 * connection dropped after it may have reached FedEx. Never retry blindly.
 */
export function isOutcomeUnknown(error: unknown) {
  return (
    error instanceof BackendApiError &&
    (error.kind === "timeout" ||
      error.kind === "network" ||
      error.kind === "unknown")
  );
}

export function newIdempotencyKey() {
  const globalCrypto =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function")
    return globalCrypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
