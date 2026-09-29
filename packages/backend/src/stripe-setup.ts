import Stripe from "stripe";
import {
  sql,
  queryRowsWithParams as query,
  queryRowsWithParamsInTransaction as txQuery,
  runInTransaction,
} from "./database.js";
import { ApiError, type AuthContext } from "./http.js";

const p = (name: string, value: unknown) => ({
  name,
  value,
  type:
    typeof value === "number"
      ? sql.Int
      : typeof value === "boolean"
        ? sql.Bit
        : sql.VarChar(200),
});
type Role = "buyer" | "seller";
type Binding = {
  bindingId: string;
  customerId: string | null;
  connectedAccountId: string | null;
  billingReady: boolean;
  payoutReady: boolean;
};

export function stripeConfiguration() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const platform = process.env.STRIPE_PLATFORM_ACCOUNT_ID?.trim();
  const mode = process.env.STRIPE_MODE;
  if (
    !key ||
    !platform ||
    !/^acct_[A-Za-z0-9]+$/.test(platform) ||
    !["test", "live"].includes(mode ?? "")
  )
    throw new ApiError(503, "Stripe payment setup is not configured.");
  const live = mode === "live";
  if (!(live ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/).test(key))
    throw new ApiError(503, "Stripe key and configured mode do not match.");
  return {
    stripe: new Stripe(key, { timeout: 15000, maxNetworkRetries: 2 }),
    platform,
    live,
  };
}

export function stripeReturnUrl(value: unknown, role: Role) {
  const origin = process.env.ECOGLOBE_WEB_URL;
  if (!origin) throw new ApiError(503, "Payment return URL is not configured.");
  const allowed = (process.env.STRIPE_RETURN_ORIGINS ?? origin)
    .split(",")
    .map((v) => new URL(v.trim()).origin);
  let url: URL;
  try {
    url = new URL(
      typeof value === "string" ? value : `/${role}/accounting/payments`,
      origin,
    );
  } catch {
    throw new ApiError(400, "Invalid payment return URL.");
  }
  if (
    !allowed.includes(url.origin) ||
    url.username ||
    url.password ||
    !["https:", "http:"].includes(url.protocol)
  )
    throw new ApiError(400, "Payment return URL is not allowed.");
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function company(auth: AuthContext, role: Role) {
  if (!auth.companyId)
    throw new ApiError(403, "Active company membership required.");
  const rows = await query<{ email: string; legalName: string }>(
    `
    SELECT u.Email AS email,c.LegalName AS legalName
    FROM dbo.CompanyMembers m JOIN dbo.AccountStatuses s ON s.Id=m.MemberStatusId
    JOIN dbo.MemberRoles r ON r.Id=m.MemberRoleId JOIN dbo.Users u ON u.Id=m.UserId
    JOIN dbo.Companies c ON c.Id=m.CompanyId JOIN dbo.CompanyTypes ct ON ct.Id=c.CompanyTypeId
    WHERE m.CompanyId=@company AND m.UserId=@user AND s.Code='active'
      AND (r.Code IN ('owner','admin') OR m.CanExecuteTransactions=1)
      AND ct.Code IN (@role,'both')`,
    [p("company", auth.companyId), p("user", auth.userId), p("role", role)],
  );
  if (!rows[0])
    throw new ApiError(403, "Company payment setup permission required.");
  return rows[0];
}

export async function startStripeSetup(
  auth: AuthContext,
  role: Role,
  returnValue: unknown,
  refreshValue: unknown,
) {
  const config = stripeConfiguration();
  const member = await company(auth, role);
  const returnUrl = stripeReturnUrl(returnValue, role);
  const refreshUrl = stripeReturnUrl(refreshValue, role);
  const params = [
    p("company", auth.companyId),
    p("platform", config.platform),
    p("live", config.live),
  ];
  // Commit an opaque provider namespace before making any remote requests. This
  // survives uncertain responses and separates development databases sharing a sandbox.
  await runInTransaction(async (tx) => {
    await txQuery(
      tx,
      `IF NOT EXISTS(SELECT 1 FROM dbo.StripeCompanyBindings WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live) INSERT dbo.StripeCompanyBindings(CompanyId,PlatformAccountId,Livemode) VALUES(@company,@platform,@live);`,
      params,
    );
  });
  const binding = await runInTransaction(async (tx) => {
    const lock = await txQuery<{ result: number }>(
      tx,
      `DECLARE @r INT; EXEC @r=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=20000; SELECT @r AS result;`,
      [
        p(
          "resource",
          `stripe:${config.platform}:${config.live}:${auth.companyId}`,
        ),
      ],
    );
    if ((lock[0]?.result ?? -1) < 0)
      throw new ApiError(409, "Payment setup is busy. Please retry.");
    await txQuery(
      tx,
      `IF NOT EXISTS(SELECT 1 FROM dbo.StripeCompanyBindings WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live) INSERT dbo.StripeCompanyBindings(CompanyId,PlatformAccountId,Livemode) VALUES(@company,@platform,@live);`,
      params,
    );
    const row = (
      await txQuery<Binding>(
        tx,
        `SELECT CONVERT(VARCHAR(36),BindingId) AS bindingId,CustomerId AS customerId,ConnectedAccountId AS connectedAccountId,BillingReady AS billingReady,PayoutReady AS payoutReady FROM dbo.StripeCompanyBindings WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live;`,
        params,
      )
    )[0]!;
    const metadata = {
      ecoglobe_company_id: String(auth.companyId),
      ecoglobe_binding_id: row.bindingId,
    };
    if (role === "buyer" && !row.customerId) {
      const customer = await config.stripe.customers.create(
        { email: member.email, name: member.legalName, metadata },
        {
          idempotencyKey: `ecoglobe:customer:${row.bindingId}`,
        },
      );
      row.customerId = customer.id;
      await txQuery(
        tx,
        `UPDATE dbo.StripeCompanyBindings SET CustomerId=@id WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live`,
        [...params, p("id", customer.id)],
      );
    }
    if (role === "seller" && !row.connectedAccountId) {
      const account = await config.stripe.v2.core.accounts.create(
        {
          dashboard: "express",
          contact_email: member.email,
          display_name: member.legalName,
          identity: { country: "US", entity_type: "company" },
          defaults: {
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application",
            },
          },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: { stripe_transfers: { requested: true } },
              },
            },
          },
          metadata,
        },
        {
          idempotencyKey: `ecoglobe:seller-v2:${row.bindingId}`,
        },
      );
      row.connectedAccountId = account.id;
      await txQuery(
        tx,
        `UPDATE dbo.StripeCompanyBindings SET ConnectedAccountId=@id WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live`,
        [...params, p("id", account.id)],
      );
    }
    return row;
  });
  if (role === "seller") {
    const link = await config.stripe.v2.core.accountLinks.create({
      account: binding.connectedAccountId!,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          return_url: `${returnUrl}?stripe=success`,
          refresh_url: refreshUrl,
        },
      },
    });
    return {
      ok: true,
      provider: "stripe",
      mode: "stripe",
      role,
      companyId: auth.companyId,
      redirectUrl: link.url,
      providerReference: binding.connectedAccountId,
      statusCode: "pending",
      message: "Stripe onboarding redirect created.",
    };
  }
  const session = await config.stripe.checkout.sessions.create({
    mode: "setup",
    currency: "usd",
    customer: binding.customerId!,
    payment_method_types: ["card"],
    metadata: { ecoglobe_company_id: String(auth.companyId) },
    success_url: `${returnUrl}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?stripe=cancelled`,
  });
  await query(
    `INSERT dbo.StripeSetupSessions(SessionId,CompanyId,PlatformAccountId,Livemode,CustomerId) VALUES(@session,@company,@platform,@live,@customer);`,
    [...params, p("session", session.id), p("customer", binding.customerId)],
  );
  if (!session.url)
    throw new ApiError(502, "Stripe did not return a setup URL.");
  return {
    ok: true,
    provider: "stripe",
    mode: "stripe",
    role,
    companyId: auth.companyId,
    redirectUrl: session.url,
    providerReference: session.id,
    statusCode: "pending_verification",
    message: "Stripe setup redirect created.",
  };
}

export async function syncStripeSetup(
  auth: AuthContext,
  role: Role,
  sessionId?: string,
) {
  await company(auth, role);
  return syncCompanyStripeSetup(auth.companyId!, role, sessionId);
}

async function syncCompanyStripeSetup(
  companyId: number,
  role: Role,
  sessionId?: string,
) {
  const { stripe, platform, live } = stripeConfiguration();
  const params = [
    p("company", companyId),
    p("platform", platform),
    p("live", live),
  ];
  const binding = (
    await query<Binding>(
      `SELECT CONVERT(VARCHAR(36),BindingId) AS bindingId,CustomerId AS customerId,ConnectedAccountId AS connectedAccountId,BillingReady AS billingReady,PayoutReady AS payoutReady FROM dbo.StripeCompanyBindings WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live`,
      params,
    )
  )[0];
  let ready = false;
  if (role === "buyer" && sessionId) {
    const owned = await query(
      `SELECT SessionId FROM dbo.StripeSetupSessions WHERE SessionId=@session AND CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live`,
      [...params, p("session", sessionId)],
    );
    if (!owned.length)
      throw new ApiError(404, "Payment setup session not found.");
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["setup_intent"],
    });
    const intent = session.setup_intent;
    if (
      session.customer !== binding?.customerId ||
      session.livemode !== live ||
      session.mode !== "setup"
    )
      throw new ApiError(
        409,
        "Payment setup session does not match this company.",
      );
    if (
      session.status === "complete" &&
      intent &&
      typeof intent !== "string" &&
      intent.status === "succeeded" &&
      intent.payment_method
    ) {
      await stripe.customers.update(binding.customerId!, {
        invoice_settings: {
          default_payment_method:
            typeof intent.payment_method === "string"
              ? intent.payment_method
              : intent.payment_method.id,
        },
      });
    }
  }
  if (role === "buyer" && binding?.customerId) {
    const customer = await stripe.customers.retrieve(binding.customerId);
    if (!customer.deleted && customer.invoice_settings.default_payment_method) {
      const methodId = customer.invoice_settings.default_payment_method;
      const method = await stripe.paymentMethods.retrieve(
        typeof methodId === "string" ? methodId : methodId.id,
      );
      ready =
        method.customer === binding.customerId && method.livemode === live;
    }
  }
  if (role === "seller" && binding?.connectedAccountId) {
    const account = await stripe.v2.core.accounts.retrieve(
      binding.connectedAccountId,
      { include: ["configuration.recipient"] },
    );
    const balance =
      account.configuration?.recipient?.capabilities?.stripe_balance;
    ready =
      account.livemode === live &&
      balance?.payouts?.status === "active" &&
      balance?.stripe_transfers?.status === "active";
  }
  if (binding) {
    await query(
      role === "buyer"
        ? `UPDATE dbo.StripeCompanyBindings SET BillingReady=@ready,UpdatedAt=SYSUTCDATETIME() WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live; UPDATE dbo.BuyerProfiles SET BillingStatusId=(SELECT Id FROM dbo.AccountStatuses WHERE Code=CASE WHEN @ready=1 THEN 'active' ELSE 'pending_verification' END),UpdatedAt=SYSUTCDATETIME() WHERE CompanyId=@company;`
        : `UPDATE dbo.StripeCompanyBindings SET PayoutReady=@ready,UpdatedAt=SYSUTCDATETIME() WHERE CompanyId=@company AND PlatformAccountId=@platform AND Livemode=@live;`,
      [...params, p("ready", ready)],
    );
  }
  return {
    ok: true,
    role,
    ready,
    mode: live ? "live" : "test",
    message: ready
      ? role === "buyer"
        ? "Payment method verified with Stripe."
        : "Stripe seller payout setup is ready."
      : "Stripe setup is incomplete. Continue setup to finish.",
  };
}

/** Resolve ownership from stored provider bindings, never event metadata. */
export async function reconcileStripeSetupEvent(event: Stripe.Event) {
  const { platform, live } = stripeConfiguration();
  if (event.livemode !== live)
    throw new ApiError(400, "Stripe event mode mismatch.");
  if (
    event.type === "checkout.session.completed" &&
    event.data.object.mode === "setup"
  ) {
    const row = (
      await query<{ companyId: number }>(
        `SELECT CompanyId AS companyId FROM dbo.StripeSetupSessions WHERE SessionId=@id AND PlatformAccountId=@platform AND Livemode=@live`,
        [
          p("id", event.data.object.id),
          p("platform", platform),
          p("live", live),
        ],
      )
    )[0];
    if (row)
      await syncCompanyStripeSetup(
        row.companyId,
        "buyer",
        event.data.object.id,
      );
  }
  if (event.type === "account.updated") {
    const row = (
      await query<{ companyId: number }>(
        `SELECT CompanyId AS companyId FROM dbo.StripeCompanyBindings WHERE ConnectedAccountId=@id AND PlatformAccountId=@platform AND Livemode=@live`,
        [
          p("id", event.data.object.id),
          p("platform", platform),
          p("live", live),
        ],
      )
    )[0];
    if (row) await syncCompanyStripeSetup(row.companyId, "seller");
  }
}
