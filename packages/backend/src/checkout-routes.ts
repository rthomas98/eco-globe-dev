import { applySampleShippingCredit } from "./sample-shipping-credit.js";
import { createHash, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type Stripe from "stripe";
import { requireSessionAuth } from "./auth.js";
import {
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as txQuery,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, readJsonBody, sendJson, type AuthContext } from "./http.js";
import { stripeConfiguration, stripeReturnUrl } from "./stripe-setup.js";
const p = (
  name: string,
  value: unknown,
  type: QueryParameter["type"] = sql.NVarChar(200),
): QueryParameter => ({ name, value, type });
type Attempt = {
  id: number;
  binding: string;
  leaseUntil: Date | null;
  orderId: number;
  listingId: number;
  quantity: number;
  amountCents: number;
  currencyCode: string;
  requestHash: string;
  state: string;
  providerSessionId: string | null;
  checkoutUrl: string | null;
  expiresAt: Date;
  platformAccountId: string;
  livemode: boolean;
  buyerCompanyId: number;
};
const selection = `SELECT Id AS id,CONVERT(VARCHAR(36),BindingId) AS binding,LeaseUntil AS leaseUntil,OrderId AS orderId,ListingId AS listingId,Quantity AS quantity,AmountCents AS amountCents,CurrencyCode AS currencyCode,RequestHash AS requestHash,State AS state,ProviderSessionId AS providerSessionId,CheckoutUrl AS checkoutUrl,ExpiresAt AS expiresAt,PlatformAccountId AS platformAccountId,Livemode AS livemode,BuyerCompanyId AS buyerCompanyId FROM dbo.CheckoutAttempts`;
export function validateCheckout(body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.listingId) || Number(body.listingId) < 1)
    throw new ApiError(400, "Valid listing required.");
  if (
    typeof body.quantity !== "number" ||
    !Number.isFinite(body.quantity) ||
    body.quantity <= 0 ||
    Math.round(body.quantity * 1000) / 1000 !== body.quantity
  )
    throw new ApiError(
      400,
      "Quantity must be positive with at most three decimals.",
    );
  if (
    typeof body.idempotencyKey !== "string" ||
    !/^[a-zA-Z0-9_-]{16,100}$/.test(body.idempotencyKey)
  )
    throw new ApiError(400, "A stable checkout idempotency key is required.");
  const deliveryMethod = body.deliveryMethod ?? body.fulfilment ?? "pickup";
  if (deliveryMethod !== "pickup" && deliveryMethod !== "delivery")
    throw new ApiError(400, "Invalid delivery method.");
  const deliveryAddress =
    typeof body.deliveryAddress === "string"
      ? body.deliveryAddress.trim()
      : null;
  if (
    deliveryMethod === "delivery" &&
    (!deliveryAddress || deliveryAddress.length > 400)
  )
    throw new ApiError(
      400,
      "Delivery address is required (maximum 400 characters).",
    );
  if (
    body.quoteId !== undefined &&
    (!Number.isSafeInteger(body.quoteId) || Number(body.quoteId) < 1)
  )
    throw new ApiError(400, "Invalid quote.");
  let pickupRequestedAt: string | null = null;
  if (body.pickupRequestedAt !== undefined && body.pickupRequestedAt !== null) {
    if (
      typeof body.pickupRequestedAt !== "string" ||
      !Number.isFinite(Date.parse(body.pickupRequestedAt))
    )
      throw new ApiError(400, "Valid pickup date required.");
    pickupRequestedAt = new Date(body.pickupRequestedAt).toISOString();
  }
  return {
    pickupRequestedAt,
    pickupContactName: pickupText(body.pickupContactName, "pickup contact name", 160),
    pickupContactPhone: pickupText(body.pickupContactPhone, "pickup contact phone", 80),
    pickupVehicleDetails: pickupText(body.pickupVehicleDetails, "pickup vehicle details", 400),
    listingId: Number(body.listingId),
    quantity: body.quantity,
    idempotencyKey: body.idempotencyKey,
    deliveryMethod,
    deliveryAddress,
    quoteId: body.quoteId === undefined ? null : Number(body.quoteId),
  };
}
function pickupText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > max || /[\x00-\x1f\x7f]/.test(value))
    throw new ApiError(400, `Invalid ${label} (maximum ${max} characters).`);
  return value.trim() || null;
}
async function requireBuyer(auth: AuthContext, execute = true) {
  if (!auth.companyId)
    throw new ApiError(403, "Active buyer company required.");
  const rows = await query(
    `SELECT c.Id FROM dbo.CompanyMembers m JOIN dbo.MemberRoles r ON r.Id=m.MemberRoleId JOIN dbo.AccountStatuses s ON s.Id=m.MemberStatusId JOIN dbo.Companies c ON c.Id=m.CompanyId JOIN dbo.CompanyTypes ct ON ct.Id=c.CompanyTypeId
 WHERE m.UserId=@user AND m.CompanyId=@company AND s.Code='active' AND ct.Code IN ('buyer','both') AND c.VerificationStatusId NOT IN (SELECT Id FROM dbo.AccountStatuses WHERE Code IN ('inactive','suspended')) AND (@execute=0 OR r.Code IN ('owner','admin') OR m.CanExecuteTransactions=1)`,
    [
      p("user", auth.userId, sql.Int),
      p("company", auth.companyId, sql.Int),
      p("execute", execute, sql.Bit),
    ],
  );
  if (!rows.length)
    throw new ApiError(403, "Buyer transaction permission required.");
  return auth.companyId;
}
export function assertSessionMatches(
  attempt: Pick<
    Attempt,
    "amountCents" | "currencyCode" | "providerSessionId" | "livemode"
  >,
  session: Pick<
    Stripe.Checkout.Session,
    "id" | "livemode" | "mode" | "amount_total" | "currency"
  >,
) {
  if (
    session.id !== attempt.providerSessionId ||
    session.livemode !== attempt.livemode ||
    session.mode !== "payment" ||
    session.amount_total !== Number(attempt.amountCents) ||
    session.currency?.toUpperCase() !== attempt.currencyCode.toUpperCase()
  )
    throw new ApiError(409, "Provider payment does not match the saved order.");
}
async function reconcileSession(
  session: Stripe.Checkout.Session,
  eventId?: string,
  eventType = "checkout.reconciled",
) {
  const config = stripeConfiguration();
  const result = await runInTransaction(async (tx) => {
    if (
      eventId &&
      (
        await txQuery(
          tx,
          "SELECT EventId FROM dbo.StripePaymentEvents WITH(UPDLOCK,HOLDLOCK) WHERE EventId=@event",
          [p("event", eventId)],
        )
      ).length
    )
      return;
    let attempt = (
      await txQuery<Attempt>(
        tx,
        `${selection} WITH(UPDLOCK,HOLDLOCK) WHERE ProviderSessionId=@session AND PlatformAccountId=@platform AND Livemode=@live`,
        [
          p("session", session.id),
          p("platform", config.platform),
          p("live", config.live, sql.Bit),
        ],
      )
    )[0];
    if (!attempt) {
      const binding = session.metadata?.ecoglobe_checkout_binding;
      if (!binding) return;
      const unbound = (
        await txQuery<Attempt>(
          tx,
          `${selection} WITH(UPDLOCK,HOLDLOCK) WHERE BindingId=TRY_CONVERT(UNIQUEIDENTIFIER,@binding) AND ProviderSessionId IS NULL AND PlatformAccountId=@platform AND Livemode=@live`,
          [
            p("binding", binding),
            p("platform", config.platform),
            p("live", config.live, sql.Bit),
          ],
        )
      )[0];
      if (!unbound) return;
      if (unbound.state === "pending")
        throw new ApiError(
          503,
          "Checkout session binding is pending. Retry delivery.",
        );
      // An authoritative provider fetch can surface a late payment after recovery
      // released stock. Match its immutable values, but never re-reserve stock.
      attempt = { ...unbound, providerSessionId: session.id };
    }
    assertSessionMatches(attempt, session);
    const params = [
      p("id", attempt.id, sql.Int),
      p("order", attempt.orderId, sql.Int),
      p("listing", attempt.listingId, sql.Int),
      p("quantity", attempt.quantity, sql.Decimal(18, 3)),
      p("amount", Number(attempt.amountCents) / 100, sql.Decimal(18, 2)),
      p("currency", attempt.currencyCode),
      p("buyer", attempt.buyerCompanyId, sql.Int),
    ];
    if (
      session.payment_status === "paid" &&
      !["pending", "paid"].includes(attempt.state)
    ) {
      await txQuery(
        tx,
        `IF NOT EXISTS(SELECT 1 FROM dbo.CheckoutAnomalies WHERE ProviderSessionId=@session)
        INSERT dbo.CheckoutAnomalies(OrderId,ProviderSessionId,Reason) VALUES(@order,@session,'Payment confirmed after reservation was released; manual refund review required.');`,
        [p("session", session.id), p("order", attempt.orderId, sql.Int)],
      );
      if (eventId)
        await txQuery(
          tx,
          "INSERT dbo.StripePaymentEvents(EventId,EventType) VALUES(@event,@type)",
          [p("event", eventId), p("type", eventType)],
        );
      return { anomaly: true };
    }
    if (session.payment_status === "paid" && attempt.state === "pending") {
      const paymentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (!paymentId)
        throw new ApiError(409, "Paid session has no payment reference.");
      await txQuery(
        tx,
        `INSERT dbo.Payments(OrderId,PayerCompanyId,ProviderPaymentId,Amount,CurrencyCode,PaymentStatusId,PaymentTypeId)
    VALUES(@order,@buyer,@payment,@amount,@currency,(SELECT Id FROM dbo.PaymentStatuses WHERE Code='captured'),(SELECT Id FROM dbo.PaymentTypes WHERE Code='buyer_funding'));
    UPDATE dbo.Orders SET OrderStatusId=(SELECT Id FROM dbo.OrderStatuses WHERE Code='in_progress'),UpdatedAt=SYSUTCDATETIME() WHERE Id=@order;
    UPDATE dbo.CheckoutAttempts SET State='paid' WHERE Id=@id;`,
        [...params, p("payment", paymentId)],
      );
    } else if (session.status === "expired" && attempt.state === "pending") {
      await txQuery(
        tx,
        `UPDATE dbo.Listings SET Quantity=Quantity+@quantity,UpdatedAt=SYSUTCDATETIME() WHERE Id=@listing;
    UPDATE dbo.CheckoutAttempts SET State='expired' WHERE Id=@id;
    UPDATE dbo.SampleShippingCredits SET RedeemedOrderId=NULL,RedeemedAt=NULL WHERE RedeemedOrderId=@order;
    DELETE dbo.SampleCreditApplications WHERE OrderId=@order;
    UPDATE dbo.Orders SET OrderStatusId=(SELECT Id FROM dbo.OrderStatuses WHERE Code='cancelled'),UpdatedAt=SYSUTCDATETIME() WHERE Id=@order;`,
        params,
      );
    }
    if (eventId)
      await txQuery(
        tx,
        "INSERT dbo.StripePaymentEvents(EventId,EventType) VALUES(@event,@type)",
        [p("event", eventId), p("type", eventType)],
      );
  });
  if (result?.anomaly && !eventId)
    throw new ApiError(
      409,
      "Payment requires administrator review. Do not retry payment.",
    );
}
export async function reconcileCheckoutEvent(event: Stripe.Event) {
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.expired",
    ].includes(event.type)
  )
    return;
  const object = event.data.object;
  if (object.object !== "checkout.session") return;
  const config = stripeConfiguration();
  if (event.livemode !== config.live || event.account)
    throw new ApiError(400, "Unexpected payment event account or mode.");
  // Fetch authoritative provider state: metadata alone never binds an order or payment.
  const session = await config.stripe.checkout.sessions.retrieve(object.id);
  await reconcileSession(session, event.id, event.type);
}
export async function reserveCheckout(
  auth: AuthContext,
  body: Record<string, unknown>,
  config: Pick<ReturnType<typeof stripeConfiguration>, "platform" | "live">,
): Promise<Attempt> {
  const companyId = await requireBuyer(auth);
  const value = validateCheckout(body);
  // Preserve hashes for retries created before the additive contact fields.
  const { pickupContactName, pickupContactPhone, pickupVehicleDetails, ...originalValue } = value;
  const hash = createHash("sha256").update(JSON.stringify({
    ...originalValue,
    ...(pickupContactName !== null ? { pickupContactName } : {}),
    ...(pickupContactPhone !== null ? { pickupContactPhone } : {}),
    ...(pickupVehicleDetails !== null ? { pickupVehicleDetails } : {}),
  })).digest("hex");
  return runInTransaction(async (tx) => {
    const lock = await txQuery<{ result: number }>(
      tx,
      "DECLARE @r INT; EXEC @r=sys.sp_getapplock @Resource=@key,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000; SELECT @r AS result;",
      [p("key", `checkout:${companyId}:${value.idempotencyKey}`)],
    );
    if ((lock[0]?.result ?? -1) < 0)
      throw new ApiError(409, "Checkout is busy. Retry with the same key.");
    const params = [
      p("buyer", companyId, sql.Int),
      p("key", value.idempotencyKey),
    ];
    const previous = (
      await txQuery<Attempt>(
        tx,
        `${selection} WITH(UPDLOCK,HOLDLOCK) WHERE BuyerCompanyId=@buyer AND IdempotencyKey=@key`,
        params,
      )
    )[0];
    if (previous) {
      if (previous.requestHash !== hash)
        throw new ApiError(
          409,
          "Checkout key was already used for different details.",
        );
      return previous;
    }
    const listing = (
      await txQuery<{
        seller: number;
        price: number;
        currency: string;
        unit: string;
        minimum: number;
        quantity: number;
        title: string;
      }>(
        tx,
        `SELECT l.SellerCompanyId AS seller,l.PricePerUnit AS price,l.CurrencyCode AS currency,l.QuantityUnit AS unit,l.MinimumOrderQuantity AS minimum,l.Quantity AS quantity,l.Title AS title FROM dbo.Listings l WITH(UPDLOCK,HOLDLOCK) JOIN dbo.ListingStatuses s ON s.Id=l.ListingStatusId JOIN dbo.Companies c ON c.Id=l.SellerCompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId WHERE l.Id=@listing AND s.Code='published' AND cs.Code NOT IN ('inactive','suspended')`,
        [p("listing", value.listingId, sql.Int)],
      )
    )[0];
    if (!listing) throw new ApiError(404, "Published listing not found.");
    const safetyDocuments = await txQuery(tx,
      `SELECT TOP (1) d.Id FROM dbo.ListingDocuments d JOIN dbo.DocumentTypes t ON t.Id=d.DocumentTypeId
       WHERE d.ListingId=@listing AND t.Code='sds' AND d.DeletedAt IS NULL
       AND (d.Content IS NOT NULL OR NULLIF(d.FileUrl,'') IS NOT NULL)`,
      [p("listing", value.listingId, sql.Int)],
    );
    if (!safetyDocuments.length)
      throw new ApiError(409, "The seller must upload the SDS before this listing can be purchased.");
    if (listing.seller === companyId)
      throw new ApiError(409, "You cannot purchase your own listing.");
    if (
      (!value.quoteId && value.quantity < Number(listing.minimum)) ||
      value.quantity > Number(listing.quantity)
    )
      throw new ApiError(
        409,
        "Requested quantity is outside the available range.",
      );
    let unitPrice = Number(listing.price);
    if (value.quoteId) {
      const quote = (
        await txQuery<{
          quantity: number;
          price: number;
          currency: string;
          unit: string;
        }>(
          tx,
          `SELECT q.Quantity AS quantity,q.UnitPrice AS price,q.CurrencyCode AS currency,q.QuantityUnit AS unit FROM dbo.Quotes q WITH(UPDLOCK,HOLDLOCK) JOIN dbo.QuoteStatuses s ON s.Id=q.QuoteStatusId WHERE q.Id=@quote AND q.ListingId=@listing AND q.BuyerCompanyId=@buyer AND q.SellerCompanyId=@seller AND s.Code='accepted' AND (q.ExpiresAt IS NULL OR q.ExpiresAt>SYSUTCDATETIME())`,
          [
            p("quote", value.quoteId, sql.Int),
            p("listing", value.listingId, sql.Int),
            p("buyer", companyId, sql.Int),
            p("seller", listing.seller, sql.Int),
          ],
        )
      )[0];
      if (
        !quote ||
        Number(quote.quantity) !== value.quantity ||
        quote.currency !== listing.currency ||
        quote.unit !== listing.unit
      )
        throw new ApiError(
          409,
          "Accepted quote does not match checkout or has expired.",
        );
      if (
        (
          await txQuery(
            tx,
            "SELECT o.Id FROM dbo.Orders o JOIN dbo.OrderStatuses s ON s.Id=o.OrderStatusId WHERE o.QuoteId=@quote AND s.Code<>'cancelled'",
            [p("quote", value.quoteId, sql.Int)],
          )
        ).length
      )
        throw new ApiError(
          409,
          "This quote already has an order. Resume its existing checkout.",
        );
      unitPrice = Number(quote.price);
    }
    let cents = Math.round(value.quantity * unitPrice * 100);
    if (
      !Number.isSafeInteger(cents) ||
      cents < 50 ||
      listing.currency !== "USD"
    )
      throw new ApiError(
        400,
        "Checkout currently supports USD orders of at least $0.50.",
      );
    const expires = new Date(Date.now() + 35 * 60 * 1000);
    const rows = await txQuery<{ id: number }>(
      tx,
      `INSERT dbo.Orders(QuoteId,ListingId,BuyerCompanyId,SellerCompanyId,CreationSourceId,OrderStatusId,TotalAmount,CurrencyCode,EscrowRequired,Quantity,QuantityUnit,DeliveryMethod,DeliveryAddress,PickupRequestedAt,PickupContactName,PickupContactPhone,PickupVehicleDetails,CreatedByUserId,UpdatedByUserId)
   OUTPUT INSERTED.Id AS id VALUES(@quote,@listing,@buyer,@seller,(SELECT Id FROM dbo.OrderCreationSources WHERE Code='listing_checkout'),(SELECT Id FROM dbo.OrderStatuses WHERE Code='awaiting_payment'),@amount,@currency,0,@quantity,@unit,@delivery,@address,@pickup,@pickupContactName,@pickupContactPhone,@pickupVehicleDetails,@user,@user)`,
      [
        p("quote", value.quoteId, sql.Int),
        p("listing", value.listingId, sql.Int),
        p("buyer", companyId, sql.Int),
        p("seller", listing.seller, sql.Int),
        p("amount", cents / 100, sql.Decimal(18, 2)),
        p("currency", listing.currency),
        p("quantity", value.quantity, sql.Decimal(18, 3)),
        p("unit", listing.unit),
        p("delivery", value.deliveryMethod),
        p("address", value.deliveryAddress, sql.NVarChar(400)),
        p("pickupContactName", value.pickupContactName, sql.NVarChar(160)),
        p("pickupContactPhone", value.pickupContactPhone, sql.NVarChar(80)),
        p("pickupVehicleDetails", value.pickupVehicleDetails, sql.NVarChar(400)),
        p(
          "pickup",
          value.pickupRequestedAt ? new Date(value.pickupRequestedAt) : null,
          sql.DateTime2,
        ),
        p("user", auth.userId, sql.Int),
      ],
    );
    cents -= await applySampleShippingCredit(
      (statement, params = []) => txQuery(tx, statement, params),
      rows[0]!.id,
      50,
    );
    await txQuery(
      tx,
      `UPDATE dbo.Listings SET Quantity=Quantity-@quantity,UpdatedAt=SYSUTCDATETIME() WHERE Id=@listing;
   INSERT dbo.CheckoutAttempts(BuyerCompanyId,IdempotencyKey,RequestHash,OrderId,ListingId,Quantity,AmountCents,CurrencyCode,PlatformAccountId,Livemode,ExpiresAt)
   VALUES(@buyer,@key,@hash,@order,@listing,@quantity,@cents,@currency,@platform,@live,@expires);`,
      [
        ...params,
        p("hash", hash),
        p("order", rows[0]!.id, sql.Int),
        p("listing", value.listingId, sql.Int),
        p("quantity", value.quantity, sql.Decimal(18, 3)),
        p("cents", cents, sql.BigInt),
        p("currency", listing.currency),
        p("platform", config.platform),
        p("live", config.live, sql.Bit),
        p("expires", expires, sql.DateTime2),
      ],
    );
    return (
      await txQuery<Attempt>(
        tx,
        `${selection} WHERE BuyerCompanyId=@buyer AND IdempotencyKey=@key`,
        params,
      )
    )[0]!;
  });
}

export async function handleCheckoutRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  const reconcile = url.pathname.match(
    /^\/api\/checkout\/(\d+)\/(reconcile|cancel)$/,
  );
  if (url.pathname !== "/api/checkout" && !reconcile) return false;
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  const auth = await requireSessionAuth(request),
    companyId = await requireBuyer(auth, reconcile?.[2] !== "reconcile"),
    config = stripeConfiguration();
  if (reconcile) {
    const attempt = (
      await query<Attempt>(
        `${selection} WHERE OrderId=@order AND BuyerCompanyId=@buyer`,
        [
          p("order", Number(reconcile[1]), sql.Int),
          p("buyer", companyId, sql.Int),
        ],
      )
    )[0];
    if (!attempt?.providerSessionId)
      throw new ApiError(404, "Checkout session not found.");
    if (
      attempt.platformAccountId !== config.platform ||
      attempt.livemode !== config.live
    )
      throw new ApiError(
        409,
        "Checkout belongs to a different payment configuration.",
      );
    let providerSession = await config.stripe.checkout.sessions.retrieve(
      attempt.providerSessionId,
    );
    assertSessionMatches(attempt, providerSession);
    if (reconcile[2] === "cancel") {
      if (providerSession.payment_status === "paid" || attempt.state === "paid")
        throw new ApiError(
          409,
          "Paid orders require an authorized refund, not cancellation.",
        );
      if (providerSession.status === "open")
        providerSession = await config.stripe.checkout.sessions.expire(
          providerSession.id,
          {},
          { idempotencyKey: `checkout-cancel-${attempt.binding}` },
        );
      if (providerSession.status !== "expired")
        throw new ApiError(
          409,
          "Payment is processing. Reconcile before cancellation.",
        );
    }
    await reconcileSession(providerSession);
    const saved = (
      await query<Attempt>(`${selection} WHERE Id=@id`, [
        p("id", attempt.id, sql.Int),
      ])
    )[0];
    sendJson(response, 200, {
      ok: true,
      orderId: attempt.orderId,
      status: saved?.state,
    });
    return true;
  }
  // A runtime cannot advertise available checkout without signed webhook reconciliation.
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new ApiError(
      503,
      "Online payment collection is awaiting webhook setup. Contact EcoGlobe for assistance.",
    );
  const attempt = await reserveCheckout(
    auth,
    await readJsonBody(request),
    config,
  );
  if (attempt.state !== "pending") {
    sendJson(response, 200, {
      ok: true,
      orderId: attempt.orderId,
      status: attempt.state,
      payment: null,
    });
    return true;
  }
  if (
    attempt.platformAccountId !== config.platform ||
    attempt.livemode !== config.live
  )
    throw new ApiError(
      409,
      "Checkout belongs to a different payment configuration.",
    );
  const prepared = await prepareCheckoutSession(attempt.id);
  if (prepared.providerSessionId) {
    const session = await config.stripe.checkout.sessions.retrieve(
      prepared.providerSessionId,
    );
    await reconcileSession(session);
  }
  const saved = (
    await query<Attempt>(`${selection} WHERE Id=@id`, [
      p("id", attempt.id, sql.Int),
    ])
  )[0]!;
  sendJson(response, 200, {
    ok: true,
    orderId: attempt.orderId,
    status: saved.state === "pending" ? "awaiting_payment" : saved.state,
    payment:
      saved.state === "pending"
        ? { provider: "stripe", checkoutUrl: saved.checkoutUrl }
        : null,
  });
  return true;
}

// Serialize provider creation and recovery across API replicas. A random database binding
// prevents local/dev orders with the same numeric ID from colliding in the sandbox.
async function prepareCheckoutSession(id: number): Promise<Attempt> {
  const config = stripeConfiguration(),
    lease = randomUUID();
  const attempt = await runInTransaction(async (tx) => {
    const row = (
      await txQuery<Attempt>(
        tx,
        `${selection} WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id`,
        [p("id", id, sql.Int)],
      )
    )[0];
    if (!row) throw new ApiError(404, "Checkout not found.");
    if (row.state !== "pending" || row.providerSessionId) return row;
    if (
      row.platformAccountId !== config.platform ||
      row.livemode !== config.live
    )
      throw new ApiError(409, "Payment configuration changed.");
    if (row.leaseUntil && new Date(row.leaseUntil).getTime() > Date.now())
      throw new ApiError(
        409,
        "Checkout is being prepared. Retry with the same details.",
      );
    await txQuery(
      tx,
      "UPDATE dbo.CheckoutAttempts SET LeaseToken=@lease,LeaseUntil=DATEADD(MINUTE,10,SYSUTCDATETIME()) WHERE Id=@id",
      [p("lease", lease, sql.UniqueIdentifier), p("id", id, sql.Int)],
    );
    return row;
  });
  if (attempt.state !== "pending" || attempt.providerSessionId) return attempt;
  async function withLease<T>(
    work: (tx: sql.Transaction) => Promise<T>,
  ): Promise<T> {
    return runInTransaction(async (tx) => {
      const owned = await txQuery(
        tx,
        "SELECT Id FROM dbo.CheckoutAttempts WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND LeaseToken=@lease AND State='pending' AND ProviderSessionId IS NULL",
        [p("id", id, sql.Int), p("lease", lease, sql.UniqueIdentifier)],
      );
      if (!owned.length)
        throw new ApiError(
          409,
          "Checkout state changed. Reconcile before retrying.",
        );
      return work(tx);
    });
  }
  try {
    const expiry = new Date(attempt.expiresAt).getTime();
    let session: Stripe.Checkout.Session | undefined;
    if (expiry < Date.now() + 30 * 60 * 1000) {
      // Search authoritative sessions before freeing a reservation after an uncertain
      // create response. Never infer a failed payment from a network error.
      let inspected = 0;
      for await (const candidate of config.stripe.checkout.sessions.list({
        limit: 100,
        created: {
          gte: Math.floor((expiry - 36 * 60 * 1000) / 1000),
          lte: Math.ceil(expiry / 1000),
        },
      })) {
        if (candidate.metadata?.ecoglobe_checkout_binding === attempt.binding) {
          session = candidate;
          break;
        }
        if (++inspected >= 1000)
          throw new ApiError(
            503,
            "Payment recovery is awaiting reconciliation.",
          );
      }
      if (!session) {
        if (Date.now() < expiry + 5 * 60 * 1000)
          throw new ApiError(
            409,
            "Payment setup is being reconciled. Retry this order shortly.",
          );
        await withLease(async (tx) =>
          txQuery(
            tx,
            `UPDATE dbo.Listings SET Quantity=Quantity+@quantity,UpdatedAt=SYSUTCDATETIME() WHERE Id=@listing;
          UPDATE dbo.CheckoutAttempts SET State='expired' WHERE Id=@id;
    UPDATE dbo.SampleShippingCredits SET RedeemedOrderId=NULL,RedeemedAt=NULL WHERE RedeemedOrderId=@order;
    DELETE dbo.SampleCreditApplications WHERE OrderId=@order;
          UPDATE dbo.Orders SET OrderStatusId=(SELECT Id FROM dbo.OrderStatuses WHERE Code='cancelled'),UpdatedAt=SYSUTCDATETIME() WHERE Id=@order;`,
            [
              p("quantity", attempt.quantity, sql.Decimal(18, 3)),
              p("listing", attempt.listingId, sql.Int),
              p("id", id, sql.Int),
              p("order", attempt.orderId, sql.Int),
            ],
          ),
        );
        return { ...attempt, state: "expired" };
      }
    } else {
      const returnUrl = new URL(stripeReturnUrl(undefined, "buyer"));
      returnUrl.searchParams.set("checkoutOrder", String(attempt.orderId));
      session = await config.stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: attempt.currencyCode.toLowerCase(),
                unit_amount: Number(attempt.amountCents),
                product_data: { name: `EcoGlobe order ${attempt.orderId}` },
              },
              quantity: 1,
            },
          ],
          success_url: returnUrl.toString(),
          cancel_url: returnUrl.toString(),
          expires_at: Math.floor(expiry / 1000),
          metadata: {
            ecoglobe_order_id: String(attempt.orderId),
            ecoglobe_checkout_binding: attempt.binding,
          },
          payment_intent_data: {
            metadata: {
              ecoglobe_order_id: String(attempt.orderId),
              ecoglobe_checkout_binding: attempt.binding,
            },
          },
        },
        { idempotencyKey: `ecoglobe-checkout-${attempt.binding}` },
      );
    }

    assertSessionMatches(
      { ...attempt, providerSessionId: session.id },
      session,
    );
    await withLease((tx) =>
      txQuery(
        tx,
        "UPDATE dbo.CheckoutAttempts SET ProviderSessionId=@session,CheckoutUrl=@url WHERE Id=@id",
        [
          p("session", session.id),
          p("url", session.url, sql.NVarChar(2000)),
          p("id", id, sql.Int),
        ],
      ),
    );
    return {
      ...attempt,
      providerSessionId: session.id,
      checkoutUrl: session.url,
    };
  } finally {
    try {
      await query(
        "UPDATE dbo.CheckoutAttempts SET LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@lease",
        [p("id", id, sql.Int), p("lease", lease, sql.UniqueIdentifier)],
      );
    } catch {
      console.error(
        JSON.stringify({
          event: "checkout_lease_release_failed",
          attemptId: id,
        }),
      );
    }
  }
}

export async function processPendingCheckouts() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
    return;
  const config = stripeConfiguration();
  const pending = await query<Attempt>(
    `${selection} WHERE State='pending' AND PlatformAccountId=@platform AND Livemode=@live AND (ProviderSessionId IS NULL OR ExpiresAt<SYSUTCDATETIME()) ORDER BY Id OFFSET 0 ROWS FETCH NEXT 25 ROWS ONLY`,
    [p("platform", config.platform), p("live", config.live, sql.Bit)],
  );
  for (const attempt of pending) {
    try {
      const prepared = await prepareCheckoutSession(attempt.id);
      if (prepared.providerSessionId)
        await reconcileSession(
          await config.stripe.checkout.sessions.retrieve(
            prepared.providerSessionId,
          ),
        );
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "checkout_reconciliation_failed",
          orderId: attempt.orderId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      // Preserve the reservation on uncertainty; subsequent ticks retry provider state.
    }
  }
}
