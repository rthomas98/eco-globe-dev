import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import { queryRowsWithParams as query, sql } from "./database.js";
import { ApiError, readJsonBody, sendJson } from "./http.js";
const int = (name: string, value: number) => ({ name, type: sql.Int, value });
export async function handlePartnerRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  if (url.pathname !== "/api/company-partners") return false;
  const auth = await requireSessionAuth(req);
  if (!auth.companyId)
    throw new ApiError(403, "Active company membership required.");
  const params = [int("companyId", auth.companyId)];
  if (req.method === "PUT") {
    const body = await readJsonBody<{
      partnerCompanyId: number;
      approved: boolean;
    }>(req);
    if (
      !Number.isSafeInteger(body.partnerCompanyId) ||
      Number(body.partnerCompanyId) <= 0 ||
      Number(body.partnerCompanyId) === auth.companyId ||
      typeof body.approved !== "boolean"
    )
      throw new ApiError(
        400,
        "A partner company and approval choice are required.",
      );
    // A company can manage only its own relationship with an actual order counterparty.
    const result = await query(
      `
   MERGE dbo.CompanyPartners WITH (HOLDLOCK) AS target
   USING (SELECT DISTINCT @companyId AS CompanyId, @partnerId AS PartnerCompanyId FROM dbo.Orders
     WHERE (BuyerCompanyId=@companyId AND SellerCompanyId=@partnerId)
        OR (SellerCompanyId=@companyId AND BuyerCompanyId=@partnerId)) AS source
   ON target.CompanyId=source.CompanyId AND target.PartnerCompanyId=source.PartnerCompanyId
   WHEN MATCHED THEN UPDATE SET Approved=@approved, UpdatedByUserId=@userId, UpdatedAt=SYSUTCDATETIME()
   WHEN NOT MATCHED THEN INSERT (CompanyId,PartnerCompanyId,Approved,UpdatedByUserId) VALUES(source.CompanyId,source.PartnerCompanyId,@approved,@userId)
   OUTPUT INSERTED.PartnerCompanyId AS partnerCompanyId,INSERTED.Approved AS approved;`,
      [
        ...params,
        int("partnerId", Number(body.partnerCompanyId)),
        int("userId", auth.userId),
        { name: "approved", type: sql.Bit, value: body.approved },
      ],
    );
    if (!result[0])
      throw new ApiError(404, "Trading partner not found for your company.");
    sendJson(res, 200, { ok: true, partner: result[0] });
    return true;
  }
  if (req.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const partners = await query(
    `
  SELECT c.Id AS id,c.LegalName AS name,COUNT(o.Id) AS orderCount,
    CAST(COALESCE(p.Approved,0) AS BIT) AS approved,p.UpdatedAt AS updatedAt
  FROM dbo.Orders o JOIN dbo.Companies c ON c.Id=CASE WHEN o.BuyerCompanyId=@companyId THEN o.SellerCompanyId ELSE o.BuyerCompanyId END
  LEFT JOIN dbo.CompanyPartners p ON p.CompanyId=@companyId AND p.PartnerCompanyId=c.Id
  WHERE (o.BuyerCompanyId=@companyId OR o.SellerCompanyId=@companyId) AND c.Id<>@companyId
  GROUP BY c.Id,c.LegalName,p.Approved,p.UpdatedAt ORDER BY c.LegalName;`,
    params,
  );
  sendJson(res, 200, { ok: true, partners });
  return true;
}
