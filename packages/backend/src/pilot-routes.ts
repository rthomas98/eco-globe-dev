import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, readJsonBody, sendJson, type AuthContext } from "./http.js";
import { int, text, bit, hash, requireCompany } from "./lab-routes.js";
import {
  object,
  exactKeys,
  string,
  choice,
  positiveId,
} from "./lab-validation.js";
import {
  validatePilot,
  pilotConstraints,
  pilotStates,
  pilotSteps,
  assertPilotTransition,
  slotStart,
} from "./pilot-validation.js";
type Row = Record<string, unknown>;
type Exec = (q: string, p?: QueryParameter[]) => Promise<Row[]>;
const txExec =
  (tx: sql.Transaction): Exec =>
  (q, p = []) =>
    queryRowsWithParamsInTransaction(tx, q, p);
const dt = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.DateTime2,
  value,
});
const num = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.Decimal(18, 3),
  value,
});
const staffSql = `SELECT DISTINCT u.Id AS userId,u.Name AS name FROM dbo.Users u JOIN dbo.AccountStatuses us ON us.Id=u.AccountStatusId JOIN dbo.CompanyMembers cm ON cm.UserId=u.Id JOIN dbo.MemberRoles mr ON mr.Id=cm.MemberRoleId JOIN dbo.PermissionTiers pt ON pt.Id=cm.PermissionTierId JOIN dbo.AccountStatuses ms ON ms.Id=cm.MemberStatusId JOIN dbo.Companies c ON c.Id=cm.CompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId WHERE mr.Code='admin' AND pt.Code='admin_override' AND ms.Code='active' AND us.Code NOT IN ('inactive','suspended') AND cs.Code<>'inactive'`;
const selectSql = `SELECT p.Id AS id,p.ListingId AS listingId,p.ListingTitle AS listingTitle,p.BuyerCompanyId AS buyerCompanyId,p.SellerCompanyId AS sellerCompanyId,b.LegalName AS buyerCompanyName,s.LegalName AS sellerCompanyName,p.OriginLabel AS originLabel,p.DestinationLabel AS destinationLabel,p.DestinationRegion AS destinationRegion,p.LoadChoice AS loadChoice,p.LoadCount AS loadCount,p.ApproximateTonnage AS approximateTonnage,p.NeededBy AS neededBy,p.ConstraintsJson AS constraintsJson,p.Objective AS objective,p.Status AS status,p.ContactPreference AS contactPreference,p.OwnerUserId AS ownerUserId,u.Name AS ownerName,p.NextAction AS nextAction,p.BuyerConsentedAt AS buyerConsentedAt,p.CreatedAt AS createdAt,p.UpdatedAt AS updatedAt,sl.StartsAt AS callStartsAt,sl.EndsAt AS callEndsAt,sh.Id AS shipmentId FROM dbo.PilotRequests p JOIN dbo.Companies b ON b.Id=p.BuyerCompanyId JOIN dbo.Companies s ON s.Id=p.SellerCompanyId LEFT JOIN dbo.Users u ON u.Id=p.OwnerUserId LEFT JOIN dbo.PilotSlots sl ON sl.RequestId=p.Id LEFT JOIN dbo.Shipments sh ON sh.PilotRequestId=p.Id`;
function project(r: Row): Row {
  const { constraintsJson, ...rest } = r;
  return {
    ...rest,
    reference: `PR-${r.id}`,
    originLabel: String(r.originLabel ?? "").replace(/[,\s]+$/, ""),
    destinationLabel: String(r.destinationLabel ?? "").replace(/[,\s]+$/, ""),
    constraints: JSON.parse(String(constraintsJson)),
  };
}
async function getRequest(
  id: number,
  auth: AuthContext,
  exec: Exec = query,
): Promise<Row> {
  const rows = await exec(
    `${selectSql} WHERE p.Id=@id AND (@admin=1 OR p.BuyerCompanyId=@company)`,
    [int("id", id), bit("admin", auth.isAdmin), int("company", auth.companyId)],
  );
  if (!rows[0]) throw new ApiError(404, "Pilot request not found.");
  return {
    ...project(rows[0]),
    nextAction: auth.isAdmin ? rows[0].nextAction : "",
  };
}
async function lockRequest(id: number, auth: AuthContext, exec: Exec) {
  const rows = await exec(
    "SELECT Id FROM dbo.PilotRequests WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND (@admin=1 OR BuyerCompanyId=@company)",
    [int("id", id), bit("admin", auth.isAdmin), int("company", auth.companyId)],
  );
  if (!rows[0]) throw new ApiError(404, "Pilot request not found.");
  return getRequest(id, auth, exec);
}
async function notes(id: number, exec: Exec = query) {
  return exec(
    `SELECT n.Id AS id,n.Body AS body,n.CreatedAt AS createdAt,u.Name AS createdByName FROM dbo.PilotNotes n JOIN dbo.Users u ON u.Id=n.CreatedByUserId WHERE n.RequestId=@id ORDER BY n.Id DESC`,
    [int("id", id)],
  );
}
async function addNote(
  id: number,
  body: string,
  auth: AuthContext,
  exec: Exec = query,
) {
  const rows = await exec(
    "INSERT dbo.PilotNotes(RequestId,Body,CreatedByUserId) OUTPUT INSERTED.Id AS id VALUES(@id,@body,@user)",
    [int("id", id), text("body", body), int("user", auth.userId)],
  );
  return rows[0];
}
async function steps(id: number, exec: Exec = query) {
  return exec(
    `SELECT st.StepKey AS [key],st.Completed AS completed,st.CompletedAt AS completedAt,u.Name AS completedByName FROM dbo.PilotSteps st LEFT JOIN dbo.Users u ON u.Id=st.CompletedByUserId WHERE st.RequestId=@id`,
    [int("id", id)],
  );
}
async function slots(admin = false, exec: Exec = query) {
  return exec(
    `SELECT sl.Id AS id,sl.StartsAt AS startsAt,sl.EndsAt AS endsAt,sl.OwnerUserId AS ownerUserId,u.Name AS ownerName${admin ? ",sl.RequestId AS requestId" : ""} FROM dbo.PilotSlots sl JOIN dbo.Users u ON u.Id=sl.OwnerUserId WHERE sl.OwnerUserId IN(SELECT userId FROM (${staffSql}) staff) ${admin ? "" : "AND sl.RequestId IS NULL AND sl.StartsAt>SYSUTCDATETIME()"} ORDER BY sl.StartsAt`,
  );
}
async function listing(id: number, exec: Exec = query) {
  const rows = await exec(
    `SELECT l.Id AS id,l.Title AS title,l.SellerCompanyId AS sellerCompanyId,c.LegalName AS sellerCompanyName,l.LocationId AS originLocationId,loc.CountryCode AS countryCode,CONCAT_WS(', ',NULLIF(loc.City,''),NULLIF(loc.StateProvince,'')) AS locationLabel FROM dbo.Listings l JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId JOIN dbo.Locations loc ON loc.Id=l.LocationId WHERE l.Id=@id AND ls.Code='published' AND l.Quantity>0 AND cs.Code<>'inactive'`,
    [int("id", id)],
  );
  if (!rows[0]) throw new ApiError(404, "Available listing not found.");
  if (String(rows[0].countryCode).trim() !== "US")
    throw new ApiError(
      400,
      "Pilots currently support domestic US deliveries only.",
    );
  return rows[0];
}
async function create(value: unknown, auth: AuthContext) {
  const b = validatePilot(value),
    company = requireCompany(auth);
  return runInTransaction(async (tx) => {
    const exec = txExec(tx);
    const prior = await exec(
      "SELECT Id AS id,RequestHash AS requestHash FROM dbo.PilotRequests WITH(UPDLOCK,HOLDLOCK) WHERE BuyerCompanyId=@company AND ClientRequestId=@key",
      [int("company", company), text("key", b.clientRequestId)],
    );
    if (prior[0]) {
      if (prior[0].requestHash !== hash(b))
        throw new ApiError(
          409,
          "Request key was already used for different details.",
        );
      return getRequest(Number(prior[0].id), auth, exec);
    }
    const l = await listing(b.listingId, exec);
    if (l.sellerCompanyId === company)
      throw new ApiError(
        400,
        "You cannot request a pilot from your own company.",
      );
    const locations = await exec(
      "SELECT Id,CountryCode,City,StateProvince,PostalCode FROM dbo.Locations WHERE Id=@id AND CompanyId=@company",
      [int("id", b.deliveryLocationId), int("company", company)],
    );
    const loc = locations[0];
    if (!loc)
      throw new ApiError(
        400,
        "Choose a delivery site belonging to your company.",
      );
    if (String(loc.CountryCode).trim() !== "US")
      throw new ApiError(
        400,
        "Pilots currently support domestic US deliveries only.",
      );
    const rows = await exec(
      `INSERT dbo.PilotRequests(ListingId,BuyerCompanyId,SellerCompanyId,OriginLocationId,DeliveryLocationId,ListingTitle,OriginLabel,DestinationLabel,DestinationRegion,LoadChoice,LoadCount,ApproximateTonnage,NeededBy,ConstraintsJson,Objective,ClientRequestId,RequestHash,CreatedByUserId) OUTPUT INSERTED.Id AS id VALUES(@listing,@buyer,@seller,@origin,@destination,@title,@originLabel,@destinationLabel,@region,@choice,@loads,@tonnage,@needed,@constraints,@objective,@key,@hash,@user)`,
      [
        int("listing", b.listingId),
        int("buyer", company),
        int("seller", l.sellerCompanyId),
        int("origin", l.originLocationId),
        int("destination", b.deliveryLocationId),
        text("title", l.title),
        text("originLabel", l.locationLabel),
        text(
          "destinationLabel",
          [loc.City, loc.StateProvince, loc.PostalCode]
            .filter(Boolean)
            .join(", "),
        ),
        text("region", [loc.StateProvince, "US"].filter(Boolean).join(", ")),
        text("choice", b.loadChoice),
        int("loads", b.loadCount),
        num("tonnage", b.approximateTonnage),
        text("needed", b.neededBy),
        text("constraints", JSON.stringify(b.constraints)),
        text("objective", b.objective),
        text("key", b.clientRequestId),
        text("hash", hash(b)),
        int("user", auth.userId),
      ],
    );
    const id = Number(rows[0].id);
    for (const key of pilotSteps)
      await exec("INSERT dbo.PilotSteps(RequestId,StepKey) VALUES(@id,@key)", [
        int("id", id),
        text("key", key),
      ]);
    await addNote(id, "Pilot request received.", auth, exec);
    return getRequest(id, auth, exec);
  });
}
export async function handlePilotRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  const path = url.pathname,
    method = req.method;
  if (
    !path.startsWith("/api/pilots/") &&
    !path.startsWith("/api/admin/pilots/")
  )
    return false;
  res.setHeader("cache-control", "private, no-store");
  res.setHeader("vary", "Authorization");
  const auth = await requireSessionAuth(req),
    admin = path.startsWith("/api/admin/");
  if (admin && !auth.isAdmin)
    throw new ApiError(403, "Internal administrator required.");
  if (!auth.isAdmin) requireCompany(auth);
  const body = async () =>
    object(await readJsonBody<Record<string, unknown>>(req));
  if (path === "/api/pilots/config" && method === "GET") {
    const l = await listing(
      positiveId(Number(url.searchParams.get("listingId"))),
    );
    const locations = await query(
      "SELECT Id AS id,Name AS name,AddressLine1 AS addressLine1,City AS city,StateProvince AS stateProvince,PostalCode AS postalCode,CountryCode AS countryCode FROM dbo.Locations WHERE CompanyId=@company AND CountryCode='US' ORDER BY IsDefault DESC,Id",
      [int("company", auth.companyId)],
    );
    sendJson(res, 200, {
      ok: true,
      listing: l,
      locations,
      constraints: pilotConstraints,
      staff: auth.isAdmin ? await query(staffSql) : [],
    });
    return true;
  }
  if (path === "/api/pilots/requests" && method === "POST") {
    sendJson(res, 201, { ok: true, request: await create(await body(), auth) });
    return true;
  }
  if (
    (path === "/api/pilots/requests" ||
      path === "/api/admin/pilots/requests") &&
    method === "GET"
  ) {
    const search = string(url.searchParams.get("q") ?? "", 200, true),
      status = url.searchParams.get("status") ?? "";
    if (status) choice(status, pilotStates);
    const rows = await query(
      `${selectSql} WHERE (@admin=1 OR p.BuyerCompanyId=@company) AND (@status='' OR p.Status=@status) AND (@q='' OR p.ListingTitle LIKE @search OR p.Objective LIKE @search OR p.OriginLabel LIKE @search OR p.DestinationLabel LIKE @search OR CONCAT('PR-',p.Id) LIKE @search OR (@admin=1 AND EXISTS(SELECT 1 FROM dbo.PilotNotes n WHERE n.RequestId=p.Id AND n.Body LIKE @search))) ORDER BY p.Id DESC`,
      [
        bit("admin", admin),
        int("company", auth.companyId),
        text("status", status),
        text("q", search),
        text("search", `%${search.replace(/[\[\]%_]/g, "[$&]")}%`),
      ],
    );
    const counts = admin
      ? (
          await query(
            `SELECT SUM(CASE WHEN Status='new' THEN 1 ELSE 0 END) AS [new],SUM(CASE WHEN Status='call_booked' THEN 1 ELSE 0 END) AS call_due,SUM(CASE WHEN Status IN ('call_held','working_lane') THEN 1 ELSE 0 END) AS working_lane,SUM(CASE WHEN Status='offer_sent' THEN 1 ELSE 0 END) AS offer_sent,SUM(CASE WHEN Status='won' THEN 1 ELSE 0 END) AS moving FROM dbo.PilotRequests`,
          )
        )[0]
      : undefined;
    sendJson(res, 200, {
      ok: true,
      requests: rows.map((row) => ({
        ...project(row),
        nextAction: admin ? row.nextAction : "",
      })),
      ...(admin
        ? {
            counts: Object.fromEntries(
              Object.entries(counts ?? {}).map(([k, v]) => [k, v ?? 0]),
            ),
            staff: await query(staffSql),
          }
        : {}),
    });
    return true;
  }
  if (
    (path === "/api/pilots/slots" || path === "/api/admin/pilots/slots") &&
    method === "GET"
  ) {
    sendJson(res, 200, {
      ok: true,
      slots: await slots(admin),
      ...(admin ? { staff: await query(staffSql) } : {}),
    });
    return true;
  }
  if (path === "/api/admin/pilots/slots" && method === "POST") {
    const b = await body();
    exactKeys(b, ["ownerUserId", "startsAt"]);
    const owner = positiveId(b.ownerUserId),
      start = slotStart(b.startsAt),
      end = new Date(start.getTime() + 900000);
    const result = await runInTransaction(async (tx) => {
      const exec = txExec(tx);
      // Serialize owner calendar changes even when no prior slots exist.
      await exec(
        "SELECT Id FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE Id=@owner",
        [int("owner", owner)],
      );
      if (!(await exec(staffSql)).some((r) => r.userId === owner))
        throw new ApiError(400, "Choose an active internal staff member.");
      if (
        (
          await exec(
            "SELECT Id FROM dbo.PilotSlots WITH(UPDLOCK,HOLDLOCK) WHERE OwnerUserId=@owner AND StartsAt<@end AND EndsAt>@start",
            [int("owner", owner), dt("start", start), dt("end", end)],
          )
        ).length
      )
        throw new ApiError(
          409,
          "This staff member already has a slot at that time.",
        );
      return (
        await exec(
          "INSERT dbo.PilotSlots(OwnerUserId,StartsAt,EndsAt,CreatedByUserId) OUTPUT INSERTED.Id AS id VALUES(@owner,@start,@end,@user)",
          [
            int("owner", owner),
            dt("start", start),
            dt("end", end),
            int("user", auth.userId),
          ],
        )
      )[0];
    });
    sendJson(res, 201, { ok: true, slot: result });
    return true;
  }
  const slotDelete = /^\/api\/admin\/pilots\/slots\/(\d+)$/.exec(path);
  if (slotDelete && method === "DELETE") {
    await runInTransaction(async (tx) => {
      const exec = txExec(tx),
        id = positiveId(Number(slotDelete[1]));
      const row = (
        await exec(
          "SELECT RequestId FROM dbo.PilotSlots WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id",
          [int("id", id)],
        )
      )[0];
      if (!row) throw new ApiError(404, "Slot not found.");
      if (row.RequestId !== null)
        throw new ApiError(409, "A booked slot cannot be removed.");
      await exec("DELETE dbo.PilotSlots WHERE Id=@id", [int("id", id)]);
    });
    sendJson(res, 200, { ok: true });
    return true;
  }
  const match =
    /^\/api\/(?:admin\/)?pilots\/requests\/(\d+)(?:\/(schedule|email-preference|proceed|notes|handoff|steps)(?:\/([a-z_]+))?)?$/.exec(
      path,
    );
  if (match) {
    const id = positiveId(Number(match[1])),
      action = match[2];
    if (!action && method === "GET") {
      const r = await getRequest(id, auth);
      sendJson(res, 200, {
        ok: true,
        request: r,
        notes: admin ? await notes(id) : [],
        steps: admin ? await steps(id) : [],
        slots: admin ? [] : await slots(),
      });
      return true;
    }
    if (!action && admin && method === "PATCH") {
      const b = await body();
      exactKeys(b, ["ownerUserId", "nextAction", "status"]);
      const result = await runInTransaction(async (tx) => {
        const exec = txExec(tx),
          r = await lockRequest(id, auth, exec);
        let owner = r.ownerUserId,
          next = r.nextAction,
          status = r.status;
        if ("ownerUserId" in b) {
          owner = b.ownerUserId === null ? null : positiveId(b.ownerUserId);
          if (
            owner !== null &&
            !(await exec(staffSql)).some((x) => x.userId === owner)
          )
            throw new ApiError(400, "Choose an active internal staff member.");
        }
        if ("nextAction" in b) next = string(b.nextAction, 2000, true);
        if ("status" in b) {
          status = choice(b.status, pilotStates);
          assertPilotTransition(String(r.status), String(status));
        }
        await exec(
          "UPDATE dbo.PilotRequests SET OwnerUserId=@owner,NextAction=@next,Status=@status,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
          [
            int("owner", owner),
            text("next", next),
            text("status", status),
            int("id", id),
          ],
        );
        if (status === "lost")
          await exec(
            "UPDATE dbo.PilotSlots SET RequestId=NULL WHERE RequestId=@id",
            [int("id", id)],
          );
        await addNote(id, `Desk updated. Stage: ${status}.`, auth, exec);
        return getRequest(id, auth, exec);
      });
      sendJson(res, 200, { ok: true, request: result });
      return true;
    }
    if (action === "notes" && admin && method === "POST") {
      const b = await body();
      exactKeys(b, ["body"]);
      await getRequest(id, auth);
      const n = await addNote(id, string(b.body, 4000), auth);
      sendJson(res, 201, { ok: true, note: n });
      return true;
    }
    if (action === "steps" && admin && method === "PUT") {
      const key = choice(match[3], pilotSteps),
        b = await body();
      exactKeys(b, ["completed"]);
      if (typeof b.completed !== "boolean")
        throw new ApiError(400, "Choose completed or incomplete.");
      await getRequest(id, auth);
      await query(
        "UPDATE dbo.PilotSteps SET Completed=@done,CompletedByUserId=CASE WHEN @done=1 THEN @user ELSE NULL END,CompletedAt=CASE WHEN @done=1 THEN SYSUTCDATETIME() ELSE NULL END WHERE RequestId=@id AND StepKey=@key",
        [
          bit("done", b.completed),
          int("user", auth.userId),
          int("id", id),
          text("key", key),
        ],
      );
      sendJson(res, 200, { ok: true, steps: await steps(id) });
      return true;
    }
    if (
      !admin &&
      (action === "schedule" ||
        action === "email-preference" ||
        action === "proceed") &&
      method === "POST"
    ) {
      const b = await body();
      exactKeys(
        b,
        action === "schedule"
          ? ["slotId"]
          : action === "proceed"
            ? ["confirm"]
            : [],
      );
      const result = await runInTransaction(async (tx) => {
        const exec = txExec(tx),
          r = await lockRequest(id, { ...auth, isAdmin: false }, exec);
        if (action === "proceed") {
          if (b.confirm !== true)
            throw new ApiError(
              400,
              "Confirm consent to proceed and share your identity.",
            );
          if (r.status === "won" && r.buyerConsentedAt) return r;
          if (r.status !== "offer_sent")
            throw new ApiError(
              409,
              "An offer must be sent before you proceed.",
            );
          await exec(
            "UPDATE dbo.PilotRequests SET Status='won',BuyerConsentedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
            [int("id", id)],
          );
          await addNote(
            id,
            "Buyer agreed to proceed and release company identity.",
            auth,
            exec,
          );
        } else {
          if (!["new", "call_booked"].includes(String(r.status)))
            throw new ApiError(409, "Scheduling is closed at this stage.");
          if (action === "email-preference") {
            await exec(
              "UPDATE dbo.PilotSlots SET RequestId=NULL WHERE RequestId=@id",
              [int("id", id)],
            );
            await exec(
              "UPDATE dbo.PilotRequests SET Status='new',ContactPreference='email',UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
              [int("id", id)],
            );
            await addNote(
              id,
              "Buyer requested email follow-up instead of a call.",
              auth,
              exec,
            );
          } else {
            const slotId = positiveId(b.slotId);
            const sl = (
              await exec(
                "SELECT Id,RequestId,OwnerUserId,StartsAt FROM dbo.PilotSlots WITH(UPDLOCK,HOLDLOCK) WHERE Id=@slot",
                [int("slot", slotId)],
              )
            )[0];
            if (!sl) throw new ApiError(404, "Slot not found.");
            if (sl.RequestId === id) return r;
            if (
              sl.RequestId !== null ||
              new Date(String(sl.StartsAt)).getTime() <= Date.now()
            )
              throw new ApiError(409, "That slot is no longer available.");
            if (
              !(await exec(staffSql)).some((x) => x.userId === sl.OwnerUserId)
            )
              throw new ApiError(
                409,
                "That staff member is no longer available.",
              );
            await exec(
              "UPDATE dbo.PilotSlots SET RequestId=NULL WHERE RequestId=@id",
              [int("id", id)],
            );
            await exec(
              "UPDATE dbo.PilotSlots SET RequestId=@id WHERE Id=@slot",
              [int("id", id), int("slot", slotId)],
            );
            await exec(
              "UPDATE dbo.PilotRequests SET Status='call_booked',ContactPreference='call',OwnerUserId=@owner,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
              [int("owner", sl.OwnerUserId), int("id", id)],
            );
            await addNote(
              id,
              "Buyer booked a fifteen-minute call.",
              auth,
              exec,
            );
          }
        }
        return getRequest(id, auth, exec);
      });
      sendJson(res, 200, { ok: true, request: result });
      return true;
    }
    if (action === "handoff" && admin && method === "POST") {
      const b = await body();
      exactKeys(b, []);
      const result = await runInTransaction(async (tx) => {
        const exec = txExec(tx),
          r = await lockRequest(id, auth, exec);
        if (r.status !== "won" || !r.buyerConsentedAt)
          throw new ApiError(
            409,
            "Buyer agreement is required before shipment handoff.",
          );
        if (r.shipmentId) return r;
        await exec(
          `INSERT dbo.Shipments(PilotRequestId,OriginLocationId,DestinationLocationId,ShipmentStatusId,CreatedByUserId,UpdatedByUserId) SELECT p.Id,p.OriginLocationId,p.DeliveryLocationId,ss.Id,@user,@user FROM dbo.PilotRequests p CROSS JOIN dbo.ShipmentStatuses ss WHERE p.Id=@id AND ss.Code='quote_pending'`,
          [int("id", id), int("user", auth.userId)],
        );
        await addNote(
          id,
          "Pilot handed to fulfilment. No carrier booking or online payment created.",
          auth,
          exec,
        );
        return getRequest(id, auth, exec);
      });
      sendJson(res, 200, {
        ok: true,
        request: result,
        shipmentId: result.shipmentId,
      });
      return true;
    }
  }
  if (path === "/api/pilots/seller-interest" && method === "GET") {
    const rows = await query(
      `${selectSql} WHERE p.SellerCompanyId=@company ORDER BY p.Id DESC`,
      [int("company", auth.companyId)],
    );
    sendJson(res, 200, {
      ok: true,
      requests: rows.map((r) => ({
        id: r.id,
        reference: `PR-${r.id}`,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        loadCount: r.loadCount,
        approximateTonnage: r.approximateTonnage,
        destinationRegion: r.destinationRegion,
        status: r.status,
        ...(r.buyerConsentedAt
          ? {
              buyerCompanyName: r.buyerCompanyName,
              buyerConsentedAt: r.buyerConsentedAt,
            }
          : {}),
      })),
    });
    return true;
  }
  throw new ApiError(404, "Pilot endpoint not found.");
}
