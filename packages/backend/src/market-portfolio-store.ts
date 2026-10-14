import type {
  MarketPortfolio,
  MarketPortfolioWrite,
  MarketPortfolioAuditEvent,
  AssignedMarketPortfolio,
} from "../../shared/src/market-portfolios-api.js";
import {
  queryRowsWithParams,
  queryRowsWithParamsInTransaction,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, type AuthContext } from "./http.js";
import {
  MarketRecordError,
  choice,
  text,
  version,
} from "./market-record-domain.js";
import { portfolioInput, portfolioIds } from "./market-portfolio-domain.js";

type Row = Record<string, unknown>;
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
const query = (
  tx: sql.Transaction | undefined,
  statement: string,
  params: QueryParameter[] = [],
) =>
  tx
    ? queryRowsWithParamsInTransaction<Row>(tx, statement, params)
    : queryRowsWithParams<Row>(statement, params);
const date = (value: unknown) =>
  value instanceof Date ? value.toISOString() : String(value);
const select = `SELECT p.*, CONVERT(VARCHAR(16),CAST(p.Version AS BINARY(8)),2) VersionHex,
 (SELECT RecordId id FROM dbo.MarketPortfolioRecords WHERE PortfolioId=p.Id ORDER BY RecordId FOR JSON PATH) RecordsJson,
 (SELECT ListingId id FROM dbo.MarketPortfolioListings WHERE PortfolioId=p.Id ORDER BY ListingId FOR JSON PATH) ListingsJson,
 (SELECT CompanyId id FROM dbo.MarketPortfolioCompanies WHERE PortfolioId=p.Id ORDER BY CompanyId FOR JSON PATH) CompaniesJson
 FROM dbo.MarketPortfolios p`;
function ids(value: unknown): number[] {
  // SQL FOR JSON PATH can be null for an empty set on some query shapes.
  if (value === null || value === undefined || value === "") return [];
  const rows: unknown = JSON.parse(String(value));
  if (!Array.isArray(rows))
    throw new Error("Invalid stored portfolio membership.");
  return portfolioIds(
    rows.map((row: unknown) =>
      row && typeof row === "object" && "id" in row ? row.id : null,
    ),
    "stored membership",
  );
}
function hydrate(row: Row): MarketPortfolio {
  return {
    id: Number(row.Id),
    version: version(String(row.VersionHex)),
    name: String(row.Name),
    description:
      row.Description === null || row.Description === undefined
        ? null
        : String(row.Description),
    status: choice(row.Status, ["active", "archived"], "stored status"),
    recordIds: ids(row.RecordsJson),
    listingIds: ids(row.ListingsJson),
    companyIds: ids(row.CompaniesJson),
    createdAt: date(row.CreatedAt),
    updatedAt: date(row.UpdatedAt),
  };
}
export async function getPortfolio(
  id: number,
  tx?: sql.Transaction,
): Promise<MarketPortfolio> {
  const rows = await query(tx, select + " WHERE p.Id=@id", [int("id", id)]);
  if (!rows[0]) throw new ApiError(404, "Market portfolio not found.");
  return hydrate(rows[0]);
}
export async function listPortfolios(
  params: URLSearchParams,
): Promise<MarketPortfolio[]> {
  const status = choice(
    params.get("status") ?? "active",
    ["active", "archived", "all"],
    "status",
  );
  const search = text(params.get("search"), "search", 240);
  const escaped = search?.replace(/[\\%_\[]/gu, (value) => "\\" + value);
  const rows = await query(
    undefined,
    select.replace("SELECT p.*", "SELECT TOP (200) p.*") +
      ` WHERE (@status='all' OR p.Status=@status) AND (@search IS NULL OR p.Name LIKE @search ESCAPE '\\' OR p.Description LIKE @search ESCAPE '\\') ORDER BY p.Id DESC`,
    [str("status", status), str("search", escaped ? `%${escaped}%` : null)],
  );
  return rows.map(hydrate);
}

async function validateMembership(
  tx: sql.Transaction,
  data: Pick<MarketPortfolioWrite, "recordIds" | "listingIds" | "companyIds">,
) {
  // Lock referenced rows until commit so validation and replacement are atomic.
  for (const [field, statement] of [
    [
      "recordIds",
      `SELECT r.Id FROM dbo.MarketRecords r WITH(UPDLOCK,HOLDLOCK) WHERE r.Status='active' AND r.Id IN (SELECT value FROM OPENJSON(@ids))`,
    ],
    [
      "listingIds",
      `SELECT l.Id FROM dbo.Listings l WITH(UPDLOCK,HOLDLOCK) JOIN dbo.ListingStatuses s ON s.Id=l.ListingStatusId JOIN dbo.Companies c WITH(UPDLOCK,HOLDLOCK) ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId WHERE s.Code='published' AND cs.Code<>'inactive' AND l.Id IN (SELECT value FROM OPENJSON(@ids))`,
    ],
    [
      "companyIds",
      `SELECT c.Id FROM dbo.Companies c WITH(UPDLOCK,HOLDLOCK) JOIN dbo.AccountStatuses s ON s.Id=c.VerificationStatusId WHERE s.Code NOT IN ('inactive','suspended') AND c.Id IN (SELECT value FROM OPENJSON(@ids))`,
    ],
  ] as const) {
    const rows = await query(tx, statement, [
      str("ids", JSON.stringify(data[field])),
    ]);
    if (rows.length !== data[field].length)
      throw new MarketRecordError(
        400,
        "invalid_membership",
        `Every ${field} entry must identify an existing eligible ${field === "listingIds" ? "published-visible listing" : "active record or company"}.`,
        { [field]: "One or more IDs are unavailable." },
      );
  }
}
async function replaceMembership(
  tx: sql.Transaction,
  id: number,
  data: MarketPortfolioWrite,
) {
  for (const [table, column, values] of [
    ["MarketPortfolioRecords", "RecordId", data.recordIds],
    ["MarketPortfolioListings", "ListingId", data.listingIds],
    ["MarketPortfolioCompanies", "CompanyId", data.companyIds],
  ] as const) {
    await query(
      tx,
      `DELETE FROM dbo.${table} WHERE PortfolioId=@id;
      INSERT dbo.${table}(PortfolioId,${column}) SELECT @id,CONVERT(INT,value) FROM OPENJSON(@ids);`,
      [int("id", id), str("ids", JSON.stringify(values))],
    );
  }
}
async function audit(
  tx: sql.Transaction,
  actor: number,
  action: string,
  previous: MarketPortfolio | null,
  next: MarketPortfolio,
  reason: string,
) {
  await query(
    tx,
    `INSERT dbo.AuditLogs(ActorUserId,ActorTypeId,ActionTypeId,RecordTypeId,RecordId,PreviousValue,NewValue,Reason,CreatedByUserId,UpdatedByUserId)
    VALUES(@actor,(SELECT Id FROM dbo.ActorTypes WHERE Code='admin'),(SELECT Id FROM dbo.AuditActionTypes WHERE Code=@action),(SELECT Id FROM dbo.RecordTypes WHERE Code='market_portfolio'),@id,@previous,@next,@reason,@actor,@actor)`,
    [
      int("actor", actor),
      str("action", action),
      int("id", next.id),
      str("previous", previous ? JSON.stringify(previous) : null),
      str("next", JSON.stringify(next)),
      str("reason", reason),
    ],
  );
}
export async function createPortfolio(
  input: MarketPortfolioWrite,
  actor: number,
): Promise<MarketPortfolio> {
  const data = portfolioInput(input);
  return runInTransaction(async (tx) => {
    await validateMembership(tx, data);
    const rows = await query(
      tx,
      `INSERT dbo.MarketPortfolios(Name,Description,CreatedByUserId,UpdatedByUserId)
      OUTPUT INSERTED.Id VALUES(@name,@description,@actor,@actor)`,
      [
        str("name", data.name),
        str("description", data.description),
        int("actor", actor),
      ],
    );
    const id = Number(rows[0]?.Id);
    await replaceMembership(tx, id, data);
    const next = await getPortfolio(id, tx);
    await audit(tx, actor, "created", null, next, data.reason);
    return next;
  });
}
type Change =
  | { action: "update"; data: MarketPortfolioWrite }
  | { action: "archive" | "restore"; reason: string };
export async function changePortfolio(
  id: number,
  expectedVersion: string,
  actor: number,
  change: Change,
): Promise<MarketPortfolio> {
  const expected = version(expectedVersion);
  const reason = text(
    change.action === "update" ? change.data.reason : change.reason,
    "reason",
    1000,
    true,
  )!;
  return runInTransaction(async (tx) => {
    const locked = await query(
      tx,
      "SELECT Id FROM dbo.MarketPortfolios WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id",
      [int("id", id)],
    );
    if (!locked[0]) throw new ApiError(404, "Market portfolio not found.");
    const previous = await getPortfolio(id, tx);
    if (previous.version !== expected)
      throw new MarketRecordError(
        409,
        "stale_version",
        "Portfolio changed. Reload before saving.",
      );
    if (change.action === "update") {
      const data = portfolioInput(change.data);
      await validateMembership(tx, data);
      await replaceMembership(tx, id, data);
      await query(
        tx,
        `UPDATE dbo.MarketPortfolios SET Name=@name,Description=@description,UpdatedAt=SYSUTCDATETIME(),UpdatedByUserId=@actor WHERE Id=@id`,
        [
          str("name", data.name),
          str("description", data.description),
          int("actor", actor),
          int("id", id),
        ],
      );
    } else {
      if (
        (change.action === "archive" && previous.status !== "active") ||
        (change.action === "restore" && previous.status !== "archived")
      )
        throw new ApiError(409, "Portfolio is already in the requested state.");
      if (change.action === "restore") await validateMembership(tx, previous);
      await query(
        tx,
        `UPDATE dbo.MarketPortfolios SET Status=@status,UpdatedAt=SYSUTCDATETIME(),UpdatedByUserId=@actor WHERE Id=@id`,
        [
          str("status", change.action === "archive" ? "archived" : "active"),
          int("actor", actor),
          int("id", id),
        ],
      );
    }
    const next = await getPortfolio(id, tx);
    await audit(
      tx,
      actor,
      change.action === "update" ? "updated" : change.action,
      previous,
      next,
      reason,
    );
    return next;
  });
}

// Active session company membership and company status are revalidated in SQL.
const activeCompanyMember = `EXISTS(SELECT 1 FROM dbo.CompanyMembers cm JOIN dbo.AccountStatuses ms ON ms.Id=cm.MemberStatusId
 JOIN dbo.Companies c ON c.Id=cm.CompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId
 WHERE cm.UserId=@user AND cm.CompanyId=@company AND ms.Code='active' AND cs.Code NOT IN ('inactive','suspended'))`;
export async function assignedPortfolios(
  auth: AuthContext,
): Promise<AssignedMarketPortfolio[]> {
  const rows = await query(
    undefined,
    `SELECT TOP (200) p.Id id,p.Name name FROM dbo.MarketPortfolios p WHERE p.Status='active'
    AND (@admin=1 OR (${activeCompanyMember} AND EXISTS(SELECT 1 FROM dbo.MarketPortfolioCompanies pc WHERE pc.PortfolioId=p.Id AND pc.CompanyId=@company))) ORDER BY p.Name,p.Id`,
    [
      int("admin", auth.isAdmin ? 1 : 0),
      int("user", auth.userId),
      int("company", auth.companyId ?? null),
    ],
  );
  return rows.map((row) => ({ id: Number(row.id), name: String(row.name) }));
}
export async function requirePortfolioAccess(
  id: number,
  auth: AuthContext | undefined,
): Promise<void> {
  if (!auth)
    throw new ApiError(
      401,
      "A company session is required for portfolio selection.",
    );
  if (!auth.isAdmin && !auth.companyId)
    throw new ApiError(403, "An assigned company is required.");
  const rows = await query(
    undefined,
    `SELECT p.Id FROM dbo.MarketPortfolios p WHERE p.Id=@id AND p.Status='active'
    AND (@admin=1 OR (${activeCompanyMember} AND EXISTS(SELECT 1 FROM dbo.MarketPortfolioCompanies pc WHERE pc.PortfolioId=p.Id AND pc.CompanyId=@company)))`,
    [
      int("id", id),
      int("admin", auth.isAdmin ? 1 : 0),
      int("user", auth.userId),
      int("company", auth.companyId ?? null),
    ],
  );
  if (!rows.length)
    throw new ApiError(
      403,
      "Portfolio is unavailable or not assigned to this company.",
    );
}
export async function portfolioAudit(
  id: number,
): Promise<MarketPortfolioAuditEvent[]> {
  await getPortfolio(id);
  const rows = await query(
    undefined,
    `SELECT TOP (200) a.Id id,t.Code action,a.ActorUserId actorUserId,u.Name actorUserName,a.CreatedAt createdAt,a.Reason reason
    FROM dbo.AuditLogs a JOIN dbo.RecordTypes r ON r.Id=a.RecordTypeId JOIN dbo.AuditActionTypes t ON t.Id=a.ActionTypeId
    LEFT JOIN dbo.Users u ON u.Id=a.ActorUserId WHERE r.Code='market_portfolio' AND a.RecordId=@id ORDER BY a.Id DESC`,
    [int("id", id)],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    action: String(row.action),
    actorUserId: Number(row.actorUserId),
    actorUserName: row.actorUserName == null ? null : String(row.actorUserName),
    createdAt: date(row.createdAt),
    reason: String(row.reason),
  }));
}
