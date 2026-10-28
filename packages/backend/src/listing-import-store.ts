import { createHash, randomUUID } from "node:crypto";
import type {
  ListingImportPreview,
  ListingImportResult,
  ListingImportRow,
} from "../../shared/src/listing-import-api.js";
import {
  queryRowsWithParams,
  queryRowsWithParamsInTransaction,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, type AuthContext } from "./http.js";
import { seller } from "./listing-seller.js";
import { insertDraftListing, listingSlug } from "./listing-write.js";
import {
  listingImportCounts,
  revalidateListingImport,
} from "./listing-import-validation.js";
import type { ImportReferences } from "./listing-import-workbook.js";

const int = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
const str = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.NVarChar(sql.MAX),
});
const num = (name: string, value: unknown, scale = 3): QueryParameter => ({
  name,
  value,
  type: sql.Decimal(18, scale),
});
const query = (
  tx: sql.Transaction | undefined,
  statement: string,
  params: QueryParameter[] = [],
) =>
  tx
    ? queryRowsWithParamsInTransaction(tx, statement, params)
    : queryRowsWithParams(statement, params);

export async function authorizeListingImport(
  auth: AuthContext,
  companyId: number,
  tx?: sql.Transaction,
): Promise<string> {
  await seller(auth, companyId, tx);
  const rows = await query(
    tx,
    `SELECT c.LegalName FROM dbo.Companies c${tx ? " WITH(HOLDLOCK)" : ""} JOIN dbo.SellerProfiles sp${tx ? " WITH(HOLDLOCK)" : ""} ON sp.CompanyId=c.Id WHERE c.Id=@company`,
    [int("company", companyId)],
  );
  if (!rows[0])
    throw new ApiError(auth.isAdmin ? 404 : 403, "Seller company not found.");
  return String(rows[0].LegalName);
}
export async function listingImportReferences(
  companyId: number,
  sellerCompanyName: string,
  tx?: sql.Transaction,
): Promise<ImportReferences> {
  const lock = tx ? " WITH(HOLDLOCK)" : "";
  const materials = await query(
    tx,
    `SELECT Id,Code,Name FROM dbo.MaterialTypes${lock} ORDER BY SortOrder,Id`,
  );
  const locations = await query(
    tx,
    `SELECT Id,Name FROM dbo.Locations${lock} WHERE CompanyId=@company ORDER BY Id`,
    [int("company", companyId)],
  );
  const titles = tx
    ? []
    : await query(
        tx,
        "SELECT l.Title FROM dbo.Listings l JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId WHERE l.SellerCompanyId=@company AND ls.Code<>'closed'",
        [int("company", companyId)],
      );
  return {
    sellerCompanyName,
    materials: materials.map((m) => ({
      id: Number(m.Id),
      code: String(m.Code),
      label: String(m.Name),
    })),
    locations: locations.map((l) => ({
      id: Number(l.Id),
      name: String(l.Name),
    })),
    existingTitles: titles.map((l) => String(l.Title)),
  };
}
export async function saveListingImportPreview(
  auth: AuthContext,
  companyId: number,
  companyName: string,
  rows: ListingImportRow[],
  bytes: Buffer,
): Promise<ListingImportPreview> {
  const now = Date.now();
  const preview: ListingImportPreview = {
    previewId: randomUUID(),
    sellerCompanyId: companyId,
    sellerCompanyName: companyName,
    fileSha256: createHash("sha256").update(bytes).digest("hex"),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    committed: false,
    result: null,
    counts: listingImportCounts(rows),
    rows,
  };
  await query(
    undefined,
    "INSERT dbo.ListingImportPreviews(Id,SellerCompanyId,CreatedByUserId,FileSha256,RowsJson,CreatedAt,ExpiresAt) VALUES(@id,@company,@user,@hash,@rows,@created,@expires)",
    [
      str("id", preview.previewId),
      int("company", companyId),
      int("user", auth.userId),
      str("hash", preview.fileSha256),
      str("rows", JSON.stringify(preview)),
      str("created", preview.createdAt),
      str("expires", preview.expiresAt),
    ],
  );
  return preview;
}
async function storedPreview(
  auth: AuthContext,
  companyId: number,
  id: string,
  tx?: sql.Transaction,
) {
  const rows = await query(
    tx,
    `SELECT RowsJson,ExpiresAt,CommittedAt,IdempotencyKey,ResultJson FROM dbo.ListingImportPreviews${tx ? " WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE Id=@id AND SellerCompanyId=@company AND CreatedByUserId=@user`,
    [str("id", id), int("company", companyId), int("user", auth.userId)],
  );
  if (!rows[0]) throw new ApiError(404, "Listing import preview not found.");
  return rows[0];
}
function expired(row: Record<string, unknown>) {
  const date =
    row.ExpiresAt instanceof Date
      ? row.ExpiresAt
      : new Date(String(row.ExpiresAt));
  return date.getTime() <= Date.now();
}
export async function getListingImportPreview(
  auth: AuthContext,
  companyId: number,
  id: string,
): Promise<ListingImportPreview> {
  const row = await storedPreview(auth, companyId, id);
  if (expired(row))
    throw new ApiError(404, "Listing import preview not found.");
  const preview = JSON.parse(String(row.RowsJson)) as ListingImportPreview;
  return {
    ...preview,
    committed: row.CommittedAt != null,
    result: row.ResultJson
      ? (JSON.parse(String(row.ResultJson)) as ListingImportResult)
      : null,
  };
}
export async function commitListingImport(
  auth: AuthContext,
  companyId: number,
  id: string,
  key: string,
): Promise<ListingImportResult> {
  return runInTransaction(async (tx) => {
    const row = await storedPreview(auth, companyId, id, tx);
    const companyName = await authorizeListingImport(auth, companyId, tx);
    if (expired(row))
      throw new ApiError(410, "Preview expired. Upload the workbook again.");
    if (row.CommittedAt != null) {
      if (String(row.IdempotencyKey).toLowerCase() !== key.toLowerCase())
        throw new ApiError(
          409,
          "This preview was committed with a different idempotency key.",
        );
      return JSON.parse(String(row.ResultJson)) as ListingImportResult;
    }
    const preview = JSON.parse(String(row.RowsJson)) as ListingImportPreview;
    if (
      preview.counts.error > 0 ||
      preview.rows.some((r) => r.status === "error")
    )
      throw new ApiError(409, "Fix the rows with errors and upload again.");
    const refs = await listingImportReferences(companyId, companyName, tx);
    const status = await query(
      tx,
      "SELECT Id FROM dbo.ListingStatuses WITH(HOLDLOCK) WHERE Code='draft'",
    );
    if (!status[0])
      throw new ApiError(409, "Draft listing status is unavailable.");
    // Validate the entire batch before inserting; locks retain FK ownership until commit.
    const validated = preview.rows.map((item) => {
      try {
        return { item, specs: revalidateListingImport(item.listing, refs) };
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        throw new ApiError(
          409,
          `Row ${item.rowNumber} no longer passes validation: ${error.message}`,
        );
      }
    });
    const result: ListingImportResult = {
      importId: id,
      sellerCompanyId: companyId,
      committedAt: new Date().toISOString(),
      created: [],
    };
    for (const { item, specs } of validated) {
      const l = item.listing;
      const title = l.title!;
      const slug = listingSlug(title);
      const material = refs.materials.find(
        (m) => m.code === l.materialTypeCode,
      )!;
      const listingId = await insertDraftListing(
        tx,
        [
          int("companyId", companyId),
          int("locationId", l.locationId),
          str("title", title),
          str("slug", slug),
          int("materialId", material.id),
          int("statusId", status[0].Id),
          num("quantity", l.quantity),
          num("moq", l.minimumOrderQuantity),
          num("price", l.pricePerUnit, 2),
          str("unit", l.quantityUnit),
          str("currency", l.currencyCode),
          str("description", l.description),
          str("specs", JSON.stringify(specs)),
          num("carbon", l.carbonIntensityKgCo2e),
          int("userId", auth.userId),
        ],
        auth,
      );
      result.created.push({
        rowNumber: item.rowNumber,
        listingId,
        slug,
        title,
      });
    }
    await query(
      tx,
      "UPDATE dbo.ListingImportPreviews SET CommittedAt=@at,IdempotencyKey=@key,ResultJson=@result WHERE Id=@id",
      [
        str("at", result.committedAt),
        str("key", key),
        str("result", JSON.stringify(result)),
        str("id", id),
      ],
    );
    await query(
      tx,
      `INSERT dbo.AuditLogs(ActorUserId,ActorCompanyId,ActorTypeId,ActionTypeId,RecordTypeId,RecordId,NewValue,Reason,CreatedByUserId,UpdatedByUserId)
      VALUES(@user,@company,(SELECT Id FROM dbo.ActorTypes WHERE Code=@actor),(SELECT Id FROM dbo.AuditActionTypes WHERE Code='created'),(SELECT Id FROM dbo.RecordTypes WHERE Code='listing_import'),NULL,@result,'Bulk listing import created draft listings.',@user,@user)`,
      [
        int("user", auth.userId),
        int("company", companyId),
        str("actor", auth.isAdmin ? "admin" : "user"),
        str("result", JSON.stringify(result)),
      ],
    );
    return result;
  });
}
