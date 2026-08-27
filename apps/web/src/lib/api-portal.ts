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
