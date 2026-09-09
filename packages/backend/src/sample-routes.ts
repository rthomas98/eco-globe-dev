/** Minimal sample workflow port from live 01a0e593, hardened at the existing API boundary. */
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as txQuery,
  runInTransaction,
  sql,
} from "./database.js";
import { ApiError, readJsonBody, sendJson } from "./http.js";
import {
  int,
  text,
  bit,
  hash,
  publishedListing,
  requireCompany,
  notifySampleCompany,
} from "./lab-routes.js";
import { positiveId, string, exactKeys, choice } from "./lab-validation.js";
export function validateSample(value: Record<string, unknown>) {
  exactKeys(value, [
    "listingId",
    "quantityLb",
    "note",
    "deliveryAddress",
    "idempotencyKey",
  ]);
  const quantity = value.quantityLb ?? 5;
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity < 1 ||
    quantity > 50 ||
    Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.00001
  )
    throw new ApiError(
      400,
      "Sample quantity must be 1..50 lb with at most two decimals.",
    );
  const key =
    value.idempotencyKey === undefined
      ? randomUUID()
      : string(value.idempotencyKey, 100);
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key))
    throw new ApiError(400, "Invalid idempotency key.");
  return {
    listingId: positiveId(value.listingId),
    quantityLb: quantity,
    note: string(value.note ?? "", 500, true),
    deliveryAddress: string(value.deliveryAddress ?? "", 400, true),
    idempotencyKey: key,
  };
}
const transitions: Record<string, readonly string[]> = {
  requested: ["accepted", "declined"],
  accepted: ["shipped", "declined"],
  declined: [],
  shipped: ["received"],
  received: [],
};
export function validateSampleTransition(
  from: string,
  to: string,
  party: "buyer" | "seller" | "admin",
) {
  if (!transitions[from]?.includes(to))
    throw new ApiError(409, "Invalid sample status transition.");
  if (party !== "admin" && party !== (to === "received" ? "buyer" : "seller"))
    throw new ApiError(
      403,
      "This transition belongs to the other sample party.",
    );
}
export async function handleSampleRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  const path = url.pathname,
    match = /^\/api\/sample-requests\/(\d+)$/.exec(path);
  if (path !== "/api/sample-requests" && !match) return false;
  const auth = await requireSessionAuth(request);
  response.setHeader("cache-control", "private, no-store");
  if (path === "/api/sample-requests" && request.method === "GET") {
    const samples = await query(
      `SELECT TOP(200) sr.Id AS id,sr.ListingId AS listingId,l.Title AS listingTitle,l.Slug AS listingSlug,sr.BuyerCompanyId AS buyerCompanyId,bc.LegalName AS buyerCompanyName,l.SellerCompanyId AS sellerCompanyId,sc.LegalName AS sellerCompanyName,sr.QuantityLb AS quantityLb,sr.Note AS note,sr.DeliveryAddress AS deliveryAddress,sr.Status AS status,sr.SellerResponse AS sellerResponse,sr.TrackingNumber AS trackingNumber,sr.ConvertedOrderId AS convertedOrderId,sr.CreatedAt AS createdAt,sr.UpdatedAt AS updatedAt FROM dbo.SampleRequests sr JOIN dbo.Listings l ON l.Id=sr.ListingId JOIN dbo.Companies bc ON bc.Id=sr.BuyerCompanyId JOIN dbo.Companies sc ON sc.Id=l.SellerCompanyId WHERE @admin=1 OR sr.BuyerCompanyId=@company OR l.SellerCompanyId=@company ORDER BY sr.Id DESC`,
      [bit("admin", auth.isAdmin), int("company", auth.companyId)],
    );
    sendJson(response, 200, { ok: true, samples });
    return true;
  }
  if (path === "/api/sample-requests" && request.method === "POST") {
    const company = requireCompany(auth),
      b = validateSample(await readJsonBody(request)),
      payloadHash = hash(b);
    const result = await runInTransaction(async (tx) => {
      const exec = (s: string, p: Parameters<typeof query>[1] = []) =>
        txQuery(tx, s, p);
      await exec(
        "DECLARE @result INT; EXEC @result=sp_getapplock @Resource=@key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @result<0 THROW 50001,'Sample retry lock unavailable',1;",
        [text("key", `sample:${company}:${b.idempotencyKey}`)],
      );
      const old = (
        await exec(
          "SELECT Id AS id,ListingId AS listingId,Status AS status,PayloadHash AS payloadHash FROM dbo.SampleRequests WHERE BuyerCompanyId=@company AND IdempotencyKey=@key",
          [int("company", company), text("key", b.idempotencyKey)],
        )
      )[0];
      if (old) {
        if (old.payloadHash !== payloadHash)
          throw new ApiError(
            409,
            "Idempotency key reused with different data.",
          );
        return {
          created: false,
          sample: { id: old.id, listingId: old.listingId, status: old.status },
        };
      }
      const listing = await publishedListing(b.listingId, exec, true);
      if (listing.sellerCompanyId === company)
        throw new ApiError(403, "Cannot request your own listing.");
      const row = (
        await exec(
          `INSERT dbo.SampleRequests(ListingId,BuyerCompanyId,RequestedByUserId,QuantityLb,Note,DeliveryAddress,UpdatedByUserId,IdempotencyKey,PayloadHash) OUTPUT INSERTED.Id AS id,INSERTED.ListingId AS listingId,INSERTED.Status AS status VALUES(@listing,@company,@actor,@quantity,@note,@address,@actor,@key,@hash)`,
          [
            int("listing", b.listingId),
            int("company", company),
            int("actor", auth.userId),
            { name: "quantity", type: sql.Decimal(10, 2), value: b.quantityLb },
            text("note", b.note),
            text("address", b.deliveryAddress),
            text("key", b.idempotencyKey),
            text("hash", payloadHash),
          ],
        )
      )[0];
      await notifySampleCompany(
        exec,
        auth.userId,
        Number(listing.sellerCompanyId),
        b.listingId,
        "Sample request received",
        `Sample ${row?.id} for ${listing.title} is ready for your review in Sales. No shipment has been booked.`,
      );
      return { created: true, sample: row };
    });
    sendJson(response, result.created ? 201 : 200, {
      ok: true,
      sample: result.sample,
    });
    return true;
  }
  if (match && request.method === "PATCH") {
    const id = positiveId(Number(match[1])),
      b = await readJsonBody(request);
    exactKeys(b, [
      "status",
      "sellerResponse",
      "trackingNumber",
      "convertedOrderId",
    ]);
    const status =
      b.status === undefined
        ? null
        : choice(b.status, [
            "requested",
            "accepted",
            "declined",
            "shipped",
            "received",
          ]);
    const sellerResponse =
        b.sellerResponse === undefined
          ? null
          : string(b.sellerResponse, 500, true),
      tracking =
        b.trackingNumber === undefined
          ? null
          : string(b.trackingNumber, 160, true),
      orderId =
        b.convertedOrderId === undefined
          ? null
          : positiveId(b.convertedOrderId);
    const sample = await runInTransaction(async (tx) => {
      const exec = (s: string, p: Parameters<typeof query>[1] = []) =>
        txQuery(tx, s, p);
      const row = (
        await exec(
          "SELECT sr.Id AS id,sr.ListingId AS listingId,sr.BuyerCompanyId AS buyerCompanyId,l.SellerCompanyId AS sellerCompanyId,sr.Status AS status,sr.ConvertedOrderId AS convertedOrderId FROM dbo.SampleRequests sr WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Listings l ON l.Id=sr.ListingId WHERE sr.Id=@id",
          [int("id", id)],
        )
      )[0];
      if (!row) throw new ApiError(404, "Sample not found.");
      const party = auth.isAdmin
        ? "admin"
        : auth.companyId === row.buyerCompanyId
          ? "buyer"
          : auth.companyId === row.sellerCompanyId
            ? "seller"
            : null;
      if (!party) throw new ApiError(404, "Sample not found.");
      if (status) validateSampleTransition(String(row.status), status, party);
      if ((sellerResponse !== null || tracking !== null) && party === "buyer")
        throw new ApiError(403, "Seller fields cannot be changed by buyers.");
      if (orderId !== null) {
        if (party === "seller")
          throw new ApiError(
            403,
            "Only buyer or internal staff can link an order.",
          );
        if (row.convertedOrderId || String(row.status) !== "received")
          throw new ApiError(
            409,
            "Only an unconverted received sample can link an order.",
          );
        if (
          !(
            await exec(
              "SELECT Id FROM dbo.Orders WHERE Id=@order AND BuyerCompanyId=@company AND ListingId=@listing",
              [
                int("order", orderId),
                int("company", row.buyerCompanyId),
                int("listing", row.listingId),
              ],
            )
          ).length
        )
          throw new ApiError(
            400,
            "Order must belong to the sample buyer and exact listing.",
          );
      }
      const updated = (
        await exec(
          "UPDATE dbo.SampleRequests SET Status=COALESCE(@status,Status),SellerResponse=COALESCE(@response,SellerResponse),TrackingNumber=COALESCE(@tracking,TrackingNumber),ConvertedOrderId=COALESCE(@order,ConvertedOrderId),UpdatedByUserId=@actor,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.Id AS id,INSERTED.Status AS status WHERE Id=@id",
          [
            int("id", id),
            text("status", status),
            text("response", sellerResponse),
            text("tracking", tracking),
            int("order", orderId),
            int("actor", auth.userId),
          ],
        )
      )[0];
      if (status)
        await notifySampleCompany(
          exec,
          auth.userId,
          Number(
            status === "received" ? row.sellerCompanyId : row.buyerCompanyId,
          ),
          Number(row.listingId),
          "Sample request updated",
          `Sample ${id} is now ${status}. Review the sample request for details.`,
        );
      return updated;
    });
    sendJson(response, 200, { ok: true, sample });
    return true;
  }
  throw new ApiError(405, "Method not allowed.");
}
