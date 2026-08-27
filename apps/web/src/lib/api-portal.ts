"use client";

/**
 * Shared portal reads for the authenticated pages: notifications, escrows,
 * payments, company details, and audit logs — all through the same-origin
 * backend proxy using the session cookie.
 */

async function proxyGet<T>(path: string): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

async function proxySend<T>(
  path: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

/* ── Notifications ── */

export interface ApiNotification {
  id: number;
  userId: number | null;
  companyId: number | null;
  relatedRecordTypeCode: string | null;
  relatedRecordId: number | null;
  notificationChannelCode: string;
  notificationCategoryCode: string;
  notificationStatusCode: string;
  subject: string;
  body: string;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function fetchNotifications(companyId?: number) {
  const suffix = companyId ? `?companyId=${companyId}` : "";
  const body = await proxyGet<{ ok: boolean; notifications: ApiNotification[] }>(
    `/api/notifications${suffix}`,
  );
  return Array.isArray(body.notifications) ? body.notifications : [];
}

export async function markNotificationRead(id: number) {
  return proxySend(`/api/notifications/${id}`, "PATCH", {
    notificationStatusCode: "read",
    readAt: new Date().toISOString(),
  });
}

/* ── Escrows ── */

export interface ApiEscrowRecord {
  id: number;
  orderId: number;
  escrowProviderCode: string;
  providerEscrowId: string | null;
  amount: number;
  currencyCode: string;
  escrowStatusCode: string;
  thresholdAmount: number | null;
  releaseRuleCode: string;
  disputeLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchEscrows() {
  const body = await proxyGet<{ ok: boolean; escrows: ApiEscrowRecord[] }>(
    "/api/escrows",
  );
  return Array.isArray(body.escrows) ? body.escrows : [];
}

/* ── Payments ── */

export interface ApiPayment {
  id: number;
  orderId: number;
  escrowId: number | null;
  payerCompanyId: number;
  payerCompanyName: string;
  providerPaymentId: string | null;
  amount: number;
  currencyCode: string;
  paymentStatusCode: string;
  paymentTypeCode: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchPayments() {
  const body = await proxyGet<{ ok: boolean; payments: ApiPayment[] }>(
    "/api/payments",
  );
  return Array.isArray(body.payments) ? body.payments : [];
}

/* ── Companies ── */

export interface ApiCompany {
  id: number;
  legalName: string;
  companyTypeCode: string;
  verificationStatusCode: string;
  createdAt: string;
}

export interface ApiCompanyMember {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  companyId: number;
  memberRoleCode: string;
  permissionTierCode: string;
  memberStatusCode: string;
}

export interface ApiLocation {
  id: number;
  companyId: number;
  locationTypeCode: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export async function fetchCompany(companyId: number) {
  const body = await proxyGet<{ ok: boolean; company: ApiCompany }>(
    `/api/companies/${companyId}`,
  );
  return body.company;
}

export async function fetchCompanyMembers(companyId: number) {
  const body = await proxyGet<{ ok: boolean; members: ApiCompanyMember[] }>(
    `/api/companies/${companyId}/members`,
  );
  return Array.isArray(body.members) ? body.members : [];
}

export async function fetchCompanyLocations(companyId: number) {
  const body = await proxyGet<{ ok: boolean; locations: ApiLocation[] }>(
    `/api/locations?companyId=${companyId}`,
  );
  return Array.isArray(body.locations) ? body.locations : [];
}

/* ── Seller / buyer profiles (admin oversight) ── */

export interface ApiSellerProfile {
  id: number;
  companyId: number;
  companyName: string;
  onboardingStatusCode: string;
  subscriptionStatusCode: string;
  payoutStatusCode: string;
  approvalStatusCode: string;
  createdAt: string;
}

export interface ApiBuyerProfile {
  id: number;
  companyId: number;
  companyName: string;
  onboardingStatusCode: string;
  subscriptionStatusCode: string;
  billingStatusCode: string;
  approvalStatusCode: string;
  createdAt: string;
}

export async function fetchSellerProfiles() {
  const body = await proxyGet<{ ok: boolean; sellerProfiles: ApiSellerProfile[] }>(
    "/api/seller-profiles",
  );
  return Array.isArray(body.sellerProfiles) ? body.sellerProfiles : [];
}

export async function fetchBuyerProfiles() {
  const body = await proxyGet<{ ok: boolean; buyerProfiles: ApiBuyerProfile[] }>(
    "/api/buyer-profiles",
  );
  return Array.isArray(body.buyerProfiles) ? body.buyerProfiles : [];
}

/* ── Listings (admin oversight — includes unpublished for admins) ── */

export interface ApiAdminListing {
  id: number;
  sellerCompanyId: number;
  sellerCompanyName: string;
  title: string;
  slug: string;
  materialTypeCode: string;
  quantity: number;
  quantityUnit: string;
  minimumOrderQuantity: number;
  pricePerUnit: number;
  currencyCode: string;
  listingStatusCode: string;
}

export async function fetchAllListings() {
  const body = await proxyGet<{ ok: boolean; listings: ApiAdminListing[] }>(
    "/api/listings",
  );
  return Array.isArray(body.listings) ? body.listings : [];
}

/* ── Interest signals (Phase 4) ── */

export interface ApiInterestRow {
  listingId: number;
  listingTitle: string;
  totalEvents: number;
  detailViews: number;
  cartAdds: number;
  quoteRequests: number;
  interestedCompanies: number;
  eventsLast30Days: number;
}

export async function fetchInterestSummary() {
  const body = await proxyGet<{ ok: boolean; interest: ApiInterestRow[] }>(
    "/api/interest",
  );
  return Array.isArray(body.interest) ? body.interest : [];
}

/* ── Wanted listings (Phase 4) ── */

export interface ApiWantedListing {
  id: number;
  buyerCompanyId: number | null;
  buyerCompanyName: string | null;
  title: string;
  materialTypeCode: string;
  materialTypeName: string;
  quantity: number;
  quantityUnit: string;
  targetPricePerUnit: number | null;
  currencyCode: string;
  countryCode: string;
  stateProvince: string | null;
  notes: string | null;
  isOpen: boolean;
  createdAt: string;
}

export async function fetchWantedListings(mineOnly = false) {
  const body = await proxyGet<{ ok: boolean; wantedListings: ApiWantedListing[] }>(
    `/api/wanted-listings${mineOnly ? "?mine=true" : ""}`,
  );
  return Array.isArray(body.wantedListings) ? body.wantedListings : [];
}

export async function createWantedListing(input: {
  title: string;
  materialTypeCode: string;
  quantity: number;
  quantityUnit?: string;
  targetPricePerUnit?: number;
  countryCode: string;
  stateProvince?: string;
  notes?: string;
}) {
  return proxySend<{ ok: boolean; wantedListing: { id: number } }>(
    "/api/wanted-listings",
    "POST",
    input,
  );
}

/* ── Saved searches (Phase 4) ── */

export interface ApiSavedSearch {
  id: number;
  name: string;
  searchQuery: string | null;
  materialTypeCode: string | null;
  countryCode: string | null;
  maxPricePerUnit: number | null;
  alertsEnabled: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export async function fetchSavedSearches() {
  const body = await proxyGet<{ ok: boolean; savedSearches: ApiSavedSearch[] }>(
    "/api/saved-searches",
  );
  return Array.isArray(body.savedSearches) ? body.savedSearches : [];
}

export async function createSavedSearch(input: {
  name: string;
  searchQuery?: string;
  materialTypeCode?: string;
  countryCode?: string;
  maxPricePerUnit?: number;
}) {
  return proxySend<{ ok: boolean; savedSearch: { id: number } }>(
    "/api/saved-searches",
    "POST",
    input,
  );
}

/* ── Admin moderation actions (Phase 5) ── */

/** Approve (publish) or reject (return to draft) a submitted listing. */
export async function moderateListing(
  listingId: number,
  decision: "approve" | "reject",
) {
  return proxySend(`/api/listings/${listingId}`, "PATCH", {
    listingStatusCode: decision === "approve" ? "published" : "draft",
  });
}

/** Mark a company's identity verification as passed. */
export async function verifyCompany(companyId: number) {
  return proxySend(`/api/companies/${companyId}`, "PATCH", {
    verificationStatusCode: "verified",
  });
}

/* ── Reports (Phase 5) ── */

export interface ApiReportSummary {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  grossMerchandiseValue: number;
  fundsHeld: number;
  fundsReleased: number;
  disputedEscrows: number;
  topListings: Array<{
    listingId: number;
    listingTitle: string;
    orders: number;
    revenue: number;
  }>;
}

export async function fetchReportSummary(companyId?: number) {
  const suffix = companyId ? `?companyId=${companyId}` : "";
  const body = await proxyGet<{ ok: boolean; summary: ApiReportSummary }>(
    `/api/reports/summary${suffix}`,
  );
  return body.summary;
}

/* ── By-id record fetchers (admin detail pages, Phase 6B) ── */

export async function fetchOrderById(id: number) {
  const body = await proxyGet<{ ok: boolean; order: Record<string, unknown> }>(
    `/api/orders/${id}`,
  );
  return body.order;
}

export async function fetchEscrowById(id: number) {
  const body = await proxyGet<{ ok: boolean; escrow: ApiEscrowRecord }>(
    `/api/escrows/${id}`,
  );
  return body.escrow;
}

export async function fetchPaymentById(id: number) {
  const body = await proxyGet<{ ok: boolean; payment: ApiPayment & { orderId: number } }>(
    `/api/payments/${id}`,
  );
  return body.payment;
}

export async function fetchListingById(id: number) {
  const body = await proxyGet<{ ok: boolean; listing: Record<string, unknown> }>(
    `/api/listings/${id}`,
  );
  return body.listing;
}

/** Admin: suspend or restore a company's marketplace standing. */
export async function setCompanyVerification(
  companyId: number,
  verificationStatusCode: "verified" | "suspended" | "pending_verification",
) {
  return proxySend(`/api/companies/${companyId}`, "PATCH", {
    verificationStatusCode,
  });
}

/** Admin: release or unlock an escrow. */
export async function adminUpdateEscrow(
  escrowId: number,
  patch: { escrowStatusCode?: string; disputeLocked?: boolean },
) {
  return proxySend(`/api/escrows/${escrowId}`, "PATCH", patch);
}

/** Extract a trailing numeric id from UI ids like EG-6, ESC-5, TX-2, LS-22. */
export function trailingNumericId(uiId: string): number | null {
  const match = /(\d+)$/.exec(uiId.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 && String(id) === match[1]
    ? id
    : null;
}

/* ── Audit logs (admin) ── */

export interface ApiAuditLog {
  id: number;
  actionTypeCode: string;
  recordTypeCode: string | null;
  recordId: number | null;
  actorTypeCode: string;
  actorUserId: number | null;
  actorUserName: string | null;
  reason: string | null;
  createdAt: string;
}

export async function fetchAuditLogs() {
  const body = await proxyGet<{ ok: boolean; auditLogs: ApiAuditLog[] }>(
    "/api/audit-logs",
  );
  return Array.isArray(body.auditLogs) ? body.auditLogs : [];
}

/* ── Shared formatting ── */

export function portalMoney(amount: number, currencyCode = "USD") {
  const symbol = currencyCode === "EUR" ? "€" : "$";
  return `${symbol}${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function portalDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function relativeTime(value: string | null) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
