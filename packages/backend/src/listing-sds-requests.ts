import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  ListingSdsRequestState,
  ListingSdsRequestResponse,
  ListingSdsRequestWriteResponse,
  SdsRequestNotificationSubject,
} from "../../shared/src/listing-sds-api.js";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParamsInTransaction as query,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, readJsonBody, sendJson, type AuthContext } from "./http.js";
import { usableListingDocumentSql } from "./listing-safety.js";

const subject: SdsRequestNotificationSubject = "SDS requested";
const int = (name: string, value: number): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
type Requested = Extract<ListingSdsRequestState, { status: "requested" }>;

export function sdsListingId(value: string): number {
  if (
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > 2147483647
  )
    throw new ApiError(400, "A positive listing ID is required.");
  return Number(value);
}

/** Validates against current relational membership, with no admin bypass. */
async function buyer(tx: sql.Transaction, auth: AuthContext): Promise<number> {
  if (!auth.companyId)
    throw new ApiError(403, "Active buyer company required.");
  const rows = await query(
    tx,
    `SELECT c.Id FROM dbo.CompanyMembers m WITH(HOLDLOCK)
    JOIN dbo.AccountStatuses ms WITH(HOLDLOCK) ON ms.Id=m.MemberStatusId
    JOIN dbo.Companies c WITH(HOLDLOCK) ON c.Id=m.CompanyId
    JOIN dbo.CompanyTypes ct WITH(HOLDLOCK) ON ct.Id=c.CompanyTypeId
    JOIN dbo.AccountStatuses cs WITH(HOLDLOCK) ON cs.Id=c.VerificationStatusId
    WHERE m.UserId=@user AND m.CompanyId=@buyer AND ms.Code='active'
      AND ct.Code IN ('buyer','both') AND cs.Code NOT IN ('inactive','suspended')`,
    [int("user", auth.userId), int("buyer", auth.companyId)],
  );
  if (!rows.length)
    throw new ApiError(403, "Active buyer company membership required.");
  return auth.companyId;
}

async function context(
  tx: sql.Transaction,
  auth: AuthContext,
  listingId: number,
) {
  // Same first lock as document writers: concurrent upload/delete and retries serialize.
  const rows = await query<{ sellerCompanyId: number; title: string }>(
    tx,
    `SELECT l.SellerCompanyId AS sellerCompanyId,l.Title AS title FROM dbo.Listings l WITH(UPDLOCK,HOLDLOCK)
     JOIN dbo.ListingStatuses ls WITH(HOLDLOCK) ON ls.Id=l.ListingStatusId
     JOIN dbo.Companies c WITH(HOLDLOCK) ON c.Id=l.SellerCompanyId
     JOIN dbo.AccountStatuses vs WITH(HOLDLOCK) ON vs.Id=c.VerificationStatusId
     WHERE l.Id=@listing AND ls.Code='published' AND vs.Code<>'inactive'`,
    [int("listing", listingId)],
  );
  const companyId = await buyer(tx, auth);
  const listing = rows[0];
  if (!listing) throw new ApiError(404, "Listing not found.");
  if (listing.sellerCompanyId === companyId)
    throw new ApiError(
      403,
      "You cannot request SDS for your own company's listing.",
    );
  const docs = await query(
    tx,
    `SELECT TOP(1) d.Id FROM dbo.ListingDocuments d WITH(HOLDLOCK)
     JOIN dbo.DocumentTypes t ON t.Id=d.DocumentTypeId
     WHERE d.ListingId=@listing AND t.Code='sds' AND d.DeletedAt IS NULL AND ${usableListingDocumentSql}`,
    [int("listing", listingId)],
  );
  return {
    companyId,
    sellerCompanyId: listing.sellerCompanyId,
    title: listing.title,
    available: docs.length > 0,
  };
}

async function existing(
  tx: sql.Transaction,
  listingId: number,
  companyId: number,
): Promise<Requested | undefined> {
  const rows = await query<{ id: number; requestedAt: Date }>(
    tx,
    `SELECT Id AS id,RequestedAt AS requestedAt FROM dbo.ListingSdsRequests WITH(UPDLOCK,HOLDLOCK)
     WHERE ListingId=@listing AND BuyerCompanyId=@buyer`,
    [int("listing", listingId), int("buyer", companyId)],
  );
  const row = rows[0];
  return row
    ? {
        status: "requested",
        listingId,
        id: row.id,
        requestedAt: row.requestedAt.toISOString(),
      }
    : undefined;
}

export async function readListingSdsRequest(
  auth: AuthContext,
  listingId: number,
): Promise<ListingSdsRequestState> {
  return runInTransaction(async (tx) => {
    const state = await context(tx, auth, listingId);
    if (state.available) return { status: "available", listingId };
    return (
      (await existing(tx, listingId, state.companyId)) ?? {
        status: "not_requested",
        listingId,
      }
    );
  });
}

export async function createListingSdsRequest(
  auth: AuthContext,
  listingId: number,
): Promise<Omit<ListingSdsRequestWriteResponse, "ok">> {
  return runInTransaction(async (tx) => {
    const state = await context(tx, auth, listingId);
    if (state.available)
      throw new ApiError(
        409,
        "The seller SDS is already available. Refresh the listing.",
      );
    const prior = await existing(tx, listingId, state.companyId);
    if (prior) return { created: false, sdsRequest: prior };
    const notifications = await query<{ id: number }>(
      tx,
      `DECLARE @created TABLE(id INT);
       INSERT dbo.Notifications(CompanyId,NotificationChannelId,NotificationCategoryId,NotificationStatusId,
        RelatedRecordTypeId,RelatedRecordId,Subject,Body,SentAt,CreatedByUserId,UpdatedByUserId)
       OUTPUT INSERTED.Id INTO @created
       SELECT @seller,ch.Id,cat.Id,st.Id,rt.Id,@listing,@subject,@body,
         SYSUTCDATETIME(),@user,@user
       FROM dbo.NotificationChannels ch CROSS JOIN dbo.NotificationCategories cat
       CROSS JOIN dbo.NotificationStatuses st CROSS JOIN dbo.RecordTypes rt
       WHERE ch.Code='in_app' AND cat.Code='compliance' AND st.Code='sent' AND rt.Code='listing'
         AND ch.IsActive=1 AND cat.IsActive=1 AND st.IsActive=1 AND rt.IsActive=1;
       SELECT id FROM @created`,
      [
        int("seller", state.sellerCompanyId),
        int("listing", listingId),
        int("user", auth.userId),
        { name: "subject", value: subject, type: sql.NVarChar(240) },
        {
          name: "body",
          value: `A buyer requested the safety data sheet for "${state.title}" (listing #${listingId}). Upload the seller SDS from the listing editor.`,
          type: sql.NVarChar(sql.MAX),
        },
      ],
    );
    if (notifications.length !== 1 || !notifications[0])
      throw new Error("SDS request notification could not be persisted.");
    const rows = await query<{ id: number; requestedAt: Date }>(
      tx,
      `DECLARE @created TABLE(id INT,requestedAt DATETIME2);
       INSERT dbo.ListingSdsRequests(ListingId,BuyerCompanyId,RequestedByUserId,NotificationId)
       OUTPUT INSERTED.Id,INSERTED.RequestedAt INTO @created VALUES(@listing,@buyer,@user,@notification);
       SELECT id,requestedAt FROM @created`,
      [
        int("listing", listingId),
        int("buyer", state.companyId),
        int("user", auth.userId),
        int("notification", notifications[0].id),
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("SDS request could not be persisted.");
    return {
      created: true,
      sdsRequest: {
        status: "requested",
        listingId,
        id: row.id,
        requestedAt: row.requestedAt.toISOString(),
      },
    };
  });
}

export function createListingSdsRequestHandler(
  authenticate = requireSessionAuth,
  repository = { readListingSdsRequest, createListingSdsRequest },
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    url: URL,
  ): Promise<boolean> => {
    const match = /^\/api\/listings\/([^/]+)\/sds-request$/.exec(url.pathname);
    if (!match) return false;
    response.setHeader("cache-control", "private, no-store");
    const auth = await authenticate(request);
    const listingId = sdsListingId(match[1]!);
    if (request.method === "GET") {
      const body: ListingSdsRequestResponse = {
        ok: true,
        sdsRequest: await repository.readListingSdsRequest(auth, listingId),
      };
      sendJson(response, 200, body);
    } else if (request.method === "POST") {
      if (Object.keys(await readJsonBody(request)).length)
        throw new ApiError(400, "SDS requests do not accept fields.");
      const result = await repository.createListingSdsRequest(auth, listingId);
      const body: ListingSdsRequestWriteResponse = { ok: true, ...result };
      sendJson(response, result.created ? 201 : 200, body);
    } else throw new ApiError(405, "Method not allowed.");
    return true;
  };
}
export const handleListingSdsRequestRoute = createListingSdsRequestHandler();
