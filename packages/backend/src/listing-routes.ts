import { insertDraftListing, listingSlug } from "./listing-write.js";
import { seller } from "./listing-seller.js";
import { listingText as text, listingNumeric as numeric, validateSpecifications } from "./listing-validation.js";
export { validateSpecifications } from "./listing-validation.js";
import { hasDemoEstimateMarker } from "../../shared/src/demo-estimates.mjs";
import { usableListingDocumentSql } from "./listing-safety.js";
import { enqueueListingReview, auditListingLifecycle } from "./staff-alerts.js";
import { handleListingSdsRequestRoute } from "./listing-sds-requests.js";
import { portfolioId } from "./market-portfolio-domain.js";
import { requirePortfolioAccess } from "./market-portfolio-store.js";
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getOptionalSessionAuth, requireSessionAuth } from "./auth.js";
import { parseListingRadius, withinListingRadius } from "./listing-radius.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import {
  ApiError,
  type AuthContext,
  readJsonBody,
  sendJson,
  corsHeaders,
} from "./http.js";

const int = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.Int,
  value,
});
const str = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.NVarChar(sql.MAX),
  value,
});
const number = (name: string, value: unknown, scale = 3): QueryParameter => ({
  name,
  type: sql.Decimal(18, scale),
  value,
});
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "Expected an object.");
  return value as Record<string, unknown>;
}
function id(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new ApiError(400, "A positive numeric ID is required.");
  return value;
}
const selectListing = `SELECT l.Id AS id,l.SellerCompanyId AS sellerCompanyId,c.LegalName AS sellerCompanyName,
 vs.Code AS sellerVerificationStatusCode,l.LocationId AS locationId,l.Title AS title,l.Slug AS slug,
 mt.Code AS materialTypeCode,l.Quantity AS quantity,l.QuantityUnit AS quantityUnit,l.MinimumOrderQuantity AS minimumOrderQuantity,
 l.PricePerUnit AS pricePerUnit,l.CurrencyCode AS currencyCode,ls.Code AS listingStatusCode,l.CarbonIntensityKgCo2e AS carbonIntensityKgCo2e,
 l.Description AS description,l.SpecificationsJson AS specificationsJson,
 (SELECT TOP (1) CASE WHEN d.Content IS NOT NULL THEN CONCAT('/api/listing-documents/',d.Id,'/download') ELSE d.FileUrl END
  FROM dbo.ListingDocuments d JOIN dbo.DocumentTypes dt ON dt.Id=d.DocumentTypeId
  WHERE d.ListingId=l.Id AND d.DeletedAt IS NULL AND dt.Code='photo'
  AND (d.Content IS NOT NULL OR NULLIF(LTRIM(RTRIM(d.FileUrl)),'') IS NOT NULL) ORDER BY d.Id) AS listingImageUrl,
 loc.Name AS locationName,loc.AddressLine1 AS addressLine1,loc.AddressLine2 AS addressLine2,loc.City AS city,
 loc.StateProvince AS stateProvince,loc.PostalCode AS postalCode,loc.CountryCode AS countryCode,loc.Latitude AS latitude,loc.Longitude AS longitude
 FROM dbo.Listings l JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses vs ON vs.Id=c.VerificationStatusId
 LEFT JOIN dbo.Locations loc ON loc.Id=l.LocationId JOIN dbo.MaterialTypes mt ON mt.Id=l.MaterialTypeId JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId`;
async function documents(listingId: unknown) {
  return documentsForListings([listingId]);
}
async function documentsForListings(listingIds: unknown[]) {
  if (!listingIds.length) return [];
  return query(
    `SELECT d.Id AS id,d.ListingId AS listingId,dt.Code AS documentTypeCode,d.FileName AS fileName,
    d.ContentType AS contentType,d.ByteLength AS byteLength,d.Sha256 AS sha256,
    CASE WHEN DATALENGTH(d.Content)>0 THEN CONCAT('/api/listing-documents/',d.Id,'/download') ELSE d.FileUrl END AS fileUrl,vs.Code AS verificationStatusCode
    FROM dbo.ListingDocuments d JOIN dbo.DocumentTypes dt ON dt.Id=d.DocumentTypeId JOIN dbo.AccountStatuses vs ON vs.Id=d.VerificationStatusId
    WHERE d.ListingId IN (SELECT value FROM OPENJSON(@listingIds)) AND d.DeletedAt IS NULL AND ${usableListingDocumentSql} ORDER BY CASE WHEN dt.Code='sds' THEN 0 ELSE 1 END,d.Id`,
    [str("listingIds", JSON.stringify(listingIds))],
  );
}
async function project(row: Record<string, unknown>, listingDocuments?: Record<string, unknown>[]) {
  const {
    specificationsJson,
    locationName,
    addressLine1,
    addressLine2,
    city,
    stateProvince,
    postalCode,
    countryCode,
    latitude,
    longitude,
    ...listing
  } = row;
  return {
    ...listing,
    teaser: false,
    locationCity: city, locationStateProvince: stateProvince, locationCountryCode: countryCode,
    locationLatitude: latitude, locationLongitude: longitude,
    sellerVerified: row.sellerVerificationStatusCode === "verified",
    specifications:
      typeof specificationsJson === "string"
        ? JSON.parse(specificationsJson)
        : {},
    location: {
      id: row.locationId,
      name: locationName,
      addressLine1,
      addressLine2,
      city,
      stateProvince,
      postalCode,
      countryCode,
      latitude,
      longitude,
    },
    documents: listingDocuments ?? await documents(row.id),
  };
}
export function listingForViewer<T extends Record<string, unknown>>(listing: T, viewer?: AuthContext) {
  if (viewer && (viewer.isAdmin || viewer.companyId)) return { ...listing, teaser: false };
  const quantity = Number(listing.quantity);
  const magnitude = quantity > 0 ? 10 ** Math.floor(Math.log10(quantity)) : 1;
  const location = listing.location as Record<string, unknown> | undefined;
  return { ...listing, teaser: true, sellerCompanyId: null, sellerCompanyName: null,
    locationId: null, minimumOrderQuantity: null, pricePerUnit: null,
    quantity: listing.quantity !== null && listing.quantity !== undefined && Number.isFinite(quantity) ? Math.round(quantity / magnitude) * magnitude : null,
    description: typeof listing.description === "string" ? listing.description.slice(0, 140) : null,
    specifications: {}, documents: [], locationCity: null, locationLatitude: null, locationLongitude: null,
    location: { ...location, id: null, name: null, addressLine1: null, addressLine2: null, city: null, postalCode: null, latitude: null, longitude: null },
  };
}
async function readListing(
  key: string,
  auth?: AuthContext,
  transaction?: sql.Transaction,
) {
  const numericKey = /^\d+$/.test(key);
  if (
    numericKey &&
    (!Number.isSafeInteger(Number(key)) ||
      Number(key) < 1 ||
      Number(key) > 2147483647)
  )
    throw new ApiError(404, "Listing not found.");
  if (!numericKey && key.length > 180)
    throw new ApiError(404, "Listing not found.");
  const statement =
    (transaction
      ? selectListing.replace(
          "dbo.Listings l",
          "dbo.Listings l WITH (UPDLOCK,HOLDLOCK)",
        )
      : selectListing) +
    (numericKey ? " WHERE l.Id=@key AND " : " WHERE l.Slug=@key AND ") +
    (auth
      ? "(l.SellerCompanyId=@companyId OR @admin=1)"
      : "ls.Code='published' AND vs.Code <> 'inactive'");
  const parameters = [
    numericKey
      ? int("key", Number(key))
      : { name: "key", type: sql.VarChar(180), value: key },
    int("companyId", auth?.companyId),
    int("admin", auth?.isAdmin ? 1 : 0),
  ];
  const rows = transaction
    ? await queryRowsWithParamsInTransaction(transaction, statement, parameters)
    : await query(statement, parameters);
  if (!rows[0]) throw new ApiError(404, "Listing not found.");
  return rows[0];
}
async function save(
  request: IncomingMessage,
  response: ServerResponse,
  key?: string,
  onPublished?: (id: number, actor: number) => Promise<void>,
) {
  const auth = await requireSessionAuth(request);
  const body = object(await readJsonBody(request));
  const savedId = await runInTransaction(async (transaction) => {
    const previous = key
      ? await readListing(key, auth, transaction)
      : undefined;
    const allowed = [
      "sellerCompanyId",
      "locationId",
      "title",
      "materialTypeCode",
      "quantity",
      "quantityUnit",
      "minimumOrderQuantity",
      "pricePerUnit",
      "currencyCode",
      "listingStatusCode",
      "carbonIntensityKgCo2e",
      "description",
      "specifications",
    ];
    for (const key of Object.keys(body))
      if (!allowed.includes(key))
        throw new ApiError(400, `Unknown listing field ${key}.`);
    const merged = { ...previous, ...body };
    const companyId = id(merged.sellerCompanyId);
    if (previous && companyId !== previous.sellerCompanyId)
      throw new ApiError(400, "Seller company cannot change.");
    await seller(auth, companyId);
    if (previous?.listingStatusCode === "closed" &&
      Object.keys(body).length === 1 && body.listingStatusCode === "draft") {
      // A restore changes lifecycle only; retain legacy blanks and raw metadata.
      await queryRowsWithParamsInTransaction(transaction,
        `UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='draft'),UpdatedByUserId=@userId,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`,
        [int("userId", auth.userId), int("id", previous.id)]);
      await auditListingLifecycle(transaction, auth, id(previous.id), "closed", "draft");
      return previous.id;
    }
    const title = text(merged.title, "title", 200);
    if (!title) throw new ApiError(400, "title is required.");
    let status = text(merged.listingStatusCode, "listingStatusCode") ?? "draft";
    if (
      !["draft", "pending_review", "published", "paused", "closed"].includes(
        status,
      )
    )
      throw new ApiError(400, "Invalid listing status.");
    if (!auth.isAdmin && status === "published") {
      if (body.listingStatusCode === "published")
        throw new ApiError(403, "Only admins may publish.");
      status = "pending_review";
    }
    if (!["draft", "closed"].includes(status) && hasDemoEstimateMarker(merged.description))
      throw new ApiError(400, "Replace demo estimates and remove the demo estimate note before submitting this listing.");
    const locationId = merged.locationId == null ? null : id(merged.locationId);
    if (locationId === null && !["draft", "closed"].includes(status))
      throw new ApiError(400, "Submission requires an owned pickup location.");
    if (locationId !== null) {
      const location = await queryRowsWithParamsInTransaction(transaction,
        "SELECT Id FROM dbo.Locations WITH(HOLDLOCK) WHERE Id=@id AND CompanyId=@companyId",
        [int("id", locationId), int("companyId", companyId)]);
      if (!location.length) throw new ApiError(403, "Location must belong to seller company.");
    }
    const quantity = numeric(merged.quantity, "quantity", 3),
      moq = numeric(merged.minimumOrderQuantity, "minimumOrderQuantity", 3),
      price = numeric(merged.pricePerUnit, "pricePerUnit", 2);
    if (quantity !== null && moq !== null && moq > quantity)
      throw new ApiError(400, "MOQ cannot exceed available quantity.");
    const unit = text(merged.quantityUnit, "quantityUnit", 40);
    if (unit && !["ton", "tons", "tonne", "tonnes", "kg", "lb", "unit", "units"].includes(unit))
      throw new ApiError(400, "Unsupported quantity unit.");
    const currency =
      text(merged.currencyCode, "currencyCode", 3)?.toUpperCase() ?? null;
    if (currency && !/^[A-Z]{3}$/.test(currency))
      throw new ApiError(400, "currencyCode must be three letters.");
    if (["pending_review", "published"].includes(status)) {
      if (
        quantity === null ||
        quantity <= 0 ||
        moq === null ||
        moq <= 0 ||
        price === null ||
        !unit ||
        !currency
      )
        throw new ApiError(
          400,
          "Submission requires positive quantity and MOQ, price, currency and unit.",
        );
      const docs = previous ? await documents(previous.id) : [];
      if (!docs.some((row) => row.documentTypeCode === "sds"))
        throw new ApiError(400, "Upload an SDS PDF before submitting.");
    }
    const specifications = validateSpecifications(
      "specifications" in body
        ? body.specifications
        : previous?.specificationsJson
          ? JSON.parse(String(previous.specificationsJson))
          : {},
    );
    const material = text(merged.materialTypeCode, "materialTypeCode");
    if (!material)
      throw new ApiError(
        400,
        "Choose a materialTypeCode before saving a listing.",
      );
    const lookups = await query(
      "SELECT (SELECT Id FROM dbo.MaterialTypes WHERE Code=@material) AS materialId,(SELECT Id FROM dbo.ListingStatuses WHERE Code=@status) AS statusId",
      [str("material", material), str("status", status)],
    );
    if (!lookups[0]?.materialId)
      throw new ApiError(400, "Unknown materialTypeCode.");
    const params = [
      int("companyId", companyId),
      int("locationId", locationId),
      str("title", title),
      str(
        "slug",
        previous?.slug ??
          listingSlug(title),
      ),
      int("materialId", lookups[0].materialId),
      int("statusId", lookups[0].statusId),
      number("quantity", quantity),
      number("moq", moq),
      number("price", price, 2),
      str("unit", unit),
      str("currency", currency),
      str("description", text(merged.description, "description", 10000)),
      str("specs", JSON.stringify(specifications)),
      number(
        "carbon",
        numeric(merged.carbonIntensityKgCo2e, "carbonIntensityKgCo2e", 3),
      ),
      int("userId", auth.userId),
      int("id", previous?.id),
    ];
    if (!previous && status === "draft") return insertDraftListing(transaction, params, auth);
    const rows = await queryRowsWithParamsInTransaction(
      transaction,
      previous
        ? `UPDATE dbo.Listings SET LocationId=@locationId,Title=@title,MaterialTypeId=@materialId,ListingStatusId=@statusId,Quantity=@quantity,MinimumOrderQuantity=@moq,PricePerUnit=@price,QuantityUnit=@unit,CurrencyCode=@currency,Description=@description,SpecificationsJson=@specs,CarbonIntensityKgCo2e=@carbon,UpdatedByUserId=@userId,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.Id AS id WHERE Id=@id`
        : `INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,ListingStatusId,Quantity,MinimumOrderQuantity,PricePerUnit,QuantityUnit,CurrencyCode,Description,SpecificationsJson,CarbonIntensityKgCo2e,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id AS id VALUES(@companyId,@locationId,@title,@slug,@materialId,@statusId,@quantity,@moq,@price,@unit,@currency,@description,@specs,@carbon,@userId,@userId)`,
      params,
    );
    const savedId = id(rows[0]?.id);
    await enqueueListingReview(transaction, savedId, previous?.listingStatusCode, status);
    await auditListingLifecycle(transaction, auth, savedId, previous?.listingStatusCode, status);
    return rows[0]?.id;
  });
  if (body.listingStatusCode === "published" && onPublished) await onPublished(Number(savedId), auth.userId);
  sendJson(response, key ? 200 : 201, {
    ok: true,
    listing: await project(await readListing(String(savedId), auth)),
  });
}
export function validateUpload(body: Record<string, unknown>) {
  const fileName = text(body.fileName, "fileName", 240);
  const contentType = text(body.contentType, "contentType", 100);
  const type =
    body.documentTypeCode === "certificate"
      ? "certification"
      : body.documentTypeCode;
  if (!fileName || /[\x00-\x1f\x7f/\\]/.test(fileName))
    throw new ApiError(400, "Invalid file name.");
  if (!["photo", "sds", "certification", "tds", "coa", "lab_report", "other"].includes(String(type)))
    throw new ApiError(400, "Unsupported document type.");
  if (
    typeof body.contentBase64 !== "string" ||
    body.contentBase64.length > Math.ceil((5 * 1024 * 1024) / 3) * 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(body.contentBase64)
  )
    throw new ApiError(400, "Valid base64 content required.");
  const bytes = Buffer.from(body.contentBase64, "base64");
  if (
    bytes.toString("base64") !== body.contentBase64 ||
    !bytes.length ||
    bytes.length > 5 * 1024 * 1024
  )
    throw new ApiError(400, "File size must be between 1 byte and 5 MiB.");
  const pdf = bytes.subarray(0, 5).toString() === "%PDF-";
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP";
  if (
    type === "photo"
      ? !(
          (contentType === "image/png" && png) ||
          (contentType === "image/jpeg" && jpeg) ||
          (contentType === "image/webp" && webp)
        )
      : !(contentType === "application/pdf" && pdf)
  )
    throw new ApiError(
      400,
      "File signature does not match an accepted format.",
    );
  return {
    fileName,
    contentType,
    type,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
async function upload(request: IncomingMessage, response: ServerResponse) {
  const auth = await requireSessionAuth(request);
  const body = object(await readJsonBody(request));
  const listingId = id(body.listingId);
  const listing = await readListing(String(listingId), auth);
  await seller(auth, id(listing.sellerCompanyId));
  const file = validateUpload(body);
  const rows = await runInTransaction(async (tx) => {
    const before = await readListing(String(listingId), auth, tx);
    const rows = await queryRowsWithParamsInTransaction(
      tx,
      `INSERT dbo.ListingDocuments(ListingId,DocumentTypeId,FileName,FileUrl,VerificationStatusId,Content,ContentType,ByteLength,Sha256,UploadedByUserId,CreatedByUserId,UpdatedByUserId)
      OUTPUT INSERTED.Id AS id VALUES(@listingId,(SELECT Id FROM dbo.DocumentTypes WHERE Code=@type),@fileName,'',(SELECT Id FROM dbo.AccountStatuses WHERE Code='pending_verification'),@content,@contentType,@length,@sha,@userId,@userId,@userId)`,
      [
        int("listingId", listingId),
        str("type", file.type),
        str("fileName", file.fileName),
        { name: "content", type: sql.VarBinary(sql.MAX), value: file.bytes },
        str("contentType", file.contentType),
        int("length", file.bytes.length),
        str("sha", file.sha256),
        int("userId", auth.userId),
      ],
    );
    await queryRowsWithParamsInTransaction(
      tx,
      `UPDATE dbo.Listings SET ListingStatusId=CASE WHEN ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='published') THEN (SELECT Id FROM dbo.ListingStatuses WHERE Code='pending_review') ELSE ListingStatusId END,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`,
      [int("id", listingId)],
    );
    const after = await readListing(String(listingId), auth, tx);
    await enqueueListingReview(tx, listingId, before.listingStatusCode, after.listingStatusCode);
    return rows;
  });
  sendJson(response, 201, {
    ok: true,
    document: (await documents(listingId)).find(
      (row) => row.id === rows[0]?.id,
    ),
  });
}
export async function handleListingRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  onPublished?: (id: number, actor: number) => Promise<void>,
) {
  if (await handleListingSdsRequestRoute(request, response, url)) return true;
  if (!/^\/api\/(listings|listing-documents)(\/|$)/.test(url.pathname))
    return false;
  // These live marketplace and moderation routes remain owned by the core API.
  if (/^\/api\/listings\/[^/]+\/(interest|favorite)$/.test(url.pathname) ||
      (request.method === "PATCH" && /^\/api\/listing-documents\/\d+$/.test(url.pathname)) ||
      (request.method === "GET" && url.pathname === "/api/listing-documents" && !url.searchParams.has("listingId"))) return false;
  const parts = url.pathname.split("/").filter(Boolean);
  const owned = url.searchParams.get("scope") === "owned";
  const method = request.method;
  if (parts[1] === "listings") {
    if (method === "POST" && parts.length === 2) {
      await save(request, response, undefined, onPublished);
      return true;
    }
    if (method === "PATCH" && parts.length === 3) {
      await save(request, response, decodeURIComponent(parts[2]!), onPublished);
      return true;
    }
    if (method === "GET" && parts.length <= 3) {
      const viewer = await getOptionalSessionAuth(request);
      const auth = owned ? await requireSessionAuth(request) : viewer?.isAdmin ? viewer : undefined;
      if (parts[2]) {
        sendJson(response, 200, {
          ok: true,
          listing: listingForViewer(await project(
            await readListing(decodeURIComponent(parts[2]), auth),
          ), viewer),
        });
        return true;
      }
      const selectedPortfolio = url.searchParams.has("portfolioId") ? portfolioId(url.searchParams.get("portfolioId")) : null;
      if (selectedPortfolio !== null) {
        if (owned) throw new ApiError(400, "Portfolio selection requires the public catalogue scope.");
        await requirePortfolioAccess(selectedPortfolio, viewer);
        response.setHeader("cache-control", "private, no-store");
      }
      const company = url.searchParams.get("sellerCompanyId");
      if (company !== null && (!/^\d+$/.test(company) || Number(company) <= 0))
        throw new ApiError(400, "Invalid sellerCompanyId.");
      if (
        auth &&
        !auth.isAdmin &&
        company !== null &&
        Number(company) !== auth.companyId
      )
        throw new ApiError(403, "Company access required.");
      const status = url.searchParams.get("statusCode");
      const search = url.searchParams.get("search");
      const radius = parseListingRadius(url.searchParams);
      // Radius membership could otherwise be probed to infer a private facility.
      if (radius && !(viewer && (viewer.companyId || viewer.isAdmin)))
        throw new ApiError(403, "Company membership is required for facility radius search.");
      const catalogueRows = await query(
        selectListing +
          ` WHERE ` +
          (auth && selectedPortfolio === null
            ? "(l.SellerCompanyId=@companyId OR @admin=1)"
            : "ls.Code='published' AND vs.Code <> 'inactive'") +
          ` AND (@seller IS NULL OR l.SellerCompanyId=@seller) AND (@status IS NULL OR ls.Code=@status) AND (@search IS NULL OR l.Title LIKE '%'+@search+'%' OR l.Description LIKE '%'+@search+'%')` +
          (selectedPortfolio === null ? "" : ` AND EXISTS(SELECT 1 FROM dbo.MarketPortfolioListings pl JOIN dbo.MarketPortfolios p ON p.Id=pl.PortfolioId WHERE pl.PortfolioId=@portfolioId AND pl.ListingId=l.Id AND p.Status='active' AND (@portfolioAdmin=1 OR EXISTS(SELECT 1 FROM dbo.MarketPortfolioCompanies pc WHERE pc.PortfolioId=p.Id AND pc.CompanyId=@portfolioCompany)))`) +
          ` ORDER BY l.Id DESC`,
        [
          int("companyId", auth?.companyId),
          int("admin", auth?.isAdmin ? 1 : 0),
          int("seller", company === null ? null : Number(company)),
          str("status", status),
          str("search", search),
          int("portfolioId", selectedPortfolio),
          int("portfolioAdmin", viewer?.isAdmin ? 1 : 0),
          int("portfolioCompany", viewer?.companyId ?? null),
        ],
      );
      // Filter saved SQL coordinates before teaser redaction; never invent an origin.
      const rows = radius ? catalogueRows.filter(row => withinListingRadius(row.latitude, row.longitude, radius)) : catalogueRows;
      // One metadata read for the catalogue, rather than one SQL request per
      // listing. Anonymous teasers never expose documents, so skip that read.
      const catalogueDocuments = viewer && (viewer.companyId || viewer.isAdmin)
        ? await documentsForListings(rows.map((row) => row.id))
        : [];
      const documentsByListing = new Map<unknown, Record<string, unknown>[]>();
      for (const document of catalogueDocuments) {
        const group = documentsByListing.get(document.listingId) ?? [];
        group.push(document);
        documentsByListing.set(document.listingId, group);
      }
      sendJson(response, 200, {
        ok: true,
        listings: await Promise.all(rows.map(async row => listingForViewer(await project(row, documentsByListing.get(row.id) ?? []), viewer))),
      });
      return true;
    }
    if (method === "DELETE" && parts.length === 3) {
      const auth = await requireSessionAuth(request),
        listing = await readListing(decodeURIComponent(parts[2]!), auth);
      await seller(auth, id(listing.sellerCompanyId));
      await runInTransaction(async tx => {
        const before = await readListing(String(listing.id), auth, tx);
        await queryRowsWithParamsInTransaction(tx,
          "UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='closed'),UpdatedAt=SYSUTCDATETIME(),UpdatedByUserId=@userId WHERE Id=@id",
          [int("id", listing.id), int("userId", auth.userId)]);
        await auditListingLifecycle(tx, auth, id(listing.id), before.listingStatusCode, "closed");
      });
      sendJson(response, 200, {
        ok: true,
        listing: await project(await readListing(String(listing.id), auth)),
      });
      return true;
    }
  } else {
    if (method === "POST" && parts.length === 2) {
      await upload(request, response);
      return true;
    }
    if (method === "GET" && parts.length === 2) {
      const key = url.searchParams.get("listingId");
      if (!key || !/^\d+$/.test(key))
        throw new ApiError(400, "listingId is required.");
      const viewer = await getOptionalSessionAuth(request);
      const auth = owned ? await requireSessionAuth(request) : viewer?.isAdmin ? viewer : undefined;
      const listing = await readListing(key, auth);
      sendJson(response, 200, {
        ok: true,
        documents: viewer && (viewer.companyId || viewer.isAdmin) ? await documents(listing.id) : [],
      });
      return true;
    }
    if (parts.length >= 3 && /^\d+$/.test(parts[2]!)) {
      const docId = Number(parts[2]);
      const rows = await query(
        "SELECT ListingId AS listingId,FileName AS fileName,ContentType AS contentType,Content AS content,(SELECT Code FROM dbo.DocumentTypes WHERE Id=DocumentTypeId) AS documentTypeCode FROM dbo.ListingDocuments WHERE Id=@id AND DeletedAt IS NULL",
        [int("id", docId)],
      );
      const doc = rows[0];
      if (!doc) throw new ApiError(404, "Document not found.");
      if (method === "GET" && parts.length === 4 && parts[3] === "download") {
        // Public requests never need auth; supplied bearer tokens must be valid.
        const auth = request.headers.authorization
          ? await requireSessionAuth(request)
          : undefined;
        let listing;
        try {
          listing = await readListing(String(doc.listingId));
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404 || !auth)
            throw error;
          listing = await readListing(String(doc.listingId), auth);
        }
        if (doc.documentTypeCode !== "photo" && (!auth || (!auth.companyId && !auth.isAdmin))) throw new ApiError(auth ? 403 : 401, "Company membership required to download documents.");
        if (!listing || !Buffer.isBuffer(doc.content))
          throw new ApiError(404, "Document not found.");
        response.writeHead(200, {
          ...corsHeaders(),
          "content-type": String(doc.contentType),
          "content-length": doc.content.length,
          "content-disposition": `${String(doc.contentType).startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(String(doc.fileName))}`,
          "x-content-type-options": "nosniff",
          "cache-control": "private, no-store",
        });
        response.end(doc.content);
        return true;
      }
      if (method === "DELETE" && parts.length === 3) {
        const auth = await requireSessionAuth(request),
          listing = await readListing(String(doc.listingId), auth);
        await seller(auth, id(listing.sellerCompanyId));
        await runInTransaction(async (tx) => {
          const before = await readListing(String(doc.listingId), auth, tx);
          await queryRowsWithParamsInTransaction(
            tx,
            "UPDATE dbo.ListingDocuments SET DeletedAt=SYSUTCDATETIME(),UpdatedByUserId=@userId WHERE Id=@id",
            [int("id", docId), int("userId", auth.userId)],
          );
          await queryRowsWithParamsInTransaction(
            tx,
            `UPDATE dbo.Listings SET ListingStatusId=CASE WHEN ListingStatusId IN (SELECT Id FROM dbo.ListingStatuses WHERE Code IN ('published','pending_review')) THEN (SELECT Id FROM dbo.ListingStatuses WHERE Code=CASE WHEN EXISTS(SELECT 1 FROM dbo.ListingDocuments d JOIN dbo.DocumentTypes dt ON dt.Id=d.DocumentTypeId WHERE d.ListingId=@id AND dt.Code='sds' AND d.DeletedAt IS NULL AND ${usableListingDocumentSql}) THEN 'pending_review' ELSE 'draft' END) ELSE ListingStatusId END,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`,
            [int("id", doc.listingId)],
          );
          const after = await readListing(String(doc.listingId), auth, tx);
          await enqueueListingReview(tx, id(doc.listingId), before.listingStatusCode, after.listingStatusCode);
        });
        sendJson(response, 200, { ok: true, document: { id: docId } });
        return true;
      }
    }
  }
  throw new ApiError(405, "Method not allowed.");
}

/** Validate transaction quantity against the saved listing without implicit unit conversion. */
export async function requirePurchasableListing(
  listingId: number,
  quantity: number,
  quantityUnit?: string,
  currencyCode?: string,
) {
  const listing = await readListing(String(listingId));
  if (
    typeof listing.quantity !== "number" ||
    typeof listing.minimumOrderQuantity !== "number" ||
    typeof listing.pricePerUnit !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity < listing.minimumOrderQuantity ||
    quantity > listing.quantity
  )
    throw new ApiError(
      400,
      "Quantity must be between the listing MOQ and available stock; saved pricing is required.",
    );
  if (
    (quantityUnit !== undefined && quantityUnit !== listing.quantityUnit) ||
    (currencyCode !== undefined &&
      currencyCode.toUpperCase() !== listing.currencyCode)
  )
    throw new ApiError(
      400,
      "Quantity unit and currency must match the saved listing.",
    );
  return listing;
}
