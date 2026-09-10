import {
  randomUUID,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as tq,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, readJsonBody, sendJson, type AuthContext } from "./http.js";
import {
  int,
  text,
  bit,
  hash,
  requireCompany,
  notifySampleCompany,
} from "./lab-routes.js";
import { positiveId, string, choice, exactKeys } from "./lab-validation.js";
import {
  sampleBoxes,
  sampleBox,
  sampleEligibility,
  dispatchDeadline,
  remainingBusinessDays,
  assertShippingTransition,
  requiresShippingRefund,
  type ShippingState,
} from "./sample-shipping-domain.js";
import {
  shippingMode,
  parcelRates,
  paymentSession,
  paymentConfirmed,
  buyParcel,
  refundPayment,
  voidParcel,
  parcelStatus,
  type ParcelAddress,
  type ParcelRate,
} from "./sample-shipping-provider.js";
type Row = Record<string, unknown>;
type Exec = (q: string, p?: QueryParameter[]) => Promise<Row[]>;
const dt = (name: string, value: unknown): QueryParameter => ({
  name,
  type: sql.DateTime2,
  value,
});
const select = `SELECT s.SampleRequestId AS id,r.ListingId AS listingId,l.Title AS listingTitle,r.BuyerCompanyId AS buyerCompanyId,l.SellerCompanyId AS sellerCompanyId,b.LegalName AS buyerCompanyName,c.LegalName AS sellerCompanyName,s.State AS state,s.Carrier AS carrier,s.Service AS service,s.ShippingCents AS shippingCents,s.DispatchDeadline AS dispatchDeadline,s.DispatchedAt AS dispatchedAt,s.TrackingNumber AS trackingNumber,s.LabelUrl AS labelUrl,s.RefundState AS refundState,s.LabelVoidState AS labelVoidState,s.PaymentSessionId AS paymentSessionId,s.PaymentIntentId AS paymentIntentId,s.RateId AS rateId,q.ProviderShipmentId AS shipmentId,q.Provider AS mode,q.BoxCode AS boxCode,q.DestinationJson AS destinationJson,q.OriginJson AS originJson,s.ReminderSentAt AS reminderSentAt,s.LastError AS lastError,s.UpdatedAt AS updatedAt,CASE WHEN cr.RedeemedOrderId IS NOT NULL THEN cr.AmountCents ELSE cr.AmountCents-COALESCE((SELECT SUM(a.AmountCents) FROM dbo.SampleCreditApplications a WHERE a.SampleRequestId=cr.SampleRequestId),0) END AS creditCents,cr.RedeemedOrderId AS redeemedOrderId FROM dbo.SampleShipping s JOIN dbo.SampleRequests r ON r.Id=s.SampleRequestId JOIN dbo.Listings l ON l.Id=r.ListingId JOIN dbo.Companies b ON b.Id=r.BuyerCompanyId JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.SampleShippingQuotes q ON q.Id=s.QuoteId LEFT JOIN dbo.SampleShippingCredits cr ON cr.SampleRequestId=s.SampleRequestId`;
function projection(r: Row, auth?: AuthContext) {
  const {
    paymentSessionId,
    paymentIntentId,
    rateId,
    shipmentId,
    destinationJson,
    originJson,
    ...rest
  } = r;
  return {
    ...rest,
    isBuyer: auth?.companyId === r.buyerCompanyId,
    isSeller: auth?.companyId === r.sellerCompanyId,
    reference: `SR-${r.id}`,
    destination: JSON.parse(String(destinationJson)),
    origin: JSON.parse(String(originJson)),
    box: sampleBox(r.boxCode),
  };
}
async function get(id: number, auth: AuthContext, exec: Exec = query) {
  const r = (
    await exec(
      `${select} WHERE s.SampleRequestId=@id AND (@admin=1 OR r.BuyerCompanyId=@company OR (l.SellerCompanyId=@company AND s.State<>'payment_pending'))`,
      [
        int("id", id),
        int("company", auth.companyId),
        bit("admin", auth.isAdmin),
      ],
    )
  )[0];
  if (!r) throw new ApiError(404, "Sample shipment not found.");
  return r;
}
async function locked<T>(
  id: number,
  auth: AuthContext,
  work: (r: Row, exec: Exec) => Promise<T>,
) {
  return runInTransaction(async (tx) => {
    const exec: Exec = (q, p = []) => tq(tx, q, p);
    await exec(
      "SELECT SampleRequestId FROM dbo.SampleShipping WITH(UPDLOCK,HOLDLOCK) WHERE SampleRequestId=@id",
      [int("id", id)],
    );
    return work(await get(id, auth, exec), exec);
  });
}
async function event(exec: Exec, id: number, kind: string, actor?: number) {
  await exec(
    "INSERT dbo.SampleShippingEvents(SampleRequestId,EventKey,Kind,ActorUserId) VALUES(@id,@key,@kind,@actor)",
    [
      int("id", id),
      text("key", `${id}:${kind}:${randomUUID()}`),
      text("kind", kind),
      int("actor", actor),
    ],
  );
}
function address(r: Row): ParcelAddress {
  return {
    company: String(r.name),
    street1: String(r.street1),
    street2: String(r.street2 ?? ""),
    city: String(r.city),
    state: String(r.state ?? ""),
    zip: String(r.zip ?? ""),
    country: String(r.country).trim(),
  };
}
const locationsSql =
  "SELECT loc.Id AS id,loc.Name AS name,loc.AddressLine1 AS street1,loc.AddressLine2 AS street2,loc.City AS city,loc.StateProvince AS state,loc.PostalCode AS zip,loc.CountryCode AS country,v.AddressHash AS addressHash FROM dbo.Locations loc LEFT JOIN dbo.SampleReceivingSites v ON v.LocationId=loc.Id";
async function config(
  listingId: number,
  auth: AuthContext,
  locationId?: number,
  exec: Exec = query,
) {
  const listing = (
    await exec(
      `SELECT l.Id AS id,l.Title AS title,l.SellerCompanyId AS sellerCompanyId,l.LocationId AS locationId,JSON_VALUE(l.SpecificationsJson,'$.state') AS physicalState,COALESCE(p.Enabled,0) AS enabled,COALESCE(p.Classification,'unreviewed') AS classification,COALESCE(p.SpecialHandling,0) AS specialHandling FROM dbo.Listings l JOIN dbo.ListingStatuses st ON st.Id=l.ListingStatusId LEFT JOIN dbo.SampleListingPolicies p ON p.ListingId=l.Id WHERE l.Id=@id AND st.Code='published' AND l.Quantity>0`,
      [int("id", listingId)],
    )
  )[0];
  if (!listing) throw new ApiError(404, "Available listing not found.");
  if (listing.sellerCompanyId === auth.companyId && !auth.isAdmin)
    throw new ApiError(403, "You cannot request your own material.");
  const origin = (
    await exec(`${locationsSql} WHERE loc.Id=@id`, [
      int("id", listing.locationId),
    ])
  )[0];
  if (!origin) throw new ApiError(409, "Seller shipping location is missing.");
  const locations = await exec(
    `${locationsSql} WHERE loc.CompanyId=@company ORDER BY loc.IsDefault DESC,loc.Id`,
    [int("company", requireCompany(auth))],
  );
  const destination =
    locations.find((l) => Number(l.id) === locationId) ??
    (locationId === undefined ? locations[0] : undefined);
  if (locationId !== undefined && !destination)
    throw new ApiError(400, "Choose your company receiving site.");
  const eligibility = sampleEligibility({
    enabled: Boolean(listing.enabled),
    classification: choice(listing.classification, [
      "standard_solid",
      "restricted",
      "liquid",
      "gas",
      "unreviewed",
    ]),
    specialHandling:
      Boolean(listing.specialHandling) ||
      ["liquid", "gas"].includes(String(listing.physicalState).toLowerCase()),
    originCountry: String(origin.country).trim(),
    destinationCountry: String(destination?.country ?? "").trim(),
    receivingSiteVerified:
      !!destination && destination.addressHash === hash(address(destination)),
  });
  return {
    listing,
    origin: address(origin),
    locations: locations.map((l) => ({
      id: l.id,
      ...address(l),
      verified: l.addressHash === hash(address(l)),
    })),
    destination: destination ? address(destination) : null,
    destinationId: destination?.id,
    eligibility,
    boxes: sampleBoxes,
    mode: shippingMode(),
    dispatchBusinessDays: 10,
  };
}
async function refund(r: Row, exec: Exec) {
  const id = Number(r.id);
  if (r.refundState !== "succeeded") {
    const result = await refundPayment(String(r.paymentIntentId), id);
    await exec(
      "UPDATE dbo.SampleShipping SET RefundState=@state,RefundId=@refund WHERE SampleRequestId=@id",
      [
        int("id", id),
        text("state", result.succeeded ? "succeeded" : "pending"),
        text("refund", result.id),
      ],
    );
  }
  if (r.labelVoidState !== "succeeded") {
    const done = await voidParcel(String(r.shipmentId));
    await exec(
      "UPDATE dbo.SampleShipping SET LabelVoidState=@state WHERE SampleRequestId=@id",
      [int("id", id), text("state", done ? "succeeded" : "pending")],
    );
  }
}
async function move(r: Row, to: ShippingState, exec: Exec, actor?: number) {
  const id = Number(r.id);
  await exec(
    "UPDATE dbo.SampleShipping SET State=@state,DispatchedAt=CASE WHEN @state='in_transit' THEN SYSUTCDATETIME() ELSE DispatchedAt END,DeliveredAt=CASE WHEN @state='delivered' THEN SYSUTCDATETIME() ELSE DeliveredAt END,RefundState=CASE WHEN @refund=1 THEN 'pending' ELSE RefundState END,UpdatedAt=SYSUTCDATETIME() WHERE SampleRequestId=@id",
    [
      int("id", id),
      text("state", to),
      bit("refund", requiresShippingRefund(to)),
    ],
  );
  const legacy =
    to === "in_transit"
      ? "shipped"
      : to === "delivered"
        ? "received"
        : requiresShippingRefund(to)
          ? "declined"
          : "accepted";
  await exec(
    "UPDATE dbo.SampleRequests SET Status=@status,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id",
    [int("id", id), text("status", legacy)],
  );
  if (to === "delivered")
    await exec(
      "IF NOT EXISTS(SELECT 1 FROM dbo.SampleShippingCredits WHERE SampleRequestId=@id) INSERT dbo.SampleShippingCredits(SampleRequestId,BuyerCompanyId,ListingId,AmountCents) VALUES(@id,@buyer,@listing,@cents)",
      [
        int("id", id),
        int("buyer", r.buyerCompanyId),
        int("listing", r.listingId),
        int("cents", r.shippingCents),
      ],
    );
  await event(exec, id, to, actor);
  if (to === "expired")
    await notifySampleCompany(
      exec,
      actor ?? null,
      Number(r.sellerCompanyId),
      Number(r.listingId),
      `Sample SR-${id} expired`,
      "The dispatch deadline passed. The buyer refund is being processed and this listing has a missed-request mark.",
    );
  await notifySampleCompany(
    exec,
    actor ?? null,
    Number(r.buyerCompanyId),
    Number(r.listingId),
    `Sample SR-${id} updated`,
    `${r.mode === "simulation" ? "SIMULATION: " : ""}${to.replaceAll("_", " ")}. ${requiresShippingRefund(to) ? "Your shipping refund is being processed." : ""}`,
  );
}
async function settle(id: number, auth: AuthContext, simulatePayment = false) {
  // Commit payment proof before label purchase so failures can be reconciled and refunded.
  await locked(id, auth, async (r, exec) => {
    if (r.mode !== shippingMode())
      throw new ApiError(
        409,
        "This request belongs to a different shipping environment.",
      );
    if (r.state !== "payment_pending") return;
    if (r.buyerCompanyId !== auth.companyId && !auth.isAdmin)
      throw new ApiError(403, "Buyer required.");
    const intent =
      r.mode === "simulation"
        ? simulatePayment
          ? `sim_payment_${id}`
          : null
        : await paymentConfirmed(
            String(r.paymentSessionId),
            Number(r.shippingCents),
            id,
          );
    if (!intent) return;
    await exec(
      "UPDATE dbo.SampleShipping SET State='paid',PaymentIntentId=@intent,UpdatedAt=SYSUTCDATETIME() WHERE SampleRequestId=@id",
      [int("id", id), text("intent", intent)],
    );
    await event(exec, id, "paid", auth.userId || undefined);
  });
  await locked(id, auth, async (r, exec) => {
    if (r.state !== "paid") return;
    const label = await buyParcel(String(r.shipmentId), String(r.rateId));
    await exec(
      "UPDATE dbo.SampleShipping SET LabelUrl=@url,TrackingNumber=@tracking,DispatchDeadline=@deadline,LastError=NULL WHERE SampleRequestId=@id",
      [
        int("id", id),
        text("url", label.labelUrl),
        text("tracking", label.tracking),
        dt("deadline", dispatchDeadline(new Date(String(r.updatedAt)))),
      ],
    );
    await move(r, "awaiting_dispatch", exec, auth.userId || undefined);
    await notifySampleCompany(
      exec,
      auth.userId || null,
      Number(r.sellerCompanyId),
      Number(r.listingId),
      `Sample SR-${id} awaiting dispatch`,
      `${r.mode === "simulation" ? "SIMULATION: " : ""}Print the prepaid label and dispatch within 10 business days. See Samples for the deadline.`,
    );
  });
}
let processing: Promise<void> | null = null;
export function processSampleShipping(): Promise<void> {
  if (!processing)
    processing = reconcileSamples().finally(() => {
      processing = null;
    });
  return processing;
}
async function reconcileSamples() {
  if (shippingMode() === "unavailable") return;
  const rows = await query(
    `${select} WHERE q.Provider=@mode AND (s.State IN ('payment_pending','paid','awaiting_dispatch','in_transit') OR s.RefundState='pending' OR s.LabelVoidState='pending')`,
    [text("mode", shippingMode())],
  );
  for (const row of rows) {
    const id = Number(row.id),
      auth = { isAdmin: true, userId: 0 };
    try {
      if (row.state === "payment_pending" || row.state === "paid") {
        await settle(id, auth);
        continue;
      }
      await locked(id, auth, async (r, exec) => {
        if (requiresShippingRefund(r.state as ShippingState)) {
          await refund(r, exec);
          return;
        }
        // Check carrier evidence before expiry, in case the seller forgot to press dispatch.
        if (r.mode === "easypost_test") {
          const status = await parcelStatus(String(r.shipmentId));
          if (
            ["in_transit", "out_for_delivery", "delivered"].includes(status) &&
            r.state === "awaiting_dispatch"
          ) {
            await move(r, "in_transit", exec);
            r.state = "in_transit";
          }
          if (status === "delivered" && r.state === "in_transit") {
            await move(r, "delivered", exec);
            return;
          }
          if (
            ["failure", "return_to_sender", "cancelled"].includes(status) &&
            r.state === "in_transit"
          ) {
            await move(r, "delivery_failed", exec);
            return;
          }
        }
        if (r.state !== "awaiting_dispatch") return;
        if (new Date(String(r.dispatchDeadline)).getTime() < Date.now()) {
          await move(r, "expired", exec);
          return;
        }
        if (
          !r.reminderSentAt &&
          remainingBusinessDays(
            new Date(),
            new Date(String(r.dispatchDeadline)),
          ) <= 2
        ) {
          await notifySampleCompany(
            exec,
            null,
            Number(r.sellerCompanyId),
            Number(r.listingId),
            `Sample SR-${id} dispatch reminder`,
            "Two business days or fewer remain. Please dispatch or choose Can’t fulfil.",
          );
          await exec(
            "UPDATE dbo.SampleShipping SET ReminderSentAt=SYSUTCDATETIME() WHERE SampleRequestId=@id",
            [int("id", id)],
          );
        }
      });
    } catch {
      if (
        row.state === "paid" &&
        Date.now() - new Date(String(row.updatedAt)).getTime() > 15 * 60_000
      ) {
        await locked(id, auth, async (r, exec) => {
          if (r.state === "paid") await move(r, "delivery_failed", exec);
        });
      }
      await query(
        "UPDATE dbo.SampleShipping SET LastError=@error WHERE SampleRequestId=@id",
        [
          int("id", id),
          text(
            "error",
            "Provider operation needs retry. No success has been assumed.",
          ),
        ],
      );
    }
  }
}
export async function handleSampleShippingRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
) {
  if (!url.pathname.startsWith("/api/sample-shipping")) return false;
  if (url.pathname.startsWith("/api/sample-shipping/webhooks/")) {
    if (request.method !== "POST" || shippingMode() !== "easypost_test")
      throw new ApiError(404, "Not found.");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > 1024 * 1024) throw new ApiError(413, "Webhook too large.");
      chunks.push(bytes);
    }
    const raw = Buffer.concat(chunks);
    const equal = (a: string, b: string) =>
      timingSafeEqual(
        createHash("sha256").update(a).digest(),
        createHash("sha256").update(b).digest(),
      );
    if (url.pathname.endsWith("/easypost")) {
      const secret = process.env.SAMPLE_EASYPOST_WEBHOOK_SECRET;
      const expected = `Basic ${Buffer.from(`ecoglobe:${secret}`).toString("base64")}`;
      if (
        !secret ||
        !equal(String(request.headers.authorization ?? ""), expected)
      )
        throw new ApiError(401, "Invalid webhook authentication.");
    } else if (url.pathname.endsWith("/stripe")) {
      const secret = process.env.SAMPLE_STRIPE_WEBHOOK_SECRET;
      const values = String(request.headers["stripe-signature"] ?? "")
        .split(",")
        .map((v) => v.split("="));
      const timestamp = values.find((v) => v[0] === "t")?.[1];
      if (
        !secret ||
        !timestamp ||
        Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
        !Number.isFinite(Number(timestamp))
      )
        throw new ApiError(401, "Invalid webhook authentication.");
      const expected = createHmac("sha256", secret)
        .update(timestamp + ".")
        .update(raw)
        .digest("hex");
      if (!values.some((v) => v[0] === "v1" && equal(v[1] ?? "", expected)))
        throw new ApiError(401, "Invalid webhook signature.");
    } else throw new ApiError(404, "Not found.");
    // Events only wake reconciliation. Provider GETs confirm current payment/tracking
    // state, so duplicate, replayed and out-of-order events cannot regress records.
    void processSampleShipping().catch(() => {});
    sendJson(response, 200, { ok: true });
    return true;
  }
  const auth = await requireSessionAuth(request),
    path = url.pathname.slice("/api/sample-shipping".length),
    method = request.method;
  response.setHeader("Cache-Control", "private, no-store");
  if (
    shippingMode() === "simulation" &&
    !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      request.socket.remoteAddress ?? "",
    )
  )
    throw new ApiError(
      403,
      "Local simulation is only available over loopback.",
    );
  if (path === "/config" && method === "GET") {
    const c = await config(
      positiveId(Number(url.searchParams.get("listingId"))),
      auth,
      url.searchParams.has("locationId")
        ? positiveId(Number(url.searchParams.get("locationId")))
        : undefined,
    );
    sendJson(response, 200, { ok: true, ...c });
    return true;
  }
  if (path === "/quotes" && method === "POST") {
    const b = await readJsonBody(request);
    exactKeys(b, ["listingId", "locationId", "boxCode"]);
    const c = await config(
      positiveId(b.listingId),
      auth,
      positiveId(b.locationId),
    );
    if (!c.eligibility.eligible) throw new ApiError(409, c.eligibility.reason);
    if (c.mode === "unavailable")
      throw new ApiError(
        503,
        "Online shipping is not connected yet. Request help from EcoGlobe.",
      );
    const box = sampleBox(b.boxCode),
      result = await parcelRates(c.origin, c.destination!, box),
      id = randomUUID();
    await query(
      "INSERT dbo.SampleShippingQuotes(Id,ListingId,BuyerCompanyId,LocationId,BoxCode,Provider,ProviderShipmentId,OriginJson,DestinationJson,RatesJson,ExpiresAt) VALUES(@id,@listing,@buyer,@location,@box,@provider,@shipment,@origin,@destination,@rates,DATEADD(minute,15,SYSUTCDATETIME()))",
      [
        text("id", id),
        int("listing", b.listingId),
        int("buyer", auth.companyId),
        int("location", b.locationId),
        text("box", box.code),
        text("provider", c.mode),
        text("shipment", result.shipmentId),
        text("origin", JSON.stringify(c.origin)),
        text("destination", JSON.stringify(c.destination)),
        text("rates", JSON.stringify(result.rates)),
      ],
    );
    sendJson(response, 201, {
      ok: true,
      quote: { id, rates: result.rates, mode: c.mode },
    });
    return true;
  }
  if (path === "/checkout" && method === "POST") {
    const b = await readJsonBody(request);
    exactKeys(b, ["quoteId", "rateId", "consent"]);
    if (b.consent !== true)
      throw new ApiError(
        400,
        "Confirm sharing your company and delivery address with the seller.",
      );
    const quoteId = string(b.quoteId, 100),
      rateId = string(b.rateId, 160);
    const result = await runInTransaction(async (tx) => {
      const exec: Exec = (q, p = []) => tq(tx, q, p);
      const q = (
        await exec(
          "SELECT * FROM dbo.SampleShippingQuotes WITH(UPDLOCK,HOLDLOCK) WHERE Id=TRY_CONVERT(uniqueidentifier,@id) AND BuyerCompanyId=@buyer",
          [text("id", quoteId), int("buyer", requireCompany(auth))],
        )
      )[0];
      if (!q) throw new ApiError(404, "Quote not found.");
      if (q.Provider !== shippingMode() || shippingMode() === "unavailable")
        throw new ApiError(
          409,
          "Shipping environment changed. Request new rates.",
        );
      const prior = (
        await exec(
          "SELECT SampleRequestId AS id,RateId AS rateId FROM dbo.SampleShipping WHERE QuoteId=@id",
          [text("id", quoteId)],
        )
      )[0];
      if (prior) {
        if (prior.rateId !== rateId)
          throw new ApiError(
            409,
            "This quote already has a different selected rate.",
          );
        return { id: Number(prior.id) };
      }
      if (new Date(String(q.ExpiresAt)).getTime() <= Date.now())
        throw new ApiError(409, "Rates expired. Request fresh rates.");
      const c = await config(
        Number(q.ListingId),
        auth,
        Number(q.LocationId),
        exec,
      );
      if (!c.eligibility.eligible)
        throw new ApiError(409, c.eligibility.reason);
      if (
        JSON.stringify(c.origin) !== q.OriginJson ||
        JSON.stringify(c.destination) !== q.DestinationJson
      )
        throw new ApiError(
          409,
          "Shipping address changed. Request fresh rates.",
        );
      const rate = (JSON.parse(String(q.RatesJson)) as ParcelRate[]).find(
        (r) => r.id === rateId,
      );
      if (!rate) throw new ApiError(400, "Choose a quoted carrier service.");
      const row = (
        await exec(
          "INSERT dbo.SampleRequests(ListingId,BuyerCompanyId,RequestedByUserId,QuantityLb,DeliveryAddress,IdempotencyKey,PayloadHash) OUTPUT INSERTED.Id AS id VALUES(@listing,@buyer,@actor,@weight,@address,@key,@hash)",
          [
            int("listing", q.ListingId),
            int("buyer", auth.companyId),
            int("actor", auth.userId),
            {
              name: "weight",
              type: sql.Decimal(10, 2),
              value: sampleBox(q.BoxCode).maxWeightKg * 2.20462,
            },
            text("address", Object.values(c.destination!).join(", ")),
            text("key", `shipping-${quoteId}`),
            text("hash", hash({ quoteId, rateId })),
          ],
        )
      )[0];
      const id = Number(row?.id);
      await exec(
        "INSERT dbo.SampleShipping(SampleRequestId,QuoteId,RateId,Carrier,Service,ShippingCents,IdentityConsentedAt) VALUES(@id,@quote,@rate,@carrier,@service,@cents,SYSUTCDATETIME())",
        [
          int("id", id),
          text("quote", quoteId),
          text("rate", rate.id),
          text("carrier", rate.carrier),
          text("service", rate.service),
          int("cents", rate.cents),
        ],
      );
      return { id };
    });
    const session = await locked(result.id, auth, async (r, exec) => {
      if (r.state !== "payment_pending") return { url: "" };
      const s = await paymentSession(result.id, Number(r.shippingCents));
      await exec(
        "UPDATE dbo.SampleShipping SET PaymentSessionId=@session WHERE SampleRequestId=@id",
        [int("id", result.id), text("session", s.id)],
      );
      return s;
    });
    sendJson(response, 200, {
      ok: true,
      id: result.id,
      url: session.url,
      mode: shippingMode(),
    });
    return true;
  }
  if (path === "/credits" && method === "GET") {
    const listingId = positiveId(Number(url.searchParams.get("listingId")));
    const r = await query(
      `SELECT COALESCE(SUM(c.AmountCents-COALESCE(a.used,0)),0) AS cents FROM dbo.SampleShippingCredits c JOIN dbo.SampleShipping s ON s.SampleRequestId=c.SampleRequestId JOIN dbo.SampleShippingQuotes q ON q.Id=s.QuoteId OUTER APPLY(SELECT SUM(AmountCents) used FROM dbo.SampleCreditApplications WHERE SampleRequestId=c.SampleRequestId) a WHERE c.BuyerCompanyId=@buyer AND c.ListingId=@listing AND q.Provider=@mode AND s.State='delivered'`,
      [
        int("buyer", requireCompany(auth)),
        int("listing", listingId),
        text("mode", shippingMode()),
      ],
    );
    sendJson(response, 200, {
      ok: true,
      cents: Number(r[0]?.cents ?? 0),
      mode: shippingMode(),
    });
    return true;
  }
  if (path === "/seller-policies" && method === "GET") {
    const listings = await query(
      "SELECT l.Id AS id,l.Title AS title,COALESCE(p.Enabled,0) AS enabled,COALESCE(p.Classification,'unreviewed') AS classification FROM dbo.Listings l LEFT JOIN dbo.SampleListingPolicies p ON p.ListingId=l.Id WHERE l.SellerCompanyId=@company ORDER BY l.Id DESC",
      [int("company", requireCompany(auth))],
    );
    sendJson(response, 200, { ok: true, listings });
    return true;
  }
  if (path === "/requests" && method === "GET") {
    const rows = await query(
      `${select} WHERE @admin=1 OR r.BuyerCompanyId=@company OR (l.SellerCompanyId=@company AND s.State<>'payment_pending') ORDER BY s.SampleRequestId DESC`,
      [bit("admin", auth.isAdmin), int("company", auth.companyId)],
    );
    sendJson(response, 200, {
      ok: true,
      requests: rows.map((r) => projection(r, auth)),
      mode: shippingMode(),
    });
    return true;
  }
  const match =
    /^\/requests\/(\d+)(?:\/(refresh|dispatch|decline|simulate-payment|simulate-delivery|simulate-expiry|label))?$/.exec(
      path,
    );
  if (match) {
    const id = positiveId(Number(match[1])),
      action = match[2];
    if (!action && method === "GET") {
      sendJson(response, 200, {
        ok: true,
        request: projection(await get(id, auth), auth),
      });
      return true;
    }
    if (action === "label" && method === "GET") {
      const r = await get(id, auth);
      if (
        !r.trackingNumber ||
        ["declined", "expired", "delivery_failed"].includes(String(r.state))
      )
        throw new ApiError(409, "No usable prepaid label.");
      if (r.mode === "simulation") {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([432, 288]);
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        page.drawText("SIMULATION - NOT VALID FOR POSTAGE", {
          x: 20,
          y: 230,
          size: 15,
          font,
        });
        page.drawText(`Sample SR-${id} | ${r.carrier} ${r.service}`, {
          x: 20,
          y: 180,
          size: 15,
          font,
        });
        page.drawText("Test the print / pack / dispatch workflow only.", {
          x: 20,
          y: 140,
          size: 12,
          font,
        });
        const bytes = await pdf.save();
        response.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="sample-${id}-SIMULATION.pdf"`,
        });
        response.end(Buffer.from(bytes));
      } else {
        response.writeHead(302, { Location: String(r.labelUrl) });
        response.end();
      }
      return true;
    }
    if (method !== "POST") throw new ApiError(405, "Method not allowed.");
    if (action?.startsWith("simulate-") && shippingMode() !== "simulation")
      throw new ApiError(404, "Not found.");
    if (action === "refresh" || action === "simulate-payment")
      await settle(id, auth, action === "simulate-payment");
    else
      await locked(id, auth, async (r, exec) => {
        if (r.mode !== shippingMode())
          throw new ApiError(409, "Wrong shipping environment.");
        if (action === "dispatch" || action === "decline") {
          if (r.sellerCompanyId !== auth.companyId)
            throw new ApiError(403, "Only the seller can dispatch or decline.");
          const to = action === "dispatch" ? "in_transit" : "declined";
          if (r.state === to) return;
          if (new Date(String(r.dispatchDeadline)).getTime() < Date.now())
            throw new ApiError(
              409,
              "Dispatch deadline passed. EcoGlobe is processing expiry.",
            );
          assertShippingTransition(r.state as ShippingState, to, "seller");
          await move(r, to, exec, auth.userId || undefined);
        } else if (
          action === "simulate-delivery" ||
          action === "simulate-expiry"
        ) {
          if (!auth.isAdmin)
            throw new ApiError(403, "Internal administrator required.");
          const to = action === "simulate-delivery" ? "delivered" : "expired";
          if (r.state === to) return;
          assertShippingTransition(
            r.state as ShippingState,
            to,
            to === "delivered" ? "tracking_provider" : "deadline_worker",
          );
          await move(r, to, exec, auth.userId || undefined);
        } else throw new ApiError(404, "Action not found.");
      });
    const current = await get(id, auth);
    if (requiresShippingRefund(current.state as ShippingState))
      await locked(id, auth, refund);
    sendJson(response, 200, {
      ok: true,
      request: projection(await get(id, auth), auth),
    });
    return true;
  }
  if (path === "/referrals" && method === "POST") {
    const b = await readJsonBody(request);
    exactKeys(b, ["listingId", "note"]);
    const c = await config(positiveId(b.listingId), auth);
    const note = string(b.note ?? "", 1000, true);
    const reason = c.eligibility.eligible
      ? "provider_unavailable"
      : c.eligibility.code;
    const r = await query(
      "INSERT dbo.SampleShippingReferrals(ListingId,BuyerCompanyId,RequestedByUserId,Reason,Note) OUTPUT INSERTED.Id AS id VALUES(@listing,@buyer,@actor,@reason,@note)",
      [
        int("listing", b.listingId),
        int("buyer", auth.companyId),
        int("actor", auth.userId),
        text("reason", reason),
        text("note", note),
      ],
    );
    sendJson(response, 201, { ok: true, referral: r[0] });
    return true;
  }
  if (path === "/admin/reconcile" && method === "POST") {
    if (!auth.isAdmin) throw new ApiError(403, "Administrator required.");
    await processSampleShipping();
    sendJson(response, 200, { ok: true });
    return true;
  }
  if (path === "/admin" && method === "GET") {
    if (!auth.isAdmin) throw new ApiError(403, "Administrator required.");
    const listings = await query(
      "SELECT l.Id AS id,l.Title AS title,COALESCE(p.Enabled,0) AS enabled,COALESCE(p.Classification,'unreviewed') AS classification,COALESCE(p.SpecialHandling,0) AS specialHandling,(SELECT COUNT(*) FROM dbo.SampleShipping s JOIN dbo.SampleRequests r ON r.Id=s.SampleRequestId WHERE r.ListingId=l.Id AND s.State='expired') AS missedRequests FROM dbo.Listings l LEFT JOIN dbo.SampleListingPolicies p ON p.ListingId=l.Id ORDER BY l.Id DESC",
    );
    const sites = await query(`${locationsSql} ORDER BY loc.Id DESC`);
    const referrals = await query(
      "SELECT r.Id AS id,l.Title AS listingTitle,c.LegalName AS buyerCompanyName,r.Reason AS reason,r.Note AS note,r.Status AS status FROM dbo.SampleShippingReferrals r JOIN dbo.Listings l ON l.Id=r.ListingId JOIN dbo.Companies c ON c.Id=r.BuyerCompanyId ORDER BY r.Id DESC",
    );
    sendJson(response, 200, {
      ok: true,
      listings,
      sites: sites.map((r) => ({
        id: r.id,
        ...address(r),
        verified: r.addressHash === hash(address(r)),
      })),
      referrals,
      mode: shippingMode(),
    });
    return true;
  }
  const policy = /^\/policies\/(\d+)$/.exec(path);
  if (policy && method === "PATCH") {
    const id = positiveId(Number(policy[1])),
      b = await readJsonBody(request);
    exactKeys(b, ["enabled", "classification", "specialHandling"]);
    const owner = (
      await query(
        "SELECT SellerCompanyId AS company FROM dbo.Listings WHERE Id=@id",
        [int("id", id)],
      )
    )[0];
    if (!owner || (!auth.isAdmin && owner.company !== auth.companyId))
      throw new ApiError(404, "Listing not found.");
    if (typeof b.enabled !== "boolean")
      throw new ApiError(400, "Enabled must be true or false.");
    if (
      !auth.isAdmin &&
      (b.classification !== undefined || b.specialHandling !== undefined)
    )
      throw new ApiError(
        403,
        "EcoGlobe must review material shipping classification.",
      );
    const classification = auth.isAdmin
      ? choice(b.classification, [
          "standard_solid",
          "restricted",
          "liquid",
          "gas",
          "unreviewed",
        ])
      : null;
    if (auth.isAdmin && typeof b.specialHandling !== "boolean")
      throw new ApiError(400, "Special handling must be true or false.");
    await query(
      "MERGE dbo.SampleListingPolicies WITH(HOLDLOCK) AS p USING(SELECT @id AS id) x ON p.ListingId=x.id WHEN MATCHED THEN UPDATE SET Enabled=@enabled,Classification=COALESCE(@classification,p.Classification),SpecialHandling=COALESCE(@handling,p.SpecialHandling),ReviewedByUserId=CASE WHEN @admin=1 THEN @actor ELSE p.ReviewedByUserId END,ReviewedAt=CASE WHEN @admin=1 THEN SYSUTCDATETIME() ELSE p.ReviewedAt END,UpdatedAt=SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT(ListingId,Enabled,Classification,SpecialHandling,ReviewedByUserId,ReviewedAt) VALUES(@id,@enabled,COALESCE(@classification,'unreviewed'),COALESCE(@handling,0),CASE WHEN @admin=1 THEN @actor END,CASE WHEN @admin=1 THEN SYSUTCDATETIME() END);",
      [
        int("id", id),
        bit("enabled", b.enabled),
        text("classification", classification),
        bit("handling", auth.isAdmin ? b.specialHandling : null),
        bit("admin", auth.isAdmin),
        int("actor", auth.userId),
      ],
    );
    sendJson(response, 200, { ok: true });
    return true;
  }
  const site = /^\/sites\/(\d+)\/verify$/.exec(path);
  if (site && method === "POST") {
    if (!auth.isAdmin) throw new ApiError(403, "Administrator required.");
    const id = positiveId(Number(site[1]));
    const r = (
      await query(`${locationsSql} WHERE loc.Id=@id`, [int("id", id)])
    )[0];
    if (!r) throw new ApiError(404, "Site not found.");
    await query(
      "MERGE dbo.SampleReceivingSites WITH(HOLDLOCK) v USING(SELECT @id id) x ON v.LocationId=x.id WHEN MATCHED THEN UPDATE SET AddressHash=@hash,VerifiedByUserId=@actor,VerifiedAt=SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT(LocationId,AddressHash,VerifiedByUserId) VALUES(@id,@hash,@actor);",
      [
        int("id", id),
        text("hash", hash(address(r))),
        int("actor", auth.userId),
      ],
    );
    sendJson(response, 200, { ok: true });
    return true;
  }
  throw new ApiError(404, "Sample shipping route not found.");
}
