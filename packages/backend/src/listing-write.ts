import { randomUUID } from "node:crypto";
import {
  queryRowsWithParamsInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, type AuthContext } from "./http.js";
import { enqueueListingReview, auditListingLifecycle } from "./staff-alerts.js";
export const listingSlug = (title: string) =>
  `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 130)}-${randomUUID()}`;
export async function insertDraftListing(
  tx: sql.Transaction,
  params: QueryParameter[],
  auth: AuthContext,
): Promise<number> {
  const rows = await queryRowsWithParamsInTransaction(
    tx,
    `INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,ListingStatusId,Quantity,MinimumOrderQuantity,PricePerUnit,QuantityUnit,CurrencyCode,Description,SpecificationsJson,CarbonIntensityKgCo2e,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id AS id VALUES(@companyId,@locationId,@title,@slug,@materialId,@statusId,@quantity,@moq,@price,@unit,@currency,@description,@specs,@carbon,@userId,@userId)`,
    params,
  );
  const id = Number(rows[0]?.id);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new ApiError(500, "Listing insert did not return an ID.");
  await enqueueListingReview(tx, id, undefined, "draft");
  await auditListingLifecycle(tx, auth, id, undefined, "draft");
  return id;
}
