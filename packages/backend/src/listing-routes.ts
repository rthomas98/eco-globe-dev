import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getOptionalSessionAuth, requireSessionAuth } from "./auth.js";
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
function text(value: unknown, key: string, max = 240): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(400, `${key} must be text up to ${max} characters.`);
  return value.trim() || null;
}
function id(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    throw new ApiError(400, "A positive numeric ID is required.");
  return value;
}
function numeric(value: unknown, key: string, scale: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 999999999999 ||
    Math.abs(value * 10 ** scale - Math.round(value * 10 ** scale)) > 0.001
  )
    throw new ApiError(
      400,
      `${key} must be a nonnegative number with at most ${scale} decimals.`,
    );
  return value;
}
const specKeys = [
  "category",
  "material",
  "listingType",
  "grade",
  "color",
  "shelfLife",
  "storage",
  "packaging",
  "weight",
  "usage",
  "origin",
  "quality",
  "composition",
  "frequency",
  "state",
  "availabilityFrom",
  "availabilityTo",
  "sustainabilityNotes",
  "originLocation",
];
export function validateSpecifications(input: unknown) {
  const source = input == null ? {} : object(input);
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source))
    if (
      ![...specKeys, "sameAsCompany", "claims", "additionalSpecs"].includes(key)
    )
      throw new ApiError(400, `Unknown specification ${key}.`);
  for (const key of specKeys) result[key] = text(source[key], key, 4000);
  for (const key of ["availabilityFrom", "availabilityTo"]) {
    const date = result[key];
    if (
      date &&
      (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw new ApiError(400, `${key} must be a valid date.`);
  }
  if (
    typeof result.availabilityFrom === "string" &&
    typeof result.availabilityTo === "string" &&
    result.availabilityFrom > result.availabilityTo
  )
    throw new ApiError(400, "Availability end precedes start.");
  if (
    source.sameAsCompany !== undefined &&
    typeof source.sameAsCompany !== "boolean"
  )
    throw new ApiError(400, "sameAsCompany must be boolean.");
  result.sameAsCompany = source.sameAsCompany ?? false;
  const claims = source.claims ?? [];
  if (!Array.isArray(claims) || claims.length > 50)
    throw new ApiError(400, "claims must be an array of at most 50 strings.");
  result.claims = claims.map((value) => {
    const claim = text(value, "claim");
    if (!claim) throw new ApiError(400, "Empty claim.");
    return claim;
  });
  const specs = source.additionalSpecs ?? [];
  if (!Array.isArray(specs) || specs.length > 50)
    throw new ApiError(
      400,
      "additionalSpecs must be an array of at most 50 rows.",
    );
  result.additionalSpecs = specs.map((value) => {
    const row = object(value);
    const label = text(row.label, "label");
    const valueText = text(row.value, "value", 4000);
    if (!label || !valueText)
      throw new ApiError(400, "Specification label and value required.");
    return { label, value: valueText };
  });
  return result;
}
const selectListing = `SELECT l.Id AS id,l.SellerCompanyId AS sellerCompanyId,c.LegalName AS sellerCompanyName,
 vs.Code AS sellerVerificationStatusCode,l.LocationId AS locationId,l.Title AS title,l.Slug AS slug,
 mt.Code AS materialTypeCode,l.Quantity AS quantity,l.QuantityUnit AS quantityUnit,l.MinimumOrderQuantity AS minimumOrderQuantity,
 l.PricePerUnit AS pricePerUnit,l.CurrencyCode AS currencyCode,ls.Code AS listingStatusCode,l.CarbonIntensityKgCo2e AS carbonIntensityKgCo2e,
 l.Description AS description,l.SpecificationsJson AS specificationsJson,
 loc.Name AS locationName,loc.AddressLine1 AS addressLine1,loc.AddressLine2 AS addressLine2,loc.City AS city,
 loc.StateProvince AS stateProvince,loc.PostalCode AS postalCode,loc.CountryCode AS countryCode,loc.Latitude AS latitude,loc.Longitude AS longitude
 FROM dbo.Listings l JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses vs ON vs.Id=c.VerificationStatusId
 JOIN dbo.Locations loc ON loc.Id=l.LocationId JOIN dbo.MaterialTypes mt ON mt.Id=l.MaterialTypeId JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId`;
async function documents(listingId: unknown) {
  return query(
    `SELECT d.Id AS id,d.ListingId AS listingId,dt.Code AS documentTypeCode,d.FileName AS fileName,
    d.ContentType AS contentType,d.ByteLength AS byteLength,d.Sha256 AS sha256,
    CASE WHEN d.Content IS NOT NULL THEN CONCAT('/api/listing-documents/',d.Id,'/download') ELSE d.FileUrl END AS fileUrl,vs.Code AS verificationStatusCode
    FROM dbo.ListingDocuments d JOIN dbo.DocumentTypes dt ON dt.Id=d.DocumentTypeId JOIN dbo.AccountStatuses vs ON vs.Id=d.VerificationStatusId
    WHERE d.ListingId=@listingId AND d.DeletedAt IS NULL AND (d.Content IS NOT NULL OR d.FileUrl IS NOT NULL) ORDER BY CASE WHEN dt.Code='sds' THEN 0 ELSE 1 END,d.Id`,
    [int("listingId", listingId)],
  );
}
async function project(row: Record<string, unknown>) {
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
    documents: await documents(row.id),
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
async function lockListing(transaction: sql.Transaction, listingId: unknown) {
  await queryRowsWithParamsInTransaction(
    transaction,
    "SELECT Id FROM dbo.Listings WITH (UPDLOCK,HOLDLOCK) WHERE Id=@id",
    [int("id", listingId)],
  );
}
async function seller(auth: AuthContext, companyId: number) {
  if (auth.isAdmin) return;
  if (auth.companyId !== companyId)
    throw new ApiError(403, "Seller company access required.");
  const rows = await query(
    `SELECT cm.Id FROM dbo.CompanyMembers cm JOIN dbo.MemberRoles mr ON mr.Id=cm.MemberRoleId
    JOIN dbo.AccountStatuses ms ON ms.Id=cm.MemberStatusId JOIN dbo.SellerProfiles sp ON sp.CompanyId=cm.CompanyId
    WHERE cm.CompanyId=@companyId AND cm.UserId=@userId AND ms.Code='active' AND mr.Code IN ('owner','admin','seller_operator')`,
    [int("companyId", companyId), int("userId", auth.userId)],
  );
  if (!rows.length)
    throw new ApiError(403, "Active seller membership required.");
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
    const locationId = id(merged.locationId);
    const location = await query(
      "SELECT Id FROM dbo.Locations WHERE Id=@id AND CompanyId=@companyId",
      [int("id", locationId), int("companyId", companyId)],
    );
    if (!location.length)
      throw new ApiError(403, "Location must belong to seller company.");
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
    const quantity = numeric(merged.quantity, "quantity", 3),
      moq = numeric(merged.minimumOrderQuantity, "minimumOrderQuantity", 3),
      price = numeric(merged.pricePerUnit, "pricePerUnit", 2);
    if (quantity !== null && moq !== null && moq > quantity)
      throw new ApiError(400, "MOQ cannot exceed available quantity.");
    const unit = text(merged.quantityUnit, "quantityUnit", 40) ?? "";
    if (unit && !["ton", "tons", "tonne", "tonnes", "kg", "lb", "unit", "units"].includes(unit))
      throw new ApiError(400, "Unsupported quantity unit.");
    const currency =
      text(merged.currencyCode, "currencyCode", 3)?.toUpperCase() ?? "";
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
          `${title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 130)}-${randomUUID()}`,
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
    const rows = await queryRowsWithParamsInTransaction(
      transaction,
      previous
        ? `UPDATE dbo.Listings SET LocationId=@locationId,Title=@title,MaterialTypeId=@materialId,ListingStatusId=@statusId,Quantity=@quantity,MinimumOrderQuantity=@moq,PricePerUnit=@price,QuantityUnit=@unit,CurrencyCode=@currency,Description=@description,SpecificationsJson=@specs,CarbonIntensityKgCo2e=@carbon,UpdatedByUserId=@userId,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.Id AS id WHERE Id=@id`
        : `INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,ListingStatusId,Quantity,MinimumOrderQuantity,PricePerUnit,QuantityUnit,CurrencyCode,Description,SpecificationsJson,CarbonIntensityKgCo2e,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id AS id VALUES(@companyId,@locationId,@title,@slug,@materialId,@statusId,@quantity,@moq,@price,@unit,@currency,@description,@specs,@carbon,@userId,@userId)`,
      params,
    );
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
    await lockListing(tx, listingId);
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
      const rows = await query(
        selectListing +
          ` WHERE ` +
          (auth
            ? "(l.SellerCompanyId=@companyId OR @admin=1)"
            : "ls.Code='published' AND vs.Code <> 'inactive'") +
          ` AND (@seller IS NULL OR l.SellerCompanyId=@seller) AND (@status IS NULL OR ls.Code=@status) AND (@search IS NULL OR l.Title LIKE '%'+@search+'%' OR l.Description LIKE '%'+@search+'%') ORDER BY l.Id DESC`,
        [
          int("companyId", auth?.companyId),
          int("admin", auth?.isAdmin ? 1 : 0),
          int("seller", company === null ? null : Number(company)),
          str("status", status),
          str("search", search),
        ],
      );
      sendJson(response, 200, {
        ok: true,
        listings: await Promise.all(rows.map(async row => listingForViewer(await project(row), viewer))),
      });
      return true;
    }
    if (method === "DELETE" && parts.length === 3) {
      const auth = await requireSessionAuth(request),
        listing = await readListing(decodeURIComponent(parts[2]!), auth);
      await seller(auth, id(listing.sellerCompanyId));
      await query(
        "UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='closed'),UpdatedAt=SYSUTCDATETIME(),UpdatedByUserId=@userId WHERE Id=@id",
        [int("id", listing.id), int("userId", auth.userId)],
      );
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
          await lockListing(tx, doc.listingId);
          await queryRowsWithParamsInTransaction(
            tx,
            "UPDATE dbo.ListingDocuments SET DeletedAt=SYSUTCDATETIME(),UpdatedByUserId=@userId WHERE Id=@id",
            [int("id", docId), int("userId", auth.userId)],
          );
          await queryRowsWithParamsInTransaction(
            tx,
            "UPDATE dbo.Listings SET ListingStatusId=CASE WHEN ListingStatusId IN (SELECT Id FROM dbo.ListingStatuses WHERE Code IN ('published','pending_review')) THEN (SELECT Id FROM dbo.ListingStatuses WHERE Code=CASE WHEN EXISTS(SELECT 1 FROM dbo.ListingDocuments d JOIN dbo.DocumentTypes dt ON dt.Id=d.DocumentTypeId WHERE d.ListingId=@id AND dt.Code='sds' AND d.DeletedAt IS NULL AND d.Content IS NOT NULL) THEN 'pending_review' ELSE 'draft' END) ELSE ListingStatusId END,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
            [int("id", doc.listingId)],
          );
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
