import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import sql from "mssql";
import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";

// Only the driver is stubbed: real API dispatch, session/RBAC, body parsing,
// transaction wrapper and PDF rendering execute. This is not SQL execution proof.
process.env.AZURE_SQL_CONNECTION_STRING = "stub-driver-only";
process.env.SQL_CONNECTION_STRING = "stub-driver-only";
const { handleApiRoute } = await import("./api.js");
const { ApiError } = await import("./http.js");
let company = 10;
let wantedOpen = true;
let hasSds = true;
let failClose = false;
let commits = 0;
let rollbacks = 0;
let quote = {
  id: 5,
  wantedListingId: 7,
  listingId: 8,
  buyerCompanyId: 10,
  sellerCompanyId: 20,
  quoteStatusCode: "sent",
  quantity: 5,
  quantityUnit: "tons",
  currencyCode: "USD",
  unitPrice: 10,
  expiresAt: new Date(Date.now() + 86400000),
};
let listing = {
  seller: 20,
  unit: "tons",
  currency: "USD",
  quantity: 100,
  minimum: 2,
  material: 1,
};
const statements: string[] = [];
function rows(
  text: string,
  params: Record<string, unknown>,
): Record<string, unknown>[] {
  statements.push(text);
  if (text.includes("FROM dbo.UserSessions"))
    return [
      {
        id: 1,
        userId: 1,
        activeCompanyId: company,
        activeRoleCode: "buyer",
        accountStatusCode: "active",
        name: "QA",
        email: "qa@example.test",
      },
    ];
  if (
    text.includes("FROM dbo.CompanyMembers cm") &&
    text.includes("companyTypeCode")
  )
    return [
      {
        id: company,
        companyTypeCode: "both",
        memberRoleCode: "owner",
        permissionTierCode: "standard",
      },
    ];
  if (text.includes("UPDATE dbo.UserSessions")) return [];
  if (text.includes("FROM dbo.CompanyMembers")) return [{ id: 1 }];
  if (text.includes("FROM dbo.ListingDocuments"))
    return hasSds ? [{ Id: 1 }] : [];
  if (text.includes("FROM dbo.Listings l")) return [listing];
  if (text.includes("UPDATE dbo.WantedListings")) {
    if (failClose) throw new Error("injected close failure");
    wantedOpen = false;
    return [{ id: 7, isOpen: false }];
  }
  if (
    text.includes("SELECT TOP (100)") &&
    text.includes("FROM dbo.WantedListings w")
  )
    return [
      {
        id: 7,
        buyerCompanyId: 10,
        isOpen: wantedOpen,
        acceptedCount: quote.quoteStatusCode === "accepted" ? 1 : 0,
      },
    ];
  if (text.includes("FROM dbo.WantedListings"))
    return [
      {
        id: 7,
        buyer: 10,
        buyerCompanyId: 10,
        isOpen: wantedOpen,
        unit: "tons",
        material: 1,
        currency: "USD",
      },
    ];
  if (text.includes("UPDATE dbo.Quotes")) {
    quote.quoteStatusCode = "accepted";
    return [{ ...quote }];
  }
  if (text.includes("INSERT dbo.Quotes")) return [{ id: 6 }];
  if (text.includes("FROM dbo.Quotes")) {
    if (
      text.includes("BuyerCompanyId=@company") &&
      params.admin !== true &&
      params.company !== quote.buyerCompanyId &&
      params.company !== quote.sellerCompanyId
    )
      return [];
    if (
      text.includes("qs.Code='accepted'") ||
      text.includes("s.Code='accepted'")
    )
      return quote.quoteStatusCode === "accepted" ? [{ id: 5 }] : [];
    return [{ ...quote }];
  }
  if (
    text.includes("FROM dbo.Orders") &&
    text.includes("AS buyerCompanyId") &&
    !text.includes("JOIN")
  )
    return [{ buyerCompanyId: 10, sellerCompanyId: 20 }];
  if (text.includes("FROM dbo.Orders o"))
    return [
      {
        id: 20,
        buyerCompanyName: "QA Buyer",
        sellerCompanyName: "QA Seller",
        listingTitle: "Saved material",
        quantity: 5,
        quantityUnit: "tons",
        totalAmount: 50,
        currencyCode: "USD",
        orderStatusCode: "completed",
        createdAt: "2026-10-06T00:00:00Z",
      },
    ];
  if (text.includes("FROM dbo.Shipments")) return [];
  if (text.includes("FROM dbo.Payments")) return [];
  if (text.includes("SELECT Id AS id FROM dbo."))
    return [{ id: params.code === "accepted" ? 3 : 1 }];
  if (
    text.includes("INSERT INTO dbo.Audit") ||
    text.includes("dbo.Notifications") ||
    text.includes("dbo.CompanyMembers")
  )
    return [];
  throw new Error(`Unhandled driver statement: ${text}`);
}
function driverRequest() {
  const params: Record<string, unknown> = {};
  return {
    input(name: string, _type: unknown, value: unknown) {
      params[name] = value;
      return this;
    },
    async query(text: string) {
      return { recordset: rows(text, params) };
    },
  };
}
mock.method(sql, "connect", async () => ({ request: driverRequest }));
// Serialize the test driver transactions deterministically. Tests assert the
// application's lock order separately; this mutex does not prove SQL locking.
let tail = Promise.resolve();
const transactions = new WeakMap<
  object,
  { quote: typeof quote; open: boolean; release: () => void }
>();
mock.method(sql.Transaction.prototype, "begin", async function (this: object) {
  const previous = tail;
  let release = () => {};
  tail = new Promise<void>((r) => {
    release = r;
  });
  await previous;
  transactions.set(this, { quote: { ...quote }, open: wantedOpen, release });
});
mock.method(sql.Transaction.prototype, "request", driverRequest);
mock.method(sql.Transaction.prototype, "commit", async function (this: object) {
  commits++;
  transactions.get(this)!.release();
});
mock.method(
  sql.Transaction.prototype,
  "rollback",
  async function (this: object) {
    rollbacks++;
    const saved = transactions.get(this)!;
    quote = saved.quote;
    wantedOpen = saved.open;
    saved.release();
  },
);
function reset() {
  company = 10;
  wantedOpen = true;
  hasSds = true;
  failClose = false;
  commits = 0;
  rollbacks = 0;
  quote = {
    ...quote,
    quoteStatusCode: "sent",
    quantity: 5,
    quantityUnit: "tons",
    currencyCode: "USD",
    expiresAt: new Date(Date.now() + 86400000),
  };
  listing = {
    seller: 20,
    unit: "tons",
    currency: "USD",
    quantity: 100,
    minimum: 2,
    material: 1,
  };
  statements.length = 0;
}
async function route(
  path: string,
  method = "PATCH",
  body: unknown = { quoteStatusCode: "accepted" },
  authenticated = true,
) {
  const request = new IncomingMessage(new Socket());
  request.method = method;
  request.headers = authenticated
    ? { authorization: "Bearer test-session" }
    : {};
  request.push(JSON.stringify(body));
  request.push(null);
  const response = new ServerResponse(request);
  let bytes = Buffer.alloc(0);
  mock.method(
    response,
    "writeHead",
    (code: number, headers: Record<string, string>) => {
      response.statusCode = code;
      for (const [key, value] of Object.entries(headers))
        response.setHeader(key, value);
      return response;
    },
  );
  mock.method(response, "end", (chunk?: Uint8Array | string) => {
    if (chunk) bytes = Buffer.from(chunk);
    return response;
  });
  const handled = await handleApiRoute(
    request,
    response,
    new URL(`http://localhost${path}`),
  );
  request.destroy();
  return { handled, response, bytes };
}
const status = (expected: number) => (e: unknown) =>
  e instanceof ApiError && e.status === expected;
test("RFQ acceptance closes wanted demand atomically and repeat acceptance conflicts", async () => {
  reset();
  await route("/api/quotes/5");
  assert.equal(wantedOpen, false);
  assert.equal(commits, 1);
  assert.equal(quote.quoteStatusCode, "accepted");
  await assert.rejects(route("/api/quotes/5"), status(409));
});
test("RFQ response requires purchase-eligible authentic SDS", async () => {
  reset();
  company = 20;
  hasSds = false;
  await assert.rejects(
    route("/api/wanted-listings/7/responses", "POST", {
      listingId: 8,
      quantity: 5,
      unitPrice: 10,
    }),
    status(409),
  );
  assert.ok(!statements.some((s) => s.includes("INSERT dbo.Quotes")));
});
test("historical accepted RFQ projects closed without rewriting stored demand", async () => {
  reset();
  quote.quoteStatusCode = "accepted";
  const result = await route("/api/wanted-listings?mine=true", "GET", {});
  assert.equal(
    JSON.parse(result.bytes.toString()).wantedListings[0].isOpen,
    false,
  );
  assert.equal(wantedOpen, true);
});
test("acceptance rollback preserves quote and demand on close failure", async () => {
  reset();
  failClose = true;
  await assert.rejects(route("/api/quotes/5"), /injected close failure/);
  assert.equal(quote.quoteStatusCode, "sent");
  assert.equal(wantedOpen, true);
  assert.equal(rollbacks, 1);
});
test("acceptance validates current inventory, SDS, currency, unit, material, expiry and tenant", async () => {
  for (const change of [
    () => {
      hasSds = false;
    },
    () => {
      listing.quantity = 4;
    },
    () => {
      listing.minimum = 6;
    },
    () => {
      listing.currency = "EUR";
    },
    () => {
      listing.unit = "kg";
    },
    () => {
      listing.material = 2;
    },
    () => {
      quote.expiresAt = new Date(0);
    },
    () => {
      company = 99;
    },
  ]) {
    reset();
    change();
    await assert.rejects(route("/api/quotes/5"));
    assert.equal(quote.quoteStatusCode, "sent");
    assert.equal(wantedOpen, true);
  }
});
test("concurrent repeated acceptance yields one accepted transaction", async () => {
  reset();
  const results = await Promise.allSettled([
    route("/api/quotes/5"),
    route("/api/quotes/5"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(commits, 1);
  assert.equal(wantedOpen, false);
  const lock = statements.findIndex((s) =>
    s.includes("WantedListings WITH(UPDLOCK,HOLDLOCK)"),
  );
  const qlock = statements.findIndex((s) =>
    s.includes("Quotes q WITH(UPDLOCK,HOLDLOCK)"),
  );
  assert.ok(lock >= 0 && qlock > lock);
});
test("order invoice is an authenticated PDF of saved facts with honest missing payment", async () => {
  reset();
  const result = await route("/api/orders/20/invoice", "GET", {});
  assert.equal(result.handled, true);
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.response.getHeader("content-type"), "application/pdf");
  assert.equal(
    result.response.getHeader("content-disposition"),
    'attachment; filename="ecoglobe-invoice-EG-20.pdf"',
  );
  assert.match(String(result.response.getHeader("cache-control")), /no-store/);
  assert.equal(result.response.getHeader("x-content-type-options"), "nosniff");
  const pdf = await PDFDocument.load(result.bytes);
  const text = pdf.context
    .enumerateIndirectObjects()
    .flatMap(([, o]) =>
      o instanceof PDFRawStream
        ? [
            ...Buffer.from(decodePDFRawStream(o).decode())
              .toString("latin1")
              .matchAll(/<([a-f0-9]+)>/gi),
          ].map((m) => Buffer.from(m[1]!, "hex").toString("latin1"))
        : [],
    )
    .join("\n");
  for (const fact of [
    "EG-20",
    "QA Buyer",
    "QA Seller",
    "Saved material",
    "5 tons",
    "USD 50.00",
    "completed",
    "No payment recorded",
  ])
    assert.ok(text.includes(fact), fact);
});
test("invoice rejects anonymous, unrelated tenant and mutation methods", async () => {
  reset();
  await assert.rejects(
    route("/api/orders/20/invoice", "GET", {}, false),
    status(401),
  );
  company = 99;
  await assert.rejects(route("/api/orders/20/invoice", "GET", {}), status(403));
  for (const method of ["POST", "PATCH"])
    await assert.rejects(
      route("/api/orders/20/invoice", method, {}),
      status(405),
    );
});

test("seller cannot send a quote without SDS or negotiate closed demand", async () => {
  reset();
  company = 20;
  quote.quoteStatusCode = "requested";
  hasSds = false;
  await assert.rejects(
    route("/api/quotes/5", "PATCH", { quoteStatusCode: "sent" }),
    status(409),
  );
  reset();
  company = 20;
  wantedOpen = false;
  await assert.rejects(
    route("/api/quotes/5", "PATCH", { unitPrice: 11 }),
    status(409),
  );
});
test("accepted quote terms and buyer expiry rewrites are rejected", async () => {
  reset();
  quote.quoteStatusCode = "accepted";
  company = 20;
  await assert.rejects(
    route("/api/quotes/5", "PATCH", { unitPrice: 11 }),
    status(409),
  );
  reset();
  await assert.rejects(
    route("/api/quotes/5", "PATCH", {
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
    status(403),
  );
});
test("invoice PDF preserves recorded payment and shipment facts, wraps long saved names", async () => {
  const { orderInvoicePdf } = await import("./order-invoice.js");
  const pdf = await PDFDocument.load(
    await orderInvoicePdf(
      {
        id: 33,
        buyerCompanyName: "QA Buyer",
        sellerCompanyName: "W".repeat(4000),
        listingTitle: "Saved material",
        quantity: 5,
        quantityUnit: "tonne",
        quotedUnitPrice: 24,
        totalAmount: 120,
        currencyCode: "USD",
        orderStatusCode: "completed",
        createdAt: "2026-10-13T00:00:00Z",
      },
      [
        {
          id: 9,
          amount: 120,
          currencyCode: "USD",
          paymentStatusCode: "pending",
          paymentTypeCode: "buyer_funding",
        },
      ],
      [{ id: 3, status: "delivered" }],
    ),
  );
  assert.ok(pdf.getPageCount() > 1);
  const text = pdf.context
    .enumerateIndirectObjects()
    .flatMap(([, o]) =>
      o instanceof PDFRawStream
        ? [
            ...Buffer.from(decodePDFRawStream(o).decode())
              .toString("latin1")
              .matchAll(/<([a-f0-9]+)>/gi),
          ].map((m) => Buffer.from(m[1]!, "hex").toString("latin1"))
        : [],
    )
    .join("\n");
  for (const fact of [
    "2026-10-13",
    "USD 24.00",
    "SHP-3 status: delivered",
    "TX-9: USD 120.00; status: pending",
    "not a paid receipt",
  ])
    assert.ok(text.includes(fact), fact);
  assert.ok(!text.includes("No payment recorded"));
});

test("cross-tenant quote PATCH is rejected before tenant row locks or transaction", async () => {
  reset();
  company = 99;
  await assert.rejects(route("/api/quotes/5"), status(404));
  assert.ok(!statements.some((statement) => statement.includes("UPDLOCK")));
  assert.equal(commits, 0);
  assert.equal(rollbacks, 0);
});
