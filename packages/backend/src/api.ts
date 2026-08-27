import type { IncomingMessage, ServerResponse } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getBearerToken,
  getOptionalSessionAuth,
  getSessionFromToken,
  requireSessionAuth,
} from "./auth.js";
import { uploadDocument } from "./storage.js";
import {
  queryRowsWithParams,
  queryRowsWithParamsInTransaction,
  runInTransaction,
  sql,
} from "./database.js";
import {
  ApiError,
  type AuthContext,
  getOptionalBoolean,
  getOptionalNumber,
  getOptionalString,
  getRequiredString,
  matchPath,
  parseId,
  readJsonBody,
  sendJson,
} from "./http.js";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

type LookupTable =
  | "AccountStatuses"
  | "CompanyTypes"
  | "MemberRoles"
  | "PermissionTiers"
  | "LocationTypes"
  | "MaterialTypes"
  | "ListingStatuses"
  | "DocumentTypes"
  | "QuoteStatuses"
  | "OrderStatuses"
  | "OrderCreationSources"
  | "Carriers"
  | "ShipmentStatuses"
  | "EscrowProviders"
  | "EscrowStatuses"
  | "EscrowReleaseRules"
  | "PaymentStatuses"
  | "PaymentTypes"
  | "PayoutStatuses"
  | "ContractSources"
  | "ContractStatuses"
  | "SignatureStatuses"
  | "NotificationChannels"
  | "NotificationCategories"
  | "NotificationStatuses"
  | "DisputeIssueTypes"
  | "DisputeStatuses"
  | "RecordTypes"
  | "ActorTypes"
  | "AuditActionTypes"
  | "LicenceTiers";

type UserBody = {
  name: string;
  email: string;
  authProviderUserId?: string;
  accountStatusCode?: string;
};

type CompanyBody = {
  legalName: string;
  companyTypeCode: string;
  verificationStatusCode?: string;
};

type MemberBody = {
  userId: number;
  memberRoleCode?: string;
  permissionTierCode?: string;
  memberStatusCode?: string;
  transactionApprovalLimit?: number;
  canApproveTransactions?: boolean;
  canExecuteTransactions?: boolean;
};

type LocationBody = {
  companyId?: number;
  locationTypeCode?: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

type OnboardingBody = {
  role: "buyer" | "seller" | "both";
  activeRole?: "buyer" | "seller";
  licenceTier?: string;
  companyName: string;
  industry?: string;
  jobTitle?: string;
  website?: string;
  address?: string;
  location?: {
    name?: string;
    addressLine1?: string;
    city?: string;
    stateProvince?: string;
    postalCode?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
  };
};

type StripeOnboardingBody = {
  role: "buyer" | "seller";
  returnUrl?: string;
  refreshUrl?: string;
};

type ProfileStatusBody = {
  onboardingStatusCode?: string;
  subscriptionStatusCode?: string;
  billingStatusCode?: string;
  payoutStatusCode?: string;
  approvalStatusCode?: string;
};

type ListingBody = {
  sellerCompanyId: number;
  locationId: number;
  title: string;
  slug?: string;
  materialTypeCode: string;
  quantity: number;
  quantityUnit: string;
  minimumOrderQuantity: number;
  pricePerUnit: number;
  currencyCode?: string;
  listingStatusCode?: string;
  carbonIntensityKgCo2e?: number;
  description?: string;
};

type ListingDocumentBody = {
  listingId?: number;
  documentTypeCode?: string;
  fileName: string;
  fileUrl: string;
  verificationStatusCode?: string;
};

type QuoteBody = {
  listingId: number;
  buyerCompanyId: number;
  sellerCompanyId?: number;
  quantity: number;
  quantityUnit?: string;
  unitPrice?: number;
  currencyCode?: string;
  deliveryTerms?: string;
  quoteStatusCode?: string;
  expiresAt?: string;
};

type OrderBody = {
  quoteId?: number;
  listingId?: number;
  buyerCompanyId: number;
  sellerCompanyId?: number;
  creationSourceCode?: string;
  orderStatusCode?: string;
  quantity?: number;
  totalAmount?: number;
  currencyCode?: string;
  escrowRequired?: boolean;
  directOrderReason?: string;
};

type NotificationBody = {
  userId?: number;
  companyId?: number;
  relatedRecordTypeCode?: string;
  relatedRecordId?: number;
  notificationChannelCode?: string;
  notificationCategoryCode?: string;
  notificationStatusCode?: string;
  subject: string;
  body: string;
  sentAt?: string;
  readAt?: string;
};

type NotificationPreferenceBody = {
  userId?: number;
  companyId?: number;
  notificationChannelCode?: string;
  notificationCategoryCode?: string;
  enabled?: boolean;
  isCompanyDefault?: boolean;
};

type CarrierBody = {
  code?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type ShipmentBody = {
  orderId: number;
  carrierId?: number;
  carrierCode?: string;
  trackingNumber?: string;
  originLocationId?: number;
  destinationLocationId?: number;
  shipmentStatusCode?: string;
  shippingCost?: number;
  carbonImpactKgCo2e?: number;
  pickupScheduledAt?: string;
  deliveryConfirmedAt?: string;
};

type EscrowBody = {
  orderId: number;
  escrowProviderCode?: string;
  providerEscrowId?: string;
  amount?: number;
  currencyCode?: string;
  escrowStatusCode?: string;
  thresholdAmount?: number;
  releaseRuleCode?: string;
  disputeLocked?: boolean;
};

type PaymentBody = {
  orderId: number;
  escrowId?: number;
  payerCompanyId: number;
  providerPaymentId?: string;
  amount?: number;
  currencyCode?: string;
  paymentStatusCode?: string;
  paymentTypeCode?: string;
};

type PayoutBody = {
  orderId: number;
  escrowId?: number;
  sellerCompanyId?: number;
  providerPayoutId?: string;
  amount?: number;
  currencyCode?: string;
  payoutStatusCode?: string;
};

type ContractBody = {
  buyerCompanyId: number;
  sellerCompanyId: number;
  listingId?: number;
  contractSourceCode?: string;
  contractStatusCode?: string;
  title: string;
  renewalTerms?: string;
  renewalDate?: string;
  signedDocumentUrl?: string;
};

type SignatureBody = {
  contractId: number;
  signerUserId: number;
  signerCompanyId: number;
  providerSignatureId?: string;
  signatureStatusCode?: string;
  signedDocumentUrl?: string;
  signedAt?: string;
};

type DisputeBody = {
  orderId?: number;
  escrowId?: number;
  shipmentId?: number;
  openedByUserId?: number;
  issueTypeCode?: string;
  disputeStatusCode?: string;
  summary: string;
  resolutionNotes?: string;
};

const lookupTables: LookupTable[] = [
  "AccountStatuses",
  "CompanyTypes",
  "MemberRoles",
  "PermissionTiers",
  "LocationTypes",
  "MaterialTypes",
  "ListingStatuses",
  "DocumentTypes",
  "QuoteStatuses",
  "OrderStatuses",
  "OrderCreationSources",
  "Carriers",
  "ShipmentStatuses",
  "EscrowProviders",
  "EscrowStatuses",
  "EscrowReleaseRules",
  "PaymentStatuses",
  "PaymentTypes",
  "PayoutStatuses",
  "ContractSources",
  "ContractStatuses",
  "SignatureStatuses",
  "NotificationChannels",
  "NotificationCategories",
  "NotificationStatuses",
  "DisputeIssueTypes",
  "DisputeStatuses",
  "RecordTypes",
  "ActorTypes",
  "AuditActionTypes",
  "LicenceTiers",
];

function ensureMethod(method: string | undefined): Method {
  if (
    method === "GET" ||
    method === "POST" ||
    method === "PATCH" ||
    method === "DELETE"
  ) {
    return method;
  }

  throw new ApiError(405, "Method not allowed.");
}

function intParam(name: string, value: number | undefined) {
  return { name, type: sql.Int, value };
}

function nvarcharParam(name: string, value: string | undefined, length = 240) {
  return { name, type: sql.NVarChar(length), value };
}

function varcharParam(name: string, value: string | undefined, length = 120) {
  return { name, type: sql.VarChar(length), value };
}

function decimalParam(name: string, value: number | undefined) {
  return { name, type: sql.Decimal(18, 3), value };
}

function moneyParam(name: string, value: number | undefined) {
  return { name, type: sql.Decimal(18, 2), value };
}

function dateTimeParam(name: string, value: Date | undefined) {
  return { name, type: sql.DateTime2, value };
}

function bitParam(name: string, value: boolean | undefined) {
  return { name, type: sql.Bit, value };
}

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function getFrontendBaseUrl() {
  return (
    process.env.ECOGLOBE_WEB_URL?.replace(/\/$/, "") ?? "http://localhost:4040"
  );
}

function normalizeRedirectUrl(value: string | undefined, fallbackPath: string) {
  const fallback = `${getFrontendBaseUrl()}${fallbackPath}`;
  if (!value) return fallback;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

async function stripePost<T>(
  path: string,
  params: URLSearchParams,
): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError(500, "Stripe is not configured for this environment.");
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const payload = (await stripeResponse.json()) as {
    error?: { message?: string };
  };
  if (!stripeResponse.ok) {
    throw new ApiError(
      502,
      payload.error?.message ?? "Stripe rejected the onboarding request.",
    );
  }

  return payload as T;
}

function getBodyInt(body: Partial<Record<string, unknown>>, key: string) {
  const value = body[key];
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, `${key} must be a positive integer.`);
  }

  return parsed;
}

function getOptionalInt(body: Partial<Record<string, unknown>>, key: string) {
  const value = body[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, `${key} must be a positive integer.`);
  }

  return parsed;
}

function getOptionalDate(body: Partial<Record<string, unknown>>, key: string) {
  const value = getOptionalString(body, key, 80);
  if (!value) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${key} must be a valid date or datetime.`);
  }

  return parsed;
}

async function lookupId(table: LookupTable, code: string) {
  const rows = await queryRowsWithParams<{ id: number }>(
    `SELECT Id AS id FROM dbo.${table} WHERE Code = @code AND IsActive = 1;`,
    [varcharParam("code", normalizeCode(code), 80)],
  );

  if (!rows[0]) {
    throw new ApiError(400, `Unknown ${table} code: ${code}.`);
  }

  return rows[0].id;
}

function requireAdmin(auth: AuthContext) {
  if (!auth.isAdmin) {
    throw new ApiError(403, "Admin access is required.");
  }
}

function requireUserAccess(auth: AuthContext, userId: number) {
  if (!auth.isAdmin && auth.userId !== userId) {
    throw new ApiError(403, "You cannot access another user's records.");
  }
}

function requireCompanyAccess(auth: AuthContext, companyId: number) {
  if (!auth.isAdmin && auth.companyId !== companyId) {
    throw new ApiError(403, "You cannot access another company's records.");
  }
}

async function requireCompanyManager(auth: AuthContext, companyId: number) {
  if (auth.isAdmin) return;
  requireCompanyAccess(auth, companyId);
  const rows = await queryRowsWithParams<{ roleCode: string }>(
    `
      SELECT mr.Code AS roleCode
      FROM dbo.CompanyMembers cm
      INNER JOIN dbo.MemberRoles mr ON mr.Id = cm.MemberRoleId
      INNER JOIN dbo.AccountStatuses ms ON ms.Id = cm.MemberStatusId
      WHERE cm.CompanyId = @companyId AND cm.UserId = @userId AND ms.Code = 'active';
    `,
    [intParam("companyId", companyId), intParam("userId", auth.userId)],
  );
  if (!rows[0] || !["owner", "admin"].includes(rows[0].roleCode)) {
    throw new ApiError(403, "Company owner or admin access is required.");
  }
}

async function requireResourceCompany(
  auth: AuthContext,
  query: string,
  params: ReturnType<typeof intParam>[],
  label: string,
) {
  const rows = await queryRowsWithParams<{ companyId: number }>(query, params);
  const resource = rows[0];
  if (!resource) throw new ApiError(404, `${label} not found.`);
  requireCompanyAccess(auth, resource.companyId);
  return resource.companyId;
}

async function requireOrderAccess(auth: AuthContext, orderId: number) {
  const rows = await queryRowsWithParams<{
    buyerCompanyId: number;
    sellerCompanyId: number;
  }>(
    "SELECT BuyerCompanyId AS buyerCompanyId, SellerCompanyId AS sellerCompanyId FROM dbo.Orders WHERE Id = @orderId;",
    [intParam("orderId", orderId)],
  );
  const order = rows[0];
  if (!order) throw new ApiError(404, "Order not found.");
  if (!auth.isAdmin && auth.companyId !== order.buyerCompanyId && auth.companyId !== order.sellerCompanyId) {
    throw new ApiError(403, "You cannot access another company's order.");
  }
  return order;
}

/**
 * In-app notification fan-out for marketplace events. Best-effort: a failed
 * notification never fails the transaction that triggered it.
 */
async function notifyCompanies({
  actorUserId,
  companyIds,
  categoryCode,
  subject,
  body,
  recordTypeCode,
  recordId,
}: {
  actorUserId: number;
  companyIds: Array<number | undefined>;
  categoryCode: string;
  subject: string;
  body: string;
  recordTypeCode: string;
  recordId: number;
}) {
  try {
    const channelId = await lookupId("NotificationChannels", "in_app");
    const categoryId = await lookupId("NotificationCategories", categoryCode);
    const statusId = await lookupId("NotificationStatuses", "sent");
    const recordTypeId = await lookupId("RecordTypes", recordTypeCode);
    const targets = [...new Set(companyIds.filter((id): id is number => !!id))];

    for (const companyId of targets) {
      await queryRowsWithParams(
        `
          INSERT INTO dbo.Notifications (
            CompanyId, RelatedRecordTypeId, RelatedRecordId,
            NotificationChannelId, NotificationCategoryId, NotificationStatusId,
            Subject, Body, SentAt, CreatedByUserId, UpdatedByUserId
          )
          VALUES (
            @companyId, @recordTypeId, @recordId,
            @channelId, @categoryId, @statusId,
            @subject, @body, SYSUTCDATETIME(), @actorUserId, @actorUserId
          );
        `,
        [
          intParam("companyId", companyId),
          intParam("recordTypeId", recordTypeId),
          intParam("recordId", recordId),
          intParam("channelId", channelId),
          intParam("categoryId", categoryId),
          intParam("statusId", statusId),
          nvarcharParam("subject", subject, 240),
          nvarcharParam("body", body, 4000),
          intParam("actorUserId", actorUserId),
        ],
      );
    }
  } catch (error) {
    console.warn("Notification fan-out failed:", error);
  }
}

/* ─── Status lifecycle guards ───
 * Every status-bearing record moves through a fixed transition map, and each
 * target status may only be set by specific parties. Admins are still bound
 * to the transition map but may set any target status.
 */

type TransactionParty = "buyer" | "seller";

const QUOTE_TRANSITIONS: Record<string, string[]> = {
  requested: ["sent", "declined", "expired"],
  sent: ["accepted", "declined", "expired"],
  accepted: [],
  declined: [],
  expired: [],
};

const QUOTE_STATUS_SETTERS: Record<string, TransactionParty[]> = {
  requested: ["buyer"],
  sent: ["seller"],
  accepted: ["buyer"],
  declined: ["buyer", "seller"],
  expired: [],
};

const ORDER_TRANSITIONS: Record<string, string[]> = {
  draft: ["approval_required", "escrow_required", "in_progress", "cancelled"],
  approval_required: ["escrow_required", "in_progress", "cancelled"],
  escrow_required: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const ORDER_STATUS_SETTERS: Record<string, TransactionParty[]> = {
  draft: ["buyer"],
  approval_required: ["buyer"],
  escrow_required: ["buyer"],
  in_progress: ["buyer", "seller"],
  completed: ["buyer"],
  cancelled: ["buyer", "seller"],
};

const ESCROW_TRANSITIONS: Record<string, string[]> = {
  not_required: ["funding_required"],
  funding_required: ["funded", "not_required"],
  funded: ["release_pending", "released", "dispute_locked"],
  release_pending: ["released", "dispute_locked"],
  released: [],
  dispute_locked: ["funded", "release_pending"],
};

const ESCROW_STATUS_SETTERS: Record<string, TransactionParty[]> = {
  not_required: ["buyer"],
  funding_required: ["buyer", "seller"],
  funded: ["buyer"],
  release_pending: ["buyer", "seller"],
  released: ["buyer"],
  dispute_locked: ["buyer", "seller"],
};

const LISTING_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_review", "closed"],
  pending_review: ["published", "draft", "closed"],
  published: ["paused", "closed"],
  paused: ["published", "closed"],
  closed: [],
};

function assertStatusTransition(
  transitions: Record<string, string[]>,
  fromCode: string,
  toCode: string,
  label: string,
) {
  if (fromCode === toCode) return;
  if (!transitions[fromCode]?.includes(toCode)) {
    throw new ApiError(
      409,
      `A ${label} cannot move from ${fromCode} to ${toCode}.`,
    );
  }
}

function transactionParty(
  auth: AuthContext,
  record: { buyerCompanyId: number; sellerCompanyId: number },
): TransactionParty | undefined {
  if (auth.companyId === record.buyerCompanyId) return "buyer";
  if (auth.companyId === record.sellerCompanyId) return "seller";
  return undefined;
}

function assertStatusSetter(
  setters: Record<string, TransactionParty[]>,
  toCode: string,
  party: TransactionParty | undefined,
  auth: AuthContext,
  label: string,
) {
  if (auth.isAdmin) return;
  if (!party || !setters[toCode]?.includes(party)) {
    throw new ApiError(
      403,
      `Your role on this ${label} cannot set the status to ${toCode}.`,
    );
  }
}

async function writeAuditLog({
  auth,
  request,
  actionTypeCode,
  recordTypeCode,
  recordId,
  previousValue,
  newValue,
  reason,
}: {
  auth: AuthContext;
  request: IncomingMessage;
  actionTypeCode: string;
  recordTypeCode: string;
  recordId?: number;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
}) {
  const actorTypeId = await lookupId(
    "ActorTypes",
    auth.isAdmin ? "admin" : "user",
  );
  const actionTypeId = await lookupId("AuditActionTypes", actionTypeCode);
  const recordTypeId = await lookupId("RecordTypes", recordTypeCode);
  const forwardedFor = request.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim();
  const userAgent = Array.isArray(request.headers["user-agent"])
    ? request.headers["user-agent"][0]
    : request.headers["user-agent"];

  await queryRowsWithParams(
    `
      INSERT INTO dbo.AuditLogs (
        ActorUserId, ActorCompanyId, ActorTypeId, ActionTypeId, RecordTypeId,
        RecordId, PreviousValue, NewValue, Reason, IpAddress, UserAgent,
        CreatedByUserId, UpdatedByUserId
      )
      VALUES (
        @actorUserId, @actorCompanyId, @actorTypeId, @actionTypeId, @recordTypeId,
        @recordId, @previousValue, @newValue, @reason, @ipAddress, @userAgent,
        @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("actorUserId", auth.userId),
      intParam("actorCompanyId", auth.companyId),
      intParam("actorTypeId", actorTypeId),
      intParam("actionTypeId", actionTypeId),
      intParam("recordTypeId", recordTypeId),
      intParam("recordId", recordId),
      nvarcharParam(
        "previousValue",
        previousValue === undefined ? undefined : JSON.stringify(previousValue),
        4000,
      ),
      nvarcharParam(
        "newValue",
        newValue === undefined ? undefined : JSON.stringify(newValue),
        4000,
      ),
      nvarcharParam("reason", reason, 1000),
      varcharParam("ipAddress", ipAddress, 64),
      nvarcharParam("userAgent", userAgent, 500),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );
}

async function lookupIdTx(
  transaction: sql.Transaction,
  table: LookupTable,
  code: string,
) {
  const rows = await queryRowsWithParamsInTransaction<{ id: number }>(
    transaction,
    `SELECT Id AS id FROM dbo.${table} WHERE Code = @code AND IsActive = 1;`,
    [varcharParam("code", normalizeCode(code), 80)],
  );

  if (!rows[0]) {
    throw new ApiError(400, `Unknown ${table} code: ${code}.`);
  }

  return rows[0].id;
}

function getOptionalNestedString(
  body: Partial<Record<string, unknown>>,
  parentKey: string,
  key: string,
  maxLength = 240,
) {
  const parent = body[parentKey];
  if (!parent || typeof parent !== "object" || Array.isArray(parent))
    return undefined;
  return getOptionalString(
    parent as Partial<Record<string, unknown>>,
    key,
    maxLength,
  );
}

function getOptionalNestedNumber(
  body: Partial<Record<string, unknown>>,
  parentKey: string,
  key: string,
) {
  const parent = body[parentKey];
  if (!parent || typeof parent !== "object" || Array.isArray(parent))
    return undefined;
  return getOptionalNumber(parent as Partial<Record<string, unknown>>, key);
}

function normalizeOnboardingRole(role: string) {
  const normalized = normalizeCode(role);
  if (
    normalized !== "buyer" &&
    normalized !== "seller" &&
    normalized !== "both"
  ) {
    throw new ApiError(400, "role must be buyer, seller, or both.");
  }
  return normalized;
}

function parseAddressFallback(rawAddress: string | undefined) {
  const fallback = {
    addressLine1: rawAddress ?? "Address pending",
    city: "Pending",
    stateProvince: undefined as string | undefined,
    postalCode: undefined as string | undefined,
    countryCode: "US",
  };

  if (!rawAddress) return fallback;

  const parts = rawAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return fallback;

  // Tolerate both "street, city, ST 12345, CC" and
  // "street, city, ST, 12345, CC" style inputs.
  const rest = parts.slice(2);
  let countryCode = "US";
  const last = rest[rest.length - 1];
  if (last && /^[A-Za-z]{2}$/.test(last)) {
    countryCode = last.toUpperCase();
    rest.pop();
  }

  let stateProvince: string | undefined;
  let postalCode: string | undefined;
  for (const part of rest) {
    const statePostal = part.match(/^([A-Za-z]{2})(?:\s+(.+))?$/);
    if (statePostal) {
      stateProvince ??= statePostal[1].toUpperCase();
      if (statePostal[2]) postalCode ??= statePostal[2];
      continue;
    }
    if (/^[0-9][0-9\s-]*$/.test(part)) {
      postalCode ??= part;
    }
  }

  return {
    addressLine1: parts[0] ?? fallback.addressLine1,
    city: parts[1] ?? fallback.city,
    stateProvince,
    postalCode,
    countryCode,
  };
}

async function getOnboardingState(
  response: ServerResponse,
  auth: AuthContext,
) {
  const membershipRows = await queryRowsWithParams<{
    companyId: number;
    legalName: string;
    companyTypeCode: string;
    verificationStatusCode: string;
    memberRoleCode: string;
    memberStatusCode: string;
  }>(
    `
      SELECT
        c.Id AS companyId,
        c.LegalName AS legalName,
        ct.Code AS companyTypeCode,
        vs.Code AS verificationStatusCode,
        mr.Code AS memberRoleCode,
        ms.Code AS memberStatusCode
      FROM dbo.CompanyMembers cm
      INNER JOIN dbo.Companies c ON c.Id = cm.CompanyId
      INNER JOIN dbo.CompanyTypes ct ON ct.Id = c.CompanyTypeId
      INNER JOIN dbo.AccountStatuses vs ON vs.Id = c.VerificationStatusId
      INNER JOIN dbo.MemberRoles mr ON mr.Id = cm.MemberRoleId
      INNER JOIN dbo.AccountStatuses ms ON ms.Id = cm.MemberStatusId
      WHERE cm.UserId = @userId
      ORDER BY CASE WHEN c.Id = @activeCompanyId THEN 0 ELSE 1 END, c.Id;
    `,
    [
      intParam("userId", auth.userId),
      intParam("activeCompanyId", auth.companyId ?? -1),
    ],
  );

  const membership = membershipRows[0];
  let location:
    | {
        id: number;
        name: string;
        addressLine1: string;
        city: string;
        stateProvince: string | null;
        postalCode: string | null;
        countryCode: string;
      }
    | undefined;
  let buyerProfile: Record<string, unknown> | undefined;
  let sellerProfile: Record<string, unknown> | undefined;

  if (membership) {
    const locationRows = await queryRowsWithParams<NonNullable<typeof location>>(
      `
        SELECT TOP (1)
          Id AS id, Name AS name, AddressLine1 AS addressLine1, City AS city,
          StateProvince AS stateProvince, PostalCode AS postalCode,
          CountryCode AS countryCode
        FROM dbo.Locations
        WHERE CompanyId = @companyId
        ORDER BY IsDefault DESC, Id;
      `,
      [intParam("companyId", membership.companyId)],
    );
    location = locationRows[0];

    const buyerRows = await queryRowsWithParams<Record<string, unknown>>(
      `
        SELECT
          bp.Id AS id,
          ob.Code AS onboardingStatusCode,
          sub.Code AS subscriptionStatusCode,
          bill.Code AS billingStatusCode,
          appr.Code AS approvalStatusCode
        FROM dbo.BuyerProfiles bp
        INNER JOIN dbo.AccountStatuses ob ON ob.Id = bp.OnboardingStatusId
        INNER JOIN dbo.AccountStatuses sub ON sub.Id = bp.SubscriptionStatusId
        INNER JOIN dbo.AccountStatuses bill ON bill.Id = bp.BillingStatusId
        INNER JOIN dbo.AccountStatuses appr ON appr.Id = bp.ApprovalStatusId
        WHERE bp.CompanyId = @companyId;
      `,
      [intParam("companyId", membership.companyId)],
    );
    buyerProfile = buyerRows[0];

    const sellerRows = await queryRowsWithParams<Record<string, unknown>>(
      `
        SELECT
          sp.Id AS id,
          ob.Code AS onboardingStatusCode,
          sub.Code AS subscriptionStatusCode,
          pay.Code AS payoutStatusCode,
          appr.Code AS approvalStatusCode,
          lt.Code AS licenceTierCode
        FROM dbo.SellerProfiles sp
        INNER JOIN dbo.AccountStatuses ob ON ob.Id = sp.OnboardingStatusId
        INNER JOIN dbo.AccountStatuses sub ON sub.Id = sp.SubscriptionStatusId
        INNER JOIN dbo.PayoutStatuses pay ON pay.Id = sp.PayoutStatusId
        INNER JOIN dbo.AccountStatuses appr ON appr.Id = sp.ApprovalStatusId
        LEFT JOIN dbo.LicenceTiers lt ON lt.Id = sp.LicenceTierId
        WHERE sp.CompanyId = @companyId;
      `,
      [intParam("companyId", membership.companyId)],
    );
    sellerProfile = sellerRows[0];
  }

  const addressProvided = Boolean(
    location && location.addressLine1 !== "To be provided during onboarding",
  );

  sendJson(response, 200, {
    ok: true,
    company: membership
      ? {
          id: membership.companyId,
          legalName: membership.legalName,
          companyTypeCode: membership.companyTypeCode,
          verificationStatusCode: membership.verificationStatusCode,
          memberRoleCode: membership.memberRoleCode,
          memberStatusCode: membership.memberStatusCode,
        }
      : undefined,
    location,
    buyerProfile,
    sellerProfile,
    checklist: {
      companyCreated: Boolean(membership),
      addressProvided,
      buyerOnboardingComplete: Boolean(buyerProfile),
      sellerOnboardingComplete: Boolean(sellerProfile),
      companyVerified: membership?.verificationStatusCode === "verified",
    },
  });
}

async function completeOnboarding(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<OnboardingBody>(request);
  const role = normalizeOnboardingRole(getRequiredString(body, "role", 20));
  const requestedActiveRole = getOptionalString(body, "activeRole", 20);
  if (
    requestedActiveRole &&
    requestedActiveRole !== "buyer" &&
    requestedActiveRole !== "seller"
  ) {
    throw new ApiError(400, "activeRole must be buyer or seller.");
  }
  const activeRoleCode =
    requestedActiveRole === "seller" && (role === "seller" || role === "both")
      ? "seller"
      : "buyer";
  const licenceTierCode =
    getOptionalString(body, "licenceTier", 40)?.toLowerCase() ?? "free";
  const companyName = getRequiredString(body, "companyName", 240);
  const rawAddress = getOptionalString(body, "address", 240);
  const parsedAddress = parseAddressFallback(rawAddress);
  const locationAddress =
    getOptionalNestedString(body, "location", "addressLine1", 240) ??
    parsedAddress.addressLine1;
  const locationCity =
    getOptionalNestedString(body, "location", "city", 120) ??
    parsedAddress.city;
  const locationState =
    getOptionalNestedString(body, "location", "stateProvince", 120) ??
    parsedAddress.stateProvince;
  const locationPostalCode =
    getOptionalNestedString(body, "location", "postalCode", 40) ??
    parsedAddress.postalCode;
  const locationCountryCode =
    getOptionalNestedString(
      body,
      "location",
      "countryCode",
      2,
    )?.toUpperCase() ?? parsedAddress.countryCode;
  const locationName =
    getOptionalNestedString(body, "location", "name", 160) ??
    (role === "seller" ? "Primary pickup site" : "Primary delivery site");
  const locationTypeCode = role === "seller" ? "pickup" : "delivery";

  const result = await runInTransaction(async (transaction) => {
    const companyTypeId = await lookupIdTx(transaction, "CompanyTypes", role);
    const verificationStatusId = await lookupIdTx(
      transaction,
      "AccountStatuses",
      "pending_verification",
    );
    const activeStatusId = await lookupIdTx(
      transaction,
      "AccountStatuses",
      "active",
    );
    const pendingStatusId = await lookupIdTx(
      transaction,
      "AccountStatuses",
      "pending_verification",
    );
    const ownerRoleId = await lookupIdTx(transaction, "MemberRoles", "owner");
    const executorTierId = await lookupIdTx(
      transaction,
      "PermissionTiers",
      "executor",
    );
    const locationTypeId = await lookupIdTx(
      transaction,
      "LocationTypes",
      locationTypeCode,
    );
    const subscribedBuyerStatusId = await lookupIdTx(
      transaction,
      "AccountStatuses",
      "subscribed_buyer",
    );
    const subscribedSellerStatusId = await lookupIdTx(
      transaction,
      "AccountStatuses",
      "subscribed_seller",
    );
    const pendingPayoutStatusId = await lookupIdTx(
      transaction,
      "PayoutStatuses",
      "pending",
    );
    const licenceTierId = await lookupIdTx(
      transaction,
      "LicenceTiers",
      licenceTierCode,
    );

    const existingCompany = (
      await queryRowsWithParamsInTransaction<{ id: number }>(
        transaction,
        `
          SELECT TOP (1) c.Id AS id
          FROM dbo.CompanyMembers cm
          INNER JOIN dbo.Companies c ON c.Id = cm.CompanyId
          WHERE cm.UserId = @userId
          ORDER BY c.Id ASC;
        `,
        [intParam("userId", auth.userId)],
      )
    )[0];

    const companyRows = existingCompany
      ? await queryRowsWithParamsInTransaction<{
          id: number;
          legalName: string;
        }>(
          transaction,
          `
            UPDATE dbo.Companies
            SET
              LegalName = @legalName,
              CompanyTypeId = @companyTypeId,
              VerificationStatusId = COALESCE(VerificationStatusId, @verificationStatusId),
              UpdatedByUserId = @updatedByUserId,
              UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.Id AS id, INSERTED.LegalName AS legalName
            WHERE Id = @companyId;
          `,
          [
            intParam("companyId", existingCompany.id),
            nvarcharParam("legalName", companyName, 240),
            intParam("companyTypeId", companyTypeId),
            intParam("verificationStatusId", verificationStatusId),
            intParam("updatedByUserId", auth.userId),
          ],
        )
      : await queryRowsWithParamsInTransaction<{
          id: number;
          legalName: string;
        }>(
          transaction,
          `
            INSERT INTO dbo.Companies (
              LegalName, CompanyTypeId, VerificationStatusId, CreatedByUserId, UpdatedByUserId
            )
            OUTPUT INSERTED.Id AS id, INSERTED.LegalName AS legalName
            VALUES (@legalName, @companyTypeId, @verificationStatusId, @createdByUserId, @updatedByUserId);
          `,
          [
            nvarcharParam("legalName", companyName, 240),
            intParam("companyTypeId", companyTypeId),
            intParam("verificationStatusId", verificationStatusId),
            intParam("createdByUserId", auth.userId),
            intParam("updatedByUserId", auth.userId),
          ],
        );

    const company = companyRows[0];
    if (!company)
      throw new ApiError(500, "Unable to create onboarding company.");

    await queryRowsWithParamsInTransaction(
      transaction,
      `
        IF EXISTS (SELECT 1 FROM dbo.CompanyMembers WHERE UserId = @userId AND CompanyId = @companyId)
        BEGIN
          UPDATE dbo.CompanyMembers
          SET
            MemberRoleId = @memberRoleId,
            PermissionTierId = @permissionTierId,
            MemberStatusId = @memberStatusId,
            TransactionApprovalLimit = @transactionApprovalLimit,
            CanApproveTransactions = 1,
            CanExecuteTransactions = 1,
            UpdatedByUserId = @updatedByUserId,
            UpdatedAt = SYSUTCDATETIME()
          WHERE UserId = @userId AND CompanyId = @companyId;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.CompanyMembers (
            UserId, CompanyId, MemberRoleId, PermissionTierId, MemberStatusId,
            TransactionApprovalLimit, CanApproveTransactions, CanExecuteTransactions,
            CreatedByUserId, UpdatedByUserId
          )
          VALUES (
            @userId, @companyId, @memberRoleId, @permissionTierId, @memberStatusId,
            @transactionApprovalLimit, 1, 1,
            @createdByUserId, @updatedByUserId
          );
        END;
      `,
      [
        intParam("userId", auth.userId),
        intParam("companyId", company.id),
        intParam("memberRoleId", ownerRoleId),
        intParam("permissionTierId", executorTierId),
        intParam("memberStatusId", activeStatusId),
        moneyParam("transactionApprovalLimit", 500000),
        intParam("createdByUserId", auth.userId),
        intParam("updatedByUserId", auth.userId),
      ],
    );

    if (role === "buyer" || role === "both") {
      await queryRowsWithParamsInTransaction(
        transaction,
        `
          IF EXISTS (SELECT 1 FROM dbo.BuyerProfiles WHERE CompanyId = @companyId)
          BEGIN
            UPDATE dbo.BuyerProfiles
            SET
              OnboardingStatusId = @onboardingStatusId,
              SubscriptionStatusId = @subscriptionStatusId,
              BillingStatusId = @billingStatusId,
              ApprovalStatusId = @approvalStatusId,
              UpdatedByUserId = @updatedByUserId,
              UpdatedAt = SYSUTCDATETIME()
            WHERE CompanyId = @companyId;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.BuyerProfiles (
              CompanyId, OnboardingStatusId, SubscriptionStatusId, BillingStatusId, ApprovalStatusId,
              CreatedByUserId, UpdatedByUserId
            )
            VALUES (
              @companyId, @onboardingStatusId, @subscriptionStatusId, @billingStatusId, @approvalStatusId,
              @createdByUserId, @updatedByUserId
            );
          END;
        `,
        [
          intParam("companyId", company.id),
          intParam("onboardingStatusId", activeStatusId),
          intParam("subscriptionStatusId", subscribedBuyerStatusId),
          intParam("billingStatusId", pendingStatusId),
          intParam("approvalStatusId", pendingStatusId),
          intParam("createdByUserId", auth.userId),
          intParam("updatedByUserId", auth.userId),
        ],
      );
    }

    if (role === "seller" || role === "both") {
      await queryRowsWithParamsInTransaction(
        transaction,
        `
          IF EXISTS (SELECT 1 FROM dbo.SellerProfiles WHERE CompanyId = @companyId)
          BEGIN
            UPDATE dbo.SellerProfiles
            SET
              OnboardingStatusId = @onboardingStatusId,
              SubscriptionStatusId = @subscriptionStatusId,
              PayoutStatusId = @payoutStatusId,
              ApprovalStatusId = @approvalStatusId,
              LicenceTierId = @licenceTierId,
              UpdatedByUserId = @updatedByUserId,
              UpdatedAt = SYSUTCDATETIME()
            WHERE CompanyId = @companyId;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.SellerProfiles (
              CompanyId, OnboardingStatusId, SubscriptionStatusId, PayoutStatusId, ApprovalStatusId,
              LicenceTierId, CreatedByUserId, UpdatedByUserId
            )
            VALUES (
              @companyId, @onboardingStatusId, @subscriptionStatusId, @payoutStatusId, @approvalStatusId,
              @licenceTierId, @createdByUserId, @updatedByUserId
            );
          END;
        `,
        [
          intParam("companyId", company.id),
          intParam("onboardingStatusId", activeStatusId),
          intParam("subscriptionStatusId", subscribedSellerStatusId),
          intParam("payoutStatusId", pendingPayoutStatusId),
          intParam("approvalStatusId", pendingStatusId),
          intParam("licenceTierId", licenceTierId),
          intParam("createdByUserId", auth.userId),
          intParam("updatedByUserId", auth.userId),
        ],
      );
    }

    const locationRows = await queryRowsWithParamsInTransaction<{
      id: number;
      companyId: number;
      name: string;
    }>(
      transaction,
      `
        IF EXISTS (SELECT 1 FROM dbo.Locations WHERE CompanyId = @companyId AND IsDefault = 1)
        BEGIN
          UPDATE dbo.Locations
          SET
            LocationTypeId = @locationTypeId,
            Name = @name,
            AddressLine1 = @addressLine1,
            City = @city,
            StateProvince = @stateProvince,
            PostalCode = @postalCode,
            CountryCode = @countryCode,
            Latitude = @latitude,
            Longitude = @longitude,
            UpdatedByUserId = @updatedByUserId,
            UpdatedAt = SYSUTCDATETIME()
          OUTPUT INSERTED.Id AS id, INSERTED.CompanyId AS companyId, INSERTED.Name AS name
          WHERE CompanyId = @companyId AND IsDefault = 1;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.Locations (
            CompanyId, LocationTypeId, Name, AddressLine1, City, StateProvince,
            PostalCode, CountryCode, Latitude, Longitude, IsDefault, CreatedByUserId, UpdatedByUserId
          )
          OUTPUT INSERTED.Id AS id, INSERTED.CompanyId AS companyId, INSERTED.Name AS name
          VALUES (
            @companyId, @locationTypeId, @name, @addressLine1, @city, @stateProvince,
            @postalCode, @countryCode, @latitude, @longitude, 1, @createdByUserId, @updatedByUserId
          );
        END;
      `,
      [
        intParam("companyId", company.id),
        intParam("locationTypeId", locationTypeId),
        nvarcharParam("name", locationName, 160),
        nvarcharParam("addressLine1", locationAddress, 240),
        nvarcharParam("city", locationCity, 120),
        nvarcharParam("stateProvince", locationState, 120),
        nvarcharParam("postalCode", locationPostalCode, 40),
        varcharParam("countryCode", locationCountryCode, 2),
        decimalParam(
          "latitude",
          getOptionalNestedNumber(body, "location", "latitude"),
        ),
        decimalParam(
          "longitude",
          getOptionalNestedNumber(body, "location", "longitude"),
        ),
        intParam("createdByUserId", auth.userId),
        intParam("updatedByUserId", auth.userId),
      ],
    );

    await queryRowsWithParamsInTransaction(
      transaction,
      `
        UPDATE dbo.UserSessions
        SET
          ActiveCompanyId = @activeCompanyId,
          ActiveRoleCode = @activeRoleCode,
          UpdatedByUserId = @updatedByUserId,
          UpdatedAt = SYSUTCDATETIME()
        WHERE UserId = @userId
          AND RevokedAt IS NULL
          AND ExpiresAt > SYSUTCDATETIME();
      `,
      [
        intParam("activeCompanyId", company.id),
        varcharParam("activeRoleCode", activeRoleCode, 40),
        intParam("updatedByUserId", auth.userId),
        intParam("userId", auth.userId),
      ],
    );

    const profileRows = await queryRowsWithParamsInTransaction<{
      buyerProfileId?: number;
      sellerProfileId?: number;
    }>(
      transaction,
      `
        SELECT
          (SELECT Id FROM dbo.BuyerProfiles WHERE CompanyId = @companyId) AS buyerProfileId,
          (SELECT Id FROM dbo.SellerProfiles WHERE CompanyId = @companyId) AS sellerProfileId;
      `,
      [intParam("companyId", company.id)],
    );

    return {
      company,
      location: locationRows[0],
      profiles: profileRows[0] ?? {},
      activeRoleCode,
    };
  });

  const token = getBearerToken(request);
  const user = await getSessionFromToken(token);

  sendJson(response, 200, {
    ok: true,
    onboarding: result,
    user,
  });
}

async function startStripeOnboarding(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<StripeOnboardingBody>(request);
  const role = getRequiredString(body, "role", 20);
  if (role !== "buyer" && role !== "seller") {
    throw new ApiError(400, "role must be buyer or seller.");
  }

  const returnUrl = normalizeRedirectUrl(
    getOptionalString(body, "returnUrl", 1000),
    `/${role}/onboarding`,
  );
  const refreshUrl = normalizeRedirectUrl(
    getOptionalString(body, "refreshUrl", 1000),
    `/${role}/onboarding`,
  );
  const readyStatusId = await lookupId("AccountStatuses", "active");
  const pendingStatusId = await lookupId(
    "AccountStatuses",
    "pending_verification",
  );
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  const rows = await queryRowsWithParams<{
    userId: number;
    email: string;
    name: string;
    companyId: number;
    legalName: string;
    companyTypeCode: string;
    buyerProfileId?: number;
    sellerProfileId?: number;
  }>(
    `
      SELECT TOP (1)
        u.Id AS userId,
        u.Email AS email,
        u.Name AS name,
        c.Id AS companyId,
        c.LegalName AS legalName,
        ct.Code AS companyTypeCode,
        bp.Id AS buyerProfileId,
        sp.Id AS sellerProfileId
      FROM dbo.CompanyMembers cm
      INNER JOIN dbo.Users u ON u.Id = cm.UserId
      INNER JOIN dbo.Companies c ON c.Id = cm.CompanyId
      INNER JOIN dbo.CompanyTypes ct ON ct.Id = c.CompanyTypeId
      LEFT JOIN dbo.BuyerProfiles bp ON bp.CompanyId = c.Id
      LEFT JOIN dbo.SellerProfiles sp ON sp.CompanyId = c.Id
      WHERE cm.UserId = @userId
        AND c.Id = COALESCE(@companyId, c.Id)
        AND (ct.Code = @role OR ct.Code = 'both')
      ORDER BY c.Id ASC;
    `,
    [
      intParam("userId", auth.userId),
      intParam("companyId", auth.companyId),
      varcharParam("role", role, 20),
    ],
  );

  const account = rows[0];
  if (!account) {
    throw new ApiError(
      400,
      "Complete company onboarding before starting Stripe setup.",
    );
  }

  if (role === "buyer" && !account.buyerProfileId) {
    throw new ApiError(
      400,
      "Buyer profile is not ready for Stripe billing setup.",
    );
  }

  if (role === "seller" && !account.sellerProfileId) {
    throw new ApiError(
      400,
      "Seller profile is not ready for Stripe payout setup.",
    );
  }

  let redirectUrl = returnUrl;
  let providerReference = `stripe_demo_${role}_${account.companyId}`;
  let statusId = readyStatusId;
  let statusCode = "active";
  let mode: "demo" | "stripe" = "demo";

  if (stripeConfigured && role === "buyer") {
    type StripeCustomer = { id: string };
    type StripeCheckoutSession = { id: string; url: string };
    const customer = await stripePost<StripeCustomer>(
      "customers",
      new URLSearchParams({
        email: account.email,
        name: account.name,
        "metadata[ecoglobe_company_id]": String(account.companyId),
        "metadata[ecoglobe_company_name]": account.legalName,
      }),
    );
    const session = await stripePost<StripeCheckoutSession>(
      "checkout/sessions",
      new URLSearchParams({
        mode: "setup",
        currency: "usd",
        customer: customer.id,
        success_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}stripe=cancelled`,
      }),
    );

    redirectUrl = session.url;
    providerReference = session.id;
    statusId = pendingStatusId;
    statusCode = "pending_verification";
    mode = "stripe";
  }

  if (stripeConfigured && role === "seller") {
    type StripeAccount = { id: string };
    type StripeAccountLink = { url: string };
    const stripeAccount = await stripePost<StripeAccount>(
      "accounts",
      new URLSearchParams({
        type: "express",
        country: "US",
        email: account.email,
        business_type: "company",
        "capabilities[transfers][requested]": "true",
        "metadata[ecoglobe_company_id]": String(account.companyId),
        "metadata[ecoglobe_company_name]": account.legalName,
      }),
    );
    const accountLink = await stripePost<StripeAccountLink>(
      "account_links",
      new URLSearchParams({
        account: stripeAccount.id,
        refresh_url: refreshUrl,
        return_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}stripe=success`,
        type: "account_onboarding",
      }),
    );

    redirectUrl = accountLink.url;
    providerReference = stripeAccount.id;
    statusId = pendingStatusId;
    statusCode = "pending_verification";
    mode = "stripe";
  }

  await queryRowsWithParams(
    role === "buyer"
      ? `
          UPDATE dbo.BuyerProfiles
          SET BillingStatusId = @statusId,
              UpdatedByUserId = @updatedByUserId,
              UpdatedAt = SYSUTCDATETIME()
          WHERE CompanyId = @companyId;
        `
      : `
          UPDATE dbo.SellerProfiles
          SET PayoutStatusId = @statusId,
              UpdatedByUserId = @updatedByUserId,
              UpdatedAt = SYSUTCDATETIME()
          WHERE CompanyId = @companyId;
        `,
    [
      intParam("companyId", account.companyId),
      intParam("statusId", statusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  sendJson(response, 200, {
    ok: true,
    provider: "stripe",
    mode,
    role,
    companyId: account.companyId,
    redirectUrl,
    providerReference,
    statusCode,
    message:
      mode === "demo"
        ? "Stripe demo setup recorded. Add STRIPE_SECRET_KEY to create live Stripe onboarding redirects."
        : "Stripe onboarding redirect created.",
  });
}

async function listLookups(response: ServerResponse) {
  const lookups: Record<string, unknown[]> = {};

  for (const table of lookupTables) {
    lookups[table] = await queryRowsWithParams(
      `SELECT Id AS id, Code AS code, Name AS name, Description AS description, SortOrder AS sortOrder
       FROM dbo.${table}
       WHERE IsActive = 1
       ORDER BY SortOrder, Name;`,
    );
  }

  sendJson(response, 200, { ok: true, lookups });
}

async function listUsers(response: ServerResponse, auth: AuthContext) {
  const users = await queryRowsWithParams(`
    SELECT
      u.Id AS id,
      u.AuthProviderUserId AS authProviderUserId,
      u.Name AS name,
      u.Email AS email,
      s.Code AS accountStatusCode,
      s.Name AS accountStatusName,
      u.CreatedAt AS createdAt,
      u.UpdatedAt AS updatedAt
    FROM dbo.Users u
    INNER JOIN dbo.AccountStatuses s ON s.Id = u.AccountStatusId
    WHERE (@isAdmin = 1 OR u.Id = @userId OR EXISTS (
      SELECT 1 FROM dbo.CompanyMembers cm
      WHERE cm.UserId = u.Id AND cm.CompanyId = @companyId
    ))
    ORDER BY u.Id DESC;
  `, [
    bitParam("isAdmin", auth.isAdmin),
    intParam("userId", auth.userId),
    intParam("companyId", auth.companyId),
  ]);

  sendJson(response, 200, { ok: true, users });
}

async function createUser(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<UserBody>(request);
  const name = getRequiredString(body, "name", 200);
  const email = getRequiredString(body, "email", 320).toLowerCase();
  const authProviderUserId = getOptionalString(body, "authProviderUserId", 200);
  const accountStatusId = await lookupId(
    "AccountStatuses",
    getOptionalString(body, "accountStatusCode", 80) ?? "unsubscribed",
  );

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Users (AuthProviderUserId, Name, Email, AccountStatusId, CreatedByUserId, UpdatedByUserId)
      OUTPUT
        INSERTED.Id AS id,
        INSERTED.AuthProviderUserId AS authProviderUserId,
        INSERTED.Name AS name,
        INSERTED.Email AS email,
        INSERTED.AccountStatusId AS accountStatusId,
        INSERTED.CreatedAt AS createdAt,
        INSERTED.UpdatedAt AS updatedAt
      VALUES (@authProviderUserId, @name, @email, @accountStatusId, @createdByUserId, @updatedByUserId);
    `,
    [
      varcharParam("authProviderUserId", authProviderUserId, 200),
      nvarcharParam("name", name, 200),
      nvarcharParam("email", email, 320),
      intParam("accountStatusId", accountStatusId),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  sendJson(response, 201, { ok: true, user: rows[0] });
}

async function updateUser(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  requireUserAccess(auth, id);
  const body = await readJsonBody<UserBody>(request);
  const name = getOptionalString(body, "name", 200);
  const accountStatusCode = getOptionalString(body, "accountStatusCode", 80);
  const accountStatusId = accountStatusCode
    ? await lookupId("AccountStatuses", accountStatusCode)
    : undefined;

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Users
      SET
        Name = COALESCE(@name, Name),
        AccountStatusId = COALESCE(@accountStatusId, AccountStatusId),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Name AS name, INSERTED.Email AS email, INSERTED.AccountStatusId AS accountStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      nvarcharParam("name", name, 200),
      intParam("accountStatusId", accountStatusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "User not found.");
  }

  sendJson(response, 200, { ok: true, user: rows[0] });
}

async function deleteUser(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  requireUserAccess(auth, id);
  const suspendedStatusId = await lookupId("AccountStatuses", "suspended");
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Users
      SET AccountStatusId = @statusId, UpdatedByUserId = @updatedByUserId, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Name AS name, INSERTED.Email AS email, INSERTED.AccountStatusId AS accountStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("statusId", suspendedStatusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "User not found.");
  }

  sendJson(response, 200, { ok: true, user: rows[0] });
}

async function listCompanies(response: ServerResponse, auth: AuthContext) {
  const companies = await queryRowsWithParams(`
    SELECT
      c.Id AS id,
      c.LegalName AS legalName,
      ct.Code AS companyTypeCode,
      ct.Name AS companyTypeName,
      vs.Code AS verificationStatusCode,
      vs.Name AS verificationStatusName,
      c.CreatedAt AS createdAt,
      c.UpdatedAt AS updatedAt
    FROM dbo.Companies c
    INNER JOIN dbo.CompanyTypes ct ON ct.Id = c.CompanyTypeId
    INNER JOIN dbo.AccountStatuses vs ON vs.Id = c.VerificationStatusId
    WHERE (@isAdmin = 1 OR c.Id = @companyId)
    ORDER BY c.Id DESC;
  `, [
    bitParam("isAdmin", auth.isAdmin),
    intParam("companyId", auth.companyId),
  ]);

  sendJson(response, 200, { ok: true, companies });
}

async function createCompany(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<CompanyBody>(request);
  const legalName = getRequiredString(body, "legalName", 240);
  const companyTypeId = await lookupId(
    "CompanyTypes",
    getRequiredString(body, "companyTypeCode", 80),
  );
  const verificationStatusId = await lookupId(
    "AccountStatuses",
    getOptionalString(body, "verificationStatusCode", 80) ??
      "pending_verification",
  );
  if (!auth.isAdmin && getOptionalString(body, "verificationStatusCode", 80) && getOptionalString(body, "verificationStatusCode", 80) !== "pending_verification") {
    throw new ApiError(403, "Only admins can set company verification status.");
  }

  // A newly-created company is immediately owned by the authenticated user.
  // The onboarding flow uses the same owner semantics, so no orphan tenant can
  // be created by the generic API endpoint.

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Companies (LegalName, CompanyTypeId, VerificationStatusId, CreatedByUserId, UpdatedByUserId)
      OUTPUT INSERTED.Id AS id, INSERTED.LegalName AS legalName, INSERTED.CompanyTypeId AS companyTypeId, INSERTED.VerificationStatusId AS verificationStatusId
      VALUES (@legalName, @companyTypeId, @verificationStatusId, @createdByUserId, @updatedByUserId);
    `,
    [
      nvarcharParam("legalName", legalName, 240),
      intParam("companyTypeId", companyTypeId),
      intParam("verificationStatusId", verificationStatusId),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(500, "Company could not be created.");
  const ownerRoleId = await lookupId("MemberRoles", "owner");
  const executorTierId = await lookupId("PermissionTiers", "executor");
  const activeStatusId = await lookupId("AccountStatuses", "active");
  await queryRowsWithParams(
    `
      INSERT INTO dbo.CompanyMembers (
        UserId, CompanyId, MemberRoleId, PermissionTierId, MemberStatusId,
        CanApproveTransactions, CanExecuteTransactions, CreatedByUserId, UpdatedByUserId
      ) VALUES (@userId, @companyId, @memberRoleId, @permissionTierId, @memberStatusId, 1, 1, @createdByUserId, @updatedByUserId);
    `,
    [
      intParam("userId", auth.userId),
      intParam("companyId", rows[0].id as number),
      intParam("memberRoleId", ownerRoleId),
      intParam("permissionTierId", executorTierId),
      intParam("memberStatusId", activeStatusId),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  await queryRowsWithParams(
    `
      UPDATE dbo.UserSessions
      SET ActiveCompanyId = @companyId, UpdatedByUserId = @userId, UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @userId AND RevokedAt IS NULL AND ExpiresAt > SYSUTCDATETIME();
    `,
    [intParam("companyId", rows[0].id as number), intParam("userId", auth.userId)],
  );

  sendJson(response, 201, { ok: true, company: rows[0] });
}

async function getCompany(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  requireCompanyAccess(auth, id);
  const rows = await queryRowsWithParams(
    `
      SELECT
        c.Id AS id,
        c.LegalName AS legalName,
        ct.Code AS companyTypeCode,
        vs.Code AS verificationStatusCode,
        c.CreatedAt AS createdAt,
        c.UpdatedAt AS updatedAt
      FROM dbo.Companies c
      INNER JOIN dbo.CompanyTypes ct ON ct.Id = c.CompanyTypeId
      INNER JOIN dbo.AccountStatuses vs ON vs.Id = c.VerificationStatusId
      WHERE c.Id = @id;
    `,
    [intParam("id", id)],
  );
  if (!rows[0]) throw new ApiError(404, "Company not found.");
  sendJson(response, 200, { ok: true, company: rows[0] });
}

async function updateCompany(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireCompanyManager(auth, id);
  const body = await readJsonBody<CompanyBody>(request);
  const legalName = getOptionalString(body, "legalName", 240);
  const companyTypeCode = getOptionalString(body, "companyTypeCode", 80);
  const verificationStatusCode = getOptionalString(
    body,
    "verificationStatusCode",
    80,
  );
  const companyTypeId = companyTypeCode
    ? await lookupId("CompanyTypes", companyTypeCode)
    : undefined;
  const verificationStatusId = verificationStatusCode
    ? await lookupId("AccountStatuses", verificationStatusCode)
    : undefined;
  if (!auth.isAdmin && verificationStatusCode) {
    throw new ApiError(403, "Only admins can change company verification status.");
  }

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Companies
      SET
        LegalName = COALESCE(@legalName, LegalName),
        CompanyTypeId = COALESCE(@companyTypeId, CompanyTypeId),
        VerificationStatusId = COALESCE(@verificationStatusId, VerificationStatusId),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.LegalName AS legalName, INSERTED.CompanyTypeId AS companyTypeId, INSERTED.VerificationStatusId AS verificationStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      nvarcharParam("legalName", legalName, 240),
      intParam("companyTypeId", companyTypeId),
      intParam("verificationStatusId", verificationStatusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "Company not found.");
  }

  sendJson(response, 200, { ok: true, company: rows[0] });
}

async function deleteCompany(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireCompanyManager(auth, id);
  const inactiveStatusId = await lookupId("AccountStatuses", "inactive");
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Companies
      SET VerificationStatusId = @statusId, UpdatedByUserId = @updatedByUserId, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.LegalName AS legalName, INSERTED.VerificationStatusId AS verificationStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("statusId", inactiveStatusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "Company not found.");
  }

  sendJson(response, 200, { ok: true, company: rows[0] });
}

async function listCompanyMembers(response: ServerResponse, companyId: number, auth: AuthContext) {
  requireCompanyAccess(auth, companyId);
  const members = await queryRowsWithParams(
    `
      SELECT
        cm.Id AS id,
        cm.UserId AS userId,
        u.Name AS userName,
        u.Email AS userEmail,
        cm.CompanyId AS companyId,
        mr.Code AS memberRoleCode,
        pt.Code AS permissionTierCode,
        ms.Code AS memberStatusCode,
        cm.TransactionApprovalLimit AS transactionApprovalLimit,
        cm.CanApproveTransactions AS canApproveTransactions,
        cm.CanExecuteTransactions AS canExecuteTransactions
      FROM dbo.CompanyMembers cm
      INNER JOIN dbo.Users u ON u.Id = cm.UserId
      INNER JOIN dbo.MemberRoles mr ON mr.Id = cm.MemberRoleId
      INNER JOIN dbo.PermissionTiers pt ON pt.Id = cm.PermissionTierId
      INNER JOIN dbo.AccountStatuses ms ON ms.Id = cm.MemberStatusId
      WHERE cm.CompanyId = @companyId
      ORDER BY cm.Id DESC;
    `,
    [intParam("companyId", companyId)],
  );

  sendJson(response, 200, { ok: true, members });
}

async function createCompanyMember(
  request: IncomingMessage,
  response: ServerResponse,
  companyId: number,
  auth: AuthContext,
) {
  await requireCompanyManager(auth, companyId);
  const body = await readJsonBody<MemberBody>(request);
  const userId = getBodyInt(body, "userId");
  const memberRoleId = await lookupId(
    "MemberRoles",
    getOptionalString(body, "memberRoleCode", 80) ?? "viewer",
  );
  const permissionTierId = await lookupId(
    "PermissionTiers",
    getOptionalString(body, "permissionTierCode", 80) ?? "view_only",
  );
  const memberStatusId = await lookupId(
    "AccountStatuses",
    getOptionalString(body, "memberStatusCode", 80) ?? "active",
  );
  const transactionApprovalLimit = getOptionalNumber(
    body,
    "transactionApprovalLimit",
  );
  const canApproveTransactions =
    getOptionalBoolean(body, "canApproveTransactions") ?? false;
  const canExecuteTransactions =
    getOptionalBoolean(body, "canExecuteTransactions") ?? false;

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.CompanyMembers (
        UserId, CompanyId, MemberRoleId, PermissionTierId, MemberStatusId,
        TransactionApprovalLimit, CanApproveTransactions, CanExecuteTransactions,
        CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.UserId AS userId, INSERTED.CompanyId AS companyId
      VALUES (
        @userId, @companyId, @memberRoleId, @permissionTierId, @memberStatusId,
        @transactionApprovalLimit, @canApproveTransactions, @canExecuteTransactions,
        @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("userId", userId),
      intParam("companyId", companyId),
      intParam("memberRoleId", memberRoleId),
      intParam("permissionTierId", permissionTierId),
      intParam("memberStatusId", memberStatusId),
      decimalParam("transactionApprovalLimit", transactionApprovalLimit),
      bitParam("canApproveTransactions", canApproveTransactions),
      bitParam("canExecuteTransactions", canExecuteTransactions),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  sendJson(response, 201, { ok: true, member: rows[0] });
}

async function deleteCompanyMember(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const company = (await queryRowsWithParams<{ companyId: number }>(
    "SELECT CompanyId AS companyId FROM dbo.CompanyMembers WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!company) throw new ApiError(404, "Company member not found.");
  await requireCompanyManager(auth, company.companyId);
  const inactiveStatusId = await lookupId("AccountStatuses", "inactive");
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.CompanyMembers
      SET MemberStatusId = @statusId, UpdatedByUserId = @updatedByUserId, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.UserId AS userId, INSERTED.CompanyId AS companyId, INSERTED.MemberStatusId AS memberStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("statusId", inactiveStatusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "Company member not found.");
  }

  sendJson(response, 200, { ok: true, member: rows[0] });
}

async function listLocations(response: ServerResponse, companyId: number | undefined, auth: AuthContext) {
  if (!auth.isAdmin) {
    if (!auth.companyId) throw new ApiError(403, "An active company is required.");
    if (companyId !== undefined) requireCompanyAccess(auth, companyId);
    companyId = auth.companyId;
  }
  const locations = await queryRowsWithParams(
    `
      SELECT
        l.Id AS id,
        l.CompanyId AS companyId,
        lt.Code AS locationTypeCode,
        l.Name AS name,
        l.AddressLine1 AS addressLine1,
        l.AddressLine2 AS addressLine2,
        l.City AS city,
        l.StateProvince AS stateProvince,
        l.PostalCode AS postalCode,
        l.CountryCode AS countryCode,
        l.Latitude AS latitude,
        l.Longitude AS longitude,
        l.IsDefault AS isDefault
      FROM dbo.Locations l
      INNER JOIN dbo.LocationTypes lt ON lt.Id = l.LocationTypeId
      WHERE (@companyId IS NULL OR l.CompanyId = @companyId)
      ORDER BY l.Id DESC;
    `,
    [intParam("companyId", companyId)],
  );

  sendJson(response, 200, { ok: true, locations });
}

async function createLocation(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
  routeCompanyId?: number,
) {
  const body = await readJsonBody<LocationBody>(request);
  const companyId = routeCompanyId ?? getBodyInt(body, "companyId");
  requireCompanyAccess(auth, companyId);
  const locationTypeId = await lookupId(
    "LocationTypes",
    getOptionalString(body, "locationTypeCode", 80) ?? "delivery",
  );
  const name = getRequiredString(body, "name", 160);
  const addressLine1 = getRequiredString(body, "addressLine1", 240);
  const addressLine2 = getOptionalString(body, "addressLine2", 240);
  const city = getRequiredString(body, "city", 120);
  const stateProvince = getOptionalString(body, "stateProvince", 120);
  const postalCode = getOptionalString(body, "postalCode", 40);
  const countryCode = getRequiredString(body, "countryCode", 2).toUpperCase();
  const latitude = getOptionalNumber(body, "latitude");
  const longitude = getOptionalNumber(body, "longitude");
  const isDefault = getOptionalBoolean(body, "isDefault") ?? false;

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Locations (
        CompanyId, LocationTypeId, Name, AddressLine1, AddressLine2, City, StateProvince,
        PostalCode, CountryCode, Latitude, Longitude, IsDefault, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.CompanyId AS companyId, INSERTED.Name AS name
      VALUES (
        @companyId, @locationTypeId, @name, @addressLine1, @addressLine2, @city, @stateProvince,
        @postalCode, @countryCode, @latitude, @longitude, @isDefault, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("companyId", companyId),
      intParam("locationTypeId", locationTypeId),
      nvarcharParam("name", name, 160),
      nvarcharParam("addressLine1", addressLine1, 240),
      nvarcharParam("addressLine2", addressLine2, 240),
      nvarcharParam("city", city, 120),
      nvarcharParam("stateProvince", stateProvince, 120),
      nvarcharParam("postalCode", postalCode, 40),
      varcharParam("countryCode", countryCode, 2),
      decimalParam("latitude", latitude),
      decimalParam("longitude", longitude),
      bitParam("isDefault", isDefault),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  sendJson(response, 201, { ok: true, location: rows[0] });
}

async function updateLocation(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireResourceCompany(
    auth,
    "SELECT CompanyId AS companyId FROM dbo.Locations WHERE Id = @id;",
    [intParam("id", id)],
    "Location",
  );
  const body = await readJsonBody<LocationBody>(request);
  const name = getOptionalString(body, "name", 160);
  const addressLine1 = getOptionalString(body, "addressLine1", 240);
  const city = getOptionalString(body, "city", 120);
  const isDefault = getOptionalBoolean(body, "isDefault");

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Locations
      SET
        Name = COALESCE(@name, Name),
        AddressLine1 = COALESCE(@addressLine1, AddressLine1),
        City = COALESCE(@city, City),
        IsDefault = COALESCE(@isDefault, IsDefault),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.CompanyId AS companyId, INSERTED.Name AS name
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      nvarcharParam("name", name, 160),
      nvarcharParam("addressLine1", addressLine1, 240),
      nvarcharParam("city", city, 120),
      bitParam("isDefault", isDefault),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "Location not found.");
  }

  sendJson(response, 200, { ok: true, location: rows[0] });
}

async function deleteLocation(response: ServerResponse, id: number, auth: AuthContext) {
  await requireResourceCompany(
    auth,
    "SELECT CompanyId AS companyId FROM dbo.Locations WHERE Id = @id;",
    [intParam("id", id)],
    "Location",
  );
  const rows = await queryRowsWithParams(
    "DELETE FROM dbo.Locations OUTPUT DELETED.Id AS id, DELETED.CompanyId AS companyId, DELETED.Name AS name WHERE Id = @id;",
    [intParam("id", id)],
  );

  if (!rows[0]) {
    throw new ApiError(404, "Location not found.");
  }

  sendJson(response, 200, { ok: true, location: rows[0] });
}

/**
 * Gated listing visibility (per the onboarding guide): viewers without a
 * company membership — anonymous visitors and explorers — get a teaser with
 * category, region, and approximate volume. Company members and admins get
 * full specifications, price, and the route to contact the seller.
 */
function hasFullListingAccess(auth: AuthContext | undefined) {
  return Boolean(auth && (auth.isAdmin || auth.companyId));
}

function approximateQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.round(value / magnitude) * magnitude;
}

function toListingTeaser<T extends Record<string, unknown>>(row: T) {
  const description =
    typeof row.description === "string" && row.description.length > 140
      ? `${row.description.slice(0, 140)}…`
      : row.description;
  return {
    ...row,
    teaser: true,
    sellerCompanyId: null,
    sellerCompanyName: null,
    locationId: null,
    locationCity: null,
    locationLatitude: null,
    locationLongitude: null,
    minimumOrderQuantity: null,
    pricePerUnit: null,
    quantity: approximateQuantity(Number(row.quantity)),
    description,
  };
}

async function listListings(
  response: ServerResponse,
  url: URL,
  auth: AuthContext | undefined,
) {
  const sellerCompanyId = url.searchParams.get("sellerCompanyId")
    ? Number(url.searchParams.get("sellerCompanyId"))
    : undefined;
  const statusCode = url.searchParams.get("statusCode") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  const listings = await queryRowsWithParams(
    `
      SELECT TOP (100)
        l.Id AS id,
        l.SellerCompanyId AS sellerCompanyId,
        c.LegalName AS sellerCompanyName,
        l.LocationId AS locationId,
        loc.City AS locationCity,
        loc.StateProvince AS locationStateProvince,
        loc.CountryCode AS locationCountryCode,
        loc.Latitude AS locationLatitude,
        loc.Longitude AS locationLongitude,
        l.Title AS title,
        l.Slug AS slug,
        mt.Code AS materialTypeCode,
        mt.Name AS materialTypeName,
        l.Quantity AS quantity,
        l.QuantityUnit AS quantityUnit,
        l.MinimumOrderQuantity AS minimumOrderQuantity,
        l.PricePerUnit AS pricePerUnit,
        l.CurrencyCode AS currencyCode,
        ls.Code AS listingStatusCode,
        l.CarbonIntensityKgCo2e AS carbonIntensityKgCo2e,
        l.Description AS description
      FROM dbo.Listings l
      INNER JOIN dbo.Companies c ON c.Id = l.SellerCompanyId
      INNER JOIN dbo.Locations loc ON loc.Id = l.LocationId
      INNER JOIN dbo.MaterialTypes mt ON mt.Id = l.MaterialTypeId
      INNER JOIN dbo.ListingStatuses ls ON ls.Id = l.ListingStatusId
      WHERE (@sellerCompanyId IS NULL OR l.SellerCompanyId = @sellerCompanyId)
        AND (@statusCode IS NULL OR ls.Code = @statusCode)
        AND (@search IS NULL OR l.Title LIKE '%' + @search + '%' OR l.Description LIKE '%' + @search + '%')
        AND (
          ls.Code = 'published'
          OR @isAdmin = 1
          OR (@authCompanyId IS NOT NULL AND l.SellerCompanyId = @authCompanyId)
        )
      ORDER BY l.Id DESC;
    `,
    [
      intParam(
        "sellerCompanyId",
        Number.isInteger(sellerCompanyId) &&
          sellerCompanyId &&
          sellerCompanyId > 0
          ? sellerCompanyId
          : undefined,
      ),
      varcharParam(
        "statusCode",
        statusCode ? normalizeCode(statusCode) : undefined,
        80,
      ),
      nvarcharParam("search", search, 160),
      bitParam("isAdmin", auth?.isAdmin ?? false),
      intParam("authCompanyId", auth?.companyId),
    ],
  );

  sendJson(response, 200, {
    ok: true,
    listings: hasFullListingAccess(auth)
      ? listings
      : (listings as Record<string, unknown>[]).map(toListingTeaser),
  });
}

async function getListing(
  response: ServerResponse,
  id: number,
  auth: AuthContext | undefined,
) {
  const rows = await queryRowsWithParams<
    Record<string, unknown> & {
      sellerCompanyId: number;
      listingStatusCode: string;
    }
  >(
    `
      SELECT
        l.Id AS id,
        l.SellerCompanyId AS sellerCompanyId,
        c.LegalName AS sellerCompanyName,
        l.LocationId AS locationId,
        loc.Name AS locationName,
        loc.City AS locationCity,
        loc.StateProvince AS locationStateProvince,
        loc.CountryCode AS locationCountryCode,
        loc.Latitude AS locationLatitude,
        loc.Longitude AS locationLongitude,
        l.Title AS title,
        l.Slug AS slug,
        mt.Code AS materialTypeCode,
        mt.Name AS materialTypeName,
        l.Quantity AS quantity,
        l.QuantityUnit AS quantityUnit,
        l.MinimumOrderQuantity AS minimumOrderQuantity,
        l.PricePerUnit AS pricePerUnit,
        l.CurrencyCode AS currencyCode,
        ls.Code AS listingStatusCode,
        l.CarbonIntensityKgCo2e AS carbonIntensityKgCo2e,
        l.Description AS description,
        l.CreatedAt AS createdAt,
        l.UpdatedAt AS updatedAt
      FROM dbo.Listings l
      INNER JOIN dbo.Companies c ON c.Id = l.SellerCompanyId
      INNER JOIN dbo.Locations loc ON loc.Id = l.LocationId
      INNER JOIN dbo.MaterialTypes mt ON mt.Id = l.MaterialTypeId
      INNER JOIN dbo.ListingStatuses ls ON ls.Id = l.ListingStatusId
      WHERE l.Id = @id;
    `,
    [intParam("id", id)],
  );

  const listing = rows[0];
  if (!listing) {
    throw new ApiError(404, "Listing not found.");
  }

  // Unpublished listings are visible only to their seller and admins.
  const canSeeUnpublished =
    auth?.isAdmin || auth?.companyId === listing.sellerCompanyId;
  if (listing.listingStatusCode !== "published" && !canSeeUnpublished) {
    throw new ApiError(404, "Listing not found.");
  }

  sendJson(response, 200, {
    ok: true,
    listing: hasFullListingAccess(auth) ? listing : toListingTeaser(listing),
  });
}

async function createListing(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<ListingBody>(request);
  const title = getRequiredString(body, "title", 200);
  const sellerCompanyId = getBodyInt(body, "sellerCompanyId");
  const locationId = getBodyInt(body, "locationId");
  requireCompanyAccess(auth, sellerCompanyId);
  const location = (await queryRowsWithParams<{ companyId: number }>(
    "SELECT CompanyId AS companyId FROM dbo.Locations WHERE Id = @locationId;",
    [intParam("locationId", locationId)],
  ))[0];
  if (!location) throw new ApiError(404, "Location not found.");
  if (location.companyId !== sellerCompanyId) {
    throw new ApiError(403, "A listing location must belong to the seller company.");
  }
  const materialTypeId = await lookupId(
    "MaterialTypes",
    getRequiredString(body, "materialTypeCode", 80),
  );
  const listingStatusId = await lookupId(
    "ListingStatuses",
    getOptionalString(body, "listingStatusCode", 80) ?? "draft",
  );
  const slug =
    getOptionalString(body, "slug", 180) ?? `${slugify(title)}-${Date.now()}`;
  const quantity = getOptionalNumber(body, "quantity");
  const minimumOrderQuantity = getOptionalNumber(body, "minimumOrderQuantity");
  const pricePerUnit = getOptionalNumber(body, "pricePerUnit");

  if (
    quantity === undefined ||
    minimumOrderQuantity === undefined ||
    pricePerUnit === undefined
  ) {
    throw new ApiError(
      400,
      "quantity, minimumOrderQuantity, and pricePerUnit are required.",
    );
  }

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Listings (
        SellerCompanyId, LocationId, Title, Slug, MaterialTypeId, Quantity, QuantityUnit,
        MinimumOrderQuantity, PricePerUnit, CurrencyCode, ListingStatusId, CarbonIntensityKgCo2e,
        Description, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.Slug AS slug
      VALUES (
        @sellerCompanyId, @locationId, @title, @slug, @materialTypeId, @quantity, @quantityUnit,
        @minimumOrderQuantity, @pricePerUnit, @currencyCode, @listingStatusId, @carbonIntensityKgCo2e,
        @description, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("sellerCompanyId", sellerCompanyId),
      intParam("locationId", locationId),
      nvarcharParam("title", title, 200),
      varcharParam("slug", slug, 180),
      intParam("materialTypeId", materialTypeId),
      decimalParam("quantity", quantity),
      varcharParam(
        "quantityUnit",
        getRequiredString(body, "quantityUnit", 40),
        40,
      ),
      decimalParam("minimumOrderQuantity", minimumOrderQuantity),
      moneyParam("pricePerUnit", pricePerUnit),
      varcharParam(
        "currencyCode",
        getOptionalString(body, "currencyCode", 3)?.toUpperCase() ?? "USD",
        3,
      ),
      intParam("listingStatusId", listingStatusId),
      decimalParam(
        "carbonIntensityKgCo2e",
        getOptionalNumber(body, "carbonIntensityKgCo2e"),
      ),
      nvarcharParam(
        "description",
        getOptionalString(body, "description", 4000),
        4000,
      ),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  sendJson(response, 201, { ok: true, listing: rows[0] });
}

async function updateListing(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireResourceCompany(
    auth,
    "SELECT SellerCompanyId AS companyId FROM dbo.Listings WHERE Id = @id;",
    [intParam("id", id)],
    "Listing",
  );
  const body = await readJsonBody<ListingBody>(request);
  const title = getOptionalString(body, "title", 200);
  const statusCode = getOptionalString(body, "listingStatusCode", 80);
  if (statusCode) {
    const currentStatus = (await queryRowsWithParams<{ code: string }>(
      `
        SELECT ls.Code AS code
        FROM dbo.Listings l
        INNER JOIN dbo.ListingStatuses ls ON ls.Id = l.ListingStatusId
        WHERE l.Id = @id;
      `,
      [intParam("id", id)],
    ))[0];
    const toCode = normalizeCode(statusCode);
    assertStatusTransition(
      LISTING_TRANSITIONS,
      currentStatus?.code ?? "draft",
      toCode,
      "listing",
    );
    // Publishing a submitted listing is EcoGlobe's review decision.
    if (
      toCode === "published" &&
      currentStatus?.code === "pending_review" &&
      !auth.isAdmin
    ) {
      throw new ApiError(
        403,
        "Listings are published by EcoGlobe review. Submit for review and wait for approval.",
      );
    }
  }
  const listingStatusId = statusCode
    ? await lookupId("ListingStatuses", statusCode)
    : undefined;

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Listings
      SET
        Title = COALESCE(@title, Title),
        Quantity = COALESCE(@quantity, Quantity),
        MinimumOrderQuantity = COALESCE(@minimumOrderQuantity, MinimumOrderQuantity),
        PricePerUnit = COALESCE(@pricePerUnit, PricePerUnit),
        ListingStatusId = COALESCE(@listingStatusId, ListingStatusId),
        Description = COALESCE(@description, Description),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.Slug AS slug, INSERTED.ListingStatusId AS listingStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      nvarcharParam("title", title, 200),
      decimalParam("quantity", getOptionalNumber(body, "quantity")),
      decimalParam(
        "minimumOrderQuantity",
        getOptionalNumber(body, "minimumOrderQuantity"),
      ),
      moneyParam("pricePerUnit", getOptionalNumber(body, "pricePerUnit")),
      intParam("listingStatusId", listingStatusId),
      nvarcharParam(
        "description",
        getOptionalString(body, "description", 4000),
        4000,
      ),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "Listing not found.");
  }

  // Fan out saved-search alerts the moment a listing goes live.
  if (statusCode && normalizeCode(statusCode) === "published") {
    await notifySavedSearchMatches(id, auth.userId);
  }

  sendJson(response, 200, { ok: true, listing: rows[0] });
}

async function deleteListing(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireResourceCompany(
    auth,
    "SELECT SellerCompanyId AS companyId FROM dbo.Listings WHERE Id = @id;",
    [intParam("id", id)],
    "Listing",
  );
  const closedStatusId = await lookupId("ListingStatuses", "closed");
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Listings
      SET ListingStatusId = @statusId, UpdatedByUserId = @updatedByUserId, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.Slug AS slug, INSERTED.ListingStatusId AS listingStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("statusId", closedStatusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) {
    throw new ApiError(404, "Listing not found.");
  }

  sendJson(response, 200, { ok: true, listing: rows[0] });
}

async function listListingDocuments(response: ServerResponse, url: URL) {
  const listingId = url.searchParams.get("listingId")
    ? Number(url.searchParams.get("listingId"))
    : undefined;

  const documents = await queryRowsWithParams(
    `
      SELECT
        d.Id AS id,
        d.ListingId AS listingId,
        dt.Code AS documentTypeCode,
        dt.Name AS documentTypeName,
        d.FileName AS fileName,
        d.FileUrl AS fileUrl,
        vs.Code AS verificationStatusCode,
        vs.Name AS verificationStatusName,
        d.UploadedByUserId AS uploadedByUserId,
        d.CreatedAt AS createdAt,
        d.UpdatedAt AS updatedAt
      FROM dbo.ListingDocuments d
      INNER JOIN dbo.DocumentTypes dt ON dt.Id = d.DocumentTypeId
      INNER JOIN dbo.AccountStatuses vs ON vs.Id = d.VerificationStatusId
      WHERE (@listingId IS NULL OR d.ListingId = @listingId)
      ORDER BY d.Id DESC;
    `,
    [
      intParam(
        "listingId",
        Number.isInteger(listingId) && listingId && listingId > 0
          ? listingId
          : undefined,
      ),
    ],
  );

  sendJson(response, 200, { ok: true, documents });
}

async function createListingDocument(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<ListingDocumentBody>(request);
  const listingId = getBodyInt(body, "listingId");
  await requireResourceCompany(
    auth,
    "SELECT SellerCompanyId AS companyId FROM dbo.Listings WHERE Id = @listingId;",
    [intParam("listingId", listingId)],
    "Listing",
  );
  const documentTypeId = await lookupId(
    "DocumentTypes",
    getOptionalString(body, "documentTypeCode", 80) ?? "other",
  );
  const verificationStatusId = await lookupId(
    "AccountStatuses",
    getOptionalString(body, "verificationStatusCode", 80) ??
      "pending_verification",
  );

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.ListingDocuments (
        ListingId, DocumentTypeId, FileName, FileUrl, VerificationStatusId,
        UploadedByUserId, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.ListingId AS listingId, INSERTED.FileName AS fileName, INSERTED.FileUrl AS fileUrl
      VALUES (
        @listingId, @documentTypeId, @fileName, @fileUrl, @verificationStatusId,
        @uploadedByUserId, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("listingId", listingId),
      intParam("documentTypeId", documentTypeId),
      nvarcharParam("fileName", getRequiredString(body, "fileName", 240), 240),
      nvarcharParam("fileUrl", getRequiredString(body, "fileUrl", 1000), 1000),
      intParam("verificationStatusId", verificationStatusId),
      intParam("uploadedByUserId", auth.userId),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "listing",
    recordId: listingId,
    newValue: rows[0],
    reason: "Listing document created.",
  });

  sendJson(response, 201, { ok: true, document: rows[0] });
}

async function updateListingDocument(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireResourceCompany(
    auth,
    `SELECT l.SellerCompanyId AS companyId
       FROM dbo.ListingDocuments d
       INNER JOIN dbo.Listings l ON l.Id = d.ListingId
       WHERE d.Id = @id;`,
    [intParam("id", id)],
    "Listing document",
  );
  const body = await readJsonBody<ListingDocumentBody>(request);
  const documentTypeCode = getOptionalString(body, "documentTypeCode", 80);
  const verificationStatusCode = getOptionalString(
    body,
    "verificationStatusCode",
    80,
  );
  if (verificationStatusCode && !auth.isAdmin) {
    throw new ApiError(
      403,
      "Only EcoGlobe admins can change document verification status.",
    );
  }
  const documentTypeId = documentTypeCode
    ? await lookupId("DocumentTypes", documentTypeCode)
    : undefined;
  const verificationStatusId = verificationStatusCode
    ? await lookupId("AccountStatuses", verificationStatusCode)
    : undefined;

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.ListingDocuments
      SET
        DocumentTypeId = COALESCE(@documentTypeId, DocumentTypeId),
        FileName = COALESCE(@fileName, FileName),
        FileUrl = COALESCE(@fileUrl, FileUrl),
        VerificationStatusId = COALESCE(@verificationStatusId, VerificationStatusId),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.ListingId AS listingId, INSERTED.FileName AS fileName, INSERTED.FileUrl AS fileUrl
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("documentTypeId", documentTypeId),
      nvarcharParam("fileName", getOptionalString(body, "fileName", 240), 240),
      nvarcharParam("fileUrl", getOptionalString(body, "fileUrl", 1000), 1000),
      intParam("verificationStatusId", verificationStatusId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Listing document not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: verificationStatusCode ? "status_changed" : "updated",
    recordTypeCode: "listing",
    recordId: rows[0].listingId as number,
    newValue: rows[0],
    reason: "Listing document updated.",
  });

  sendJson(response, 200, { ok: true, document: rows[0] });
}

async function deleteListingDocument(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireResourceCompany(
    auth,
    `SELECT l.SellerCompanyId AS companyId
       FROM dbo.ListingDocuments d
       INNER JOIN dbo.Listings l ON l.Id = d.ListingId
       WHERE d.Id = @id;`,
    [intParam("id", id)],
    "Listing document",
  );
  const rows = await queryRowsWithParams(
    `
      DELETE FROM dbo.ListingDocuments
      OUTPUT DELETED.Id AS id, DELETED.ListingId AS listingId, DELETED.FileName AS fileName
      WHERE Id = @id;
    `,
    [intParam("id", id)],
  );

  if (!rows[0]) throw new ApiError(404, "Listing document not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "status_changed",
    recordTypeCode: "listing",
    recordId: rows[0].listingId as number,
    previousValue: rows[0],
    reason: "Listing document deleted.",
  });

  sendJson(response, 200, { ok: true, document: rows[0] });
}

async function listQuotes(response: ServerResponse, url: URL, auth: AuthContext) {
  const listingId = url.searchParams.get("listingId")
    ? Number(url.searchParams.get("listingId"))
    : undefined;
  const buyerCompanyId = url.searchParams.get("buyerCompanyId")
    ? Number(url.searchParams.get("buyerCompanyId"))
    : undefined;
  const sellerCompanyId = url.searchParams.get("sellerCompanyId")
    ? Number(url.searchParams.get("sellerCompanyId"))
    : undefined;
  const statusCode = url.searchParams.get("statusCode") ?? undefined;

  const quotes = await queryRowsWithParams(
    `
      SELECT TOP (100)
        q.Id AS id,
        q.ListingId AS listingId,
        l.Title AS listingTitle,
        q.BuyerCompanyId AS buyerCompanyId,
        bc.LegalName AS buyerCompanyName,
        q.SellerCompanyId AS sellerCompanyId,
        sc.LegalName AS sellerCompanyName,
        q.Quantity AS quantity,
        q.QuantityUnit AS quantityUnit,
        q.UnitPrice AS unitPrice,
        q.CurrencyCode AS currencyCode,
        q.DeliveryTerms AS deliveryTerms,
        qs.Code AS quoteStatusCode,
        qs.Name AS quoteStatusName,
        q.ExpiresAt AS expiresAt,
        q.CreatedAt AS createdAt,
        q.UpdatedAt AS updatedAt
      FROM dbo.Quotes q
      INNER JOIN dbo.Listings l ON l.Id = q.ListingId
      INNER JOIN dbo.Companies bc ON bc.Id = q.BuyerCompanyId
      INNER JOIN dbo.Companies sc ON sc.Id = q.SellerCompanyId
      INNER JOIN dbo.QuoteStatuses qs ON qs.Id = q.QuoteStatusId
      WHERE (@listingId IS NULL OR q.ListingId = @listingId)
        AND (@buyerCompanyId IS NULL OR q.BuyerCompanyId = @buyerCompanyId)
        AND (@sellerCompanyId IS NULL OR q.SellerCompanyId = @sellerCompanyId)
        AND (@isAdmin = 1 OR q.BuyerCompanyId = @authCompanyId OR q.SellerCompanyId = @authCompanyId)
        AND (@statusCode IS NULL OR qs.Code = @statusCode)
      ORDER BY q.Id DESC;
    `,
    [
      intParam("listingId", Number.isInteger(listingId) ? listingId : undefined),
      intParam(
        "buyerCompanyId",
        Number.isInteger(buyerCompanyId) ? buyerCompanyId : undefined,
      ),
      intParam(
        "sellerCompanyId",
        Number.isInteger(sellerCompanyId) ? sellerCompanyId : undefined,
      ),
      varcharParam(
        "statusCode",
        statusCode ? normalizeCode(statusCode) : undefined,
        80,
      ),
      bitParam("isAdmin", auth.isAdmin),
      intParam("authCompanyId", auth.companyId),
    ],
  );

  sendJson(response, 200, { ok: true, quotes });
}

async function getQuote(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const rows = await queryRowsWithParams<
    Record<string, unknown> & { buyerCompanyId: number; sellerCompanyId: number }
  >(
    `
      SELECT
        q.Id AS id,
        q.ListingId AS listingId,
        l.Title AS listingTitle,
        q.BuyerCompanyId AS buyerCompanyId,
        bc.LegalName AS buyerCompanyName,
        q.SellerCompanyId AS sellerCompanyId,
        sc.LegalName AS sellerCompanyName,
        q.Quantity AS quantity,
        q.QuantityUnit AS quantityUnit,
        q.UnitPrice AS unitPrice,
        q.CurrencyCode AS currencyCode,
        q.DeliveryTerms AS deliveryTerms,
        qs.Code AS quoteStatusCode,
        qs.Name AS quoteStatusName,
        q.ExpiresAt AS expiresAt,
        q.CreatedAt AS createdAt,
        q.UpdatedAt AS updatedAt
      FROM dbo.Quotes q
      INNER JOIN dbo.Listings l ON l.Id = q.ListingId
      INNER JOIN dbo.Companies bc ON bc.Id = q.BuyerCompanyId
      INNER JOIN dbo.Companies sc ON sc.Id = q.SellerCompanyId
      INNER JOIN dbo.QuoteStatuses qs ON qs.Id = q.QuoteStatusId
      WHERE q.Id = @id;
    `,
    [intParam("id", id)],
  );
  const quote = rows[0];
  if (!quote) throw new ApiError(404, "Quote not found.");
  if (!auth.isAdmin && !transactionParty(auth, quote)) {
    throw new ApiError(403, "You cannot access another company's quote.");
  }
  sendJson(response, 200, { ok: true, quote });
}

async function createQuote(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<QuoteBody>(request);
  const listingId = getBodyInt(body, "listingId");
  const buyerCompanyId = getBodyInt(body, "buyerCompanyId");
  requireCompanyAccess(auth, buyerCompanyId);
  const listingRows = await queryRowsWithParams<{
    sellerCompanyId: number;
    quantityUnit: string;
    pricePerUnit: number;
    currencyCode: string;
  }>(
    `
      SELECT SellerCompanyId AS sellerCompanyId, QuantityUnit AS quantityUnit,
        PricePerUnit AS pricePerUnit, CurrencyCode AS currencyCode
      FROM dbo.Listings
      WHERE Id = @listingId;
    `,
    [intParam("listingId", listingId)],
  );
  const listing = listingRows[0];
  if (!listing) throw new ApiError(404, "Listing not found.");
  if (getOptionalInt(body, "sellerCompanyId") !== undefined && getOptionalInt(body, "sellerCompanyId") !== listing.sellerCompanyId) {
    throw new ApiError(403, "The quote seller company must match the listing.");
  }

  const requestedStatusCode =
    getOptionalString(body, "quoteStatusCode", 80) ?? "requested";
  if (!auth.isAdmin && normalizeCode(requestedStatusCode) !== "requested") {
    throw new ApiError(400, "New quotes must start in the requested status.");
  }
  const quoteStatusId = await lookupId("QuoteStatuses", requestedStatusCode);
  const quantity = getOptionalNumber(body, "quantity");
  if (quantity === undefined) throw new ApiError(400, "quantity is required.");

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Quotes (
        ListingId, BuyerCompanyId, SellerCompanyId, Quantity, QuantityUnit,
        UnitPrice, CurrencyCode, DeliveryTerms, QuoteStatusId, ExpiresAt,
        CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.ListingId AS listingId, INSERTED.BuyerCompanyId AS buyerCompanyId, INSERTED.SellerCompanyId AS sellerCompanyId
      VALUES (
        @listingId, @buyerCompanyId, @sellerCompanyId, @quantity, @quantityUnit,
        @unitPrice, @currencyCode, @deliveryTerms, @quoteStatusId, @expiresAt,
        @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("listingId", listingId),
      intParam("buyerCompanyId", buyerCompanyId),
      intParam("sellerCompanyId", getOptionalInt(body, "sellerCompanyId") ?? listing.sellerCompanyId),
      decimalParam("quantity", quantity),
      varcharParam("quantityUnit", getOptionalString(body, "quantityUnit", 40) ?? listing.quantityUnit, 40),
      moneyParam("unitPrice", getOptionalNumber(body, "unitPrice") ?? Number(listing.pricePerUnit)),
      varcharParam("currencyCode", getOptionalString(body, "currencyCode", 3)?.toUpperCase() ?? listing.currencyCode, 3),
      nvarcharParam("deliveryTerms", getOptionalString(body, "deliveryTerms", 500), 500),
      intParam("quoteStatusId", quoteStatusId),
      dateTimeParam("expiresAt", getOptionalDate(body, "expiresAt")),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "quote",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: "Quote created.",
  });

  await notifyCompanies({
    actorUserId: auth.userId,
    companyIds: [listing.sellerCompanyId],
    categoryCode: "orders",
    subject: `New quote request #${rows[0].id}`,
    body: `A buyer requested a quote for ${quantity} ${getOptionalString(body, "quantityUnit", 40) ?? listing.quantityUnit} on one of your listings.`,
    recordTypeCode: "quote",
    recordId: rows[0].id as number,
  });

  sendJson(response, 201, { ok: true, quote: rows[0] });
}

async function updateQuote(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const quote = (await queryRowsWithParams<{
    buyerCompanyId: number;
    sellerCompanyId: number;
    quoteStatusCode: string;
  }>(
    `
      SELECT q.BuyerCompanyId AS buyerCompanyId, q.SellerCompanyId AS sellerCompanyId, qs.Code AS quoteStatusCode
      FROM dbo.Quotes q
      INNER JOIN dbo.QuoteStatuses qs ON qs.Id = q.QuoteStatusId
      WHERE q.Id = @id;
    `,
    [intParam("id", id)],
  ))[0];
  if (!quote) throw new ApiError(404, "Quote not found.");
  const party = transactionParty(auth, quote);
  if (!auth.isAdmin && !party) {
    throw new ApiError(403, "You cannot access another company's quote.");
  }

  const body = await readJsonBody<QuoteBody>(request);
  const quoteStatusCode = getOptionalString(body, "quoteStatusCode", 80);
  if (quoteStatusCode) {
    assertStatusTransition(
      QUOTE_TRANSITIONS,
      quote.quoteStatusCode,
      normalizeCode(quoteStatusCode),
      "quote",
    );
    assertStatusSetter(
      QUOTE_STATUS_SETTERS,
      normalizeCode(quoteStatusCode),
      party,
      auth,
      "quote",
    );
  }

  // Terms may only change while the quote is still being negotiated.
  const editsTerms =
    getOptionalNumber(body, "quantity") !== undefined ||
    getOptionalNumber(body, "unitPrice") !== undefined ||
    getOptionalString(body, "quantityUnit", 40) !== undefined ||
    getOptionalString(body, "deliveryTerms", 500) !== undefined;
  if (
    editsTerms &&
    !auth.isAdmin &&
    !["requested", "sent"].includes(quote.quoteStatusCode)
  ) {
    throw new ApiError(
      409,
      `Quote terms cannot change once the quote is ${quote.quoteStatusCode}.`,
    );
  }

  const quoteStatusId = quoteStatusCode
    ? await lookupId("QuoteStatuses", quoteStatusCode)
    : undefined;

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Quotes
      SET
        Quantity = COALESCE(@quantity, Quantity),
        QuantityUnit = COALESCE(@quantityUnit, QuantityUnit),
        UnitPrice = COALESCE(@unitPrice, UnitPrice),
        DeliveryTerms = COALESCE(@deliveryTerms, DeliveryTerms),
        QuoteStatusId = COALESCE(@quoteStatusId, QuoteStatusId),
        ExpiresAt = COALESCE(@expiresAt, ExpiresAt),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.ListingId AS listingId, INSERTED.BuyerCompanyId AS buyerCompanyId, INSERTED.SellerCompanyId AS sellerCompanyId, INSERTED.QuoteStatusId AS quoteStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      decimalParam("quantity", getOptionalNumber(body, "quantity")),
      varcharParam("quantityUnit", getOptionalString(body, "quantityUnit", 40), 40),
      moneyParam("unitPrice", getOptionalNumber(body, "unitPrice")),
      nvarcharParam("deliveryTerms", getOptionalString(body, "deliveryTerms", 500), 500),
      intParam("quoteStatusId", quoteStatusId),
      dateTimeParam("expiresAt", getOptionalDate(body, "expiresAt")),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Quote not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: quoteStatusCode ? "status_changed" : "updated",
    recordTypeCode: "quote",
    recordId: id,
    newValue: rows[0],
    reason: "Quote updated.",
  });

  if (quoteStatusCode && normalizeCode(quoteStatusCode) !== quote.quoteStatusCode) {
    await notifyCompanies({
      actorUserId: auth.userId,
      companyIds: [quote.buyerCompanyId, quote.sellerCompanyId],
      categoryCode: "orders",
      subject: `Quote #${id} is now ${normalizeCode(quoteStatusCode)}`,
      body: `Quote #${id} moved from ${quote.quoteStatusCode} to ${normalizeCode(quoteStatusCode)}.`,
      recordTypeCode: "quote",
      recordId: id,
    });
  }

  sendJson(response, 200, { ok: true, quote: rows[0] });
}

async function listOrders(response: ServerResponse, url: URL, auth: AuthContext) {
  const buyerCompanyId = url.searchParams.get("buyerCompanyId")
    ? Number(url.searchParams.get("buyerCompanyId"))
    : undefined;
  const sellerCompanyId = url.searchParams.get("sellerCompanyId")
    ? Number(url.searchParams.get("sellerCompanyId"))
    : undefined;
  const statusCode = url.searchParams.get("statusCode") ?? undefined;

  const orders = await queryRowsWithParams(
    `
      SELECT TOP (100)
        o.Id AS id,
        o.QuoteId AS quoteId,
        o.ListingId AS listingId,
        l.Title AS listingTitle,
        o.BuyerCompanyId AS buyerCompanyId,
        bc.LegalName AS buyerCompanyName,
        o.SellerCompanyId AS sellerCompanyId,
        sc.LegalName AS sellerCompanyName,
        os.Code AS orderStatusCode,
        os.Name AS orderStatusName,
        src.Code AS creationSourceCode,
        o.TotalAmount AS totalAmount,
        o.CurrencyCode AS currencyCode,
        o.EscrowRequired AS escrowRequired,
        o.DirectOrderReason AS directOrderReason,
        o.CreatedAt AS createdAt,
        o.UpdatedAt AS updatedAt
      FROM dbo.Orders o
      LEFT JOIN dbo.Listings l ON l.Id = o.ListingId
      INNER JOIN dbo.Companies bc ON bc.Id = o.BuyerCompanyId
      INNER JOIN dbo.Companies sc ON sc.Id = o.SellerCompanyId
      INNER JOIN dbo.OrderStatuses os ON os.Id = o.OrderStatusId
      INNER JOIN dbo.OrderCreationSources src ON src.Id = o.CreationSourceId
      WHERE (@buyerCompanyId IS NULL OR o.BuyerCompanyId = @buyerCompanyId)
        AND (@sellerCompanyId IS NULL OR o.SellerCompanyId = @sellerCompanyId)
        AND (@isAdmin = 1 OR o.BuyerCompanyId = @authCompanyId OR o.SellerCompanyId = @authCompanyId)
        AND (@statusCode IS NULL OR os.Code = @statusCode)
      ORDER BY o.Id DESC;
    `,
    [
      intParam(
        "buyerCompanyId",
        Number.isInteger(buyerCompanyId) ? buyerCompanyId : undefined,
      ),
      intParam(
        "sellerCompanyId",
        Number.isInteger(sellerCompanyId) ? sellerCompanyId : undefined,
      ),
      varcharParam(
        "statusCode",
        statusCode ? normalizeCode(statusCode) : undefined,
        80,
      ),
      bitParam("isAdmin", auth.isAdmin),
      intParam("authCompanyId", auth.companyId),
    ],
  );

  sendJson(response, 200, { ok: true, orders });
}

async function getOrder(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireOrderAccess(auth, id);
  const rows = await queryRowsWithParams(
    `
      SELECT
        o.Id AS id,
        o.QuoteId AS quoteId,
        o.ListingId AS listingId,
        l.Title AS listingTitle,
        o.BuyerCompanyId AS buyerCompanyId,
        bc.LegalName AS buyerCompanyName,
        o.SellerCompanyId AS sellerCompanyId,
        sc.LegalName AS sellerCompanyName,
        os.Code AS orderStatusCode,
        os.Name AS orderStatusName,
        src.Code AS creationSourceCode,
        o.TotalAmount AS totalAmount,
        o.CurrencyCode AS currencyCode,
        o.EscrowRequired AS escrowRequired,
        o.DirectOrderReason AS directOrderReason,
        o.CreatedAt AS createdAt,
        o.UpdatedAt AS updatedAt
      FROM dbo.Orders o
      LEFT JOIN dbo.Listings l ON l.Id = o.ListingId
      INNER JOIN dbo.Companies bc ON bc.Id = o.BuyerCompanyId
      INNER JOIN dbo.Companies sc ON sc.Id = o.SellerCompanyId
      INNER JOIN dbo.OrderStatuses os ON os.Id = o.OrderStatusId
      INNER JOIN dbo.OrderCreationSources src ON src.Id = o.CreationSourceId
      WHERE o.Id = @id;
    `,
    [intParam("id", id)],
  );
  if (!rows[0]) throw new ApiError(404, "Order not found.");
  sendJson(response, 200, { ok: true, order: rows[0] });
}

async function createOrder(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<OrderBody>(request);
  const quoteId = getOptionalInt(body, "quoteId");
  const listingId = getOptionalInt(body, "listingId");
  const buyerCompanyId = getBodyInt(body, "buyerCompanyId");
  requireCompanyAccess(auth, buyerCompanyId);
  const directOrderReason = getOptionalString(body, "directOrderReason", 1000);
  const creationSourceCode =
    getOptionalString(body, "creationSourceCode", 80) ??
    (quoteId
      ? "quote_acceptance"
      : listingId && !auth.isAdmin
        ? "listing_checkout"
        : "admin_direct");

  if (!quoteId && !listingId && creationSourceCode !== "admin_direct") {
    throw new ApiError(400, "listingId or quoteId is required.");
  }
  if (creationSourceCode === "admin_direct" && !auth.isAdmin) {
    throw new ApiError(403, "Only admins can create direct orders.");
  }
  if (creationSourceCode === "admin_direct" && !directOrderReason) {
    throw new ApiError(400, "directOrderReason is required for admin direct orders.");
  }
  if (creationSourceCode === "listing_checkout" && (!listingId || quoteId)) {
    throw new ApiError(400, "Listing checkout orders require a listingId and no quote.");
  }

  const quoteRows = quoteId
    ? await queryRowsWithParams<{
        listingId: number;
        buyerCompanyId: number;
        sellerCompanyId: number;
        quantity: number;
        unitPrice: number;
        currencyCode: string;
      }>(
        `SELECT ListingId AS listingId, BuyerCompanyId AS buyerCompanyId, SellerCompanyId AS sellerCompanyId,
          Quantity AS quantity, UnitPrice AS unitPrice, CurrencyCode AS currencyCode
         FROM dbo.Quotes WHERE Id = @quoteId;`,
        [intParam("quoteId", quoteId)],
      )
    : [];
  const quote = quoteRows[0];
  if (quoteId && !quote) throw new ApiError(404, "Quote not found.");
  if (quote && !auth.isAdmin && quote.buyerCompanyId !== auth.companyId) {
    throw new ApiError(403, "You cannot create an order for another company.");
  }

  const listingRows =
    listingId || quote?.listingId
      ? await queryRowsWithParams<{
          sellerCompanyId: number;
          pricePerUnit: number;
          currencyCode: string;
          minimumOrderQuantity: number;
          listingStatusCode: string;
        }>(
          `SELECT l.SellerCompanyId AS sellerCompanyId, l.PricePerUnit AS pricePerUnit,
            l.CurrencyCode AS currencyCode, l.MinimumOrderQuantity AS minimumOrderQuantity,
            ls.Code AS listingStatusCode
           FROM dbo.Listings l
           INNER JOIN dbo.ListingStatuses ls ON ls.Id = l.ListingStatusId
           WHERE l.Id = @listingId;`,
          [intParam("listingId", listingId ?? quote?.listingId)],
        )
      : [];
  const listing = listingRows[0];
  if ((listingId || quote?.listingId) && !listing) {
    throw new ApiError(404, "Listing not found.");
  }

  // Direct checkout is priced server-side from the published listing.
  let checkoutQuantity: number | undefined;
  if (creationSourceCode === "listing_checkout" && listing) {
    if (listing.listingStatusCode !== "published" && !auth.isAdmin) {
      throw new ApiError(409, "Only published listings can be purchased.");
    }
    checkoutQuantity = getOptionalNumber(body, "quantity");
    if (checkoutQuantity === undefined || checkoutQuantity <= 0) {
      throw new ApiError(400, "quantity is required for listing checkout.");
    }
    if (checkoutQuantity < Number(listing.minimumOrderQuantity)) {
      throw new ApiError(
        400,
        `Quantity is below this listing's minimum order of ${listing.minimumOrderQuantity}.`,
      );
    }
  }

  const totalAmount =
    checkoutQuantity !== undefined && listing
      ? checkoutQuantity * Number(listing.pricePerUnit)
      : (getOptionalNumber(body, "totalAmount") ??
        (quote ? Number(quote.quantity) * Number(quote.unitPrice) : undefined));
  if (totalAmount === undefined) {
    throw new ApiError(400, "totalAmount is required when no quote is provided.");
  }

  const escrowRequired =
    getOptionalBoolean(body, "escrowRequired") ?? totalAmount > 1000;
  const orderStatusId = await lookupId(
    "OrderStatuses",
    getOptionalString(body, "orderStatusCode", 80) ??
      (escrowRequired ? "escrow_required" : "in_progress"),
  );
  const creationSourceId = await lookupId(
    "OrderCreationSources",
    creationSourceCode,
  );

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Orders (
        QuoteId, ListingId, BuyerCompanyId, SellerCompanyId, CreationSourceId,
        OrderStatusId, TotalAmount, CurrencyCode, EscrowRequired, DirectOrderReason,
        CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.QuoteId AS quoteId, INSERTED.ListingId AS listingId,
        INSERTED.BuyerCompanyId AS buyerCompanyId, INSERTED.SellerCompanyId AS sellerCompanyId,
        INSERTED.TotalAmount AS totalAmount, INSERTED.EscrowRequired AS escrowRequired
      VALUES (
        @quoteId, @listingId, @buyerCompanyId, @sellerCompanyId, @creationSourceId,
        @orderStatusId, @totalAmount, @currencyCode, @escrowRequired, @directOrderReason,
        @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("quoteId", quoteId),
      intParam("listingId", listingId ?? quote?.listingId),
      intParam("buyerCompanyId", quote?.buyerCompanyId ?? buyerCompanyId),
      intParam("sellerCompanyId", getOptionalInt(body, "sellerCompanyId") ?? quote?.sellerCompanyId ?? listing?.sellerCompanyId),
      intParam("creationSourceId", creationSourceId),
      intParam("orderStatusId", orderStatusId),
      moneyParam("totalAmount", totalAmount),
      varcharParam("currencyCode", getOptionalString(body, "currencyCode", 3)?.toUpperCase() ?? quote?.currencyCode ?? listing?.currencyCode ?? "USD", 3),
      bitParam("escrowRequired", escrowRequired),
      nvarcharParam("directOrderReason", directOrderReason, 1000),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "order",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: creationSourceCode === "admin_direct" ? directOrderReason : "Order created.",
  });

  await notifyCompanies({
    actorUserId: auth.userId,
    companyIds: [
      rows[0].buyerCompanyId as number,
      rows[0].sellerCompanyId as number,
    ],
    categoryCode: "orders",
    subject: `Order #${rows[0].id} placed`,
    body: `Order #${rows[0].id} was created for ${rows[0].totalAmount} ${
      getOptionalString(body, "currencyCode", 3)?.toUpperCase() ??
      quote?.currencyCode ??
      listing?.currencyCode ??
      "USD"
    }.${rows[0].escrowRequired ? " Escrow funding is required before fulfilment starts." : ""}`,
    recordTypeCode: "order",
    recordId: rows[0].id as number,
  });

  sendJson(response, 201, { ok: true, order: rows[0] });
}

async function updateOrder(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const order = (await queryRowsWithParams<{
    buyerCompanyId: number;
    sellerCompanyId: number;
    orderStatusCode: string;
    escrowRequired: boolean;
  }>(
    `
      SELECT o.BuyerCompanyId AS buyerCompanyId, o.SellerCompanyId AS sellerCompanyId,
        os.Code AS orderStatusCode, o.EscrowRequired AS escrowRequired
      FROM dbo.Orders o
      INNER JOIN dbo.OrderStatuses os ON os.Id = o.OrderStatusId
      WHERE o.Id = @id;
    `,
    [intParam("id", id)],
  ))[0];
  if (!order) throw new ApiError(404, "Order not found.");
  const party = transactionParty(auth, order);
  if (!auth.isAdmin && !party) {
    throw new ApiError(403, "You cannot access another company's order.");
  }

  const body = await readJsonBody<OrderBody>(request);
  const orderStatusCode = getOptionalString(body, "orderStatusCode", 80);
  if (orderStatusCode) {
    const toCode = normalizeCode(orderStatusCode);
    assertStatusTransition(
      ORDER_TRANSITIONS,
      order.orderStatusCode,
      toCode,
      "order",
    );
    assertStatusSetter(ORDER_STATUS_SETTERS, toCode, party, auth, "order");

    // An escrow-backed order can only start once its escrow is funded.
    if (
      toCode === "in_progress" &&
      order.escrowRequired &&
      order.orderStatusCode !== "in_progress"
    ) {
      const fundedEscrow = (await queryRowsWithParams<{ id: number }>(
        `
          SELECT TOP (1) e.Id AS id
          FROM dbo.Escrows e
          INNER JOIN dbo.EscrowStatuses es ON es.Id = e.EscrowStatusId
          WHERE e.OrderId = @orderId AND es.Code IN ('funded', 'release_pending', 'released');
        `,
        [intParam("orderId", id)],
      ))[0];
      if (!fundedEscrow) {
        throw new ApiError(
          409,
          "This order requires a funded escrow before it can move to in_progress.",
        );
      }
    }
  }

  const totalAmount = getOptionalNumber(body, "totalAmount");
  const requestedEscrowFlag = getOptionalBoolean(body, "escrowRequired");
  if (!auth.isAdmin && (totalAmount !== undefined || requestedEscrowFlag !== undefined)) {
    throw new ApiError(
      403,
      "Only admins can change the order total or escrow requirement after creation.",
    );
  }

  const orderStatusId = orderStatusCode
    ? await lookupId("OrderStatuses", orderStatusCode)
    : undefined;
  const escrowRequired =
    requestedEscrowFlag ??
    (totalAmount === undefined ? undefined : totalAmount > 1000);

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Orders
      SET
        OrderStatusId = COALESCE(@orderStatusId, OrderStatusId),
        TotalAmount = COALESCE(@totalAmount, TotalAmount),
        EscrowRequired = COALESCE(@escrowRequired, EscrowRequired),
        DirectOrderReason = COALESCE(@directOrderReason, DirectOrderReason),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.OrderStatusId AS orderStatusId, INSERTED.TotalAmount AS totalAmount, INSERTED.EscrowRequired AS escrowRequired
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("orderStatusId", orderStatusId),
      moneyParam("totalAmount", totalAmount),
      bitParam("escrowRequired", escrowRequired),
      nvarcharParam("directOrderReason", getOptionalString(body, "directOrderReason", 1000), 1000),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Order not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: orderStatusCode ? "status_changed" : "updated",
    recordTypeCode: "order",
    recordId: id,
    newValue: rows[0],
    reason: "Order updated.",
  });

  if (orderStatusCode && normalizeCode(orderStatusCode) !== order.orderStatusCode) {
    await notifyCompanies({
      actorUserId: auth.userId,
      companyIds: [order.buyerCompanyId, order.sellerCompanyId],
      categoryCode: "orders",
      subject: `Order #${id} is now ${normalizeCode(orderStatusCode)}`,
      body: `Order #${id} moved from ${order.orderStatusCode} to ${normalizeCode(orderStatusCode)}.`,
      recordTypeCode: "order",
      recordId: id,
    });
  }

  sendJson(response, 200, { ok: true, order: rows[0] });
}

async function listNotifications(response: ServerResponse, url: URL, auth: AuthContext) {
  const userId = url.searchParams.get("userId")
    ? Number(url.searchParams.get("userId"))
    : undefined;
  const companyId = url.searchParams.get("companyId")
    ? Number(url.searchParams.get("companyId"))
    : undefined;
  const statusCode = url.searchParams.get("statusCode") ?? undefined;
  const categoryCode = url.searchParams.get("categoryCode") ?? undefined;

  const notifications = await queryRowsWithParams(
    `
      SELECT TOP (100)
        n.Id AS id,
        n.UserId AS userId,
        n.CompanyId AS companyId,
        rt.Code AS relatedRecordTypeCode,
        n.RelatedRecordId AS relatedRecordId,
        nc.Code AS notificationChannelCode,
        cat.Code AS notificationCategoryCode,
        ns.Code AS notificationStatusCode,
        n.Subject AS subject,
        n.Body AS body,
        n.SentAt AS sentAt,
        n.ReadAt AS readAt,
        n.CreatedAt AS createdAt,
        n.UpdatedAt AS updatedAt
      FROM dbo.Notifications n
      LEFT JOIN dbo.RecordTypes rt ON rt.Id = n.RelatedRecordTypeId
      INNER JOIN dbo.NotificationChannels nc ON nc.Id = n.NotificationChannelId
      INNER JOIN dbo.NotificationCategories cat ON cat.Id = n.NotificationCategoryId
      INNER JOIN dbo.NotificationStatuses ns ON ns.Id = n.NotificationStatusId
      WHERE (@userId IS NULL OR n.UserId = @userId)
        AND (@companyId IS NULL OR n.CompanyId = @companyId)
        AND (@isAdmin = 1 OR n.UserId = @authUserId OR n.CompanyId = @authCompanyId)
        AND (@statusCode IS NULL OR ns.Code = @statusCode)
        AND (@categoryCode IS NULL OR cat.Code = @categoryCode)
      ORDER BY n.Id DESC;
    `,
    [
      intParam("userId", Number.isInteger(userId) ? userId : undefined),
      intParam("companyId", Number.isInteger(companyId) ? companyId : undefined),
      varcharParam("statusCode", statusCode ? normalizeCode(statusCode) : undefined, 80),
      varcharParam("categoryCode", categoryCode ? normalizeCode(categoryCode) : undefined, 80),
      bitParam("isAdmin", auth.isAdmin),
      intParam("authUserId", auth.userId),
      intParam("authCompanyId", auth.companyId),
    ],
  );

  sendJson(response, 200, { ok: true, notifications });
}

async function createNotification(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<NotificationBody>(request);
  const requestedUserId = getOptionalInt(body, "userId") ?? (auth.isAdmin ? undefined : auth.userId);
  const requestedCompanyId = getOptionalInt(body, "companyId");
  if (!auth.isAdmin && requestedUserId !== undefined && requestedUserId !== auth.userId) {
    throw new ApiError(403, "You cannot create notifications for another user.");
  }
  if (!auth.isAdmin && requestedCompanyId !== undefined) requireCompanyAccess(auth, requestedCompanyId);
  const relatedRecordTypeCode = getOptionalString(body, "relatedRecordTypeCode", 80);
  const relatedRecordTypeId = relatedRecordTypeCode
    ? await lookupId("RecordTypes", relatedRecordTypeCode)
    : undefined;
  const channelId = await lookupId(
    "NotificationChannels",
    getOptionalString(body, "notificationChannelCode", 80) ?? "in_app",
  );
  const categoryId = await lookupId(
    "NotificationCategories",
    getOptionalString(body, "notificationCategoryCode", 80) ?? "system",
  );
  const statusId = await lookupId(
    "NotificationStatuses",
    getOptionalString(body, "notificationStatusCode", 80) ?? "queued",
  );

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Notifications (
        UserId, CompanyId, RelatedRecordTypeId, RelatedRecordId,
        NotificationChannelId, NotificationCategoryId, NotificationStatusId,
        Subject, Body, SentAt, ReadAt, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.UserId AS userId, INSERTED.CompanyId AS companyId, INSERTED.Subject AS subject
      VALUES (
        @userId, @companyId, @relatedRecordTypeId, @relatedRecordId,
        @notificationChannelId, @notificationCategoryId, @notificationStatusId,
        @subject, @body, @sentAt, @readAt, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("userId", requestedUserId),
      intParam("companyId", requestedCompanyId),
      intParam("relatedRecordTypeId", relatedRecordTypeId),
      intParam("relatedRecordId", getOptionalInt(body, "relatedRecordId")),
      intParam("notificationChannelId", channelId),
      intParam("notificationCategoryId", categoryId),
      intParam("notificationStatusId", statusId),
      nvarcharParam("subject", getRequiredString(body, "subject", 240), 240),
      nvarcharParam("body", getRequiredString(body, "body", 4000), 4000),
      dateTimeParam("sentAt", getOptionalDate(body, "sentAt")),
      dateTimeParam("readAt", getOptionalDate(body, "readAt")),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "notification",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: "Notification created.",
  });

  sendJson(response, 201, { ok: true, notification: rows[0] });
}

async function updateNotification(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const notification = (await queryRowsWithParams<{ userId: number | null; companyId: number | null }>(
    "SELECT UserId AS userId, CompanyId AS companyId FROM dbo.Notifications WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!notification) throw new ApiError(404, "Notification not found.");
  if (!auth.isAdmin && notification.userId !== auth.userId && notification.companyId !== auth.companyId) {
    throw new ApiError(403, "You cannot update another user's notification.");
  }
  const body = await readJsonBody<NotificationBody>(request);
  const statusCode = getOptionalString(body, "notificationStatusCode", 80);
  const statusId = statusCode
    ? await lookupId("NotificationStatuses", statusCode)
    : undefined;

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Notifications
      SET
        NotificationStatusId = COALESCE(@notificationStatusId, NotificationStatusId),
        Subject = COALESCE(@subject, Subject),
        Body = COALESCE(@body, Body),
        SentAt = COALESCE(@sentAt, SentAt),
        ReadAt = COALESCE(@readAt, ReadAt),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.UserId AS userId, INSERTED.CompanyId AS companyId, INSERTED.Subject AS subject
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("notificationStatusId", statusId),
      nvarcharParam("subject", getOptionalString(body, "subject", 240), 240),
      nvarcharParam("body", getOptionalString(body, "body", 4000), 4000),
      dateTimeParam("sentAt", getOptionalDate(body, "sentAt")),
      dateTimeParam("readAt", getOptionalDate(body, "readAt")),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Notification not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: statusCode ? "status_changed" : "updated",
    recordTypeCode: "notification",
    recordId: id,
    newValue: rows[0],
    reason: "Notification updated.",
  });

  sendJson(response, 200, { ok: true, notification: rows[0] });
}

async function listNotificationPreferences(response: ServerResponse, url: URL, auth: AuthContext) {
  const userId = url.searchParams.get("userId")
    ? Number(url.searchParams.get("userId"))
    : undefined;
  const companyId = url.searchParams.get("companyId")
    ? Number(url.searchParams.get("companyId"))
    : undefined;

  const preferences = await queryRowsWithParams(
    `
      SELECT
        p.Id AS id,
        p.UserId AS userId,
        p.CompanyId AS companyId,
        nc.Code AS notificationChannelCode,
        cat.Code AS notificationCategoryCode,
        p.Enabled AS enabled,
        p.IsCompanyDefault AS isCompanyDefault,
        p.CreatedAt AS createdAt,
        p.UpdatedAt AS updatedAt
      FROM dbo.NotificationPreferences p
      INNER JOIN dbo.NotificationChannels nc ON nc.Id = p.NotificationChannelId
      INNER JOIN dbo.NotificationCategories cat ON cat.Id = p.NotificationCategoryId
      WHERE (@userId IS NULL OR p.UserId = @userId)
        AND (@companyId IS NULL OR p.CompanyId = @companyId)
        AND (@isAdmin = 1 OR p.UserId = @authUserId OR p.CompanyId = @authCompanyId)
      ORDER BY p.Id DESC;
    `,
    [
      intParam("userId", Number.isInteger(userId) ? userId : undefined),
      intParam("companyId", Number.isInteger(companyId) ? companyId : undefined),
      bitParam("isAdmin", auth.isAdmin),
      intParam("authUserId", auth.userId),
      intParam("authCompanyId", auth.companyId),
    ],
  );

  sendJson(response, 200, { ok: true, preferences });
}

async function createNotificationPreference(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<NotificationPreferenceBody>(request);
  const userId = getOptionalInt(body, "userId");
  const companyId = getOptionalInt(body, "companyId");
  if (!userId && !companyId) {
    throw new ApiError(400, "userId or companyId is required.");
  }
  if (!auth.isAdmin && userId !== undefined && userId !== auth.userId) {
    throw new ApiError(403, "You cannot create preferences for another user.");
  }
  if (!auth.isAdmin && companyId !== undefined) requireCompanyAccess(auth, companyId);
  const channelId = await lookupId(
    "NotificationChannels",
    getOptionalString(body, "notificationChannelCode", 80) ?? "in_app",
  );
  const categoryId = await lookupId(
    "NotificationCategories",
    getOptionalString(body, "notificationCategoryCode", 80) ?? "system",
  );
  const enabled = getOptionalBoolean(body, "enabled") ?? true;
  const isCompanyDefault = getOptionalBoolean(body, "isCompanyDefault") ?? Boolean(companyId && !userId);

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.NotificationPreferences (
        UserId, CompanyId, NotificationChannelId, NotificationCategoryId,
        Enabled, IsCompanyDefault, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.UserId AS userId, INSERTED.CompanyId AS companyId, INSERTED.Enabled AS enabled, INSERTED.IsCompanyDefault AS isCompanyDefault
      VALUES (
        @userId, @companyId, @notificationChannelId, @notificationCategoryId,
        @enabled, @isCompanyDefault, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("userId", userId),
      intParam("companyId", companyId),
      intParam("notificationChannelId", channelId),
      intParam("notificationCategoryId", categoryId),
      bitParam("enabled", enabled),
      bitParam("isCompanyDefault", isCompanyDefault),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "notification",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: "Notification preference created.",
  });

  sendJson(response, 201, { ok: true, preference: rows[0] });
}

async function updateNotificationPreference(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const preference = (await queryRowsWithParams<{ userId: number | null; companyId: number | null }>(
    "SELECT UserId AS userId, CompanyId AS companyId FROM dbo.NotificationPreferences WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!preference) throw new ApiError(404, "Notification preference not found.");
  if (!auth.isAdmin && preference.userId !== auth.userId && preference.companyId !== auth.companyId) {
    throw new ApiError(403, "You cannot update another user's notification preference.");
  }
  const body = await readJsonBody<NotificationPreferenceBody>(request);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.NotificationPreferences
      SET
        Enabled = COALESCE(@enabled, Enabled),
        IsCompanyDefault = COALESCE(@isCompanyDefault, IsCompanyDefault),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.UserId AS userId, INSERTED.CompanyId AS companyId, INSERTED.Enabled AS enabled, INSERTED.IsCompanyDefault AS isCompanyDefault
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      bitParam("enabled", getOptionalBoolean(body, "enabled")),
      bitParam("isCompanyDefault", getOptionalBoolean(body, "isCompanyDefault")),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Notification preference not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "updated",
    recordTypeCode: "notification",
    recordId: id,
    newValue: rows[0],
    reason: "Notification preference updated.",
  });

  sendJson(response, 200, { ok: true, preference: rows[0] });
}

async function deleteNotificationPreference(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const preference = (await queryRowsWithParams<{ userId: number | null; companyId: number | null }>(
    "SELECT UserId AS userId, CompanyId AS companyId FROM dbo.NotificationPreferences WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!preference) throw new ApiError(404, "Notification preference not found.");
  if (!auth.isAdmin && preference.userId !== auth.userId && preference.companyId !== auth.companyId) {
    throw new ApiError(403, "You cannot delete another user's notification preference.");
  }
  const rows = await queryRowsWithParams(
    `
      DELETE FROM dbo.NotificationPreferences
      OUTPUT DELETED.Id AS id, DELETED.UserId AS userId, DELETED.CompanyId AS companyId
      WHERE Id = @id;
    `,
    [intParam("id", id)],
  );

  if (!rows[0]) throw new ApiError(404, "Notification preference not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "status_changed",
    recordTypeCode: "notification",
    recordId: id,
    previousValue: rows[0],
    reason: "Notification preference deleted.",
  });

  sendJson(response, 200, { ok: true, preference: rows[0] });
}

async function listAuditLogs(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  auth: AuthContext,
) {
  requireAdmin(auth);
  const recordTypeCode = url.searchParams.get("recordTypeCode") ?? undefined;
  const actionTypeCode = url.searchParams.get("actionTypeCode") ?? undefined;
  const actorUserId = url.searchParams.get("actorUserId")
    ? Number(url.searchParams.get("actorUserId"))
    : undefined;
  const recordId = url.searchParams.get("recordId")
    ? Number(url.searchParams.get("recordId"))
    : undefined;

  const auditLogs = await queryRowsWithParams(
    `
      SELECT TOP (500)
        a.Id AS id,
        a.ActorUserId AS actorUserId,
        u.Name AS actorUserName,
        a.ActorCompanyId AS actorCompanyId,
        at.Code AS actorTypeCode,
        act.Code AS actionTypeCode,
        rt.Code AS recordTypeCode,
        a.RecordId AS recordId,
        a.PreviousValue AS previousValue,
        a.NewValue AS newValue,
        a.Reason AS reason,
        a.IpAddress AS ipAddress,
        a.UserAgent AS userAgent,
        a.CreatedAt AS createdAt
      FROM dbo.AuditLogs a
      LEFT JOIN dbo.Users u ON u.Id = a.ActorUserId
      INNER JOIN dbo.ActorTypes at ON at.Id = a.ActorTypeId
      INNER JOIN dbo.AuditActionTypes act ON act.Id = a.ActionTypeId
      INNER JOIN dbo.RecordTypes rt ON rt.Id = a.RecordTypeId
      WHERE (@recordTypeCode IS NULL OR rt.Code = @recordTypeCode)
        AND (@actionTypeCode IS NULL OR act.Code = @actionTypeCode)
        AND (@actorUserId IS NULL OR a.ActorUserId = @actorUserId)
        AND (@recordId IS NULL OR a.RecordId = @recordId)
      ORDER BY a.Id DESC;
    `,
    [
      varcharParam("recordTypeCode", recordTypeCode ? normalizeCode(recordTypeCode) : undefined, 80),
      varcharParam("actionTypeCode", actionTypeCode ? normalizeCode(actionTypeCode) : undefined, 80),
      intParam("actorUserId", Number.isInteger(actorUserId) ? actorUserId : undefined),
      intParam("recordId", Number.isInteger(recordId) ? recordId : undefined),
    ],
  );

  if (url.searchParams.get("export") === "true") {
    await writeAuditLog({
      auth,
      request,
      actionTypeCode: "exported",
      recordTypeCode: "user",
      reason: "Audit logs exported.",
    });
  }

  sendJson(response, 200, { ok: true, auditLogs });
}

async function listBuyerProfiles(
  response: ServerResponse,
  url: URL,
  auth: AuthContext,
) {
  const requestedCompanyId = url.searchParams.get("companyId")
    ? Number(url.searchParams.get("companyId"))
    : undefined;
  const companyId = auth.isAdmin ? requestedCompanyId : auth.companyId;

  const buyerProfiles = await queryRowsWithParams(
    `
      SELECT TOP (100)
        bp.Id AS id, bp.CompanyId AS companyId, c.LegalName AS companyName,
        onboarding.Code AS onboardingStatusCode,
        subscription.Code AS subscriptionStatusCode,
        billing.Code AS billingStatusCode,
        approval.Code AS approvalStatusCode,
        bp.CreatedAt AS createdAt, bp.UpdatedAt AS updatedAt
      FROM dbo.BuyerProfiles bp
      INNER JOIN dbo.Companies c ON c.Id = bp.CompanyId
      INNER JOIN dbo.AccountStatuses onboarding ON onboarding.Id = bp.OnboardingStatusId
      INNER JOIN dbo.AccountStatuses subscription ON subscription.Id = bp.SubscriptionStatusId
      INNER JOIN dbo.AccountStatuses billing ON billing.Id = bp.BillingStatusId
      INNER JOIN dbo.AccountStatuses approval ON approval.Id = bp.ApprovalStatusId
      WHERE (@companyId IS NULL OR bp.CompanyId = @companyId)
      ORDER BY bp.Id DESC;
    `,
    [intParam("companyId", Number.isInteger(companyId) ? companyId : undefined)],
  );

  sendJson(response, 200, { ok: true, buyerProfiles });
}

async function updateBuyerProfile(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const body = await readJsonBody<ProfileStatusBody>(request);
  const profile = (
    await queryRowsWithParams<{ companyId: number }>(
      "SELECT CompanyId AS companyId FROM dbo.BuyerProfiles WHERE Id = @id;",
      [intParam("id", id)],
    )
  )[0];
  if (!profile) throw new ApiError(404, "Buyer profile not found.");
  if (!auth.isAdmin && profile.companyId !== auth.companyId) {
    throw new ApiError(403, "You cannot update another company's buyer profile.");
  }

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.BuyerProfiles
      SET
        OnboardingStatusId = COALESCE(@onboardingStatusId, OnboardingStatusId),
        SubscriptionStatusId = COALESCE(@subscriptionStatusId, SubscriptionStatusId),
        BillingStatusId = COALESCE(@billingStatusId, BillingStatusId),
        ApprovalStatusId = COALESCE(@approvalStatusId, ApprovalStatusId),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.CompanyId AS companyId,
        INSERTED.OnboardingStatusId AS onboardingStatusId,
        INSERTED.SubscriptionStatusId AS subscriptionStatusId,
        INSERTED.BillingStatusId AS billingStatusId,
        INSERTED.ApprovalStatusId AS approvalStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam(
        "onboardingStatusId",
        body.onboardingStatusCode ? await lookupId("AccountStatuses", body.onboardingStatusCode) : undefined,
      ),
      intParam(
        "subscriptionStatusId",
        body.subscriptionStatusCode ? await lookupId("AccountStatuses", body.subscriptionStatusCode) : undefined,
      ),
      intParam(
        "billingStatusId",
        body.billingStatusCode ? await lookupId("AccountStatuses", body.billingStatusCode) : undefined,
      ),
      intParam(
        "approvalStatusId",
        body.approvalStatusCode ? await lookupId("AccountStatuses", body.approvalStatusCode) : undefined,
      ),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "updated",
    recordTypeCode: "company",
    recordId: profile.companyId,
    newValue: rows[0],
    reason: "Buyer profile updated.",
  });

  sendJson(response, 200, { ok: true, buyerProfile: rows[0] });
}

async function listSellerProfiles(
  response: ServerResponse,
  url: URL,
  auth: AuthContext,
) {
  const requestedCompanyId = url.searchParams.get("companyId")
    ? Number(url.searchParams.get("companyId"))
    : undefined;
  const companyId = auth.isAdmin ? requestedCompanyId : auth.companyId;

  const sellerProfiles = await queryRowsWithParams(
    `
      SELECT TOP (100)
        sp.Id AS id, sp.CompanyId AS companyId, c.LegalName AS companyName,
        onboarding.Code AS onboardingStatusCode,
        subscription.Code AS subscriptionStatusCode,
        payout.Code AS payoutStatusCode,
        approval.Code AS approvalStatusCode,
        sp.CreatedAt AS createdAt, sp.UpdatedAt AS updatedAt
      FROM dbo.SellerProfiles sp
      INNER JOIN dbo.Companies c ON c.Id = sp.CompanyId
      INNER JOIN dbo.AccountStatuses onboarding ON onboarding.Id = sp.OnboardingStatusId
      INNER JOIN dbo.AccountStatuses subscription ON subscription.Id = sp.SubscriptionStatusId
      INNER JOIN dbo.PayoutStatuses payout ON payout.Id = sp.PayoutStatusId
      INNER JOIN dbo.AccountStatuses approval ON approval.Id = sp.ApprovalStatusId
      WHERE (@companyId IS NULL OR sp.CompanyId = @companyId)
      ORDER BY sp.Id DESC;
    `,
    [intParam("companyId", Number.isInteger(companyId) ? companyId : undefined)],
  );

  sendJson(response, 200, { ok: true, sellerProfiles });
}

async function updateSellerProfile(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const body = await readJsonBody<ProfileStatusBody>(request);
  const profile = (
    await queryRowsWithParams<{ companyId: number }>(
      "SELECT CompanyId AS companyId FROM dbo.SellerProfiles WHERE Id = @id;",
      [intParam("id", id)],
    )
  )[0];
  if (!profile) throw new ApiError(404, "Seller profile not found.");
  if (!auth.isAdmin && profile.companyId !== auth.companyId) {
    throw new ApiError(403, "You cannot update another company's seller profile.");
  }

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.SellerProfiles
      SET
        OnboardingStatusId = COALESCE(@onboardingStatusId, OnboardingStatusId),
        SubscriptionStatusId = COALESCE(@subscriptionStatusId, SubscriptionStatusId),
        PayoutStatusId = COALESCE(@payoutStatusId, PayoutStatusId),
        ApprovalStatusId = COALESCE(@approvalStatusId, ApprovalStatusId),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.CompanyId AS companyId,
        INSERTED.OnboardingStatusId AS onboardingStatusId,
        INSERTED.SubscriptionStatusId AS subscriptionStatusId,
        INSERTED.PayoutStatusId AS payoutStatusId,
        INSERTED.ApprovalStatusId AS approvalStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam(
        "onboardingStatusId",
        body.onboardingStatusCode ? await lookupId("AccountStatuses", body.onboardingStatusCode) : undefined,
      ),
      intParam(
        "subscriptionStatusId",
        body.subscriptionStatusCode ? await lookupId("AccountStatuses", body.subscriptionStatusCode) : undefined,
      ),
      intParam(
        "payoutStatusId",
        body.payoutStatusCode ? await lookupId("PayoutStatuses", body.payoutStatusCode) : undefined,
      ),
      intParam(
        "approvalStatusId",
        body.approvalStatusCode ? await lookupId("AccountStatuses", body.approvalStatusCode) : undefined,
      ),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "updated",
    recordTypeCode: "company",
    recordId: profile.companyId,
    newValue: rows[0],
    reason: "Seller profile updated.",
  });

  sendJson(response, 200, { ok: true, sellerProfile: rows[0] });
}

async function listCarriers(response: ServerResponse) {
  const carriers = await queryRowsWithParams(`
    SELECT Id AS id, Code AS code, Name AS name, Description AS description,
      IsActive AS isActive, SortOrder AS sortOrder, CreatedAt AS createdAt, UpdatedAt AS updatedAt
    FROM dbo.Carriers
    ORDER BY SortOrder, Name;
  `);

  sendJson(response, 200, { ok: true, carriers });
}

async function createCarrier(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  requireAdmin(auth);
  const body = await readJsonBody<CarrierBody>(request);
  const name = getRequiredString(body, "name", 160);
  const code = getOptionalString(body, "code", 80) ?? slugify(name);

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Carriers (Code, Name, Description, IsActive, SortOrder, CreatedByUserId, UpdatedByUserId)
      OUTPUT INSERTED.Id AS id, INSERTED.Code AS code, INSERTED.Name AS name, INSERTED.IsActive AS isActive
      VALUES (@code, @name, @description, @isActive, @sortOrder, @createdByUserId, @updatedByUserId);
    `,
    [
      varcharParam("code", normalizeCode(code), 80),
      nvarcharParam("name", name, 160),
      nvarcharParam("description", getOptionalString(body, "description", 500), 500),
      bitParam("isActive", getOptionalBoolean(body, "isActive") ?? true),
      intParam("sortOrder", Math.trunc(getOptionalNumber(body, "sortOrder") ?? 0)),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "shipment",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: "Carrier integration created.",
  });

  sendJson(response, 201, { ok: true, carrier: rows[0] });
}

async function updateCarrier(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  requireAdmin(auth);
  const body = await readJsonBody<CarrierBody>(request);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Carriers
      SET
        Name = COALESCE(@name, Name),
        Description = COALESCE(@description, Description),
        IsActive = COALESCE(@isActive, IsActive),
        SortOrder = COALESCE(@sortOrder, SortOrder),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Code AS code, INSERTED.Name AS name, INSERTED.IsActive AS isActive
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      nvarcharParam("name", getOptionalString(body, "name", 160), 160),
      nvarcharParam("description", getOptionalString(body, "description", 500), 500),
      bitParam("isActive", getOptionalBoolean(body, "isActive")),
      intParam(
        "sortOrder",
        getOptionalNumber(body, "sortOrder") === undefined
          ? undefined
          : Math.trunc(getOptionalNumber(body, "sortOrder") ?? 0),
      ),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Carrier not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "updated",
    recordTypeCode: "shipment",
    recordId: id,
    newValue: rows[0],
    reason: "Carrier integration updated.",
  });

  sendJson(response, 200, { ok: true, carrier: rows[0] });
}

async function deleteCarrier(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  requireAdmin(auth);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Carriers
      SET IsActive = 0, UpdatedByUserId = @updatedByUserId, UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Code AS code, INSERTED.Name AS name, INSERTED.IsActive AS isActive
      WHERE Id = @id;
    `,
    [intParam("id", id), intParam("updatedByUserId", auth.userId)],
  );

  if (!rows[0]) throw new ApiError(404, "Carrier not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "status_changed",
    recordTypeCode: "shipment",
    recordId: id,
    newValue: rows[0],
    reason: "Carrier integration deactivated.",
  });

  sendJson(response, 200, { ok: true, carrier: rows[0] });
}

async function listShipments(response: ServerResponse, url: URL, auth: AuthContext) {
  const orderId = url.searchParams.get("orderId")
    ? Number(url.searchParams.get("orderId"))
    : undefined;
  const statusCode = url.searchParams.get("statusCode") ?? undefined;

  const shipments = await queryRowsWithParams(
    `
      SELECT TOP (100)
        s.Id AS id, s.OrderId AS orderId, s.CarrierId AS carrierId, c.Code AS carrierCode,
        c.Name AS carrierName, s.TrackingNumber AS trackingNumber,
        s.OriginLocationId AS originLocationId, s.DestinationLocationId AS destinationLocationId,
        ss.Code AS shipmentStatusCode, ss.Name AS shipmentStatusName,
        s.ShippingCost AS shippingCost, s.CarbonImpactKgCo2e AS carbonImpactKgCo2e,
        s.PickupScheduledAt AS pickupScheduledAt, s.DeliveryConfirmedAt AS deliveryConfirmedAt,
        s.CreatedAt AS createdAt, s.UpdatedAt AS updatedAt
      FROM dbo.Shipments s
      INNER JOIN dbo.Orders o ON o.Id = s.OrderId
      LEFT JOIN dbo.Carriers c ON c.Id = s.CarrierId
      INNER JOIN dbo.ShipmentStatuses ss ON ss.Id = s.ShipmentStatusId
      WHERE (@orderId IS NULL OR s.OrderId = @orderId)
        AND (@isAdmin = 1 OR o.BuyerCompanyId = @authCompanyId OR o.SellerCompanyId = @authCompanyId)
        AND (@statusCode IS NULL OR ss.Code = @statusCode)
      ORDER BY s.Id DESC;
    `,
    [
      intParam("orderId", Number.isInteger(orderId) ? orderId : undefined),
      varcharParam("statusCode", statusCode ? normalizeCode(statusCode) : undefined, 80),
      bitParam("isAdmin", auth.isAdmin),
      intParam("authCompanyId", auth.companyId),
    ],
  );

  sendJson(response, 200, { ok: true, shipments });
}

async function createShipment(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<ShipmentBody>(request);
  const carrierCode = getOptionalString(body, "carrierCode", 80);
  const orderId = getBodyInt(body, "orderId");
  await requireOrderAccess(auth, orderId);
  const carrierId = getOptionalInt(body, "carrierId") ?? (carrierCode ? await lookupId("Carriers", carrierCode) : undefined);
  const shipmentStatusId = await lookupId(
    "ShipmentStatuses",
    getOptionalString(body, "shipmentStatusCode", 80) ?? "scheduled",
  );

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Shipments (
        OrderId, CarrierId, TrackingNumber, OriginLocationId, DestinationLocationId,
        ShipmentStatusId, ShippingCost, CarbonImpactKgCo2e, PickupScheduledAt,
        DeliveryConfirmedAt, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.CarrierId AS carrierId, INSERTED.ShipmentStatusId AS shipmentStatusId
      VALUES (
        @orderId, @carrierId, @trackingNumber, @originLocationId, @destinationLocationId,
        @shipmentStatusId, @shippingCost, @carbonImpactKgCo2e, @pickupScheduledAt,
        @deliveryConfirmedAt, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("orderId", orderId),
      intParam("carrierId", carrierId),
      varcharParam("trackingNumber", getOptionalString(body, "trackingNumber", 160), 160),
      intParam("originLocationId", getOptionalInt(body, "originLocationId")),
      intParam("destinationLocationId", getOptionalInt(body, "destinationLocationId")),
      intParam("shipmentStatusId", shipmentStatusId),
      moneyParam("shippingCost", getOptionalNumber(body, "shippingCost")),
      decimalParam("carbonImpactKgCo2e", getOptionalNumber(body, "carbonImpactKgCo2e")),
      dateTimeParam("pickupScheduledAt", getOptionalDate(body, "pickupScheduledAt")),
      dateTimeParam("deliveryConfirmedAt", getOptionalDate(body, "deliveryConfirmedAt")),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "shipment",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: "Shipment created.",
  });

  const shipmentOrderParties = await requireOrderAccess(auth, orderId);
  await notifyCompanies({
    actorUserId: auth.userId,
    companyIds: [
      shipmentOrderParties.buyerCompanyId,
      shipmentOrderParties.sellerCompanyId,
    ],
    categoryCode: "logistics",
    subject: `Shipment created for order #${orderId}`,
    body: `A shipment was scheduled for order #${orderId}.`,
    recordTypeCode: "shipment",
    recordId: rows[0].id as number,
  });

  sendJson(response, 201, { ok: true, shipment: rows[0] });
}

async function updateShipment(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const shipmentOrder = (await queryRowsWithParams<{ orderId: number }>(
    "SELECT OrderId AS orderId FROM dbo.Shipments WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!shipmentOrder) throw new ApiError(404, "Shipment not found.");
  await requireOrderAccess(auth, shipmentOrder.orderId);
  const body = await readJsonBody<ShipmentBody>(request);
  const statusCode = getOptionalString(body, "shipmentStatusCode", 80);
  const statusId = statusCode ? await lookupId("ShipmentStatuses", statusCode) : undefined;
  const carrierCode = getOptionalString(body, "carrierCode", 80);
  const carrierId = getOptionalInt(body, "carrierId") ?? (carrierCode ? await lookupId("Carriers", carrierCode) : undefined);

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Shipments
      SET
        CarrierId = COALESCE(@carrierId, CarrierId),
        TrackingNumber = COALESCE(@trackingNumber, TrackingNumber),
        OriginLocationId = COALESCE(@originLocationId, OriginLocationId),
        DestinationLocationId = COALESCE(@destinationLocationId, DestinationLocationId),
        ShipmentStatusId = COALESCE(@shipmentStatusId, ShipmentStatusId),
        ShippingCost = COALESCE(@shippingCost, ShippingCost),
        CarbonImpactKgCo2e = COALESCE(@carbonImpactKgCo2e, CarbonImpactKgCo2e),
        PickupScheduledAt = COALESCE(@pickupScheduledAt, PickupScheduledAt),
        DeliveryConfirmedAt = COALESCE(@deliveryConfirmedAt, DeliveryConfirmedAt),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.ShipmentStatusId AS shipmentStatusId, INSERTED.DeliveryConfirmedAt AS deliveryConfirmedAt
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("carrierId", carrierId),
      varcharParam("trackingNumber", getOptionalString(body, "trackingNumber", 160), 160),
      intParam("originLocationId", getOptionalInt(body, "originLocationId")),
      intParam("destinationLocationId", getOptionalInt(body, "destinationLocationId")),
      intParam("shipmentStatusId", statusId),
      moneyParam("shippingCost", getOptionalNumber(body, "shippingCost")),
      decimalParam("carbonImpactKgCo2e", getOptionalNumber(body, "carbonImpactKgCo2e")),
      dateTimeParam("pickupScheduledAt", getOptionalDate(body, "pickupScheduledAt")),
      dateTimeParam("deliveryConfirmedAt", getOptionalDate(body, "deliveryConfirmedAt")),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Shipment not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: statusCode ? "status_changed" : "updated",
    recordTypeCode: "shipment",
    recordId: id,
    newValue: rows[0],
    reason: "Shipment updated.",
  });

  if (statusCode) {
    const parties = await requireOrderAccess(auth, shipmentOrder.orderId);
    await notifyCompanies({
      actorUserId: auth.userId,
      companyIds: [parties.buyerCompanyId, parties.sellerCompanyId],
      categoryCode: "logistics",
      subject: `Shipment for order #${shipmentOrder.orderId} is now ${normalizeCode(statusCode)}`,
      body: `The shipment on order #${shipmentOrder.orderId} moved to ${normalizeCode(statusCode)}.`,
      recordTypeCode: "shipment",
      recordId: id,
    });
  }

  sendJson(response, 200, { ok: true, shipment: rows[0] });
}

async function listEscrows(response: ServerResponse, url: URL, auth: AuthContext) {
  const orderId = url.searchParams.get("orderId")
    ? Number(url.searchParams.get("orderId"))
    : undefined;

  const escrows = await queryRowsWithParams(
    `
      SELECT TOP (100)
        e.Id AS id, e.OrderId AS orderId, ep.Code AS escrowProviderCode,
        e.ProviderEscrowId AS providerEscrowId, e.Amount AS amount, e.CurrencyCode AS currencyCode,
        es.Code AS escrowStatusCode, e.ThresholdAmount AS thresholdAmount,
        rr.Code AS releaseRuleCode, e.DisputeLocked AS disputeLocked,
        e.CreatedAt AS createdAt, e.UpdatedAt AS updatedAt
      FROM dbo.Escrows e
      INNER JOIN dbo.Orders o ON o.Id = e.OrderId
      INNER JOIN dbo.EscrowProviders ep ON ep.Id = e.EscrowProviderId
      INNER JOIN dbo.EscrowStatuses es ON es.Id = e.EscrowStatusId
      INNER JOIN dbo.EscrowReleaseRules rr ON rr.Id = e.ReleaseRuleId
      WHERE (@orderId IS NULL OR e.OrderId = @orderId)
        AND (@isAdmin = 1 OR o.BuyerCompanyId = @authCompanyId OR o.SellerCompanyId = @authCompanyId)
      ORDER BY e.Id DESC;
    `,
    [intParam("orderId", Number.isInteger(orderId) ? orderId : undefined), bitParam("isAdmin", auth.isAdmin), intParam("authCompanyId", auth.companyId)],
  );

  sendJson(response, 200, { ok: true, escrows });
}

async function getEscrow(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const rows = await queryRowsWithParams<
    Record<string, unknown> & { orderId: number }
  >(
    `
      SELECT
        e.Id AS id, e.OrderId AS orderId, ep.Code AS escrowProviderCode,
        e.ProviderEscrowId AS providerEscrowId, e.Amount AS amount, e.CurrencyCode AS currencyCode,
        es.Code AS escrowStatusCode, e.ThresholdAmount AS thresholdAmount,
        rr.Code AS releaseRuleCode, e.DisputeLocked AS disputeLocked,
        e.CreatedAt AS createdAt, e.UpdatedAt AS updatedAt
      FROM dbo.Escrows e
      INNER JOIN dbo.EscrowProviders ep ON ep.Id = e.EscrowProviderId
      INNER JOIN dbo.EscrowStatuses es ON es.Id = e.EscrowStatusId
      INNER JOIN dbo.EscrowReleaseRules rr ON rr.Id = e.ReleaseRuleId
      WHERE e.Id = @id;
    `,
    [intParam("id", id)],
  );
  const escrow = rows[0];
  if (!escrow) throw new ApiError(404, "Escrow not found.");
  await requireOrderAccess(auth, escrow.orderId);
  sendJson(response, 200, { ok: true, escrow });
}

async function createEscrow(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<EscrowBody>(request);
  const orderId = getBodyInt(body, "orderId");
  await requireOrderAccess(auth, orderId);
  const order = (
    await queryRowsWithParams<{ totalAmount: number; currencyCode: string; escrowRequired: boolean }>(
      "SELECT TotalAmount AS totalAmount, CurrencyCode AS currencyCode, EscrowRequired AS escrowRequired FROM dbo.Orders WHERE Id = @orderId;",
      [intParam("orderId", orderId)],
    )
  )[0];
  if (!order) throw new ApiError(404, "Order not found.");

  const amount = getOptionalNumber(body, "amount") ?? Number(order.totalAmount);
  const statusCode =
    getOptionalString(body, "escrowStatusCode", 80) ??
    (order.escrowRequired ? "funding_required" : "not_required");
  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Escrows (
        OrderId, EscrowProviderId, ProviderEscrowId, Amount, CurrencyCode, EscrowStatusId,
        ThresholdAmount, ReleaseRuleId, DisputeLocked, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.Amount AS amount, INSERTED.EscrowStatusId AS escrowStatusId
      VALUES (
        @orderId, @escrowProviderId, @providerEscrowId, @amount, @currencyCode, @escrowStatusId,
        @thresholdAmount, @releaseRuleId, @disputeLocked, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("orderId", orderId),
      intParam("escrowProviderId", await lookupId("EscrowProviders", getOptionalString(body, "escrowProviderCode", 80) ?? "demo_escrow")),
      varcharParam("providerEscrowId", getOptionalString(body, "providerEscrowId", 200), 200),
      moneyParam("amount", amount),
      varcharParam("currencyCode", getOptionalString(body, "currencyCode", 3)?.toUpperCase() ?? order.currencyCode, 3),
      intParam("escrowStatusId", await lookupId("EscrowStatuses", statusCode)),
      moneyParam("thresholdAmount", getOptionalNumber(body, "thresholdAmount") ?? 1000),
      intParam("releaseRuleId", await lookupId("EscrowReleaseRules", getOptionalString(body, "releaseRuleCode", 80) ?? "delivery_confirmation")),
      bitParam("disputeLocked", getOptionalBoolean(body, "disputeLocked") ?? false),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "escrow_triggered",
    recordTypeCode: "escrow",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: "Escrow record created.",
  });

  sendJson(response, 201, { ok: true, escrow: rows[0] });
}

async function updateEscrow(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const escrow = (await queryRowsWithParams<{
    orderId: number;
    escrowStatusCode: string;
    releaseRuleCode: string;
    disputeLocked: boolean;
  }>(
    `
      SELECT e.OrderId AS orderId, es.Code AS escrowStatusCode,
        rr.Code AS releaseRuleCode, e.DisputeLocked AS disputeLocked
      FROM dbo.Escrows e
      INNER JOIN dbo.EscrowStatuses es ON es.Id = e.EscrowStatusId
      INNER JOIN dbo.EscrowReleaseRules rr ON rr.Id = e.ReleaseRuleId
      WHERE e.Id = @id;
    `,
    [intParam("id", id)],
  ))[0];
  if (!escrow) throw new ApiError(404, "Escrow not found.");
  const escrowOrder = await requireOrderAccess(auth, escrow.orderId);
  const party = transactionParty(auth, escrowOrder);

  const body = await readJsonBody<EscrowBody>(request);
  const statusCode = getOptionalString(body, "escrowStatusCode", 80);
  if (statusCode) {
    const toCode = normalizeCode(statusCode);
    assertStatusTransition(
      ESCROW_TRANSITIONS,
      escrow.escrowStatusCode,
      toCode,
      "escrow",
    );
    assertStatusSetter(ESCROW_STATUS_SETTERS, toCode, party, auth, "escrow");

    if (toCode === "released" && escrow.escrowStatusCode !== "released") {
      if (escrow.disputeLocked) {
        throw new ApiError(
          409,
          "This escrow is dispute-locked and cannot be released until the dispute is resolved.",
        );
      }
      if (escrow.releaseRuleCode === "admin_approval" && !auth.isAdmin) {
        throw new ApiError(
          403,
          "This escrow releases only with EcoGlobe admin approval.",
        );
      }
      if (escrow.releaseRuleCode === "delivery_confirmation" && !auth.isAdmin) {
        const delivered = (await queryRowsWithParams<{ id: number }>(
          `
            SELECT TOP (1) s.Id AS id
            FROM dbo.Shipments s
            INNER JOIN dbo.ShipmentStatuses ss ON ss.Id = s.ShipmentStatusId
            WHERE s.OrderId = @orderId AND ss.Code = 'delivered';
          `,
          [intParam("orderId", escrow.orderId)],
        ))[0];
        if (!delivered) {
          throw new ApiError(
            409,
            "This escrow releases on delivery confirmation, and no shipment on the order is delivered yet.",
          );
        }
      }
      if (escrow.releaseRuleCode === "contract_milestone" && !auth.isAdmin) {
        const activeContract = (await queryRowsWithParams<{ id: number }>(
          `
            SELECT TOP (1) c.Id AS id
            FROM dbo.Contracts c
            INNER JOIN dbo.ContractStatuses cs ON cs.Id = c.ContractStatusId
            WHERE c.OrderId = @orderId AND cs.Code = 'active';
          `,
          [intParam("orderId", escrow.orderId)],
        ))[0];
        if (!activeContract) {
          throw new ApiError(
            409,
            "This escrow releases on a contract milestone, and the order has no active contract.",
          );
        }
      }
    }
  }

  // Clearing a dispute lock is an admin action; parties may only set it.
  const disputeLockedFlag = getOptionalBoolean(body, "disputeLocked");
  if (disputeLockedFlag === false && !auth.isAdmin) {
    throw new ApiError(403, "Only admins can clear an escrow dispute lock.");
  }

  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Escrows
      SET
        ProviderEscrowId = COALESCE(@providerEscrowId, ProviderEscrowId),
        Amount = COALESCE(@amount, Amount),
        EscrowStatusId = COALESCE(@escrowStatusId, EscrowStatusId),
        ReleaseRuleId = COALESCE(@releaseRuleId, ReleaseRuleId),
        DisputeLocked = COALESCE(@disputeLocked, DisputeLocked),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.Amount AS amount, INSERTED.EscrowStatusId AS escrowStatusId, INSERTED.DisputeLocked AS disputeLocked
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      varcharParam("providerEscrowId", getOptionalString(body, "providerEscrowId", 200), 200),
      moneyParam("amount", getOptionalNumber(body, "amount")),
      intParam("escrowStatusId", statusCode ? await lookupId("EscrowStatuses", statusCode) : undefined),
      intParam("releaseRuleId", getOptionalString(body, "releaseRuleCode", 80) ? await lookupId("EscrowReleaseRules", getOptionalString(body, "releaseRuleCode", 80) ?? "") : undefined),
      bitParam("disputeLocked", getOptionalBoolean(body, "disputeLocked")),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  if (!rows[0]) throw new ApiError(404, "Escrow not found.");

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: statusCode === "released" ? "escrow_released" : statusCode ? "status_changed" : "updated",
    recordTypeCode: "escrow",
    recordId: id,
    newValue: rows[0],
    reason: "Escrow updated.",
  });

  if (statusCode && normalizeCode(statusCode) !== escrow.escrowStatusCode) {
    await notifyCompanies({
      actorUserId: auth.userId,
      companyIds: [escrowOrder.buyerCompanyId, escrowOrder.sellerCompanyId],
      categoryCode: "payments",
      subject: `Escrow for order #${escrow.orderId} is now ${normalizeCode(statusCode)}`,
      body: `The escrow on order #${escrow.orderId} moved from ${escrow.escrowStatusCode} to ${normalizeCode(statusCode)}.`,
      recordTypeCode: "escrow",
      recordId: id,
    });
  }

  sendJson(response, 200, { ok: true, escrow: rows[0] });
}

async function listPayments(response: ServerResponse, url: URL, auth: AuthContext) {
  const orderId = url.searchParams.get("orderId") ? Number(url.searchParams.get("orderId")) : undefined;
  const payments = await queryRowsWithParams(
    `
      SELECT TOP (100)
        p.Id AS id, p.OrderId AS orderId, p.EscrowId AS escrowId, p.PayerCompanyId AS payerCompanyId,
        c.LegalName AS payerCompanyName, p.ProviderPaymentId AS providerPaymentId,
        p.Amount AS amount, p.CurrencyCode AS currencyCode, ps.Code AS paymentStatusCode,
        pt.Code AS paymentTypeCode, p.CreatedAt AS createdAt, p.UpdatedAt AS updatedAt
      FROM dbo.Payments p
      INNER JOIN dbo.Orders o ON o.Id = p.OrderId
      INNER JOIN dbo.Companies c ON c.Id = p.PayerCompanyId
      INNER JOIN dbo.PaymentStatuses ps ON ps.Id = p.PaymentStatusId
      INNER JOIN dbo.PaymentTypes pt ON pt.Id = p.PaymentTypeId
      WHERE (@orderId IS NULL OR p.OrderId = @orderId)
        AND (@isAdmin = 1 OR o.BuyerCompanyId = @authCompanyId OR o.SellerCompanyId = @authCompanyId)
      ORDER BY p.Id DESC;
    `,
    [intParam("orderId", Number.isInteger(orderId) ? orderId : undefined), bitParam("isAdmin", auth.isAdmin), intParam("authCompanyId", auth.companyId)],
  );
  sendJson(response, 200, { ok: true, payments });
}

async function getPayment(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const rows = await queryRowsWithParams<
    Record<string, unknown> & { orderId: number }
  >(
    `
      SELECT
        p.Id AS id, p.OrderId AS orderId, p.EscrowId AS escrowId, p.PayerCompanyId AS payerCompanyId,
        c.LegalName AS payerCompanyName, p.ProviderPaymentId AS providerPaymentId,
        p.Amount AS amount, p.CurrencyCode AS currencyCode, ps.Code AS paymentStatusCode,
        pt.Code AS paymentTypeCode, p.CreatedAt AS createdAt, p.UpdatedAt AS updatedAt
      FROM dbo.Payments p
      INNER JOIN dbo.Companies c ON c.Id = p.PayerCompanyId
      INNER JOIN dbo.PaymentStatuses ps ON ps.Id = p.PaymentStatusId
      INNER JOIN dbo.PaymentTypes pt ON pt.Id = p.PaymentTypeId
      WHERE p.Id = @id;
    `,
    [intParam("id", id)],
  );
  const payment = rows[0];
  if (!payment) throw new ApiError(404, "Payment not found.");
  await requireOrderAccess(auth, payment.orderId);
  sendJson(response, 200, { ok: true, payment });
}

async function createPayment(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<PaymentBody>(request);
  const orderId = getBodyInt(body, "orderId");
  await requireOrderAccess(auth, orderId);
  const order = (
    await queryRowsWithParams<{ totalAmount: number; currencyCode: string }>(
      "SELECT TotalAmount AS totalAmount, CurrencyCode AS currencyCode FROM dbo.Orders WHERE Id = @orderId;",
      [intParam("orderId", orderId)],
    )
  )[0];
  if (!order) throw new ApiError(404, "Order not found.");

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Payments (
        OrderId, EscrowId, PayerCompanyId, ProviderPaymentId, Amount, CurrencyCode,
        PaymentStatusId, PaymentTypeId, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.Amount AS amount, INSERTED.PaymentStatusId AS paymentStatusId
      VALUES (
        @orderId, @escrowId, @payerCompanyId, @providerPaymentId, @amount, @currencyCode,
        @paymentStatusId, @paymentTypeId, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("orderId", orderId),
      intParam("escrowId", getOptionalInt(body, "escrowId")),
      intParam("payerCompanyId", getBodyInt(body, "payerCompanyId")),
      varcharParam("providerPaymentId", getOptionalString(body, "providerPaymentId", 200), 200),
      moneyParam("amount", getOptionalNumber(body, "amount") ?? Number(order.totalAmount)),
      varcharParam("currencyCode", getOptionalString(body, "currencyCode", 3)?.toUpperCase() ?? order.currencyCode, 3),
      intParam("paymentStatusId", await lookupId("PaymentStatuses", getOptionalString(body, "paymentStatusCode", 80) ?? "pending")),
      intParam("paymentTypeId", await lookupId("PaymentTypes", getOptionalString(body, "paymentTypeCode", 80) ?? "buyer_funding")),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({ auth, request, actionTypeCode: "created", recordTypeCode: "payment", recordId: rows[0].id as number, newValue: rows[0], reason: "Payment created." });
  sendJson(response, 201, { ok: true, payment: rows[0] });
}

async function updatePayment(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const paymentOrder = (await queryRowsWithParams<{ orderId: number }>(
    "SELECT OrderId AS orderId FROM dbo.Payments WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!paymentOrder) throw new ApiError(404, "Payment not found.");
  await requireOrderAccess(auth, paymentOrder.orderId);
  const body = await readJsonBody<PaymentBody>(request);
  const statusCode = getOptionalString(body, "paymentStatusCode", 80);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Payments
      SET
        ProviderPaymentId = COALESCE(@providerPaymentId, ProviderPaymentId),
        Amount = COALESCE(@amount, Amount),
        PaymentStatusId = COALESCE(@paymentStatusId, PaymentStatusId),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.Amount AS amount, INSERTED.PaymentStatusId AS paymentStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      varcharParam("providerPaymentId", getOptionalString(body, "providerPaymentId", 200), 200),
      moneyParam("amount", getOptionalNumber(body, "amount")),
      intParam("paymentStatusId", statusCode ? await lookupId("PaymentStatuses", statusCode) : undefined),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Payment not found.");
  await writeAuditLog({ auth, request, actionTypeCode: statusCode ? "status_changed" : "updated", recordTypeCode: "payment", recordId: id, newValue: rows[0], reason: "Payment updated." });
  sendJson(response, 200, { ok: true, payment: rows[0] });
}

async function listPayouts(response: ServerResponse, url: URL, auth: AuthContext) {
  const orderId = url.searchParams.get("orderId") ? Number(url.searchParams.get("orderId")) : undefined;
  const payouts = await queryRowsWithParams(
    `
      SELECT TOP (100)
        p.Id AS id, p.OrderId AS orderId, p.EscrowId AS escrowId, p.SellerCompanyId AS sellerCompanyId,
        c.LegalName AS sellerCompanyName, p.ProviderPayoutId AS providerPayoutId,
        p.Amount AS amount, p.CurrencyCode AS currencyCode, ps.Code AS payoutStatusCode,
        p.CreatedAt AS createdAt, p.UpdatedAt AS updatedAt
      FROM dbo.Payouts p
      INNER JOIN dbo.Orders o ON o.Id = p.OrderId
      INNER JOIN dbo.Companies c ON c.Id = p.SellerCompanyId
      INNER JOIN dbo.PayoutStatuses ps ON ps.Id = p.PayoutStatusId
      WHERE (@orderId IS NULL OR p.OrderId = @orderId)
        AND (@isAdmin = 1 OR o.BuyerCompanyId = @authCompanyId OR o.SellerCompanyId = @authCompanyId)
      ORDER BY p.Id DESC;
    `,
    [intParam("orderId", Number.isInteger(orderId) ? orderId : undefined), bitParam("isAdmin", auth.isAdmin), intParam("authCompanyId", auth.companyId)],
  );
  sendJson(response, 200, { ok: true, payouts });
}

async function createPayout(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<PayoutBody>(request);
  const orderId = getBodyInt(body, "orderId");
  const order = (
    await queryRowsWithParams<{ sellerCompanyId: number; totalAmount: number; currencyCode: string }>(
      "SELECT SellerCompanyId AS sellerCompanyId, TotalAmount AS totalAmount, CurrencyCode AS currencyCode FROM dbo.Orders WHERE Id = @orderId;",
      [intParam("orderId", orderId)],
    )
  )[0];
  if (!order) throw new ApiError(404, "Order not found.");
  await requireOrderAccess(auth, orderId);

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Payouts (
        OrderId, EscrowId, SellerCompanyId, ProviderPayoutId, Amount, CurrencyCode,
        PayoutStatusId, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.Amount AS amount, INSERTED.PayoutStatusId AS payoutStatusId
      VALUES (
        @orderId, @escrowId, @sellerCompanyId, @providerPayoutId, @amount, @currencyCode,
        @payoutStatusId, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("orderId", orderId),
      intParam("escrowId", getOptionalInt(body, "escrowId")),
      intParam("sellerCompanyId", getOptionalInt(body, "sellerCompanyId") ?? order.sellerCompanyId),
      varcharParam("providerPayoutId", getOptionalString(body, "providerPayoutId", 200), 200),
      moneyParam("amount", getOptionalNumber(body, "amount") ?? Number(order.totalAmount)),
      varcharParam("currencyCode", getOptionalString(body, "currencyCode", 3)?.toUpperCase() ?? order.currencyCode, 3),
      intParam("payoutStatusId", await lookupId("PayoutStatuses", getOptionalString(body, "payoutStatusCode", 80) ?? "pending")),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );

  await writeAuditLog({ auth, request, actionTypeCode: "created", recordTypeCode: "payment", recordId: rows[0].id as number, newValue: rows[0], reason: "Payout created." });
  sendJson(response, 201, { ok: true, payout: rows[0] });
}

async function updatePayout(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const payoutOrder = (await queryRowsWithParams<{ orderId: number }>(
    "SELECT OrderId AS orderId FROM dbo.Payouts WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!payoutOrder) throw new ApiError(404, "Payout not found.");
  await requireOrderAccess(auth, payoutOrder.orderId);
  const body = await readJsonBody<PayoutBody>(request);
  const statusCode = getOptionalString(body, "payoutStatusCode", 80);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Payouts
      SET
        ProviderPayoutId = COALESCE(@providerPayoutId, ProviderPayoutId),
        Amount = COALESCE(@amount, Amount),
        PayoutStatusId = COALESCE(@payoutStatusId, PayoutStatusId),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.Amount AS amount, INSERTED.PayoutStatusId AS payoutStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      varcharParam("providerPayoutId", getOptionalString(body, "providerPayoutId", 200), 200),
      moneyParam("amount", getOptionalNumber(body, "amount")),
      intParam("payoutStatusId", statusCode ? await lookupId("PayoutStatuses", statusCode) : undefined),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Payout not found.");
  await writeAuditLog({ auth, request, actionTypeCode: statusCode ? "status_changed" : "updated", recordTypeCode: "payment", recordId: id, newValue: rows[0], reason: "Payout updated." });
  sendJson(response, 200, { ok: true, payout: rows[0] });
}

async function listContracts(response: ServerResponse, url: URL, auth: AuthContext) {
  const companyId = url.searchParams.get("companyId") ? Number(url.searchParams.get("companyId")) : undefined;
  const contracts = await queryRowsWithParams(
    `
      SELECT TOP (100)
        c.Id AS id, c.BuyerCompanyId AS buyerCompanyId, bc.LegalName AS buyerCompanyName,
        c.SellerCompanyId AS sellerCompanyId, sc.LegalName AS sellerCompanyName,
        c.ListingId AS listingId, src.Code AS contractSourceCode, st.Code AS contractStatusCode,
        c.Title AS title, c.RenewalTerms AS renewalTerms, c.RenewalDate AS renewalDate,
        c.ProviderName AS providerName, c.ProviderEnvelopeId AS providerEnvelopeId,
        c.ProviderTemplateId AS providerTemplateId, c.SignedDocumentUrl AS signedDocumentUrl,
        c.CompletionCertificateUrl AS completionCertificateUrl, c.CompletedAt AS completedAt,
        c.CreatedAt AS createdAt, c.UpdatedAt AS updatedAt
      FROM dbo.Contracts c
      INNER JOIN dbo.Companies bc ON bc.Id = c.BuyerCompanyId
      INNER JOIN dbo.Companies sc ON sc.Id = c.SellerCompanyId
      INNER JOIN dbo.ContractSources src ON src.Id = c.ContractSourceId
      INNER JOIN dbo.ContractStatuses st ON st.Id = c.ContractStatusId
      WHERE (@companyId IS NULL OR c.BuyerCompanyId = @companyId OR c.SellerCompanyId = @companyId)
        AND (@isAdmin = 1 OR c.BuyerCompanyId = @authCompanyId OR c.SellerCompanyId = @authCompanyId)
      ORDER BY c.Id DESC;
    `,
    [intParam("companyId", Number.isInteger(companyId) ? companyId : undefined), bitParam("isAdmin", auth.isAdmin), intParam("authCompanyId", auth.companyId)],
  );
  sendJson(response, 200, { ok: true, contracts });
}

async function createContract(request: IncomingMessage, response: ServerResponse, auth: AuthContext) {
  const body = await readJsonBody<ContractBody>(request);
  const buyerCompanyId = getBodyInt(body, "buyerCompanyId");
  const sellerCompanyId = getBodyInt(body, "sellerCompanyId");
  if (!auth.isAdmin && auth.companyId !== buyerCompanyId && auth.companyId !== sellerCompanyId) {
    throw new ApiError(403, "A contract must include your active company.");
  }
  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Contracts (
        BuyerCompanyId, SellerCompanyId, ListingId, ContractSourceId, ContractStatusId,
        Title, RenewalTerms, RenewalDate, SignedDocumentUrl, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.ContractStatusId AS contractStatusId
      VALUES (
        @buyerCompanyId, @sellerCompanyId, @listingId, @contractSourceId, @contractStatusId,
        @title, @renewalTerms, @renewalDate, @signedDocumentUrl, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("buyerCompanyId", buyerCompanyId),
      intParam("sellerCompanyId", sellerCompanyId),
      intParam("listingId", getOptionalInt(body, "listingId")),
      intParam("contractSourceId", await lookupId("ContractSources", getOptionalString(body, "contractSourceCode", 80) ?? (getOptionalInt(body, "listingId") ? "platform_listing" : "custom_off_platform"))),
      intParam("contractStatusId", await lookupId("ContractStatuses", getOptionalString(body, "contractStatusCode", 80) ?? "draft")),
      nvarcharParam("title", getRequiredString(body, "title", 220), 220),
      nvarcharParam("renewalTerms", getOptionalString(body, "renewalTerms", 1000), 1000),
      dateTimeParam("renewalDate", getOptionalDate(body, "renewalDate")),
      nvarcharParam("signedDocumentUrl", getOptionalString(body, "signedDocumentUrl", 1000), 1000),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  await writeAuditLog({ auth, request, actionTypeCode: "created", recordTypeCode: "contract", recordId: rows[0].id as number, newValue: rows[0], reason: "Contract created." });
  sendJson(response, 201, { ok: true, contract: rows[0] });
}

async function updateContract(request: IncomingMessage, response: ServerResponse, id: number, auth: AuthContext) {
  const contract = (await queryRowsWithParams<{ buyerCompanyId: number; sellerCompanyId: number }>(
    "SELECT BuyerCompanyId AS buyerCompanyId, SellerCompanyId AS sellerCompanyId FROM dbo.Contracts WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!contract) throw new ApiError(404, "Contract not found.");
  if (!auth.isAdmin && auth.companyId !== contract.buyerCompanyId && auth.companyId !== contract.sellerCompanyId) {
    throw new ApiError(403, "You cannot update another company's contract.");
  }
  const body = await readJsonBody<ContractBody>(request);
  const statusCode = getOptionalString(body, "contractStatusCode", 80);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Contracts
      SET
        ContractStatusId = COALESCE(@contractStatusId, ContractStatusId),
        Title = COALESCE(@title, Title),
        RenewalTerms = COALESCE(@renewalTerms, RenewalTerms),
        RenewalDate = COALESCE(@renewalDate, RenewalDate),
        SignedDocumentUrl = COALESCE(@signedDocumentUrl, SignedDocumentUrl),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.ContractStatusId AS contractStatusId
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("contractStatusId", statusCode ? await lookupId("ContractStatuses", statusCode) : undefined),
      nvarcharParam("title", getOptionalString(body, "title", 220), 220),
      nvarcharParam("renewalTerms", getOptionalString(body, "renewalTerms", 1000), 1000),
      dateTimeParam("renewalDate", getOptionalDate(body, "renewalDate")),
      nvarcharParam("signedDocumentUrl", getOptionalString(body, "signedDocumentUrl", 1000), 1000),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Contract not found.");
  await writeAuditLog({ auth, request, actionTypeCode: statusCode ? "status_changed" : "updated", recordTypeCode: "contract", recordId: id, newValue: rows[0], reason: "Contract updated." });
  sendJson(response, 200, { ok: true, contract: rows[0] });
}

async function listSignatures(response: ServerResponse, url: URL, auth: AuthContext) {
  const contractId = url.searchParams.get("contractId") ? Number(url.searchParams.get("contractId")) : undefined;
  const signatures = await queryRowsWithParams(
    `
      SELECT TOP (100)
        s.Id AS id, s.ContractId AS contractId, s.SignerUserId AS signerUserId,
        u.Name AS signerUserName, s.SignerCompanyId AS signerCompanyId,
        c.LegalName AS signerCompanyName, s.ProviderName AS providerName,
        s.ProviderEnvelopeId AS providerEnvelopeId, s.ProviderSignatureId AS providerSignatureId,
        s.ProviderRecipientId AS providerRecipientId, s.ProviderClientUserId AS providerClientUserId,
        st.Code AS signatureStatusCode, s.SignedDocumentUrl AS signedDocumentUrl,
        s.SentAt AS sentAt, s.DeliveredAt AS deliveredAt, s.SignedAt AS signedAt,
        s.DeclinedAt AS declinedAt, s.CreatedAt AS createdAt, s.UpdatedAt AS updatedAt
      FROM dbo.Signatures s
      INNER JOIN dbo.Users u ON u.Id = s.SignerUserId
      INNER JOIN dbo.Companies c ON c.Id = s.SignerCompanyId
      INNER JOIN dbo.SignatureStatuses st ON st.Id = s.SignatureStatusId
      WHERE (@contractId IS NULL OR s.ContractId = @contractId)
        AND (@isAdmin = 1 OR EXISTS (
          SELECT 1 FROM dbo.Contracts accessibleContract
          WHERE accessibleContract.Id = s.ContractId
            AND (accessibleContract.BuyerCompanyId = @authCompanyId OR accessibleContract.SellerCompanyId = @authCompanyId)
        ))
      ORDER BY s.Id DESC;
    `,
    [intParam("contractId", Number.isInteger(contractId) ? contractId : undefined), bitParam("isAdmin", auth.isAdmin), intParam("authCompanyId", auth.companyId)],
  );
  sendJson(response, 200, { ok: true, signatures });
}

async function createSignature(request: IncomingMessage, response: ServerResponse, auth: AuthContext) {
  const body = await readJsonBody<SignatureBody>(request);
  const signerUserId = getBodyInt(body, "signerUserId");
  const signerCompanyId = getBodyInt(body, "signerCompanyId");
  if (!auth.isAdmin) {
    requireUserAccess(auth, signerUserId);
    requireCompanyAccess(auth, signerCompanyId);
  }
  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Signatures (
        ContractId, SignerUserId, SignerCompanyId, ProviderSignatureId, SignatureStatusId,
        SignedDocumentUrl, SignedAt, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.ContractId AS contractId, INSERTED.SignerUserId AS signerUserId, INSERTED.SignatureStatusId AS signatureStatusId
      VALUES (
        @contractId, @signerUserId, @signerCompanyId, @providerSignatureId, @signatureStatusId,
        @signedDocumentUrl, @signedAt, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("contractId", getBodyInt(body, "contractId")),
      intParam("signerUserId", signerUserId),
      intParam("signerCompanyId", signerCompanyId),
      varcharParam("providerSignatureId", getOptionalString(body, "providerSignatureId", 200), 200),
      intParam("signatureStatusId", await lookupId("SignatureStatuses", getOptionalString(body, "signatureStatusCode", 80) ?? "not_sent")),
      nvarcharParam("signedDocumentUrl", getOptionalString(body, "signedDocumentUrl", 1000), 1000),
      dateTimeParam("signedAt", getOptionalDate(body, "signedAt")),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  await writeAuditLog({ auth, request, actionTypeCode: "created", recordTypeCode: "contract", recordId: rows[0].contractId as number, newValue: rows[0], reason: "Signature record created." });
  sendJson(response, 201, { ok: true, signature: rows[0] });
}

async function updateSignature(request: IncomingMessage, response: ServerResponse, id: number, auth: AuthContext) {
  const signature = (await queryRowsWithParams<{ signerUserId: number; signerCompanyId: number }>(
    "SELECT SignerUserId AS signerUserId, SignerCompanyId AS signerCompanyId FROM dbo.Signatures WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!signature) throw new ApiError(404, "Signature not found.");
  if (!auth.isAdmin && auth.userId !== signature.signerUserId && auth.companyId !== signature.signerCompanyId) {
    throw new ApiError(403, "You cannot update another company's signature.");
  }
  const body = await readJsonBody<SignatureBody>(request);
  const statusCode = getOptionalString(body, "signatureStatusCode", 80);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Signatures
      SET
        ProviderSignatureId = COALESCE(@providerSignatureId, ProviderSignatureId),
        SignatureStatusId = COALESCE(@signatureStatusId, SignatureStatusId),
        SignedDocumentUrl = COALESCE(@signedDocumentUrl, SignedDocumentUrl),
        SignedAt = COALESCE(@signedAt, SignedAt),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.ContractId AS contractId, INSERTED.SignatureStatusId AS signatureStatusId, INSERTED.SignedAt AS signedAt
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      varcharParam("providerSignatureId", getOptionalString(body, "providerSignatureId", 200), 200),
      intParam("signatureStatusId", statusCode ? await lookupId("SignatureStatuses", statusCode) : undefined),
      nvarcharParam("signedDocumentUrl", getOptionalString(body, "signedDocumentUrl", 1000), 1000),
      dateTimeParam("signedAt", getOptionalDate(body, "signedAt")),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Signature not found.");
  await writeAuditLog({ auth, request, actionTypeCode: statusCode ? "status_changed" : "updated", recordTypeCode: "contract", recordId: rows[0].contractId as number, newValue: rows[0], reason: "Signature updated." });
  sendJson(response, 200, { ok: true, signature: rows[0] });
}

async function listDisputes(response: ServerResponse, url: URL, auth: AuthContext) {
  const orderId = url.searchParams.get("orderId") ? Number(url.searchParams.get("orderId")) : undefined;
  const disputes = await queryRowsWithParams(
    `
      SELECT TOP (100)
        d.Id AS id, d.OrderId AS orderId, d.EscrowId AS escrowId, d.ShipmentId AS shipmentId,
        d.OpenedByUserId AS openedByUserId, it.Code AS issueTypeCode,
        st.Code AS disputeStatusCode, d.Summary AS summary, d.ResolutionNotes AS resolutionNotes,
        d.CreatedAt AS createdAt, d.UpdatedAt AS updatedAt
      FROM dbo.Disputes d
      INNER JOIN dbo.DisputeIssueTypes it ON it.Id = d.IssueTypeId
      INNER JOIN dbo.DisputeStatuses st ON st.Id = d.DisputeStatusId
      WHERE (@orderId IS NULL OR d.OrderId = @orderId)
        AND (@isAdmin = 1 OR d.OpenedByUserId = @authUserId OR EXISTS (
          SELECT 1 FROM dbo.Orders o
          WHERE o.Id = d.OrderId AND (o.BuyerCompanyId = @authCompanyId OR o.SellerCompanyId = @authCompanyId)
        ))
      ORDER BY d.Id DESC;
    `,
    [intParam("orderId", Number.isInteger(orderId) ? orderId : undefined), bitParam("isAdmin", auth.isAdmin), intParam("authUserId", auth.userId), intParam("authCompanyId", auth.companyId)],
  );
  sendJson(response, 200, { ok: true, disputes });
}

async function createDispute(request: IncomingMessage, response: ServerResponse, auth: AuthContext) {
  const body = await readJsonBody<DisputeBody>(request);
  const orderId = getOptionalInt(body, "orderId");
  const escrowId = getOptionalInt(body, "escrowId");
  const shipmentId = getOptionalInt(body, "shipmentId");
  if (!orderId && !escrowId && !shipmentId) throw new ApiError(400, "orderId, escrowId, or shipmentId is required.");
  if (orderId) await requireOrderAccess(auth, orderId);
  if (!auth.isAdmin && escrowId) {
    const escrowOrder = (await queryRowsWithParams<{ orderId: number }>("SELECT OrderId AS orderId FROM dbo.Escrows WHERE Id = @id;", [intParam("id", escrowId)]))[0];
    if (!escrowOrder) throw new ApiError(404, "Escrow not found.");
    await requireOrderAccess(auth, escrowOrder.orderId);
  }
  if (!auth.isAdmin && shipmentId) {
    const shipmentOrder = (await queryRowsWithParams<{ orderId: number }>("SELECT OrderId AS orderId FROM dbo.Shipments WHERE Id = @id;", [intParam("id", shipmentId)]))[0];
    if (!shipmentOrder) throw new ApiError(404, "Shipment not found.");
    await requireOrderAccess(auth, shipmentOrder.orderId);
  }
  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.Disputes (
        OrderId, EscrowId, ShipmentId, OpenedByUserId, IssueTypeId, DisputeStatusId,
        Summary, ResolutionNotes, CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.DisputeStatusId AS disputeStatusId, INSERTED.Summary AS summary
      VALUES (
        @orderId, @escrowId, @shipmentId, @openedByUserId, @issueTypeId, @disputeStatusId,
        @summary, @resolutionNotes, @createdByUserId, @updatedByUserId
      );
    `,
    [
      intParam("orderId", orderId),
      intParam("escrowId", escrowId),
      intParam("shipmentId", shipmentId),
      intParam("openedByUserId", getOptionalInt(body, "openedByUserId") ?? auth.userId),
      intParam("issueTypeId", await lookupId("DisputeIssueTypes", getOptionalString(body, "issueTypeCode", 80) ?? "quality")),
      intParam("disputeStatusId", await lookupId("DisputeStatuses", getOptionalString(body, "disputeStatusCode", 80) ?? "open")),
      nvarcharParam("summary", getRequiredString(body, "summary", 500), 500),
      nvarcharParam("resolutionNotes", getOptionalString(body, "resolutionNotes", 4000), 4000),
      intParam("createdByUserId", auth.userId),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  // Opening a dispute freezes any live escrow money on the affected order.
  await queryRowsWithParams(
    `
      UPDATE e
      SET e.DisputeLocked = 1,
          e.EscrowStatusId = locked.Id,
          e.UpdatedByUserId = @userId,
          e.UpdatedAt = SYSUTCDATETIME()
      FROM dbo.Escrows e
      INNER JOIN dbo.EscrowStatuses es ON es.Id = e.EscrowStatusId
      CROSS JOIN (SELECT Id FROM dbo.EscrowStatuses WHERE Code = 'dispute_locked') locked
      WHERE (e.Id = @escrowId OR e.OrderId = @orderId)
        AND es.Code IN ('funded', 'release_pending');
    `,
    [
      intParam("escrowId", escrowId ?? -1),
      intParam("orderId", orderId ?? -1),
      intParam("userId", auth.userId),
    ],
  );

  await writeAuditLog({ auth, request, actionTypeCode: "created", recordTypeCode: "dispute", recordId: rows[0].id as number, newValue: rows[0], reason: "Dispute created." });
  sendJson(response, 201, { ok: true, dispute: rows[0] });
}

async function updateDispute(request: IncomingMessage, response: ServerResponse, id: number, auth: AuthContext) {
  const dispute = (await queryRowsWithParams<{ orderId: number | null; openedByUserId: number }>(
    "SELECT OrderId AS orderId, OpenedByUserId AS openedByUserId FROM dbo.Disputes WHERE Id = @id;",
    [intParam("id", id)],
  ))[0];
  if (!dispute) throw new ApiError(404, "Dispute not found.");
  if (!auth.isAdmin) {
    if (dispute.openedByUserId === auth.userId) {
      // opener may update their own dispute
    } else if (dispute.orderId) {
      await requireOrderAccess(auth, dispute.orderId);
    } else {
      throw new ApiError(403, "You cannot update this dispute.");
    }
  }
  const body = await readJsonBody<DisputeBody>(request);
  const statusCode = getOptionalString(body, "disputeStatusCode", 80);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.Disputes
      SET
        DisputeStatusId = COALESCE(@disputeStatusId, DisputeStatusId),
        Summary = COALESCE(@summary, Summary),
        ResolutionNotes = COALESCE(@resolutionNotes, ResolutionNotes),
        UpdatedByUserId = @updatedByUserId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.OrderId AS orderId, INSERTED.DisputeStatusId AS disputeStatusId, INSERTED.Summary AS summary
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      intParam("disputeStatusId", statusCode ? await lookupId("DisputeStatuses", statusCode) : undefined),
      nvarcharParam("summary", getOptionalString(body, "summary", 500), 500),
      nvarcharParam("resolutionNotes", getOptionalString(body, "resolutionNotes", 4000), 4000),
      intParam("updatedByUserId", auth.userId),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Dispute not found.");
  await writeAuditLog({ auth, request, actionTypeCode: statusCode ? "status_changed" : "updated", recordTypeCode: "dispute", recordId: id, newValue: rows[0], reason: "Dispute updated." });
  sendJson(response, 200, { ok: true, dispute: rows[0] });
}

/* ─── Phase 5: uploads, reports, Stripe webhook ─── */

async function uploadFile(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<{
    fileName?: string;
    contentType?: string;
    dataBase64?: string;
  }>(request);
  const result = await uploadDocument({
    fileName: getRequiredString(body, "fileName", 200),
    contentType: getRequiredString(body, "contentType", 100),
    dataBase64: getRequiredString(body, "dataBase64", 12_000_000),
  });

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "notification",
    recordId: 0,
    newValue: { blobName: result.blobName, size: result.size },
    reason: `Document uploaded: ${result.fileName}`,
  });

  sendJson(response, 201, { ok: true, file: result });
}

/**
 * Live report aggregates: platform-wide for admins, company-scoped for
 * everyone else.
 */
async function getReportSummary(
  response: ServerResponse,
  url: URL,
  auth: AuthContext,
) {
  const requestedCompanyId = url.searchParams.get("companyId")
    ? Number(url.searchParams.get("companyId"))
    : undefined;
  const companyId = auth.isAdmin
    ? requestedCompanyId
    : (requestedCompanyId ?? auth.companyId);
  if (!auth.isAdmin && companyId !== auth.companyId) {
    throw new ApiError(403, "You cannot access another company's reports.");
  }

  const totals = (await queryRowsWithParams<Record<string, unknown>>(
    `
      SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN os.Code = 'completed' THEN 1 ELSE 0 END) AS completedOrders,
        SUM(CASE WHEN os.Code IN ('in_progress','escrow_required','approval_required') THEN 1 ELSE 0 END) AS activeOrders,
        SUM(CASE WHEN os.Code = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
        COALESCE(SUM(CASE WHEN os.Code <> 'cancelled' THEN o.TotalAmount ELSE 0 END), 0) AS grossMerchandiseValue
      FROM dbo.Orders o
      INNER JOIN dbo.OrderStatuses os ON os.Id = o.OrderStatusId
      WHERE (@companyId IS NULL OR o.BuyerCompanyId = @companyId OR o.SellerCompanyId = @companyId);
    `,
    [intParam("companyId", companyId)],
  ))[0];

  const escrow = (await queryRowsWithParams<Record<string, unknown>>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN es.Code IN ('funded','release_pending','dispute_locked') THEN e.Amount ELSE 0 END), 0) AS fundsHeld,
        COALESCE(SUM(CASE WHEN es.Code = 'released' THEN e.Amount ELSE 0 END), 0) AS fundsReleased,
        SUM(CASE WHEN e.DisputeLocked = 1 THEN 1 ELSE 0 END) AS disputedEscrows
      FROM dbo.Escrows e
      INNER JOIN dbo.EscrowStatuses es ON es.Id = e.EscrowStatusId
      INNER JOIN dbo.Orders o ON o.Id = e.OrderId
      WHERE (@companyId IS NULL OR o.BuyerCompanyId = @companyId OR o.SellerCompanyId = @companyId);
    `,
    [intParam("companyId", companyId)],
  ))[0];

  const topListings = await queryRowsWithParams(
    `
      SELECT TOP (5)
        l.Id AS listingId,
        l.Title AS listingTitle,
        COUNT(o.Id) AS orders,
        COALESCE(SUM(o.TotalAmount), 0) AS revenue
      FROM dbo.Orders o
      INNER JOIN dbo.Listings l ON l.Id = o.ListingId
      INNER JOIN dbo.OrderStatuses os ON os.Id = o.OrderStatusId
      WHERE os.Code <> 'cancelled'
        AND (@companyId IS NULL OR o.BuyerCompanyId = @companyId OR o.SellerCompanyId = @companyId)
      GROUP BY l.Id, l.Title
      ORDER BY revenue DESC;
    `,
    [intParam("companyId", companyId)],
  );

  sendJson(response, 200, {
    ok: true,
    summary: { ...totals, ...escrow, topListings },
  });
}

async function readRawBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Stripe webhook: verifies the signature when STRIPE_WEBHOOK_SECRET is set
 * and reconciles payment and payout-readiness state.
 */
async function handleStripeWebhook(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const payload = await readRawBody(request);
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (secret) {
    const signatureHeader = request.headers["stripe-signature"];
    const header = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    if (!header) throw new ApiError(400, "Missing Stripe-Signature header.");
    const parts = Object.fromEntries(
      header.split(",").map((part) => part.split("=") as [string, string]),
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) {
      throw new ApiError(400, "Malformed Stripe-Signature header.");
    }
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(signature, "hex");
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new ApiError(400, "Stripe webhook signature verification failed.");
    }
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    throw new ApiError(400, "Webhook payload must be valid JSON.");
  }

  const object = event.data?.object ?? {};

  if (event.type === "payment_intent.succeeded" && typeof object.id === "string") {
    const capturedId = await lookupId("PaymentStatuses", "captured");
    await queryRowsWithParams(
      `
        UPDATE dbo.Payments
        SET PaymentStatusId = @statusId, UpdatedAt = SYSUTCDATETIME()
        WHERE ProviderPaymentId = @providerPaymentId;
      `,
      [
        intParam("statusId", capturedId),
        varcharParam("providerPaymentId", object.id, 200),
      ],
    );
  }

  if (event.type === "payment_intent.payment_failed" && typeof object.id === "string") {
    const failedId = await lookupId("PaymentStatuses", "failed");
    await queryRowsWithParams(
      `
        UPDATE dbo.Payments
        SET PaymentStatusId = @statusId, UpdatedAt = SYSUTCDATETIME()
        WHERE ProviderPaymentId = @providerPaymentId;
      `,
      [
        intParam("statusId", failedId),
        varcharParam("providerPaymentId", object.id, 200),
      ],
    );
  }

  if (
    event.type === "account.updated" &&
    typeof object.metadata === "object" &&
    object.metadata !== null
  ) {
    const metadata = object.metadata as Record<string, unknown>;
    const companyId = Number(metadata.ecoglobeCompanyId);
    if (Number.isInteger(companyId) && companyId > 0) {
      const payoutsEnabled = object.payouts_enabled === true;
      const statusId = await lookupId(
        "PayoutStatuses",
        payoutsEnabled ? "scheduled" : "pending",
      );
      await queryRowsWithParams(
        `
          UPDATE dbo.SellerProfiles
          SET PayoutStatusId = @statusId, UpdatedAt = SYSUTCDATETIME()
          WHERE CompanyId = @companyId;
        `,
        [intParam("statusId", statusId), intParam("companyId", companyId)],
      );
    }
  }

  sendJson(response, 200, { ok: true, received: event.type ?? "unknown" });
}

/* ─── Phase 4: interest signals, wanted listings, saved searches ─── */

const INTEREST_EVENT_TYPES = [
  "view",
  "detail_view",
  "cart_add",
  "quote_request",
];

async function recordListingInterest(
  request: IncomingMessage,
  response: ServerResponse,
  listingId: number,
  auth: AuthContext | undefined,
) {
  const body = await readJsonBody<{ eventType?: string; region?: string }>(
    request,
  );
  const eventType = normalizeCode(getRequiredString(body, "eventType", 40));
  if (!INTEREST_EVENT_TYPES.includes(eventType)) {
    throw new ApiError(
      400,
      `eventType must be one of: ${INTEREST_EVENT_TYPES.join(", ")}.`,
    );
  }
  const listing = (await queryRowsWithParams<{ sellerCompanyId: number }>(
    "SELECT SellerCompanyId AS sellerCompanyId FROM dbo.Listings WHERE Id = @id;",
    [intParam("id", listingId)],
  ))[0];
  if (!listing) throw new ApiError(404, "Listing not found.");

  // A seller browsing their own listing is not buyer interest.
  if (auth?.companyId === listing.sellerCompanyId) {
    sendJson(response, 200, { ok: true, recorded: false });
    return;
  }

  await queryRowsWithParams(
    `
      INSERT INTO dbo.ListingInterestEvents (ListingId, EventType, ViewerCompanyId, ViewerRegion)
      VALUES (@listingId, @eventType, @viewerCompanyId, @viewerRegion);
    `,
    [
      intParam("listingId", listingId),
      varcharParam("eventType", eventType, 40),
      intParam("viewerCompanyId", auth?.companyId),
      nvarcharParam("viewerRegion", getOptionalString(body, "region", 120), 120),
    ],
  );

  sendJson(response, 201, { ok: true, recorded: true });
}

async function listInterestSummary(
  response: ServerResponse,
  url: URL,
  auth: AuthContext,
) {
  const sellerCompanyId = url.searchParams.get("sellerCompanyId")
    ? Number(url.searchParams.get("sellerCompanyId"))
    : auth.companyId;
  if (!sellerCompanyId) {
    throw new ApiError(400, "sellerCompanyId is required.");
  }
  requireCompanyAccess(auth, sellerCompanyId);

  // The aggregate is the product: totals only, never who viewed.
  const summary = await queryRowsWithParams(
    `
      SELECT
        l.Id AS listingId,
        l.Title AS listingTitle,
        COUNT(e.Id) AS totalEvents,
        SUM(CASE WHEN e.EventType = 'detail_view' THEN 1 ELSE 0 END) AS detailViews,
        SUM(CASE WHEN e.EventType = 'cart_add' THEN 1 ELSE 0 END) AS cartAdds,
        SUM(CASE WHEN e.EventType = 'quote_request' THEN 1 ELSE 0 END) AS quoteRequests,
        COUNT(DISTINCT e.ViewerCompanyId) AS interestedCompanies,
        SUM(CASE WHEN e.CreatedAt >= DATEADD(day, -30, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS eventsLast30Days
      FROM dbo.Listings l
      LEFT JOIN dbo.ListingInterestEvents e ON e.ListingId = l.Id
      WHERE l.SellerCompanyId = @sellerCompanyId
      GROUP BY l.Id, l.Title
      ORDER BY totalEvents DESC, l.Id DESC;
    `,
    [intParam("sellerCompanyId", sellerCompanyId)],
  );

  sendJson(response, 200, { ok: true, interest: summary });
}

async function listWantedListings(
  response: ServerResponse,
  url: URL,
  auth: AuthContext | undefined,
) {
  const mineOnly = url.searchParams.get("mine") === "true";
  if (mineOnly && !auth?.companyId) {
    throw new ApiError(401, "Sign in to view your wanted listings.");
  }

  const rows = await queryRowsWithParams<Record<string, unknown>>(
    `
      SELECT TOP (100)
        w.Id AS id,
        w.BuyerCompanyId AS buyerCompanyId,
        c.LegalName AS buyerCompanyName,
        w.Title AS title,
        mt.Code AS materialTypeCode,
        mt.Name AS materialTypeName,
        w.Quantity AS quantity,
        w.QuantityUnit AS quantityUnit,
        w.TargetPricePerUnit AS targetPricePerUnit,
        w.CurrencyCode AS currencyCode,
        w.CountryCode AS countryCode,
        w.StateProvince AS stateProvince,
        w.Notes AS notes,
        w.IsOpen AS isOpen,
        w.CreatedAt AS createdAt
      FROM dbo.WantedListings w
      INNER JOIN dbo.Companies c ON c.Id = w.BuyerCompanyId
      INNER JOIN dbo.MaterialTypes mt ON mt.Id = w.MaterialTypeId
      WHERE (@mineOnly = 0 OR w.BuyerCompanyId = @authCompanyId)
        AND (@mineOnly = 1 OR w.IsOpen = 1)
      ORDER BY w.Id DESC;
    `,
    [
      bitParam("mineOnly", mineOnly),
      intParam("authCompanyId", auth?.companyId ?? -1),
    ],
  );

  // Buyer anonymity is a designed feature: the public view shows demand
  // without exposing who is asking. Owners and admins see their own names.
  const wantedListings = rows.map((row) => {
    const isOwner =
      auth?.isAdmin || (auth?.companyId && auth.companyId === row.buyerCompanyId);
    return isOwner
      ? row
      : { ...row, buyerCompanyId: null, buyerCompanyName: null };
  });

  sendJson(response, 200, { ok: true, wantedListings });
}

async function createWantedListing(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  if (!auth.companyId) {
    throw new ApiError(
      403,
      "Set up your company before posting a wanted listing.",
    );
  }
  const body = await readJsonBody<Record<string, unknown>>(request);
  const materialTypeId = await lookupId(
    "MaterialTypes",
    getRequiredString(body, "materialTypeCode", 80),
  );
  const quantity = getOptionalNumber(body, "quantity");
  if (quantity === undefined || quantity <= 0) {
    throw new ApiError(400, "quantity must be a positive number.");
  }
  const countryCode = getRequiredString(body, "countryCode", 2).toUpperCase();

  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.WantedListings (
        BuyerCompanyId, Title, MaterialTypeId, Quantity, QuantityUnit,
        TargetPricePerUnit, CurrencyCode, CountryCode, StateProvince, Notes,
        CreatedByUserId, UpdatedByUserId
      )
      OUTPUT INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.IsOpen AS isOpen
      VALUES (
        @buyerCompanyId, @title, @materialTypeId, @quantity, @quantityUnit,
        @targetPricePerUnit, @currencyCode, @countryCode, @stateProvince, @notes,
        @userId, @userId
      );
    `,
    [
      intParam("buyerCompanyId", auth.companyId),
      nvarcharParam("title", getRequiredString(body, "title", 200), 200),
      intParam("materialTypeId", materialTypeId),
      decimalParam("quantity", quantity),
      varcharParam(
        "quantityUnit",
        getOptionalString(body, "quantityUnit", 40) ?? "tons",
        40,
      ),
      moneyParam("targetPricePerUnit", getOptionalNumber(body, "targetPricePerUnit")),
      varcharParam(
        "currencyCode",
        getOptionalString(body, "currencyCode", 3)?.toUpperCase() ?? "USD",
        3,
      ),
      varcharParam("countryCode", countryCode, 2),
      nvarcharParam("stateProvince", getOptionalString(body, "stateProvince", 120), 120),
      nvarcharParam("notes", getOptionalString(body, "notes", 2000), 2000),
      intParam("userId", auth.userId),
    ],
  );

  await writeAuditLog({
    auth,
    request,
    actionTypeCode: "created",
    recordTypeCode: "listing",
    recordId: rows[0].id as number,
    newValue: rows[0],
    reason: "Wanted listing posted.",
  });

  sendJson(response, 201, { ok: true, wantedListing: rows[0] });
}

async function updateWantedListing(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  await requireResourceCompany(
    auth,
    "SELECT BuyerCompanyId AS companyId FROM dbo.WantedListings WHERE Id = @id;",
    [intParam("id", id)],
    "Wanted listing",
  );
  const body = await readJsonBody<Record<string, unknown>>(request);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.WantedListings
      SET
        Title = COALESCE(@title, Title),
        Quantity = COALESCE(@quantity, Quantity),
        TargetPricePerUnit = COALESCE(@targetPricePerUnit, TargetPricePerUnit),
        Notes = COALESCE(@notes, Notes),
        IsOpen = COALESCE(@isOpen, IsOpen),
        UpdatedByUserId = @userId,
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Title AS title, INSERTED.IsOpen AS isOpen
      WHERE Id = @id;
    `,
    [
      intParam("id", id),
      nvarcharParam("title", getOptionalString(body, "title", 200), 200),
      decimalParam("quantity", getOptionalNumber(body, "quantity")),
      moneyParam("targetPricePerUnit", getOptionalNumber(body, "targetPricePerUnit")),
      nvarcharParam("notes", getOptionalString(body, "notes", 2000), 2000),
      bitParam("isOpen", getOptionalBoolean(body, "isOpen")),
      intParam("userId", auth.userId),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Wanted listing not found.");
  sendJson(response, 200, { ok: true, wantedListing: rows[0] });
}

async function listSavedSearches(response: ServerResponse, auth: AuthContext) {
  const rows = await queryRowsWithParams(
    `
      SELECT
        s.Id AS id, s.Name AS name, s.SearchQuery AS searchQuery,
        mt.Code AS materialTypeCode, s.CountryCode AS countryCode,
        s.MaxPricePerUnit AS maxPricePerUnit, s.AlertsEnabled AS alertsEnabled,
        s.LastNotifiedAt AS lastNotifiedAt, s.CreatedAt AS createdAt
      FROM dbo.SavedSearches s
      LEFT JOIN dbo.MaterialTypes mt ON mt.Id = s.MaterialTypeId
      WHERE s.UserId = @userId
      ORDER BY s.Id DESC;
    `,
    [intParam("userId", auth.userId)],
  );
  sendJson(response, 200, { ok: true, savedSearches: rows });
}

async function createSavedSearch(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const materialTypeCode = getOptionalString(body, "materialTypeCode", 80);
  const rows = await queryRowsWithParams(
    `
      INSERT INTO dbo.SavedSearches (
        UserId, Name, SearchQuery, MaterialTypeId, CountryCode, MaxPricePerUnit, AlertsEnabled
      )
      OUTPUT INSERTED.Id AS id, INSERTED.Name AS name, INSERTED.AlertsEnabled AS alertsEnabled
      VALUES (@userId, @name, @searchQuery, @materialTypeId, @countryCode, @maxPricePerUnit, @alertsEnabled);
    `,
    [
      intParam("userId", auth.userId),
      nvarcharParam("name", getRequiredString(body, "name", 160), 160),
      nvarcharParam("searchQuery", getOptionalString(body, "searchQuery", 400), 400),
      intParam(
        "materialTypeId",
        materialTypeCode ? await lookupId("MaterialTypes", materialTypeCode) : undefined,
      ),
      varcharParam(
        "countryCode",
        getOptionalString(body, "countryCode", 2)?.toUpperCase(),
        2,
      ),
      moneyParam("maxPricePerUnit", getOptionalNumber(body, "maxPricePerUnit")),
      bitParam("alertsEnabled", getOptionalBoolean(body, "alertsEnabled") ?? true),
    ],
  );
  sendJson(response, 201, { ok: true, savedSearch: rows[0] });
}

async function updateSavedSearch(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const rows = await queryRowsWithParams(
    `
      UPDATE dbo.SavedSearches
      SET
        Name = COALESCE(@name, Name),
        AlertsEnabled = COALESCE(@alertsEnabled, AlertsEnabled),
        UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id AS id, INSERTED.Name AS name, INSERTED.AlertsEnabled AS alertsEnabled
      WHERE Id = @id AND UserId = @userId;
    `,
    [
      intParam("id", id),
      intParam("userId", auth.userId),
      nvarcharParam("name", getOptionalString(body, "name", 160), 160),
      bitParam("alertsEnabled", getOptionalBoolean(body, "alertsEnabled")),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Saved search not found.");
  sendJson(response, 200, { ok: true, savedSearch: rows[0] });
}

async function deleteSavedSearch(
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const rows = await queryRowsWithParams(
    "DELETE FROM dbo.SavedSearches OUTPUT DELETED.Id AS id WHERE Id = @id AND UserId = @userId;",
    [intParam("id", id), intParam("userId", auth.userId)],
  );
  if (!rows[0]) throw new ApiError(404, "Saved search not found.");
  sendJson(response, 200, { ok: true });
}

/**
 * Saved-search alerting: when a listing goes live, notify every user whose
 * saved search matches it. Best-effort — never fails the publish.
 */
async function notifySavedSearchMatches(listingId: number, actorUserId: number) {
  try {
    const listing = (await queryRowsWithParams<{
      title: string;
      description: string | null;
      materialTypeId: number;
      pricePerUnit: number;
      countryCode: string | null;
    }>(
      `
        SELECT l.Title AS title, l.Description AS description,
          l.MaterialTypeId AS materialTypeId, l.PricePerUnit AS pricePerUnit,
          loc.CountryCode AS countryCode
        FROM dbo.Listings l
        LEFT JOIN dbo.Locations loc ON loc.Id = l.LocationId
        WHERE l.Id = @id;
      `,
      [intParam("id", listingId)],
    ))[0];
    if (!listing) return;

    const matches = await queryRowsWithParams<{ id: number; userId: number; name: string }>(
      `
        SELECT s.Id AS id, s.UserId AS userId, s.Name AS name
        FROM dbo.SavedSearches s
        WHERE s.AlertsEnabled = 1
          AND s.UserId <> @actorUserId
          AND (s.SearchQuery IS NULL OR @title LIKE '%' + s.SearchQuery + '%' OR @description LIKE '%' + s.SearchQuery + '%')
          AND (s.MaterialTypeId IS NULL OR s.MaterialTypeId = @materialTypeId)
          AND (s.CountryCode IS NULL OR s.CountryCode = @countryCode)
          AND (s.MaxPricePerUnit IS NULL OR @pricePerUnit <= s.MaxPricePerUnit);
      `,
      [
        intParam("actorUserId", actorUserId),
        nvarcharParam("title", listing.title, 400),
        nvarcharParam("description", listing.description ?? "", 4000),
        intParam("materialTypeId", listing.materialTypeId),
        varcharParam("countryCode", listing.countryCode ?? "ZZ", 2),
        moneyParam("pricePerUnit", Number(listing.pricePerUnit)),
      ],
    );
    if (matches.length === 0) return;

    const channelId = await lookupId("NotificationChannels", "in_app");
    const categoryId = await lookupId("NotificationCategories", "marketplace");
    const statusId = await lookupId("NotificationStatuses", "sent");
    const recordTypeId = await lookupId("RecordTypes", "listing");

    for (const match of matches) {
      await queryRowsWithParams(
        `
          INSERT INTO dbo.Notifications (
            UserId, RelatedRecordTypeId, RelatedRecordId,
            NotificationChannelId, NotificationCategoryId, NotificationStatusId,
            Subject, Body, SentAt, CreatedByUserId, UpdatedByUserId
          )
          VALUES (
            @userId, @recordTypeId, @listingId,
            @channelId, @categoryId, @statusId,
            @subject, @body, SYSUTCDATETIME(), @actorUserId, @actorUserId
          );
          UPDATE dbo.SavedSearches SET LastNotifiedAt = SYSUTCDATETIME() WHERE Id = @savedSearchId;
        `,
        [
          intParam("userId", match.userId),
          intParam("recordTypeId", recordTypeId),
          intParam("listingId", listingId),
          intParam("channelId", channelId),
          intParam("categoryId", categoryId),
          intParam("statusId", statusId),
          nvarcharParam(
            "subject",
            `New match for your saved search "${match.name}"`,
            240,
          ),
          nvarcharParam(
            "body",
            `"${listing.title}" was just published and matches your saved search "${match.name}".`,
            4000,
          ),
          intParam("actorUserId", actorUserId),
          intParam("savedSearchId", match.id),
        ],
      );
    }
  } catch (error) {
    console.warn("Saved-search alerting failed:", error);
  }
}

export async function handleApiRoute(
  request: IncomingMessage,
  response: ServerResponse,
  requestUrl: URL,
) {
  const method = ensureMethod(request.method);

  if (method === "GET" && requestUrl.pathname === "/api/lookups") {
    await listLookups(response);
    return true;
  }

  if (requestUrl.pathname === "/api/onboarding") {
    if (method === "GET") {
      await getOnboardingState(response, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await completeOnboarding(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  if (requestUrl.pathname === "/api/stripe/onboarding") {
    if (method === "POST") {
      await startStripeOnboarding(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  if (requestUrl.pathname === "/api/users") {
    if (method === "GET") {
      await listUsers(response, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      const auth = await requireSessionAuth(request);
      requireAdmin(auth);
      await createUser(request, response, auth);
      return true;
    }
  }

  const userMatch = matchPath(requestUrl.pathname, "/api/users/:id");
  if (userMatch.matched) {
    const auth = await requireSessionAuth(request);
    const id = parseId(userMatch.params.id, "User ID");

    if (method === "PATCH") {
      await updateUser(request, response, id, auth);
      return true;
    }

    if (method === "DELETE") {
      await deleteUser(response, id, auth);
      return true;
    }
  }

  if (requestUrl.pathname === "/api/companies") {
    if (method === "GET") {
      await listCompanies(response, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createCompany(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const companyMatch = matchPath(requestUrl.pathname, "/api/companies/:id");
  if (companyMatch.matched) {
    const id = parseId(companyMatch.params.id, "Company ID");

    if (method === "GET") {
      await getCompany(response, id, await requireSessionAuth(request));
      return true;
    }

    if (method === "PATCH") {
      await updateCompany(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }

    if (method === "DELETE") {
      await deleteCompany(response, id, await requireSessionAuth(request));
      return true;
    }
  }

  const companyMembersMatch = matchPath(
    requestUrl.pathname,
    "/api/companies/:id/members",
  );
  if (companyMembersMatch.matched) {
    const companyId = parseId(companyMembersMatch.params.id, "Company ID");

    if (method === "GET") {
      await listCompanyMembers(response, companyId, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createCompanyMember(
        request,
        response,
        companyId,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  const memberMatch = matchPath(
    requestUrl.pathname,
    "/api/company-members/:id",
  );
  if (memberMatch.matched && method === "DELETE") {
      await deleteCompanyMember(
        response,
        parseId(memberMatch.params.id, "Company member ID"),
      await requireSessionAuth(request),
    );
    return true;
  }

  if (requestUrl.pathname === "/api/locations") {
    if (method === "GET") {
      const companyId = requestUrl.searchParams.get("companyId")
        ? Number(requestUrl.searchParams.get("companyId"))
        : undefined;
      await listLocations(response, companyId, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createLocation(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  const companyLocationsMatch = matchPath(
    requestUrl.pathname,
    "/api/companies/:id/locations",
  );
  if (companyLocationsMatch.matched) {
    const companyId = parseId(companyLocationsMatch.params.id, "Company ID");

    if (method === "GET") {
      await listLocations(response, companyId, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createLocation(
        request,
        response,
        await requireSessionAuth(request),
        companyId,
      );
      return true;
    }
  }

  const locationMatch = matchPath(requestUrl.pathname, "/api/locations/:id");
  if (locationMatch.matched) {
    const id = parseId(locationMatch.params.id, "Location ID");

    if (method === "PATCH") {
      await updateLocation(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }

    if (method === "DELETE") {
      await deleteLocation(response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/listings") {
    if (method === "GET") {
      await listListings(
        response,
        requestUrl,
        await getOptionalSessionAuth(request),
      );
      return true;
    }

    if (method === "POST") {
      await createListing(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const interestMatch = matchPath(
    requestUrl.pathname,
    "/api/listings/:id/interest",
  );
  if (interestMatch.matched && method === "POST") {
    await recordListingInterest(
      request,
      response,
      parseId(interestMatch.params.id, "Listing ID"),
      await getOptionalSessionAuth(request),
    );
    return true;
  }

  if (requestUrl.pathname === "/api/files" && method === "POST") {
    await uploadFile(request, response, await requireSessionAuth(request));
    return true;
  }

  if (requestUrl.pathname === "/api/reports/summary" && method === "GET") {
    await getReportSummary(
      response,
      requestUrl,
      await requireSessionAuth(request),
    );
    return true;
  }

  if (requestUrl.pathname === "/api/stripe/webhook" && method === "POST") {
    await handleStripeWebhook(request, response);
    return true;
  }

  if (requestUrl.pathname === "/api/interest" && method === "GET") {
    await listInterestSummary(
      response,
      requestUrl,
      await requireSessionAuth(request),
    );
    return true;
  }

  if (requestUrl.pathname === "/api/wanted-listings") {
    if (method === "GET") {
      await listWantedListings(
        response,
        requestUrl,
        await getOptionalSessionAuth(request),
      );
      return true;
    }
    if (method === "POST") {
      await createWantedListing(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  const wantedMatch = matchPath(requestUrl.pathname, "/api/wanted-listings/:id");
  if (wantedMatch.matched && method === "PATCH") {
    await updateWantedListing(
      request,
      response,
      parseId(wantedMatch.params.id, "Wanted listing ID"),
      await requireSessionAuth(request),
    );
    return true;
  }

  if (requestUrl.pathname === "/api/saved-searches") {
    if (method === "GET") {
      await listSavedSearches(response, await requireSessionAuth(request));
      return true;
    }
    if (method === "POST") {
      await createSavedSearch(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  const savedSearchMatch = matchPath(
    requestUrl.pathname,
    "/api/saved-searches/:id",
  );
  if (savedSearchMatch.matched) {
    const id = parseId(savedSearchMatch.params.id, "Saved search ID");
    if (method === "PATCH") {
      await updateSavedSearch(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }
    if (method === "DELETE") {
      await deleteSavedSearch(response, id, await requireSessionAuth(request));
      return true;
    }
  }

  const listingMatch = matchPath(requestUrl.pathname, "/api/listings/:id");
  if (listingMatch.matched) {
    const id = parseId(listingMatch.params.id, "Listing ID");

    if (method === "GET") {
      await getListing(response, id, await getOptionalSessionAuth(request));
      return true;
    }

    if (method === "PATCH") {
      await updateListing(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }

    if (method === "DELETE") {
      await deleteListing(response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/listing-documents") {
    if (method === "GET") {
      await listListingDocuments(response, requestUrl);
      return true;
    }

    if (method === "POST") {
      await createListingDocument(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  const listingDocumentMatch = matchPath(
    requestUrl.pathname,
    "/api/listing-documents/:id",
  );
  if (listingDocumentMatch.matched) {
    const id = parseId(
      listingDocumentMatch.params.id,
      "Listing document ID",
    );

    if (method === "PATCH") {
      await updateListingDocument(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }

    if (method === "DELETE") {
      await deleteListingDocument(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  if (requestUrl.pathname === "/api/buyer-profiles") {
    if (method === "GET") {
      await listBuyerProfiles(response, requestUrl, await requireSessionAuth(request));
      return true;
    }
  }

  const buyerProfileMatch = matchPath(requestUrl.pathname, "/api/buyer-profiles/:id");
  if (buyerProfileMatch.matched) {
    const id = parseId(buyerProfileMatch.params.id, "Buyer profile ID");

    if (method === "PATCH") {
      await updateBuyerProfile(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/seller-profiles") {
    if (method === "GET") {
      await listSellerProfiles(response, requestUrl, await requireSessionAuth(request));
      return true;
    }
  }

  const sellerProfileMatch = matchPath(requestUrl.pathname, "/api/seller-profiles/:id");
  if (sellerProfileMatch.matched) {
    const id = parseId(sellerProfileMatch.params.id, "Seller profile ID");

    if (method === "PATCH") {
      await updateSellerProfile(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/quotes") {
    if (method === "GET") {
      await listQuotes(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createQuote(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const quoteMatch = matchPath(requestUrl.pathname, "/api/quotes/:id");
  if (quoteMatch.matched) {
    const id = parseId(quoteMatch.params.id, "Quote ID");

    if (method === "GET") {
      await getQuote(response, id, await requireSessionAuth(request));
      return true;
    }

    if (method === "PATCH") {
      await updateQuote(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/orders") {
    if (method === "GET") {
      await listOrders(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createOrder(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const orderMatch = matchPath(requestUrl.pathname, "/api/orders/:id");
  if (orderMatch.matched) {
    const id = parseId(orderMatch.params.id, "Order ID");

    if (method === "GET") {
      await getOrder(response, id, await requireSessionAuth(request));
      return true;
    }

    if (method === "PATCH") {
      await updateOrder(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/notifications") {
    if (method === "GET") {
      await listNotifications(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createNotification(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  const notificationMatch = matchPath(
    requestUrl.pathname,
    "/api/notifications/:id",
  );
  if (notificationMatch.matched) {
    const id = parseId(notificationMatch.params.id, "Notification ID");

    if (method === "PATCH") {
      await updateNotification(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  if (requestUrl.pathname === "/api/notification-preferences") {
    if (method === "GET") {
      await listNotificationPreferences(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createNotificationPreference(
        request,
        response,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  const notificationPreferenceMatch = matchPath(
    requestUrl.pathname,
    "/api/notification-preferences/:id",
  );
  if (notificationPreferenceMatch.matched) {
    const id = parseId(
      notificationPreferenceMatch.params.id,
      "Notification preference ID",
    );

    if (method === "PATCH") {
      await updateNotificationPreference(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }

    if (method === "DELETE") {
      await deleteNotificationPreference(
        request,
        response,
        id,
        await requireSessionAuth(request),
      );
      return true;
    }
  }

  if (requestUrl.pathname === "/api/carriers") {
    if (method === "GET") {
      await listCarriers(response);
      return true;
    }

    if (method === "POST") {
      await createCarrier(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const carrierMatch = matchPath(requestUrl.pathname, "/api/carriers/:id");
  if (carrierMatch.matched) {
    const id = parseId(carrierMatch.params.id, "Carrier ID");

    if (method === "PATCH") {
      await updateCarrier(request, response, id, await requireSessionAuth(request));
      return true;
    }

    if (method === "DELETE") {
      await deleteCarrier(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/shipments") {
    if (method === "GET") {
      await listShipments(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createShipment(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const shipmentMatch = matchPath(requestUrl.pathname, "/api/shipments/:id");
  if (shipmentMatch.matched) {
    const id = parseId(shipmentMatch.params.id, "Shipment ID");

    if (method === "PATCH") {
      await updateShipment(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/escrows") {
    if (method === "GET") {
      await listEscrows(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createEscrow(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const escrowMatch = matchPath(requestUrl.pathname, "/api/escrows/:id");
  if (escrowMatch.matched) {
    const id = parseId(escrowMatch.params.id, "Escrow ID");

    if (method === "GET") {
      await getEscrow(response, id, await requireSessionAuth(request));
      return true;
    }

    if (method === "PATCH") {
      await updateEscrow(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/payments") {
    if (method === "GET") {
      await listPayments(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createPayment(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const paymentMatch = matchPath(requestUrl.pathname, "/api/payments/:id");
  if (paymentMatch.matched) {
    const id = parseId(paymentMatch.params.id, "Payment ID");

    if (method === "GET") {
      await getPayment(response, id, await requireSessionAuth(request));
      return true;
    }

    if (method === "PATCH") {
      await updatePayment(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/payouts") {
    if (method === "GET") {
      await listPayouts(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createPayout(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const payoutMatch = matchPath(requestUrl.pathname, "/api/payouts/:id");
  if (payoutMatch.matched) {
    const id = parseId(payoutMatch.params.id, "Payout ID");

    if (method === "PATCH") {
      await updatePayout(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/contracts") {
    if (method === "GET") {
      await listContracts(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createContract(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const contractMatch = matchPath(requestUrl.pathname, "/api/contracts/:id");
  if (contractMatch.matched) {
    const id = parseId(contractMatch.params.id, "Contract ID");

    if (method === "PATCH") {
      await updateContract(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/signatures") {
    if (method === "GET") {
      await listSignatures(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createSignature(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const signatureMatch = matchPath(requestUrl.pathname, "/api/signatures/:id");
  if (signatureMatch.matched) {
    const id = parseId(signatureMatch.params.id, "Signature ID");

    if (method === "PATCH") {
      await updateSignature(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/disputes") {
    if (method === "GET") {
      await listDisputes(response, requestUrl, await requireSessionAuth(request));
      return true;
    }

    if (method === "POST") {
      await createDispute(request, response, await requireSessionAuth(request));
      return true;
    }
  }

  const disputeMatch = matchPath(requestUrl.pathname, "/api/disputes/:id");
  if (disputeMatch.matched) {
    const id = parseId(disputeMatch.params.id, "Dispute ID");

    if (method === "PATCH") {
      await updateDispute(request, response, id, await requireSessionAuth(request));
      return true;
    }
  }

  if (requestUrl.pathname === "/api/audit-logs" && method === "GET") {
    await listAuditLogs(
      request,
      response,
      requestUrl,
      await requireSessionAuth(request),
    );
    return true;
  }

  return false;
}
