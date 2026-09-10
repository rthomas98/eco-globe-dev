"use client";

import { apiFetch } from "./backend-client";
import type { PilotLoadChoice, PilotRequestWrite, PilotStatus, PilotStepKey } from "./pilots";

/**
 * Client for pilot requests, call scheduling and the internal pilot desk.
 * Contract: docs/PILOT_IMPLEMENTATION_PLAN.md. Nothing here carries a
 * price, fee or carrier quote; pricing happens off-platform.
 */

export interface PilotListingContext {
  id: number;
  title: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  locationLabel: string;
}

export interface PilotDeliveryLocation {
  id: number;
  name: string;
  addressLine1: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
}

export interface PilotStaff {
  userId: number;
  name: string;
}

export interface PilotConfig {
  listing: PilotListingContext;
  locations: PilotDeliveryLocation[];
  constraints: string[];
  staff: PilotStaff[];
}

export interface PilotRequest {
  id: number;
  reference: string;
  listingId: number;
  listingTitle: string;
  sellerCompanyId: number;
  sellerCompanyName: string;
  buyerCompanyId: number;
  buyerCompanyName: string;
  originLabel: string;
  destinationLabel: string;
  destinationRegion: string;
  loadChoice: PilotLoadChoice;
  loadCount: number;
  approximateTonnage: number | string;
  neededBy: string;
  constraints: string[];
  objective: string;
  status: PilotStatus;
  contactPreference: "call" | "email";
  ownerUserId: number | null;
  ownerName: string | null;
  nextAction: string;
  callStartsAt: string | null;
  callEndsAt: string | null;
  buyerConsentedAt: string | null;
  shipmentId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PilotSlot {
  id: number;
  startsAt: string;
  endsAt: string;
  ownerUserId: number;
  ownerName: string;
  /** Admin listing only: the request holding this slot. */
  requestId?: number | null;
}

export interface PilotNote {
  id: number;
  body: string;
  createdAt: string;
  createdByName: string;
}

export interface PilotStep {
  key: PilotStepKey;
  completed: boolean;
  completedByName: string | null;
  completedAt: string | null;
}

export interface PilotCounts {
  new: number;
  call_due: number;
  working_lane: number;
  offer_sent: number;
  moving: number;
}

/** Seller projection: identity fields appear only after buyer consent. */
export interface SellerPilotInterest {
  id: number;
  reference: string;
  listingId: number;
  listingTitle: string;
  loadCount: number;
  approximateTonnage: number | string;
  destinationRegion: string;
  status: PilotStatus;
  buyerCompanyName?: string;
  buyerConsentedAt?: string;
}

const noStore = { cache: "no-store" as const };

function normalizeStep(step: PilotStep): PilotStep {
  return { ...step, completed: step.completed === true || Number(step.completed) === 1 };
}

/* ── Buyer ── */

export async function fetchPilotConfig(listingId: number) {
  const body = await apiFetch<{ ok: true } & PilotConfig>(
    `/api/pilots/config?listingId=${encodeURIComponent(String(listingId))}`,
    { method: "GET", ...noStore },
  );
  return {
    listing: body.listing,
    locations: Array.isArray(body.locations) ? body.locations : [],
    constraints: Array.isArray(body.constraints) ? body.constraints : [],
    staff: Array.isArray(body.staff) ? body.staff : [],
  } satisfies PilotConfig;
}

/** Create a request. The same clientRequestId never creates a second record. */
export async function createPilotRequest(body: PilotRequestWrite) {
  const response = await apiFetch<{ ok: true; request: PilotRequest }>("/api/pilots/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response.request;
}

export async function fetchPilotRequests() {
  const body = await apiFetch<{ ok: true; requests: PilotRequest[] }>("/api/pilots/requests", { method: "GET", ...noStore });
  return Array.isArray(body.requests) ? body.requests : [];
}

export async function fetchPilotRequest(id: number) {
  const body = await apiFetch<{ ok: true; request: PilotRequest; slots: PilotSlot[] }>(
    `/api/pilots/requests/${id}`,
    { method: "GET", ...noStore },
  );
  return { request: body.request, slots: Array.isArray(body.slots) ? body.slots : [] };
}

export async function fetchPilotSlots() {
  const body = await apiFetch<{ ok: true; slots: PilotSlot[] }>("/api/pilots/slots", { method: "GET", ...noStore });
  return Array.isArray(body.slots) ? body.slots : [];
}

export async function schedulePilotCall(requestId: number, slotId: number) {
  const body = await apiFetch<{ ok: true; request: PilotRequest }>(`/api/pilots/requests/${requestId}/schedule`, {
    method: "POST",
    body: JSON.stringify({ slotId }),
  });
  return body.request;
}

/** Ask for email follow-up instead of a call. Queues staff work; sends nothing. */
export async function preferPilotEmail(requestId: number) {
  const body = await apiFetch<{ ok: true; request: PilotRequest }>(`/api/pilots/requests/${requestId}/email-preference`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return body.request;
}

/** Buyer agrees to proceed on the off-platform terms and releases identity. */
export async function proceedWithPilot(requestId: number) {
  const body = await apiFetch<{ ok: true; request: PilotRequest }>(`/api/pilots/requests/${requestId}/proceed`, {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
  return body.request;
}

/* ── Seller ── */

export async function fetchSellerPilotInterest() {
  const body = await apiFetch<{ ok: true; requests: SellerPilotInterest[] }>("/api/pilots/seller-interest", { method: "GET", ...noStore });
  return Array.isArray(body.requests) ? body.requests : [];
}

/* ── Internal desk ── */

export async function fetchAdminPilotRequests(params: { q?: string; status?: PilotStatus | "" } = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  const suffix = search.toString() ? `?${search}` : "";
  const body = await apiFetch<{ ok: true; requests: PilotRequest[]; counts: Partial<PilotCounts>; staff: PilotStaff[] }>(
    `/api/admin/pilots/requests${suffix}`,
    { method: "GET", ...noStore },
  );
  const counts = body.counts ?? {};
  return {
    requests: Array.isArray(body.requests) ? body.requests : [],
    counts: {
      new: Number(counts.new ?? 0),
      call_due: Number(counts.call_due ?? 0),
      working_lane: Number(counts.working_lane ?? 0),
      offer_sent: Number(counts.offer_sent ?? 0),
      moving: Number(counts.moving ?? 0),
    } satisfies PilotCounts,
    staff: Array.isArray(body.staff) ? body.staff : [],
  };
}

export async function fetchAdminPilotRequest(id: number) {
  const body = await apiFetch<{ ok: true; request: PilotRequest; notes: PilotNote[]; steps: PilotStep[] }>(
    `/api/admin/pilots/requests/${id}`,
    { method: "GET", ...noStore },
  );
  return {
    request: body.request,
    notes: Array.isArray(body.notes) ? body.notes : [],
    steps: Array.isArray(body.steps) ? body.steps.map(normalizeStep) : [],
  };
}

export async function updateAdminPilotRequest(
  id: number,
  patch: { ownerUserId?: number | null; nextAction?: string; status?: PilotStatus },
) {
  const body = await apiFetch<{ ok: true; request: PilotRequest }>(`/api/admin/pilots/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return body.request;
}

export async function addAdminPilotNote(id: number, text: string) {
  const body = await apiFetch<{ ok: true; note: { id: number } }>(`/api/admin/pilots/requests/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ body: text }),
  });
  return body.note;
}

export async function setAdminPilotStep(id: number, key: PilotStepKey, completed: boolean) {
  const body = await apiFetch<{ ok: true; steps: PilotStep[] }>(`/api/admin/pilots/requests/${id}/steps/${key}`, {
    method: "PUT",
    body: JSON.stringify({ completed }),
  });
  return Array.isArray(body.steps) ? body.steps.map(normalizeStep) : [];
}

/** Idempotent: repeated calls return the same shipment. Requires buyer consent. */
export async function handoffAdminPilot(id: number) {
  const body = await apiFetch<{ ok: true; request: PilotRequest; shipmentId: number | null }>(
    `/api/admin/pilots/requests/${id}/handoff`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return { request: body.request, shipmentId: body.shipmentId ?? body.request.shipmentId };
}

export async function fetchAdminPilotSlots() {
  const body = await apiFetch<{ ok: true; slots: PilotSlot[]; staff: PilotStaff[] }>("/api/admin/pilots/slots", { method: "GET", ...noStore });
  return { slots: Array.isArray(body.slots) ? body.slots : [], staff: Array.isArray(body.staff) ? body.staff : [] };
}

export async function createAdminPilotSlot(input: { ownerUserId: number; startsAt: string }) {
  const body = await apiFetch<{ ok: true; slot: { id: number } }>("/api/admin/pilots/slots", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.slot;
}

export async function deleteAdminPilotSlot(id: number) {
  await apiFetch<{ ok: true }>(`/api/admin/pilots/slots/${id}`, { method: "DELETE" });
}
