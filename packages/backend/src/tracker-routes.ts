import type { IncomingMessage, ServerResponse } from "node:http";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireSessionAuth } from "./auth.js";
import { queryRowsWithParams as query } from "./database.js";
import { ApiError, sendJson } from "./http.js";
import { int, requireCompany } from "./lab-routes.js";

export async function handleTrackerRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  const document = /^\/api\/tracker\/samples\/(\d+)\/document$/.exec(
    url.pathname,
  );
  if (url.pathname !== "/api/tracker" && !document) return false;
  if (req.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const auth = await requireSessionAuth(req);
  const company = requireCompany(auth);
  if (document) {
    const rows = await query(
      `SELECT r.Id AS id,l.Title AS title,COALESCE(s.State,r.Status) AS status,s.ShippingCents AS cents,q.Provider AS mode,s.Carrier AS carrier,s.Service AS service,r.CreatedAt AS createdAt FROM dbo.SampleRequests r JOIN dbo.Listings l ON l.Id=r.ListingId LEFT JOIN dbo.SampleShipping s ON s.SampleRequestId=r.Id LEFT JOIN dbo.SampleShippingQuotes q ON q.Id=s.QuoteId WHERE r.Id=@id AND (r.BuyerCompanyId=@company OR l.SellerCompanyId=@company)`,
      [int("id", Number(document[1])), int("company", company)],
    );
    const row = rows[0];
    if (!row) throw new ApiError(404, "Sample not found.");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const lines = [
      "EcoGlobe sample request summary",
      `SR-${row.id}`,
      String(row.title),
      `Status: ${row.status}`,
      `Created: ${new Date(String(row.createdAt)).toISOString().slice(0, 10)}`,
      row.cents != null
        ? `Shipping amount: USD ${(Number(row.cents) / 100).toFixed(2)}`
        : "Shipping amount not recorded",
      `${row.carrier ?? ""} ${row.service ?? ""}`,
      row.mode === "simulation"
        ? "LOCAL SIMULATION - no real payment or postage"
        : "Request summary - not a tax invoice or shipping label",
    ];
    lines.forEach((line, i) =>
      page.drawText(line.replace(/[^\x20-\x7E]/g, "?").slice(0, 95), {
        x: 45,
        y: 780 - i * 30,
        size: 12,
        font,
      }),
    );
    res.writeHead(200, {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="sample-SR-${row.id}.pdf"`,
      "cache-control": "private, no-store",
    });
    res.end(Buffer.from(await pdf.save()));
    return true;
  }
  const role = url.searchParams.get("role");
  if (role !== "buyer" && role !== "seller")
    throw new ApiError(400, "Choose buyer or seller tracker.");
  const params = [int("company", company), int("user", auth.userId)];
  const profile = await query(
    `SELECT Id FROM dbo.${role === "buyer" ? "BuyerProfiles" : "SellerProfiles"} WHERE CompanyId=@company`,
    params,
  );
  if (!profile.length)
    throw new ApiError(403, "This company does not have this portal profile.");
  const scope =
    role === "seller"
      ? "l.SellerCompanyId=@company"
      : `(
    EXISTS(SELECT 1 FROM dbo.ListingFavorites f WHERE f.ListingId=l.Id AND f.UserId=@user)
    OR EXISTS(SELECT 1 FROM dbo.SampleRequests r WHERE r.ListingId=l.Id AND r.BuyerCompanyId=@company)
    OR EXISTS(SELECT 1 FROM dbo.LabRequests r WHERE r.ListingId=l.Id AND r.CompanyId=@company)
    OR EXISTS(SELECT 1 FROM dbo.PilotRequests r WHERE r.ListingId=l.Id AND r.BuyerCompanyId=@company)
    OR EXISTS(SELECT 1 FROM dbo.Orders r WHERE r.ListingId=l.Id AND r.BuyerCompanyId=@company))`;
  const [
    account,
    listings,
    samples,
    labs,
    pilots,
    orders,
    files,
    reports,
    sites,
  ] = await Promise.all([
    query(
      `SELECT c.LegalName AS name,s.Code AS verification,cm.CanExecuteTransactions AS canExecute,cm.TransactionApprovalLimit AS approvalLimit,lt.Name AS licence,ps.Code AS payout FROM dbo.Companies c JOIN dbo.AccountStatuses s ON s.Id=c.VerificationStatusId LEFT JOIN dbo.CompanyMembers cm ON cm.CompanyId=c.Id AND cm.UserId=@user LEFT JOIN dbo.SellerProfiles sp ON sp.CompanyId=c.Id LEFT JOIN dbo.LicenceTiers lt ON lt.Id=sp.LicenceTierId LEFT JOIN dbo.PayoutStatuses ps ON ps.Id=sp.PayoutStatusId WHERE c.Id=@company`,
      params,
    ),
    query(
      `SELECT l.Id AS id,l.Title AS title,l.Quantity AS quantity,l.QuantityUnit AS unit,l.PricePerUnit AS price,l.CurrencyCode AS currency,s.Code AS status,c.LegalName AS seller,loc.City AS city,loc.StateProvince AS region,l.CreatedAt AS createdAt,(SELECT COUNT(DISTINCT f.UserId) FROM dbo.ListingFavorites f WHERE f.ListingId=l.Id) AS interestCount FROM dbo.Listings l JOIN dbo.ListingStatuses s ON s.Id=l.ListingStatusId JOIN dbo.Companies c ON c.Id=l.SellerCompanyId LEFT JOIN dbo.Locations loc ON loc.Id=l.LocationId WHERE ${scope} ORDER BY l.UpdatedAt DESC`,
      params,
    ),
    query(
      `SELECT r.Id AS id,r.ListingId AS listingId,COALESCE(s.State,r.Status) AS status,s.DispatchDeadline AS deadline,s.Carrier AS carrier,s.Service AS service,s.TrackingNumber AS tracking,s.ShippingCents AS cents,q.Provider AS mode,q.BoxCode AS box,CASE WHEN s.LabelUrl IS NOT NULL THEN 1 ELSE 0 END AS label,s.RefundState AS refund,r.CreatedAt AS createdAt FROM dbo.SampleRequests r JOIN dbo.Listings l ON l.Id=r.ListingId LEFT JOIN dbo.SampleShipping s ON s.SampleRequestId=r.Id LEFT JOIN dbo.SampleShippingQuotes q ON q.Id=s.QuoteId WHERE ${role === "seller" ? "l.SellerCompanyId" : "r.BuyerCompanyId"}=@company ORDER BY r.Id DESC`,
      params,
    ),
    query(
      `SELECT r.Id AS id,r.ListingId AS listingId,r.Status AS status,r.CreatedAt AS createdAt FROM dbo.LabRequests r JOIN dbo.Listings l ON l.Id=r.ListingId WHERE ${role === "seller" ? "l.SellerCompanyId=@company AND (r.CompanyId=@company OR r.Sharing='shared')" : "r.CompanyId=@company"} ORDER BY r.Id DESC`,
      params,
    ),
    query(
      `SELECT p.Id AS id,p.ListingId AS listingId,p.Status AS status,sl.StartsAt AS callAt,p.CreatedAt AS createdAt FROM dbo.PilotRequests p LEFT JOIN dbo.PilotSlots sl ON sl.RequestId=p.Id WHERE ${role === "seller" ? "p.SellerCompanyId" : "p.BuyerCompanyId"}=@company ORDER BY p.Id DESC`,
      params,
    ),
    query(
      `SELECT o.Id AS id,o.ListingId AS listingId,os.Code AS status,ss.Code AS shippingStatus,sh.TrackingNumber AS tracking,sh.Id AS shipmentId,CASE WHEN EXISTS(SELECT 1 FROM dbo.Payouts p JOIN dbo.PayoutStatuses ps ON ps.Id=p.PayoutStatusId WHERE p.OrderId=o.Id AND ps.Code='paid') THEN 1 ELSE 0 END AS paid,o.CreatedAt AS createdAt FROM dbo.Orders o JOIN dbo.OrderStatuses os ON os.Id=o.OrderStatusId LEFT JOIN dbo.Shipments sh ON sh.OrderId=o.Id LEFT JOIN dbo.ShipmentStatuses ss ON ss.Id=sh.ShipmentStatusId WHERE o.${role === "seller" ? "SellerCompanyId" : "BuyerCompanyId"}=@company ORDER BY o.Id DESC`,
      params,
    ),
    query(
      `SELECT d.Id AS id,d.ListingId AS listingId,d.FileName AS name FROM dbo.ListingDocuments d JOIN dbo.Listings l ON l.Id=d.ListingId WHERE ${scope}`,
      params,
    ),
    query(
      `SELECT p.Id AS id,r.ListingId AS listingId,p.FileName AS name FROM dbo.LabReports p JOIN dbo.LabRequests r ON r.Id=p.RequestId JOIN dbo.Listings l ON l.Id=r.ListingId JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses vs ON vs.Id=c.VerificationStatusId WHERE (${scope}) AND (r.CompanyId=@company OR (r.Sharing='shared' AND p.Published=1 AND ls.Code='published' AND l.Quantity>0 AND vs.Code<>'inactive'))`,
      params,
    ),
    query(
      `SELECT loc.Id AS id,loc.City AS city,loc.StateProvince AS region,CASE WHEN s.LocationId IS NOT NULL THEN 1 ELSE 0 END AS verified FROM dbo.Locations loc LEFT JOIN dbo.SampleReceivingSites s ON s.LocationId=loc.Id WHERE loc.CompanyId=@company`,
      params,
    ),
  ]);
  sendJson(res, 200, {
    ok: true,
    account: account[0],
    listings,
    samples,
    labs,
    pilots,
    orders,
    files,
    reports,
    sites,
  });
  return true;
}
