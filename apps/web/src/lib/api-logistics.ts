"use client";

/**
 * Staff-managed logistics client (docs/implementation/LOGISTICS_MVP_API.md).
 *
 * Quotes are recorded manually by the seller or EcoGlobe staff; buyer
 * acceptance approves coordination only. Nothing here books a carrier,
 * charges a card, tracks GPS or moves escrow funds.
 */

import { apiFetch, BackendApiError } from "./backend-client";

export type LogisticsQuoteStatus = "offered" | "accepted";
export type LogisticsShipmentStatus =
  | "quote_pending"
  | "scheduled"
  | "in_transit"
  | "delivered"
  | "exception";

export interface LogisticsCarrier {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface LogisticsShipment {
  id: number;
  statusCode: LogisticsShipmentStatus;
  carrierId: number | null;
  carrierName: string | null;
  trackingNumber: string | null;
  pickupScheduledAt: string | null;
  deliveryConfirmedAt: string | null;
  originName: string | null;
  originLatitude: number | null;
  originLongitude: number | null;
  destinationName: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  bolFileName: string | null;
  bolUploadedAt: string | null;
  receiverName: string | null;
  deliveryNotes: string | null;
}

export interface LogisticsQuote {
  id: number;
  status: LogisticsQuoteStatus;
  carrierId: number;
  carrierName: string | null;
  amount: number;
  currencyCode: string;
  pickupScheduledAt: string;
  estimatedDeliveryAt: string | null;
  note: string | null;
}

export interface LogisticsOrder {
  id: number;
  orderStatusCode: string;
  buyerCompanyId: number;
  sellerCompanyId: number;
  buyerCompanyName: string;
  sellerCompanyName: string;
  listingTitle: string | null;
  quantity: number | null;
  quantityUnitCode: string | null;
  shippingTypeCode: string | null;
  /** Order currency; quotes must be recorded in it. */
  currencyCode: string | null;
  deliveryAddress: string | null;
  /** True while a dispute locks fulfilment; the backend refuses mutations. */
  fulfilmentLocked: boolean;
  shipment: LogisticsShipment | null;
  quote: LogisticsQuote | null;
}

export interface LogisticsWorkspace {
  orders: LogisticsOrder[];
  carriers: LogisticsCarrier[];
}

/* ── Boundary validation ── */

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function malformed(field: string): never {
  throw new BackendApiError(
    `The logistics workspace response was malformed (${field}).`,
    undefined,
    "server",
  );
}

function reqNumber(row: Row, key: string): number {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  return malformed(key);
}

function optNumber(row: Row, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  return reqNumber(row, key);
}

function reqString(row: Row, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : malformed(key);
}

function optString(row: Row, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : malformed(key);
}

/**
 * SQL DATETIME2 values arrive with up to seven fractional digits. Trim to
 * milliseconds so every browser's Date parser accepts them.
 */
function optDate(row: Row, key: string): string | null {
  const value = optString(row, key);
  return value === null ? null : value.replace(/(\.\d{3})\d+/, "$1");
}

function reqDate(row: Row, key: string): string {
  return optDate(row, key) ?? malformed(key);
}

const SHIPMENT_STATUSES: readonly LogisticsShipmentStatus[] = [
  "quote_pending",
  "scheduled",
  "in_transit",
  "delivered",
  "exception",
];

function isShipmentStatus(value: string): value is LogisticsShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(value);
}

function parseShipment(value: unknown): LogisticsShipment | null {
  if (value === null || value === undefined) return null;
  if (!isRow(value)) return malformed("shipment");
  const statusCode = reqString(value, "statusCode");
  if (!isShipmentStatus(statusCode)) return malformed("shipment.statusCode");
  return {
    id: reqNumber(value, "id"),
    statusCode,
    carrierId: optNumber(value, "carrierId"),
    carrierName: optString(value, "carrierName"),
    trackingNumber: optString(value, "trackingNumber"),
    pickupScheduledAt: optDate(value, "pickupScheduledAt"),
    deliveryConfirmedAt: optDate(value, "deliveryConfirmedAt"),
    originName: optString(value, "originName"),
    originLatitude: optNumber(value, "originLatitude"),
    originLongitude: optNumber(value, "originLongitude"),
    destinationName: optString(value, "destinationName"),
    destinationLatitude: optNumber(value, "destinationLatitude"),
    destinationLongitude: optNumber(value, "destinationLongitude"),
    bolFileName: optString(value, "bolFileName"),
    bolUploadedAt: optDate(value, "bolUploadedAt"),
    receiverName: optString(value, "receiverName"),
    deliveryNotes: optString(value, "deliveryNotes"),
  };
}

function parseQuote(value: unknown): LogisticsQuote | null {
  if (value === null || value === undefined) return null;
  if (!isRow(value)) return malformed("quote");
  const status = reqString(value, "status");
  if (status !== "offered" && status !== "accepted")
    return malformed("quote.status");
  return {
    id: reqNumber(value, "id"),
    status,
    carrierId: reqNumber(value, "carrierId"),
    carrierName: optString(value, "carrierName"),
    amount: reqNumber(value, "amount"),
    currencyCode: reqString(value, "currencyCode").trim(),
    pickupScheduledAt: reqDate(value, "pickupScheduledAt"),
    estimatedDeliveryAt: optDate(value, "estimatedDeliveryAt"),
    note: optString(value, "note"),
  };
}

function parseOrder(value: unknown): LogisticsOrder {
  if (!isRow(value)) return malformed("order");
  return {
    id: reqNumber(value, "id"),
    orderStatusCode: reqString(value, "orderStatusCode"),
    buyerCompanyId: reqNumber(value, "buyerCompanyId"),
    sellerCompanyId: reqNumber(value, "sellerCompanyId"),
    buyerCompanyName: optString(value, "buyerCompanyName") ?? "Buyer",
    sellerCompanyName: optString(value, "sellerCompanyName") ?? "Seller",
    listingTitle: optString(value, "listingTitle"),
    quantity: optNumber(value, "quantity"),
    quantityUnitCode: optString(value, "quantityUnitCode"),
    shippingTypeCode: optString(value, "shippingTypeCode"),
    currencyCode: optString(value, "currencyCode")?.trim() || null,
    deliveryAddress: optString(value, "deliveryAddress")?.trim() || null,
    fulfilmentLocked: value.fulfilmentLocked === true || value.fulfilmentLocked === 1,
    shipment: parseShipment(value.shipment),
    quote: parseQuote(value.quote),
  };
}

function parseCarrier(value: unknown): LogisticsCarrier {
  if (!isRow(value)) return malformed("carrier");
  const active = value.isActive;
  return {
    id: reqNumber(value, "id"),
    code: reqString(value, "code"),
    name: reqString(value, "name"),
    isActive: active === true || active === 1,
  };
}

/* ── Reads ── */

export async function fetchLogisticsWorkspace(): Promise<LogisticsWorkspace> {
  const body = await apiFetch<unknown>("/api/logistics/workspace");
  if (!isRow(body) || !Array.isArray(body.orders) || !Array.isArray(body.carriers))
    return malformed("workspace");
  return {
    orders: body.orders.map(parseOrder),
    carriers: body.carriers.map(parseCarrier),
  };
}

/**
 * Same-origin proxy URL for the private BOL PDF. The proxy attaches the
 * HttpOnly session and the backend authorizes the participant/admin and
 * replies with attachment headers, so a plain user-click anchor downloads it.
 */
export function logisticsBolDownloadUrl(orderId: number) {
  return `/api/backend/api/logistics/orders/${orderId}/bol`;
}

/* ── Actions (POST JSON, `{ok:true}`; callers reload the workspace) ── */

async function postAction(
  orderId: number,
  action: "quote" | "accept" | "bol" | "dispatch" | "confirm",
  payload: Record<string, unknown>,
  deadlineMs?: number,
) {
  await apiFetch<{ ok: true }>(`/api/logistics/orders/${orderId}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload),
    deadlineMs,
  });
}

export interface LogisticsQuoteInput {
  orderId: number;
  carrierId: number;
  amount: number;
  currencyCode: string;
  /** ISO timestamp; must be in the future. */
  pickupScheduledAt: string;
  estimatedDeliveryAt?: string;
  note?: string;
}

/** Seller/admin records a manual quote. No provider booking or charge. */
export function recordLogisticsQuote({ orderId, ...input }: LogisticsQuoteInput) {
  return postAction(orderId, "quote", { ...input });
}

/** Buyer approves the offered quote; staff then coordinate the pickup. */
export function acceptLogisticsQuote(input: { orderId: number; quoteId: number }) {
  return postAction(input.orderId, "accept", { quoteId: input.quoteId });
}

export const MAX_BOL_BYTES = 5 * 1024 * 1024;

/** Seller/admin attaches the BOL PDF. This does not dispatch the shipment. */
export function uploadLogisticsBol(input: {
  orderId: number;
  fileName: string;
  dataBase64: string;
}) {
  return postAction(
    input.orderId,
    "bol",
    {
      fileName: input.fileName,
      contentType: "application/pdf",
      dataBase64: input.dataBase64,
    },
    60_000,
  );
}

/** Seller/admin records carrier pickup. Tracking reference is optional. */
export function dispatchLogisticsShipment(input: {
  orderId: number;
  trackingNumber?: string;
}) {
  const trackingNumber = input.trackingNumber?.trim();
  return postAction(input.orderId, "dispatch", trackingNumber ? { trackingNumber } : {});
}

export interface ReceiptDetails {
  receiverName: string;
  notes?: string;
  inspectionComplete: true;
}

/**
 * Buyer acknowledges receipt (delivery or pickup). Completes the order and
 * records receipt evidence; it does not release escrow or move funds.
 */
export function confirmLogisticsReceipt(input: { orderId: number } & ReceiptDetails) {
  const notes = input.notes?.trim();
  return postAction(input.orderId, "confirm", {
    receiverName: input.receiverName.trim(),
    inspectionComplete: true,
    ...(notes ? { notes } : {}),
  });
}
