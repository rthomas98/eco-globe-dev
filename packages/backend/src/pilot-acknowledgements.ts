import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import { queryRowsWithParams as query, queryRowsWithParamsInTransaction, sql, type QueryParameter } from "./database.js";
import { buildResendPayload, getEmailConfig, sendEcoGlobePayload, type ResendEmailPayload } from "./email.js";
import { ApiError, sendJson } from "./http.js";

const CONFIG_ERROR = "Acknowledgement configuration or verified recipient invalid; inspect scoped configuration and snapshot.";
const UNKNOWN_DELIVERY = "Delivery unconfirmed; reconcile provider history before any resend.";
const parameter = (name: string, value: unknown, type: QueryParameter["type"] = sql.NVarChar(sql.MAX)): QueryParameter => ({ name, value, type });

export type AcknowledgementSnapshot = {
  requestId: number;
  intendedRecipient: string | null;
  recipientVerified: boolean;
  isTest: boolean;
};
type Job = Record<string, unknown> & AcknowledgementSnapshot & {
  id: number;
  eventKey: string;
  payloadJson: string | null;
  attempts: number;
};

function address(value: string) {
  return value.length <= 320 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(value);
}
function recipients(value: string | undefined) {
  return [...new Set((value ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean))].sort();
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

/** No user-supplied recipient or listing/facility data enters the message. */
export function buildPilotAcknowledgementPayload(snapshot: AcknowledgementSnapshot): ResendEmailPayload {
  if (!Number.isSafeInteger(snapshot.requestId) || snapshot.requestId <= 0 ||
      !snapshot.recipientVerified || !snapshot.intendedRecipient || !address(snapshot.intendedRecipient))
    throw new Error(CONFIG_ERROR);
  const mode = process.env.PILOT_ACK_EMAIL_MODE;
  if ((mode !== "test" && mode !== "buyer") || snapshot.isTest !== (mode === "test") ||
      (mode === "buyer" && process.env.PILOT_ACK_EMAIL_ENABLED !== "true"))
    throw new Error(CONFIG_ERROR);
  const allowed = recipients(process.env.PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS);
  const to = snapshot.isTest
    ? recipients(process.env.PILOT_ACK_EMAIL_TEST_RECIPIENT)
    : [snapshot.intendedRecipient];
  // Test requires one explicitly approved QA inbox. Buyer mode explicitly opts in
  // to verified creators; an optional allowlist further restricts that audience.
  if (allowed.some((v) => !address(v)) || to.length !== 1 ||
      (allowed.length > 0 && !allowed.includes(to[0]!)) ||
      (snapshot.isTest && (allowed.length !== 1 || allowed[0] !== to[0])))
    throw new Error(CONFIG_ERROR);
  const origin = new URL(process.env.PILOT_ACK_WEB_URL ?? "");
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash)
    throw new Error(CONFIG_ERROR);
  const link = new URL(`/buyer/pilots/${snapshot.requestId}`, origin).href;
  const reference = `PR-${snapshot.requestId}`;
  const label = snapshot.isTest ? "QA TEST ONLY: sent to the configured QA inbox.\n" : "";
  const acknowledgement = `${reference}: We received your pilot request. It is pending EcoGlobe review. This acknowledgement does not confirm a booking or purchase.`;
  const payload = buildResendPayload({
    to,
    subject: `${snapshot.isTest ? "[QA TEST ONLY] " : ""}EcoGlobe ${reference}: pilot request received`,
    text: `${label}${acknowledgement}\nView your request (sign in required): ${link}`,
    html: `${snapshot.isTest ? "<p><strong>QA TEST ONLY: sent to the configured QA inbox.</strong></p>" : ""}<p>${escapeHtml(acknowledgement)}</p><p><a href="${escapeHtml(link)}">View your request (sign in required)</a></p>`,
  });
  // The shared transport's global redirect must agree, never silently reroute.
  if (JSON.stringify(payload.to) !== JSON.stringify(to)) throw new Error(CONFIG_ERROR);
  return payload;
}

/** Called only for a newly inserted pilot, in its transaction. No network IO. */
export async function enqueuePilotAcknowledgement(tx: sql.Transaction, input: { requestId: number; userId: number }) {
  const creator = (await queryRowsWithParamsInTransaction<{
    email: string; emailVerifiedAt: Date | string | null;
  }>(tx, `SELECT u.Email email,u.EmailVerifiedAt emailVerifiedAt FROM dbo.PilotRequests p JOIN dbo.Users u ON u.Id=p.CreatedByUserId WHERE p.Id=@id AND u.Id=@user`, [
    parameter("id", input.requestId, sql.Int), parameter("user", input.userId, sql.Int),
  ]))[0];
  const snapshot: AcknowledgementSnapshot = {
    requestId: input.requestId,
    intendedRecipient: creator?.email?.trim().toLowerCase() ?? null,
    recipientVerified: creator?.emailVerifiedAt != null,
    isTest: process.env.PILOT_ACK_EMAIL_MODE === "test",
  };
  let payload: ResendEmailPayload | null = null;
  try { payload = buildPilotAcknowledgementPayload(snapshot); } catch { /* Persist an unsendable job; request creation still succeeds. */ }
  await queryRowsWithParamsInTransaction(tx,
    `INSERT dbo.PilotAcknowledgementOutbox(RequestId,CreatorUserId,IntendedRecipient,RecipientVerified,IsTest,EventKey,PayloadJson,State,LastError)
     VALUES(@id,@user,@recipient,@verified,@test,@key,@payload,@state,@error)`, [
      parameter("id", input.requestId, sql.Int), parameter("user", input.userId, sql.Int),
      parameter("recipient", snapshot.intendedRecipient), parameter("verified", snapshot.recipientVerified, sql.Bit),
      parameter("test", snapshot.isTest, sql.Bit), parameter("key", randomUUID(), sql.UniqueIdentifier),
      parameter("payload", payload ? JSON.stringify(payload) : null),
      parameter("state", payload ? "queued" : "needs_review"), parameter("error", payload ? null : CONFIG_ERROR),
    ]);
}

let processing: Promise<number> | undefined;
/** Disabled means no SQL or transport access, independently of staff/refund settings. */
export function processPilotAcknowledgements(): Promise<number> {
  if (process.env.PILOT_ACK_EMAIL_ENABLED !== "true") return Promise.resolve(0);
  processing ??= processJobs().finally(() => { processing = undefined; });
  return processing;
}
async function processJobs() {
  // Unknown sends and jobs outside the provider idempotency window are terminal.
  await query(`UPDATE TOP(100) dbo.PilotAcknowledgementOutbox SET State='needs_review',LastError='Delivery unknown or retry window expired; reconcile provider history.',LeaseToken=NULL,LeaseUntil=NULL
    WHERE (State='sending' AND LeaseUntil<=SYSUTCDATETIME()) OR
    (State IN ('queued','retry') AND (Attempts>=3 OR CreatedAt<DATEADD(hour,-23,SYSUTCDATETIME()) OR FirstAttemptAt<DATEADD(hour,-1,SYSUTCDATETIME())))`);
  let sent = 0;
  for (let count = 0; count < 10 && process.env.PILOT_ACK_EMAIL_ENABLED === "true"; count++) {
    const token = randomUUID();
    const job = (await query<Job>(`;WITH candidate AS (
      SELECT TOP(1) * FROM dbo.PilotAcknowledgementOutbox WITH(UPDLOCK,READPAST,READCOMMITTEDLOCK)
      WHERE State IN ('queued','retry') AND NextAttemptAt<=SYSUTCDATETIME() AND Attempts<3
      AND CreatedAt>=DATEADD(hour,-23,SYSUTCDATETIME()) AND (FirstAttemptAt IS NULL OR FirstAttemptAt>=DATEADD(hour,-1,SYSUTCDATETIME())) ORDER BY Id)
      UPDATE candidate SET State='sending',LeaseToken=@token,LeaseUntil=DATEADD(second,60,SYSUTCDATETIME()),Attempts=Attempts+1,FirstAttemptAt=COALESCE(FirstAttemptAt,SYSUTCDATETIME())
      OUTPUT INSERTED.Id id,INSERTED.RequestId requestId,INSERTED.IntendedRecipient intendedRecipient,INSERTED.RecipientVerified recipientVerified,INSERTED.IsTest isTest,INSERTED.EventKey eventKey,INSERTED.PayloadJson payloadJson,INSERTED.Attempts attempts`, [parameter("token", token, sql.UniqueIdentifier)]))[0];
    if (!job) break;
    const params = [parameter("id", job.id, sql.Int), parameter("token", token, sql.UniqueIdentifier)];
    let payload: ResendEmailPayload;
    try {
      // Rebuild only to validate configuration drift. Never replace the saved bytes.
      payload = buildPilotAcknowledgementPayload(job);
      if (!getEmailConfig().configured || JSON.stringify(payload) !== job.payloadJson ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.eventKey))
        throw new Error(CONFIG_ERROR);
    } catch {
      await query("UPDATE dbo.PilotAcknowledgementOutbox SET State='needs_review',LastError=@error,LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND State='sending' AND LeaseToken=@token", [...params, parameter("error", CONFIG_ERROR)]);
      continue;
    }
    // Recheck claim immediately before network IO. An expired/stolen claim never sends.
    const live = await query("UPDATE dbo.PilotAcknowledgementOutbox SET LeaseUntil=LeaseUntil OUTPUT INSERTED.Id id WHERE Id=@id AND State='sending' AND LeaseToken=@token AND LeaseUntil>SYSUTCDATETIME() AND PayloadJson=@payload", [...params, parameter("payload", job.payloadJson)]);
    if (!live.length) continue;
    let providerId: string;
    try {
      providerId = (await sendEcoGlobePayload(payload, `pilot-ack-${job.eventKey.toLowerCase()}`)).id;
    } catch (error) {
      const retry = error instanceof ApiError && error.status === 429 && job.attempts < 3;
      await query(`UPDATE dbo.PilotAcknowledgementOutbox SET State=CASE WHEN LeaseUntil>SYSUTCDATETIME() THEN @state ELSE 'needs_review' END,LastError=@error,NextAttemptAt=DATEADD(minute,5,SYSUTCDATETIME()),LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND State='sending' AND LeaseToken=@token`, [
        ...params, parameter("state", retry ? "retry" : "needs_review"), parameter("error", retry ? "Provider rate limited the request." : UNKNOWN_DELIVERY),
      ]);
      continue;
    }
    // A database error here leaves the claim for reconciliation, never a retry.
    const saved = await query("UPDATE dbo.PilotAcknowledgementOutbox SET State='sent',ProviderEmailId=@provider,SentAt=SYSUTCDATETIME(),LastError=NULL,LeaseToken=NULL,LeaseUntil=NULL OUTPUT INSERTED.Id id WHERE Id=@id AND State='sending' AND LeaseToken=@token AND LeaseUntil>SYSUTCDATETIME()", [...params, parameter("provider", providerId)]);
    if (saved.length) sent++;
  }
  return sent;
}

/** Operator status deliberately omits recipient snapshots, payloads and raw errors. */
export async function handlePilotAcknowledgementRoute(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (url.pathname !== "/api/admin/pilot-acknowledgements") return false;
  res.setHeader("cache-control", "private, no-store");
  res.setHeader("vary", "Authorization");
  const auth = await requireSessionAuth(req);
  if (!auth.isAdmin) throw new ApiError(403, "Admin access required.");
  if (req.method !== "GET") throw new ApiError(405, "Method not allowed.");
  const jobs = await query(`SELECT TOP(100) Id id,RequestId requestId,IsTest isTest,State state,Attempts attempts,LastError lastError,CreatedAt createdAt,SentAt sentAt FROM dbo.PilotAcknowledgementOutbox ORDER BY Id DESC`);
  sendJson(res, 200, { ok: true, deliveryEnabled: process.env.PILOT_ACK_EMAIL_ENABLED === "true", jobs });
  return true;
}
