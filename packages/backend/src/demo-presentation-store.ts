import type { DemoPresentation } from "../../shared/src/demo-presentations-api.js";
import { queryRowsWithParams as query, queryRowsWithParamsInTransaction, runInTransaction, sql, type QueryParameter } from "./database.js";
import { parseDemoPresentation, parseDemoPresentationPlan } from "./demo-presentation-domain.js";
import { ApiError } from "./http.js";

const projection = `p.Id id,p.Kind kind,p.CompanyName companyName,p.Title title,p.MaterialTypeCode materialTypeCode,
 p.Quantity quantity,p.QuantityUnitCode quantityUnitCode,p.Price price,p.CurrencyCode currencyCode,
 p.PriceUnitCode priceUnitCode,p.PriceEstimated priceEstimated,p.QuantityEstimated quantityEstimated`;
const sourceJoins = `LEFT JOIN dbo.Listings l ON l.Id=p.SourceListingId
 LEFT JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId
 LEFT JOIN dbo.WantedListings w ON w.Id=p.SourceWantedListingId
 JOIN dbo.Companies c ON c.Id=CASE WHEN p.Kind='seller' THEN l.SellerCompanyId ELSE w.BuyerCompanyId END
 JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId`;
const eligibleSource = `cs.Code NOT IN ('inactive','suspended') AND
 ((p.Kind='seller' AND ls.Code='draft') OR (p.Kind='buyer' AND w.IsDraft=1 AND w.IsOpen=0))`;

export async function listDemoPresentations(): Promise<DemoPresentation[]> {
  const rows = await query(`SELECT ${projection} FROM dbo.DemoPresentations p ${sourceJoins}
    WHERE p.IsEnabled=1 AND ${eligibleSource} ORDER BY p.CompanyName,p.Kind,p.Title,p.Id`);
  return rows.map(parseDemoPresentation);
}

/** Internal reviewed-plan operation. Never reachable through the public HTTP API. */
export async function enrollDemoPresentations(input: unknown) {
  const plan = parseDemoPresentationPlan(input);
  return runInTransaction(async tx => {
    const execute = (statement: string, parameters: QueryParameter[] = []) => queryRowsWithParamsInTransaction(tx, statement, parameters);
    const approver = await execute("SELECT Id FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE Id=@user", [{ name: "user", type: sql.Int, value: plan.approvedByUserId }]);
    if (!approver.length) throw new ApiError(400, "Unknown approving user.");
    let created = 0, unchanged = 0;
    for (const entry of plan.entries) {
      const p = entry.presentation;
      const sourceListingId = "sourceListingId" in entry ? entry.sourceListingId : null;
      const sourceWantedListingId = "sourceWantedListingId" in entry ? entry.sourceWantedListingId : null;
      const params: QueryParameter[] = [
        { name: "id", type: sql.UniqueIdentifier, value: p.id },
        { name: "listing", type: sql.Int, value: sourceListingId },
        { name: "wanted", type: sql.Int, value: sourceWantedListingId },
        { name: "approver", type: sql.Int, value: plan.approvedByUserId },
        ...Object.entries(p).filter(([key]) => key !== "id").map(([name, value]): QueryParameter => ({
          name, value,
          type: typeof value === "boolean" ? sql.Bit : name === "price" || name === "quantity" ? sql.Decimal(18, 3) : sql.NVarChar(240),
        })),
      ];
      const source = await execute(p.kind === "seller"
        ? `SELECT l.Id FROM dbo.Listings l WITH(UPDLOCK,HOLDLOCK) JOIN dbo.ListingStatuses s ON s.Id=l.ListingStatusId
           JOIN dbo.Companies c WITH(UPDLOCK,HOLDLOCK) ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId
           WHERE l.Id=@listing AND s.Code='draft' AND cs.Code NOT IN ('inactive','suspended')`
        : `SELECT w.Id FROM dbo.WantedListings w WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Companies c WITH(UPDLOCK,HOLDLOCK) ON c.Id=w.BuyerCompanyId
           JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId WHERE w.Id=@wanted AND w.IsDraft=1 AND w.IsOpen=0 AND cs.Code NOT IN ('inactive','suspended')`, params);
      if (!source.length) throw new ApiError(409, "Presentation source must remain an eligible private draft.");
      const existing = await execute(`SELECT ${projection},p.SourceListingId sourceListingId,p.SourceWantedListingId sourceWantedListingId,
        p.IsEnabled isEnabled,p.ApprovedByUserId approvedByUserId FROM dbo.DemoPresentations p WITH(UPDLOCK,HOLDLOCK)
        WHERE p.Id=@id OR p.SourceListingId=@listing OR p.SourceWantedListingId=@wanted`, params);
      if (existing.length) {
        const row = existing[0]!;
        const { sourceListingId: savedListing, sourceWantedListingId: savedWanted, isEnabled, approvedByUserId, ...saved } = row;
        if (existing.length !== 1 || savedListing !== sourceListingId || savedWanted !== sourceWantedListingId || isEnabled !== true || approvedByUserId !== plan.approvedByUserId || JSON.stringify(parseDemoPresentation(saved)) !== JSON.stringify(p))
          throw new ApiError(409, "Existing presentation differs from reviewed plan; create-only enrollment refused.");
        unchanged++;
        continue;
      }
      await execute(`INSERT dbo.DemoPresentations(Id,Kind,SourceListingId,SourceWantedListingId,CompanyName,Title,MaterialTypeCode,
        Quantity,QuantityUnitCode,Price,CurrencyCode,PriceUnitCode,PriceEstimated,QuantityEstimated,ApprovedByUserId)
        VALUES(@id,@kind,@listing,@wanted,@companyName,@title,@materialTypeCode,@quantity,@quantityUnitCode,@price,@currencyCode,@priceUnitCode,@priceEstimated,@quantityEstimated,@approver)`, params);
      created++;
    }
    return { created, unchanged };
  });
}
