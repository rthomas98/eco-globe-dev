import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as txQuery,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, readJsonBody, sendJson } from "./http.js";
import { sameQuantityUnit } from "./quantity-units.js";
const p = (
  name: string,
  value: unknown,
  type: QueryParameter["type"] = sql.Int,
): QueryParameter => ({ name, value, type });
export async function handleRfqRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  const match = url.pathname.match(
    /^\/api\/wanted-listings\/(\d+)\/responses$/,
  );
  if (!match) return false;
  const auth = await requireSessionAuth(request),
    wantedId = Number(match[1]);
  if (!auth.companyId && !auth.isAdmin)
    throw new ApiError(403, "Active company required.");
  const wanted = (
    await query<{
      buyer: number;
      isOpen: boolean;
      unit: string;
      material: number;
    }>(
      `SELECT BuyerCompanyId AS buyer,IsOpen AS isOpen,QuantityUnit AS unit,MaterialTypeId AS material FROM dbo.WantedListings WHERE Id=@id`,
      [p("id", wantedId)],
    )
  )[0];
  if (!wanted) throw new ApiError(404, "Request not found.");
  if (request.method === "GET") {
    const responses = await query(
      `SELECT q.Id AS id,q.ListingId AS listingId,l.Title AS listingTitle,q.SellerCompanyId AS sellerCompanyId,c.LegalName AS sellerCompanyName,q.Quantity AS quantity,q.QuantityUnit AS quantityUnit,q.UnitPrice AS unitPrice,q.CurrencyCode AS currencyCode,q.DeliveryTerms AS deliveryTerms,q.ExpiresAt AS expiresAt,s.Code AS quoteStatusCode,q.CreatedAt AS createdAt FROM dbo.Quotes q JOIN dbo.Listings l ON l.Id=q.ListingId JOIN dbo.Companies c ON c.Id=q.SellerCompanyId JOIN dbo.QuoteStatuses s ON s.Id=q.QuoteStatusId WHERE q.WantedListingId=@id AND (@admin=1 OR q.BuyerCompanyId=@company OR q.SellerCompanyId=@company) ORDER BY q.Id DESC`,
      [
        p("id", wantedId),
        p("company", auth.companyId),
        p("admin", auth.isAdmin ? 1 : 0),
      ],
    );
    sendJson(response, 200, { ok: true, responses });
    return true;
  }
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  if (!wanted.isOpen || wanted.buyer === auth.companyId)
    throw new ApiError(409, "Respond to an open request from another company.");
  const body = await readJsonBody(request),
    listingId = Number(body.listingId),
    quantity = body.quantity,
    unitPrice = body.unitPrice;
  if (
    !Number.isSafeInteger(listingId) ||
    listingId < 1 ||
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    Math.round(quantity * 1000) / 1000 !== quantity ||
    typeof unitPrice !== "number" ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0 ||
    Math.round(unitPrice * 100) / 100 !== unitPrice
  )
    throw new ApiError(
      400,
      "Valid listing, positive quantity and unit price are required.",
    );
  const terms =
    typeof body.deliveryTerms === "string" ? body.deliveryTerms.trim() : null;
  if (terms && terms.length > 500)
    throw new ApiError(400, "Delivery terms are too long.");
  const expires =
    typeof body.expiresAt === "string" ? new Date(body.expiresAt) : null;
  if (
    expires &&
    (!Number.isFinite(expires.getTime()) || expires.getTime() <= Date.now())
  )
    throw new ApiError(400, "Expiry must be in the future.");
  const quote = await runInTransaction(async (tx) => {
    const current = await txQuery(
      tx,
      "SELECT Id FROM dbo.WantedListings WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND IsOpen=1 AND BuyerCompanyId=@buyer",
      [p("id", wantedId), p("buyer", wanted.buyer)],
    );
    if (!current.length) throw new ApiError(409, "Request is no longer open.");
    const listing = (
      await txQuery<{
        seller: number;
        unit: string;
        currency: string;
        quantity: number;
        minimum: number;
        material: number;
      }>(
        tx,
        `SELECT l.SellerCompanyId AS seller,l.QuantityUnit AS unit,l.CurrencyCode AS currency,l.Quantity AS quantity,l.MinimumOrderQuantity AS minimum,l.MaterialTypeId AS material FROM dbo.Listings l WITH(UPDLOCK,HOLDLOCK) JOIN dbo.ListingStatuses s ON s.Id=l.ListingStatusId WHERE l.Id=@id AND s.Code='published'`,
        [p("id", listingId)],
      )
    )[0];
    if (!listing || listing.seller !== auth.companyId)
      throw new ApiError(
        403,
        "Use a published listing owned by your active company.",
      );
    const permission = await txQuery(
      tx,
      `SELECT m.Id FROM dbo.CompanyMembers m JOIN dbo.MemberRoles r ON r.Id=m.MemberRoleId JOIN dbo.AccountStatuses s ON s.Id=m.MemberStatusId JOIN dbo.Companies c ON c.Id=m.CompanyId WHERE m.UserId=@user AND m.CompanyId=@company AND s.Code='active' AND c.VerificationStatusId NOT IN (SELECT Id FROM dbo.AccountStatuses WHERE Code IN ('inactive','suspended')) AND (r.Code IN ('owner','admin') OR m.CanExecuteTransactions=1)`,
      [p("user", auth.userId), p("company", auth.companyId)],
    );
    if (!permission.length)
      throw new ApiError(403, "Transaction permission required.");
    if (
      quantity < Number(listing.minimum) ||
      quantity > Number(listing.quantity) ||
      listing.material !== wanted.material ||
      !sameQuantityUnit(listing.unit, wanted.unit)
    )
      throw new ApiError(
        400,
        "Listing material, unit and available quantity must match the request.",
      );
    const rows = await txQuery(
      tx,
      `INSERT dbo.Quotes(WantedListingId,ListingId,BuyerCompanyId,SellerCompanyId,Quantity,QuantityUnit,UnitPrice,CurrencyCode,DeliveryTerms,QuoteStatusId,ExpiresAt,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id AS id VALUES(@wanted,@listing,@buyer,@seller,@quantity,@unit,@price,@currency,@terms,(SELECT Id FROM dbo.QuoteStatuses WHERE Code='sent'),@expires,@user,@user)`,
      [
        p("wanted", wantedId),
        p("listing", listingId),
        p("buyer", wanted.buyer),
        p("seller", listing.seller),
        p("quantity", quantity, sql.Decimal(18, 3)),
        p("unit", listing.unit, sql.VarChar(40)),
        p("price", unitPrice, sql.Decimal(18, 2)),
        p("currency", listing.currency, sql.Char(3)),
        p("terms", terms, sql.NVarChar(500)),
        p("expires", expires, sql.DateTime2),
        p("user", auth.userId),
      ],
    );
    return rows[0];
  });
  sendJson(response, 201, { ok: true, quote });
  return true;
}
