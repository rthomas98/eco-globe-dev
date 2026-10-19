import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import {
  buildResendPayload,
  getEmailConfig,
  sendEcoGlobePayload,
  type ResendEmailPayload,
} from "./email.js";
import { requireSessionAuth } from "./auth.js";
import { ApiError, sendJson } from "./http.js";

const parameter = (
  name: string,
  value: unknown,
  type: QueryParameter["type"] = sql.NVarChar(sql.MAX),
): QueryParameter => ({ name, value, type });
const kinds = [
  "pilot_created",
  "pilot_email_follow_up",
  "listing_pending_review",
] as const;
export type StaffEvent = { kind: (typeof kinds)[number]; recordId: number };
type Job = Record<string, unknown> & {
  id: number;
  eventJson: string;
  payloadJson: string | null;
  eventKey: string;
  attempts: number;
};

/** Call only on a new event while holding the owning record's transaction lock. */
export async function enqueueStaffAlert(
  tx: sql.Transaction,
  event: StaffEvent,
) {
  await queryRowsWithParamsInTransaction(
    tx,
    "INSERT dbo.StaffNotificationOutbox(EventKey,Kind,RecordId,EventJson) VALUES(@key,@kind,@id,@event)",
    [
      parameter("key", randomUUID(), sql.UniqueIdentifier),
      parameter("kind", event.kind),
      parameter("id", event.recordId, sql.Int),
      parameter("event", JSON.stringify(event)),
    ],
  );
}

/** Status is read under the caller's listing lock before and after mutation. */
export async function enqueueListingReview(
  tx: sql.Transaction,
  recordId: number,
  previous: unknown,
  next: unknown,
) {
  if (previous !== "pending_review" && next === "pending_review")
    await enqueueStaffAlert(tx, { kind: "listing_pending_review", recordId });
}

export async function auditListingLifecycle(
  tx: sql.Transaction,
  auth: { userId: number; companyId?: number; isAdmin: boolean },
  recordId: number,
  previous: unknown,
  next: unknown,
) {
  if (
    previous === next ||
    !(next === "closed" || (previous === "closed" && next === "draft"))
  )
    return;
  await queryRowsWithParamsInTransaction(
    tx,
    `INSERT dbo.AuditLogs(ActorUserId,ActorCompanyId,ActorTypeId,ActionTypeId,RecordTypeId,RecordId,PreviousValue,NewValue,Reason,CreatedByUserId,UpdatedByUserId)
    VALUES(@user,@company,(SELECT Id FROM dbo.ActorTypes WHERE Code=@actor),(SELECT Id FROM dbo.AuditActionTypes WHERE Code='status_changed'),(SELECT Id FROM dbo.RecordTypes WHERE Code='listing'),@id,@previous,@next,@reason,@user,@user)`,
    [
      parameter("user", auth.userId, sql.Int),
      parameter("company", auth.companyId ?? null, sql.Int),
      parameter("actor", auth.isAdmin ? "admin" : "user"),
      parameter("id", recordId, sql.Int),
      parameter("previous", JSON.stringify({ listingStatusCode: previous })),
      parameter("next", JSON.stringify({ listingStatusCode: next })),
      parameter(
        "reason",
        next === "closed"
          ? "Listing closed; history retained."
          : "Listing restored to draft; history retained.",
      ),
    ],
  );
}

export function parseStaffEvent(raw: string): StaffEvent {
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("kind" in value) ||
    !("recordId" in value) ||
    typeof value.recordId !== "number" ||
    !Number.isSafeInteger(value.recordId) ||
    value.recordId <= 0
  )
    throw new Error("Invalid staff event.");
  for (const kind of kinds)
    if (value.kind === kind) return { kind, recordId: value.recordId };
  throw new Error("Invalid staff event kind.");
}
function recipients(value: string | undefined) {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort();
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function buildStaffPayload(event: StaffEvent): ResendEmailPayload {
  const to = recipients(process.env.STAFF_ALERT_EMAIL_RECIPIENTS);
  if (!to.length || to.some((v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))
    throw new Error("Staff recipients are not configured.");
  const origin = new URL(process.env.STAFF_ALERT_ADMIN_URL ?? "");
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("Staff admin origin is invalid.");
  const listing = event.kind === "listing_pending_review";
  const reference = `${listing ? "L" : "PR"}-${event.recordId}`;
  const action = listing
    ? "Review listing"
    : event.kind === "pilot_created"
      ? "Review new pilot request"
      : "Arrange requested email follow-up";
  const link = new URL(
    `/admin/${listing ? "listings" : "pilots"}/${event.recordId}`,
    origin,
  ).href;
  const text = `${reference}: ${action}.\n${link}`;
  // The existing redirect applies first. A mismatch is an operator-visible failure,
  // never permission to send an alert to the default development mailbox.
  const payload = buildResendPayload({
    to,
    subject: `EcoGlobe ${reference}: ${action}`,
    text,
    html: `<p>${escapeHtml(reference)}: ${escapeHtml(action)}.</p><p><a href="${escapeHtml(link)}">Open admin record</a></p>`,
  });
  if (JSON.stringify(recipients(payload.to.join(","))) !== JSON.stringify(to))
    throw new Error(
      "Development email redirect does not match staff recipients.",
    );
  assertAllowed(payload);
  return payload;
}
function assertAllowed(payload: ResendEmailPayload) {
  const allowed = recipients(process.env.STAFF_ALERT_EMAIL_ALLOWED_RECIPIENTS);
  const current = recipients(process.env.STAFF_ALERT_EMAIL_RECIPIENTS);
  const actual = recipients(payload.to.join(","));
  if (
    !actual.length ||
    actual.some((v) => !allowed.includes(v)) ||
    JSON.stringify(actual) !== JSON.stringify(current)
  )
    throw new Error("Saved staff recipients are not currently approved.");
  const config = getEmailConfig();
  if (
    config.overrideRecipients &&
    JSON.stringify(actual) !== JSON.stringify(recipients(config.testRecipient))
  )
    throw new Error(
      "Development email redirect does not match saved staff recipients.",
    );
}
export function parseStaffPayload(raw: string): ResendEmailPayload {
  const p: unknown = JSON.parse(raw);
  if (
    !p ||
    typeof p !== "object" ||
    !("from" in p) ||
    typeof p.from !== "string" ||
    !("to" in p) ||
    !Array.isArray(p.to) ||
    !p.to.length ||
    !p.to.every((v) => typeof v === "string") ||
    !("subject" in p) ||
    typeof p.subject !== "string" ||
    !("html" in p) ||
    typeof p.html !== "string" ||
    !("text" in p) ||
    typeof p.text !== "string"
  )
    throw new Error("Invalid saved staff payload.");
  return {
    from: p.from,
    to: p.to,
    subject: p.subject,
    html: p.html,
    text: p.text,
  };
}

let processing: Promise<number> | undefined;
/** At most ten sends per tick; independent of all other email opt-ins. */
export function processStaffAlerts(): Promise<number> {
  if (process.env.STAFF_ALERT_EMAIL_ENABLED !== "true")
    return Promise.resolve(0);
  processing ??= processJobs().finally(() => {
    processing = undefined;
  });
  return processing;
}
async function processJobs() {
  // A crashed/unknown send is never automatically reissued, even after lease expiry.
  await query(`UPDATE dbo.StaffNotificationOutbox SET State='needs_review',LastError='Delivery unknown or retry window expired; reconcile provider history.',LeaseToken=NULL,LeaseUntil=NULL
    WHERE (State='sending' AND LeaseUntil<=SYSUTCDATETIME()) OR
    (State IN ('queued','retry') AND (Attempts>=3 OR CreatedAt<DATEADD(hour,-23,SYSUTCDATETIME()) OR FirstAttemptAt<DATEADD(hour,-1,SYSUTCDATETIME())))`);
  let sent = 0;
  for (let count = 0; count < 10; count++) {
    const token = randomUUID();
    const job = (
      await query<Job>(
        `;WITH candidate AS (
      SELECT TOP(1) * FROM dbo.StaffNotificationOutbox WITH(UPDLOCK,READPAST,READCOMMITTEDLOCK)
      WHERE State IN ('queued','retry') AND NextAttemptAt<=SYSUTCDATETIME() AND Attempts<3
       AND CreatedAt>=DATEADD(hour,-23,SYSUTCDATETIME()) AND (FirstAttemptAt IS NULL OR FirstAttemptAt>=DATEADD(hour,-1,SYSUTCDATETIME())) ORDER BY Id)
      UPDATE candidate SET State='sending',LeaseToken=@token,LeaseUntil=DATEADD(second,60,SYSUTCDATETIME()),Attempts=Attempts+1,FirstAttemptAt=COALESCE(FirstAttemptAt,SYSUTCDATETIME())
      OUTPUT INSERTED.Id id,INSERTED.EventJson eventJson,INSERTED.PayloadJson payloadJson,INSERTED.EventKey eventKey,INSERTED.Attempts attempts`,
        [parameter("token", token, sql.UniqueIdentifier)],
      )
    )[0];
    if (!job) break;
    const params = [
      parameter("id", job.id, sql.Int),
      parameter("token", token, sql.UniqueIdentifier),
    ];
    let payload: ResendEmailPayload;
    try {
      payload = job.payloadJson
        ? parseStaffPayload(job.payloadJson)
        : buildStaffPayload(parseStaffEvent(job.eventJson));
      assertAllowed(payload);
      if (!getEmailConfig().configured)
        throw new Error("Staff email transport is not configured.");
      if (!job.payloadJson) {
        const saved = await query(
          "UPDATE dbo.StaffNotificationOutbox SET PayloadJson=@payload OUTPUT INSERTED.Id id WHERE Id=@id AND State='sending' AND LeaseToken=@token AND LeaseUntil>SYSUTCDATETIME() AND PayloadJson IS NULL",
          [...params, parameter("payload", JSON.stringify(payload))],
        );
        if (!saved.length)
          throw new Error("Staff claim expired before payload save.");
      }
    } catch {
      await query(
        "UPDATE dbo.StaffNotificationOutbox SET State='needs_review',LastError='Staff email configuration or payload invalid; check recipient, redirect, allowlist, origin and transport.',LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@token",
        params,
      );
      continue;
    }
    let providerId: string;
    try {
      providerId = (
        await sendEcoGlobePayload(
          payload,
          `staff-alert-${job.eventKey.toLowerCase()}`,
        )
      ).id;
    } catch (error) {
      // Only an explicit rate-limit rejection proves it is safe to retry. Timeout,
      // missing confirmation, 5xx and network errors are ambiguous deliveries.
      const retry =
        error instanceof ApiError && error.status === 429 && job.attempts < 3;
      await query(
        `UPDATE dbo.StaffNotificationOutbox SET State=@state,LastError=@error,NextAttemptAt=DATEADD(minute,5,SYSUTCDATETIME()),LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@token`,
        [
          ...params,
          parameter("state", retry ? "retry" : "needs_review"),
          parameter(
            "error",
            retry
              ? "Provider rate limited the request."
              : "Delivery unconfirmed or rejected; reconcile provider history before any resend.",
          ),
        ],
      );
      continue;
    }
    // A persistence error after send leaves the claim for reconciliation; never
    // reinterpret it as a transport failure eligible for automatic redelivery.
    await query(
      "UPDATE dbo.StaffNotificationOutbox SET State='sent',ProviderEmailId=@provider,SentAt=SYSUTCDATETIME(),LastError=NULL,LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@token",
      [...params, parameter("provider", providerId)],
    );
    sent++;
  }
  return sent;
}

export async function handleStaffAlertRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) {
  if (url.pathname !== "/api/admin/staff-alerts") return false;
  res.setHeader("cache-control", "private, no-store");
  const auth = await requireSessionAuth(req);
  if (!auth.isAdmin) throw new ApiError(403, "Admin access required.");
  if (req.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const jobs = await query(
    `SELECT TOP(100) Id id,Kind kind,RecordId recordId,State state,Attempts attempts,LastError lastError,ProviderEmailId providerEmailId,CreatedAt createdAt,SentAt sentAt FROM dbo.StaffNotificationOutbox ORDER BY Id DESC`,
  );
  sendJson(res, 200, {
    ok: true,
    deliveryEnabled: process.env.STAFF_ALERT_EMAIL_ENABLED === "true",
    jobs,
  });
  return true;
}
