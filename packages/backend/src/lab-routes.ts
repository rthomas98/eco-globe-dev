import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as txQuery,
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
import {
  positiveId,
  string,
  choice,
  exactKeys,
  validateRequest,
  validateSelection,
  validatePanel,
  validateReport,
  referralOptions,
  sharingChoices,
  statuses,
} from "./lab-validation.js";
export const int = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.Int,
  value,
});
export const text = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.NVarChar(sql.MAX),
  value,
});
export const bit = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.Bit,
  value,
});
export const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Executor = (
  statement: string,
  params?: QueryParameter[],
) => Promise<Record<string, unknown>[]>;
const inTx =
  (tx: sql.Transaction): Executor =>
  (statement, params = []) =>
    txQuery(tx, statement, params);
export function requireCompany(auth: AuthContext): number {
  if (!auth.companyId)
    throw new ApiError(403, "Active company membership required.");
  return auth.companyId;
}
function requireAdmin(auth: AuthContext) {
  if (!auth.isAdmin)
    throw new ApiError(403, "Internal administrator required.");
}
const staffQuery = `SELECT DISTINCT u.Id AS userId,u.Name AS name FROM dbo.Users u
 JOIN dbo.AccountStatuses us ON us.Id=u.AccountStatusId JOIN dbo.CompanyMembers cm ON cm.UserId=u.Id
 JOIN dbo.MemberRoles mr ON mr.Id=cm.MemberRoleId JOIN dbo.PermissionTiers pt ON pt.Id=cm.PermissionTierId
 JOIN dbo.AccountStatuses ms ON ms.Id=cm.MemberStatusId JOIN dbo.Companies staffCompany ON staffCompany.Id=cm.CompanyId JOIN dbo.AccountStatuses cs ON cs.Id=staffCompany.VerificationStatusId
 WHERE mr.Code='admin' AND pt.Code='admin_override' AND ms.Code='active' AND us.Code NOT IN ('inactive','suspended') AND cs.Code<>'inactive'`;
export async function publishedListing(
  id: number,
  exec: Executor = query,
  lock = false,
) {
  const rows = await exec(
    `SELECT l.Id AS id,l.Title AS title,l.SellerCompanyId AS sellerCompanyId,c.LegalName AS sellerCompanyName,
 mt.Code AS categoryCode,CONCAT(loc.City,', ',loc.StateProvince) AS locationLabel
 FROM dbo.Listings l ${lock ? "WITH(UPDLOCK,HOLDLOCK)" : ""} JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId
 JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses vs ON vs.Id=c.VerificationStatusId
 JOIN dbo.MaterialTypes mt ON mt.Id=l.MaterialTypeId JOIN dbo.Locations loc ON loc.Id=l.LocationId
 WHERE l.Id=@listingId AND ls.Code='published' AND l.Quantity>0 AND vs.Code<>'inactive' AND l.Quantity>0`,
    [int("listingId", id)],
  );
  if (!rows[0])
    throw new ApiError(404, "Published available listing not found.");
  return rows[0];
}
function panelProjection(row: Record<string, unknown>, admin = false) {
  const result = {
    id: Number(row.id),
    familyCode: String(row.familyCode),
    version: Number(row.version),
    name: String(row.name),
    status: String(row.status),
    materialTypeCodes: JSON.parse(
      String(row.materialTypeCodesJson),
    ) as string[],
    tests: JSON.parse(String(row.testsJson)) as string[],
    optionalTests: JSON.parse(String(row.optionalTestsJson)) as {
      id: string;
      group: string;
      label: string;
    }[],
  };
  return admin
    ? {
        ...result,
        review: row.reviewJson ? JSON.parse(String(row.reviewJson)) : null,
      }
    : result;
}
const panelSelect = `SELECT Id AS id,FamilyCode AS familyCode,Version AS version,Name AS name,Status AS status,MaterialTypeCodesJson AS materialTypeCodesJson,TestsJson AS testsJson,OptionalTestsJson AS optionalTestsJson,ReviewJson AS reviewJson FROM dbo.LabPanels`;
async function configuration(
  listing: Record<string, unknown>,
  exec: Executor = query,
) {
  const rows = await exec(
    `${panelSelect} p WHERE Status='published' AND EXISTS(SELECT 1 FROM OPENJSON(p.MaterialTypeCodesJson) WHERE value=@category)`,
    [text("category", listing.categoryCode)],
  );
  if (rows.length > 1)
    throw new ApiError(
      409,
      "Conflicting panel mappings require internal review.",
    );
  const panel = rows[0] ? panelProjection(rows[0]) : null;
  return {
    listingId: Number(listing.id),
    listingTitle: String(listing.title),
    sellerCompanyName: String(listing.sellerCompanyName),
    locationLabel: String(listing.locationLabel),
    categoryCode: String(listing.categoryCode),
    panel,
    scopeToBeConfirmed: !panel,
    optionalTests: panel?.optionalTests ?? referralOptions,
  };
}
const requestSelect = `SELECT r.Id AS id,r.ListingId AS listingId,l.Title AS listingTitle,r.SampleRequestId AS sampleRequestId,
 r.CompanyId AS companyId,r.CategoryCode AS categoryCode,r.PanelId AS panelId,r.PanelVersion AS panelVersion,
 r.ScopeJson AS scopeJson,r.OptionalTestIdsJson AS optionalTestIdsJson,r.Concerns AS concerns,r.Turnaround AS turnaround,r.Sharing AS sharing,r.Status AS status,r.CreatedAt AS createdAt,r.OwnerUserId AS ownerUserId,r.Notes AS notes,
 rc.LegalName AS companyName,u.Name AS requestedByName,u.Email AS requestedByEmail
 FROM dbo.LabRequests r JOIN dbo.Listings l ON l.Id=r.ListingId JOIN dbo.Companies rc ON rc.Id=r.CompanyId JOIN dbo.Users u ON u.Id=r.RequestedByUserId`;
const reportSelect = `SELECT p.Id AS id,p.RequestId AS requestId,r.ListingId AS listingId,p.LaboratoryName AS laboratoryName,p.BatchReference AS batchReference,
 CONVERT(VARCHAR(10),p.SampleDate,23) AS sampleDate,CONVERT(VARCHAR(10),p.ReportDate,23) AS reportDate,p.ResultsJson AS resultsJson,
 p.FileName AS fileName,p.ByteLength AS byteLength,p.Sha256 AS sha256,p.Published AS published,r.Sharing AS sharing
 FROM dbo.LabReports p JOIN dbo.LabRequests r ON r.Id=p.RequestId`;
function reportProjection(row: Record<string, unknown>) {
  const { resultsJson, ...rest } = row;
  return {
    ...rest,
    results: JSON.parse(String(resultsJson)),
    fileUrl: `/api/lab/reports/${row.id}/file`,
  };
}
async function requestProjection(row: Record<string, unknown>, admin = false) {
  const {
    scopeJson,
    optionalTestIdsJson,
    ownerUserId,
    notes,
    companyName,
    requestedByName,
    requestedByEmail,
    ...rest
  } = row;
  const reports = (
    await query(`${reportSelect} WHERE r.Id=@id ORDER BY p.Id DESC`, [
      int("id", row.id),
    ])
  ).map(reportProjection);
  return {
    ...rest,
    scope: JSON.parse(String(scopeJson)),
    optionalTestIds: JSON.parse(String(optionalTestIdsJson)),
    reports,
    ...(admin
      ? { ownerUserId, notes, companyName, requestedByName, requestedByEmail }
      : {}),
  };
}
async function readRequest(id: number, auth: AuthContext, admin = false) {
  const rows = await query(
    `${requestSelect} WHERE r.Id=@id AND (@admin=1 OR r.CompanyId=@company)`,
    [
      int("id", id),
      bit("admin", admin && auth.isAdmin),
      int("company", auth.companyId),
    ],
  );
  if (!rows[0]) throw new ApiError(404, "Request not found.");
  return requestProjection(rows[0], admin);
}
export async function notifyInternal(
  exec: Executor,
  actor: number,
  listingId: number,
  subject: string,
  body: string,
) {
  await exec(
    `INSERT dbo.Notifications(UserId,CompanyId,NotificationChannelId,NotificationCategoryId,NotificationStatusId,Subject,Body,RelatedRecordTypeId,RelatedRecordId,CreatedByUserId,UpdatedByUserId,SentAt)
 SELECT staff.userId,NULL,ch.Id,cat.Id,st.Id,@subject,@body,rt.Id,@listingId,@actor,@actor,SYSUTCDATETIME() FROM (${staffQuery}) staff
 CROSS JOIN dbo.NotificationChannels ch CROSS JOIN dbo.NotificationCategories cat CROSS JOIN dbo.NotificationStatuses st CROSS JOIN dbo.RecordTypes rt
 WHERE ch.Code='in_app' AND cat.Code='orders' AND st.Code='sent' AND rt.Code='listing'`,
    [
      int("actor", actor),
      int("listingId", listingId),
      text("subject", subject),
      text("body", body),
    ],
  );
}
async function event(
  exec: Executor,
  id: number,
  auth: AuthContext,
  type: string,
  detail: string,
) {
  await exec(
    "INSERT dbo.LabEvents(RequestId,ActorUserId,EventType,Detail) VALUES(@id,@actor,@type,@detail)",
    [
      int("id", id),
      int("actor", auth.userId),
      text("type", type),
      text("detail", detail),
    ],
  );
}
/** In-app notification for a saved sample party; never an outbound email. */
export async function notifySampleCompany(
  exec: Executor,
  actor: number,
  company: number,
  listingId: number,
  subject: string,
  body: string,
) {
  await exec(
    `INSERT dbo.Notifications(CompanyId,NotificationChannelId,NotificationCategoryId,NotificationStatusId,Subject,Body,RelatedRecordTypeId,RelatedRecordId,CreatedByUserId,UpdatedByUserId,SentAt)
 SELECT @company,ch.Id,cat.Id,st.Id,@subject,@body,rt.Id,@listing,@actor,@actor,SYSUTCDATETIME()
 FROM dbo.NotificationChannels ch CROSS JOIN dbo.NotificationCategories cat CROSS JOIN dbo.NotificationStatuses st CROSS JOIN dbo.RecordTypes rt
 WHERE ch.Code='in_app' AND cat.Code='orders' AND st.Code='sent' AND rt.Code='listing'`,
    [
      int("actor", actor),
      int("company", company),
      int("listing", listingId),
      text("subject", subject),
      text("body", body),
    ],
  );
}
async function createRequest(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const company = requireCompany(auth),
    body = validateRequest(await readJsonBody(request)),
    payloadHash = hash(body);
  const result = await runInTransaction(async (tx) => {
    const exec = inTx(tx);
    // Transaction-owned application lock avoids concurrent first-insert races, including an empty key range.
    await exec(
      `DECLARE @result INT; EXEC @result=sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @result<0 THROW 50001,'Request retry lock unavailable',1;`,
      [text("resource", `lab-request:${company}:${body.idempotencyKey}`)],
    );
    const existing = (
      await exec(
        "SELECT Id AS id,PayloadHash AS payloadHash FROM dbo.LabRequests WHERE CompanyId=@company AND IdempotencyKey=@key",
        [int("company", company), text("key", body.idempotencyKey)],
      )
    )[0];
    if (existing) {
      if (existing.payloadHash !== payloadHash)
        throw new ApiError(
          409,
          "Idempotency key was already used with different data.",
        );
      return { id: Number(existing.id), created: false };
    }
    const listing = await publishedListing(body.listingId, exec, true);
    if (listing.sellerCompanyId === company)
      throw new ApiError(403, "Cannot request testing for your own listing.");
    if (body.sampleRequestId !== null) {
      const samples = await exec(
        `SELECT Id FROM dbo.SampleRequests WITH(UPDLOCK,HOLDLOCK) WHERE Id=@sample AND ListingId=@listing AND BuyerCompanyId=@company AND Status<>'declined'`,
        [
          int("sample", body.sampleRequestId),
          int("listing", body.listingId),
          int("company", company),
        ],
      );
      if (!samples.length)
        throw new ApiError(
          400,
          "Sample must belong to your company and this listing.",
        );
    }
    const config = await configuration(listing, exec);
    validateSelection(body, config.panel);
    const rows = await exec(
      `INSERT dbo.LabRequests(ListingId,CompanyId,RequestedByUserId,SampleRequestId,IdempotencyKey,PayloadHash,CategoryCode,PanelId,PanelVersion,ScopeJson,OptionalTestIdsJson,Concerns,Turnaround,Sharing)
 OUTPUT INSERTED.Id AS id VALUES(@listing,@company,@actor,@sample,@key,@hash,@category,@panel,@version,@scope,@tests,@concerns,@turnaround,@sharing)`,
      [
        int("listing", body.listingId),
        int("company", company),
        int("actor", auth.userId),
        int("sample", body.sampleRequestId),
        text("key", body.idempotencyKey),
        text("hash", payloadHash),
        text("category", config.categoryCode),
        int("panel", body.panelId),
        int("version", body.panelVersion),
        text("scope", JSON.stringify(config)),
        text("tests", JSON.stringify(body.optionalTestIds)),
        text("concerns", body.concerns),
        text("turnaround", body.turnaround),
        text("sharing", body.sharing),
      ],
    );
    const id = Number(rows[0]?.id);
    await event(
      exec,
      id,
      auth,
      "created",
      `Referral from ${body.sampleRequestId ? "sample" : "listing"}; sharing ${body.sharing}.`,
    );
    await notifyInternal(
      exec,
      auth.userId,
      body.listingId,
      "Lab testing referral received",
      `Referral ${id} for ${listing.title}. Review in the internal lab queue; no booking has been made.`,
    );
    return { id, created: true };
  });
  sendJson(response, result.created ? 201 : 200, {
    ok: true,
    request: await readRequest(result.id, auth),
  });
}
// One predicate powers both metadata and file reads; no signed or cacheable URLs.
export const reportAccess = `(@admin=1 OR r.CompanyId=@company OR (r.Sharing='shared' AND p.Published=1 AND ls.Code='published' AND l.Quantity>0 AND vs.Code<>'inactive'))`;
const visibilityJoins = ` JOIN dbo.Listings l ON l.Id=r.ListingId JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses vs ON vs.Id=c.VerificationStatusId`;
async function listReports(listingId: number, auth?: AuthContext) {
  return (
    await query(
      `${reportSelect}${visibilityJoins} WHERE r.ListingId=@listing AND ${reportAccess} ORDER BY p.Id DESC`,
      [
        int("listing", listingId),
        int("company", auth?.companyId),
        bit("admin", auth?.isAdmin ?? false),
      ],
    )
  ).map(reportProjection);
}
async function uploadReport(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const b = await validateReport(await readJsonBody(request));
  const reportId = await runInTransaction(async (tx) => {
    const exec = inTx(tx);
    const target = (
      await exec(
        "SELECT Id,Status AS status FROM dbo.LabRequests WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id",
        [int("id", id)],
      )
    )[0];
    if (!target) throw new ApiError(404, "Request not found.");
    if (target.status === "cancelled")
      throw new ApiError(409, "Cannot attach a report to a cancelled request.");
    const rows = await exec(
      `INSERT dbo.LabReports(RequestId,LaboratoryName,BatchReference,SampleDate,ReportDate,ResultsJson,FileName,FileBytes,ByteLength,Sha256,Published,UploadedByUserId)
  OUTPUT INSERTED.Id AS id VALUES(@id,@lab,@batch,@sample,@report,@results,@name,@bytes,@length,@hash,@published,@actor)`,
      [
        int("id", id),
        text("lab", b.laboratoryName),
        text("batch", b.batchReference),
        text("sample", b.sampleDate),
        text("report", b.reportDate),
        text("results", JSON.stringify(b.results)),
        text("name", b.fileName),
        { name: "bytes", type: sql.VarBinary(sql.MAX), value: b.bytes },
        int("length", b.bytes.length),
        text("hash", createHash("sha256").update(b.bytes).digest("hex")),
        bit("published", b.published),
        int("actor", auth.userId),
      ],
    );
    await exec(
      "UPDATE dbo.LabRequests SET Status='completed',UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
      [int("id", id)],
    );
    await event(
      exec,
      id,
      auth,
      "report_attached",
      `Report ${rows[0]?.id}, batch ${b.batchReference}; published ${b.published}.`,
    );
    return Number(rows[0]?.id);
  });
  const report = (
    await query(`${reportSelect} WHERE p.Id=@id`, [int("id", reportId)])
  )[0];
  sendJson(response, 201, { ok: true, report: reportProjection(report!) });
}
async function savePanel(
  request: IncomingMessage,
  response: ServerResponse,
  auth: AuthContext,
) {
  const b = validatePanel(await readJsonBody(request));
  const id = await runInTransaction(async (tx) => {
    const exec = inTx(tx);
    await exec(
      "DECLARE @result INT; EXEC @result=sp_getapplock @Resource='lab-panels',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; IF @result<0 THROW 50001,'Panel configuration lock unavailable',1;",
    );
    for (const code of b.materialTypeCodes)
      if (
        !(
          await exec(
            "SELECT Id FROM dbo.MaterialTypes WHERE Code=@code AND IsActive=1",
            [text("code", code)],
          )
        ).length
      )
        throw new ApiError(400, "Unknown material mapping.");
    if (b.status === "published") {
      for (const code of b.materialTypeCodes)
        if (
          (
            await exec(
              "SELECT Id FROM dbo.LabPanels p WHERE Status='published' AND FamilyCode<>@family AND EXISTS(SELECT 1 FROM OPENJSON(p.MaterialTypeCodesJson) WHERE value=@code)",
              [text("family", b.familyCode), text("code", code)],
            )
          ).length
        )
          throw new ApiError(
            409,
            "Material already mapped to another published family.",
          );
      await exec(
        "UPDATE dbo.LabPanels SET Status='retired' WHERE FamilyCode=@family AND Status='published'",
        [text("family", b.familyCode)],
      );
    }
    if (b.status === "retired")
      await exec(
        "UPDATE dbo.LabPanels SET Status='retired' WHERE FamilyCode=@family AND Status='published'",
        [text("family", b.familyCode)],
      );
    const rows = await exec(
      `INSERT dbo.LabPanels(FamilyCode,Version,Name,MaterialTypeCodesJson,TestsJson,OptionalTestsJson,Status,ReviewJson,ReviewedByUserId)
  OUTPUT INSERTED.Id AS id SELECT @family,COALESCE(MAX(Version),0)+1,@name,@materials,@tests,@optional,@status,@review,@actor FROM dbo.LabPanels WHERE FamilyCode=@family`,
      [
        text("family", b.familyCode),
        text("name", b.name),
        text("materials", JSON.stringify(b.materialTypeCodes)),
        text("tests", JSON.stringify(b.tests)),
        text("optional", JSON.stringify(b.optionalTests)),
        text("status", b.status),
        text("review", b.review ? JSON.stringify(b.review) : null),
        int("actor", b.review ? auth.userId : null),
      ],
    );
    return Number(rows[0]?.id);
  });
  const row = (await query(`${panelSelect} WHERE Id=@id`, [int("id", id)]))[0];
  sendJson(response, 201, { ok: true, panel: panelProjection(row!, true) });
}
async function updateAdminRequest(
  request: IncomingMessage,
  response: ServerResponse,
  id: number,
  auth: AuthContext,
) {
  const b = await readJsonBody(request);
  exactKeys(b, ["status", "ownerUserId", "notes"]);
  const status = b.status === undefined ? null : choice(b.status, statuses);
  const owner = b.ownerUserId == null ? null : positiveId(b.ownerUserId);
  const notes = b.notes === undefined ? null : string(b.notes, 4000, true);
  await runInTransaction(async (tx) => {
    const exec = inTx(tx);
    if (
      !(
        await exec(
          "SELECT Id,Status AS status FROM dbo.LabRequests WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id",
          [int("id", id)],
        )
      ).length
    )
      throw new ApiError(404, "Request not found.");
    if (
      owner !== null &&
      !(await exec(`${staffQuery} AND u.Id=@owner`, [int("owner", owner)]))
        .length
    )
      throw new ApiError(
        400,
        "Owner must be an active internal administrator.",
      );
    if (
      status === "completed" &&
      !(
        await exec("SELECT Id FROM dbo.LabReports WHERE RequestId=@id", [
          int("id", id),
        ])
      ).length
    )
      throw new ApiError(400, "Completed requests require an actual report.");
    await exec(
      `UPDATE dbo.LabRequests SET Status=COALESCE(@status,Status),OwnerUserId=CASE WHEN @setOwner=1 THEN @owner ELSE OwnerUserId END,Notes=COALESCE(@notes,Notes),UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`,
      [
        int("id", id),
        text("status", status),
        bit("setOwner", b.ownerUserId !== undefined),
        int("owner", owner),
        text("notes", notes),
      ],
    );
    await event(
      exec,
      id,
      auth,
      "admin_updated",
      JSON.stringify(b).slice(0, 4000),
    );
  });
  sendJson(response, 200, {
    ok: true,
    request: await readRequest(id, auth, true),
  });
}
export async function handleLabRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  const path = url.pathname,
    method = request.method;
  const listingReports = /^\/api\/listings\/(\d+)\/lab-reports$/.exec(path);
  if (
    !path.startsWith("/api/lab/") &&
    !path.startsWith("/api/admin/lab/") &&
    !listingReports
  )
    return false;
  response.setHeader("cache-control", "private, no-store");
  response.setHeader("vary", "Authorization");
  const file = /^\/api\/lab\/reports\/(\d+)\/file$/.exec(path);
  if (
    method === "GET" &&
    (path === "/api/lab/config" || listingReports || file)
  ) {
    const auth = request.headers.authorization
      ? await requireSessionAuth(request)
      : undefined;
    if (path === "/api/lab/config")
      sendJson(response, 200, {
        ok: true,
        config: await configuration(
          await publishedListing(
            positiveId(Number(url.searchParams.get("listingId"))),
          ),
        ),
      });
    else if (listingReports)
      sendJson(response, 200, {
        ok: true,
        reports: await listReports(positiveId(Number(listingReports[1])), auth),
      });
    else if (file) {
      const rows = await query(
        `SELECT p.FileBytes AS bytes,p.FileName AS fileName FROM dbo.LabReports p JOIN dbo.LabRequests r ON r.Id=p.RequestId${visibilityJoins} WHERE p.Id=@id AND ${reportAccess}`,
        [
          int("id", positiveId(Number(file[1]))),
          int("company", auth?.companyId),
          bit("admin", auth?.isAdmin ?? false),
        ],
      );
      const row = rows[0];
      if (!row || !Buffer.isBuffer(row.bytes))
        throw new ApiError(404, "Report not found.");
      response.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${String(row.fileName).replace(/[^\w .()-]/g, "_")}"`,
        "content-length": row.bytes.length,
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
        ...corsHeaders(),
      });
      response.end(row.bytes);
    }
    return true;
  }
  const auth = await requireSessionAuth(request);
  if (path.startsWith("/api/admin/")) requireAdmin(auth);
  else requireCompany(auth);
  if (path === "/api/lab/requests" && method === "POST") {
    await createRequest(request, response, auth);
    return true;
  }
  if (
    (path === "/api/lab/requests" || path === "/api/admin/lab/requests") &&
    method === "GET"
  ) {
    const admin = path.startsWith("/api/admin/");
    const status = url.searchParams.get("status");
    if (status) choice(status, statuses);
    const listingId = url.searchParams.has("listingId")
      ? positiveId(Number(url.searchParams.get("listingId")))
      : null;
    const rows = await query(
      `${requestSelect} WHERE (@admin=1 OR r.CompanyId=@company) AND (@status IS NULL OR r.Status=@status) AND (@listing IS NULL OR r.ListingId=@listing) ORDER BY r.Id DESC`,
      [
        bit("admin", admin),
        int("company", auth.companyId),
        text("status", status),
        int("listing", listingId),
      ],
    );
    sendJson(response, 200, {
      ok: true,
      requests: await Promise.all(
        rows.map((row) => requestProjection(row, admin)),
      ),
    });
    return true;
  }
  const sharing = /^\/api\/lab\/requests\/(\d+)\/sharing$/.exec(path);
  if (sharing && method === "PATCH") {
    const id = positiveId(Number(sharing[1])),
      b = await readJsonBody(request);
    exactKeys(b, ["sharing"]);
    const value = choice(b.sharing, sharingChoices);
    await runInTransaction(async (tx) => {
      const exec = inTx(tx);
      const rows = await exec(
        "UPDATE dbo.LabRequests SET Sharing=@sharing,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.Id AS id WHERE Id=@id AND CompanyId=@company",
        [text("sharing", value), int("id", id), int("company", auth.companyId)],
      );
      if (!rows.length) throw new ApiError(404, "Request not found.");
      await event(exec, id, auth, "sharing_changed", value);
    });
    sendJson(response, 200, { ok: true, request: await readRequest(id, auth) });
    return true;
  }
  if (path === "/api/admin/lab/assignees" && method === "GET") {
    sendJson(response, 200, { ok: true, assignees: await query(staffQuery) });
    return true;
  }
  if (path === "/api/admin/lab/panels") {
    if (method === "GET") {
      sendJson(response, 200, {
        ok: true,
        panels: (
          await query(`${panelSelect} ORDER BY FamilyCode,Version DESC`)
        ).map((row) => panelProjection(row, true)),
      });
      return true;
    }
    if (method === "POST") {
      await savePanel(request, response, auth);
      return true;
    }
  }
  const adminRequest = /^\/api\/admin\/lab\/requests\/(\d+)$/.exec(path);
  if (adminRequest && method === "PATCH") {
    await updateAdminRequest(
      request,
      response,
      positiveId(Number(adminRequest[1])),
      auth,
    );
    return true;
  }
  const upload = /^\/api\/admin\/lab\/requests\/(\d+)\/reports$/.exec(path);
  if (upload && method === "POST") {
    await uploadReport(request, response, positiveId(Number(upload[1])), auth);
    return true;
  }
  const publication = /^\/api\/admin\/lab\/reports\/(\d+)$/.exec(path);
  if (publication && method === "PATCH") {
    const id = positiveId(Number(publication[1])),
      b = await readJsonBody(request);
    exactKeys(b, ["published"]);
    if (typeof b.published !== "boolean")
      throw new ApiError(400, "published must be boolean.");
    await runInTransaction(async (tx) => {
      const exec = inTx(tx);
      const rows = await exec(
        "UPDATE dbo.LabReports SET Published=@published OUTPUT INSERTED.RequestId AS requestId WHERE Id=@id",
        [bit("published", b.published), int("id", id)],
      );
      if (!rows[0]) throw new ApiError(404, "Report not found.");
      await event(
        exec,
        Number(rows[0].requestId),
        auth,
        "report_publication",
        `Report ${id}: ${b.published}`,
      );
    });
    const row = (
      await query(`${reportSelect} WHERE p.Id=@id`, [int("id", id)])
    )[0];
    sendJson(response, 200, { ok: true, report: reportProjection(row!) });
    return true;
  }
  throw new ApiError(404, "Lab endpoint not found.");
}
