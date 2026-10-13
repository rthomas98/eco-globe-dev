import { queryRowsWithParamsInTransaction, sql } from "./database.js";
import { ApiError } from "./http.js";

export const usableListingDocumentSql =
  "(DATALENGTH(d.Content)>0 OR NULLIF(LTRIM(RTRIM(d.FileUrl)),'') IS NOT NULL)";

/** The same saved, nondeleted SDS eligibility for checkout and RFQ. */
export async function requireListingSds(
  tx: sql.Transaction,
  listingId: number,
) {
  const documents = await queryRowsWithParamsInTransaction(
    tx,
    `SELECT TOP (1) d.Id FROM dbo.ListingDocuments d WITH(HOLDLOCK)
     JOIN dbo.DocumentTypes t ON t.Id=d.DocumentTypeId
     WHERE d.ListingId=@listing AND t.Code='sds' AND d.DeletedAt IS NULL
       AND ${usableListingDocumentSql}`,
    [{ name: "listing", value: listingId, type: sql.Int }],
  );
  if (!documents.length)
    throw new ApiError(
      409,
      "The seller must upload the SDS before this listing can be purchased or quoted.",
    );
}
