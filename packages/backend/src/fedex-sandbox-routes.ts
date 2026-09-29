import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, readJsonBody, sendJson, corsHeaders } from "./http.js";
import {
  FedExRejectedError,
  fedexConfig,
  fedexQuote,
  fedexBook,
  fedexTrack,
  fedexCancel,
  validateFedExInput,
  type FedExInput,
} from "./fedex-sandbox-provider.js";
const p = (
  name: string,
  value: unknown,
  type: QueryParameter["type"] = sql.NVarChar(sql.MAX),
): QueryParameter => ({ name, value, type });
type Row = {
  Id: string;
  State: string;
  InputJson: string;
  QuoteJson: string;
  ProviderScope: string;
  RequestHash: string;
  TrackingNumber: string | null;
  HasLabel: boolean;
  TrackingJson: string | null;
  LastError: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  BookedAt: Date | null;
  CancelledAt: Date | null;
};
async function row(id: string) {
  const r = (
    await query<Row>(
      "SELECT Id,State,InputJson,QuoteJson,ProviderScope,RequestHash,TrackingNumber,TrackingJson,LastError,CreatedAt,UpdatedAt,BookedAt,CancelledAt,CAST(CASE WHEN LabelBytes IS NULL THEN 0 ELSE 1 END AS bit) AS HasLabel FROM dbo.FedExSandboxShipments WHERE Id=@id",
      [p("id", id, sql.UniqueIdentifier)],
    )
  )[0];
  if (!r) throw new ApiError(404, "Sandbox shipment not found.");
  return r;
}
function view(r: Row) {
  const input = JSON.parse(r.InputJson) as FedExInput;
  const quote = JSON.parse(r.QuoteJson) as { expiresAt: string };
  let state = r.State;
  if (state === "quoted" && new Date(quote.expiresAt).getTime() <= Date.now())
    state = "quote_expired";
  if (
    state === "booking" &&
    Date.now() - new Date(r.UpdatedAt).getTime() > 120000
  )
    state = "booking_unknown";
  return {
    id: r.Id,
    reference: `FX-TEST-${r.Id.slice(0, 8)}`,
    environment: "sandbox",
    ...input,
    state,
    quote,
    trackingNumber: r.TrackingNumber,
    labelAvailable: !!r.HasLabel,
    tracking: r.TrackingJson ? JSON.parse(r.TrackingJson) : null,
    lastError: r.LastError,
    createdAt: r.CreatedAt,
    updatedAt: r.UpdatedAt,
    bookedAt: r.BookedAt,
    cancelledAt: r.CancelledAt,
  };
}
function ensureScope(r: Row) {
  if (r.ProviderScope !== fedexConfig().scope)
    throw new ApiError(
      409,
      "This shipment belongs to different sandbox credentials.",
    );
}
const errorText = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "FedEx sandbox operation could not be confirmed. Contact an administrator; do not repeat booking.";
export async function handleFedExSandboxRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  const prefix = "/api/admin/fedex-sandbox";
  if (!url.pathname.startsWith(prefix + "/")) return false;
  const auth = await requireSessionAuth(req);
  if (!auth.isAdmin) throw new ApiError(403, "Administrator access required.");
  const path = url.pathname.slice(prefix.length);
  if (path === "/shipments" && req.method === "GET") {
    let configured = false;
    try {
      fedexConfig();
      configured = true;
    } catch {}
    const rows = await query<Row>(
      "SELECT TOP(50) Id,State,InputJson,QuoteJson,ProviderScope,RequestHash,TrackingNumber,TrackingJson,LastError,CreatedAt,UpdatedAt,BookedAt,CancelledAt,CAST(CASE WHEN LabelBytes IS NULL THEN 0 ELSE 1 END AS bit) AS HasLabel FROM dbo.FedExSandboxShipments ORDER BY CreatedAt DESC",
      [],
    );
    sendJson(res, 200, {
      environment: "sandbox",
      capabilities: {
        configured,
        services: [
          {
            code: "STANDARD_OVERNIGHT",
            label: "FedEx Standard Overnight",
            available: configured,
          },
          {
            code: "FEDEX_GROUND",
            label: "FedEx Ground",
            available: false,
            reason:
              "Ground shipping is not authorized for the current sandbox test account.",
          },
        ],
        trackingMayBeVirtualized: true,
        notes: [
          "Sandbox only: test labels must not be used to ship goods.",
          "Tracking responses are virtualized provider examples, not actual parcel movement.",
          "Bulk freight remains staff-managed and requires separate FedEx Freight enrollment.",
        ],
      },
      shipments: rows.map(view),
    });
    return true;
  }
  if (path === "/quotes" && req.method === "POST") {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const key = body.idempotencyKey;
    if (typeof key !== "string" || !/^[A-Za-z0-9_-]{16,100}$/.test(key))
      throw new ApiError(400, "Valid idempotency key required.");
    const input = validateFedExInput(body),
      inputJson = JSON.stringify(input),
      hash = createHash("sha256").update(inputJson).digest("hex"),
      scope = fedexConfig().scope;
    const existing = (
      await query<Row>(
        "SELECT Id,State,InputJson,QuoteJson,ProviderScope,RequestHash,TrackingNumber,TrackingJson,LastError,CreatedAt,UpdatedAt,BookedAt,CancelledAt,CAST(CASE WHEN LabelBytes IS NULL THEN 0 ELSE 1 END AS bit) AS HasLabel FROM dbo.FedExSandboxShipments WHERE CreatedByUserId=@user AND IdempotencyKey=@key",
        [p("user", auth.userId, sql.Int), p("key", key)],
      )
    )[0];
    if (existing) {
      if (existing.RequestHash !== hash || existing.ProviderScope !== scope)
        throw new ApiError(
          409,
          "Quote retry does not match its original request.",
        );
      sendJson(res, 200, { shipment: view(existing) });
      return true;
    }
    const rate = await fedexQuote(input);
    const id = randomUUID(),
      now = Date.now();
    const quote = {
      id,
      ...rate,
      provider: "fedex",
      quotedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
    };
    try {
      await query(
        "INSERT INTO dbo.FedExSandboxShipments(Id,CreatedByUserId,IdempotencyKey,RequestHash,ProviderScope,State,InputJson,QuoteJson) VALUES(@id,@user,@key,@hash,@scope,'quoted',@input,@quote)",
        [
          p("id", id, sql.UniqueIdentifier),
          p("user", auth.userId, sql.Int),
          p("key", key),
          p("hash", hash),
          p("scope", scope),
          p("input", inputJson),
          p("quote", JSON.stringify(quote)),
        ],
      );
    } catch (e) {
      const duplicate = (
        await query<Row>(
          "SELECT Id,State,InputJson,QuoteJson,ProviderScope,RequestHash,TrackingNumber,TrackingJson,LastError,CreatedAt,UpdatedAt,BookedAt,CancelledAt,CAST(CASE WHEN LabelBytes IS NULL THEN 0 ELSE 1 END AS bit) AS HasLabel FROM dbo.FedExSandboxShipments WHERE CreatedByUserId=@user AND IdempotencyKey=@key",
          [p("user", auth.userId, sql.Int), p("key", key)],
        )
      )[0];
      if (!duplicate) throw e;
      if (duplicate.RequestHash !== hash || duplicate.ProviderScope !== scope)
        throw new ApiError(409, "Quote retry differs from original.");
      sendJson(res, 200, { shipment: view(duplicate) });
      return true;
    }
    sendJson(res, 201, { shipment: view(await row(id)) });
    return true;
  }
  const match =
    /^\/shipments\/([0-9a-fA-F-]{36})(?:\/(book|label|tracking\/refresh|cancel))?$/.exec(
      path,
    );
  if (!match) throw new ApiError(404, "FedEx sandbox route not found.");
  const id = match[1]!;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ApiError(400, "Invalid shipment ID.");
  const action = match[2];
  let r = await row(id);
  if (!action && req.method === "GET") {
    sendJson(res, 200, { shipment: view(r) });
    return true;
  }
  if (action === "label" && req.method === "GET") {
    const label = (
      await query<{ LabelBytes: Buffer | null }>(
        "SELECT LabelBytes FROM dbo.FedExSandboxShipments WHERE Id=@id",
        [p("id", id, sql.UniqueIdentifier)],
      )
    )[0]?.LabelBytes;
    if (!label) throw new ApiError(404, "Test label is not available.");
    res.writeHead(200, {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="FedEx-TEST-${id}.pdf"`,
      "cache-control": "private, no-store",
      ...corsHeaders(),
    });
    res.end(label);
    return true;
  }
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed.");
  ensureScope(r);
  if (action === "book") {
    const body = await readJsonBody<Record<string, unknown>>(req);
    if (
      body.quoteId !== undefined &&
      (typeof body.quoteId !== "string" ||
        body.quoteId.toLowerCase() !== id.toLowerCase())
    )
      throw new ApiError(409, "Quote does not match shipment.");
    if (["booked", "cancelled"].includes(r.State)) {
      sendJson(res, 200, { shipment: view(r) });
      return true;
    }
    if (view(r).state !== "quoted")
      throw new ApiError(
        409,
        "This quote cannot be booked. Booking may already be in progress or uncertain.",
      );
    const claimed = await query<{ Id: string }>(
      "UPDATE dbo.FedExSandboxShipments SET State='booking',UpdatedAt=SYSUTCDATETIME(),LastError=NULL OUTPUT INSERTED.Id WHERE Id=@id AND State='quoted' AND TRY_CONVERT(datetimeoffset,JSON_VALUE(QuoteJson,'$.expiresAt'))>SYSUTCDATETIME()",
      [p("id", id, sql.UniqueIdentifier)],
    );
    if (!claimed.length)
      throw new ApiError(409, "Booking already started or quote expired.");
    try {
      const result = await fedexBook(
        validateFedExInput(JSON.parse(r.InputJson)),
        `FX-TEST-${id.slice(0, 8)}`,
      );
      await query(
        "UPDATE dbo.FedExSandboxShipments SET State='booked',TrackingNumber=@tracking,LabelBytes=@label,BookedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME(),LastError=NULL WHERE Id=@id AND State='booking'",
        [
          p("id", id, sql.UniqueIdentifier),
          p("tracking", result.tracking),
          p("label", result.label, sql.VarBinary(sql.MAX)),
        ],
      );
    } catch (e) {
      await query(
        "UPDATE dbo.FedExSandboxShipments SET State=@state,LastError=@error,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id AND State='booking'",
        [
          p("id", id, sql.UniqueIdentifier),
          p("error", errorText(e).slice(0, 500)),
          p(
            "state",
            e instanceof FedExRejectedError
              ? "booking_failed"
              : "booking_unknown",
          ),
        ],
      );
      if (e instanceof FedExRejectedError) throw e;
      throw new ApiError(
        502,
        "Booking outcome is uncertain. Do not create a replacement shipment; review with FedEx.",
      );
    }
  } else if (action === "tracking/refresh") {
    if (!r.TrackingNumber)
      throw new ApiError(409, "No booked tracking number.");
    const tracking = await fedexTrack(r.TrackingNumber);
    await query(
      "UPDATE dbo.FedExSandboxShipments SET TrackingJson=@tracking,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
      [
        p("id", id, sql.UniqueIdentifier),
        p("tracking", JSON.stringify(tracking)),
      ],
    );
  } else if (action === "cancel") {
    if (r.State === "cancelled") {
      sendJson(res, 200, { shipment: view(r) });
      return true;
    }
    if (!r.TrackingNumber || !["booked", "cancel_failed"].includes(r.State))
      throw new ApiError(
        409,
        "Only a confirmed sandbox booking can be cancelled.",
      );
    const claimed = await query<{ Id: string }>(
      "UPDATE dbo.FedExSandboxShipments SET State='cancelling',UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.Id WHERE Id=@id AND State IN ('booked','cancel_failed')",
      [p("id", id, sql.UniqueIdentifier)],
    );
    if (!claimed.length)
      throw new ApiError(409, "Cancellation already started.");
    try {
      await fedexCancel(r.TrackingNumber);
      await query(
        "UPDATE dbo.FedExSandboxShipments SET State='cancelled',CancelledAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME(),LastError=NULL WHERE Id=@id AND State='cancelling'",
        [p("id", id, sql.UniqueIdentifier)],
      );
    } catch (e) {
      await query(
        "UPDATE dbo.FedExSandboxShipments SET State='cancel_failed',UpdatedAt=SYSUTCDATETIME(),LastError=@error WHERE Id=@id AND State='cancelling'",
        [
          p("id", id, sql.UniqueIdentifier),
          p("error", errorText(e).slice(0, 500)),
        ],
      );
      throw e;
    }
  } else throw new ApiError(404, "FedEx sandbox operation not found.");
  r = await row(id);
  sendJson(res, 200, { shipment: view(r) });
  return true;
}
