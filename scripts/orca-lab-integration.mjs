/** Real lab-referral SQL/API checks. Only the owned local database is allowed. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
const require = createRequire(
  new URL("../packages/backend/package.json", import.meta.url),
);
const sql = require("mssql");
let pool,
  child,
  phase = "owned database";
try {
  assert.match(
    process.env.AZURE_SQL_CONNECTION_STRING ?? "",
    /^Server=127\.0\.0\.1,/,
  );
  pool = await new sql.ConnectionPool(
    process.env.AZURE_SQL_CONNECTION_STRING,
  ).connect();
  const identity = (
    await pool
      .request()
      .query("SELECT DB_NAME() AS db,Token FROM dbo.OrcaOwner")
  ).recordset[0];
  assert.equal(identity.db, process.env.ORCA_SQL_DATABASE);
  assert.equal(identity.Token, process.env.ORCA_SQL_MARKER);
  const handle = await open(
    process.env.ORCA_ANA_FIXTURE,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  let fixture;
  try {
    const stat = await handle.stat();
    assert.ok(
      stat.isFile() &&
        stat.uid === process.getuid() &&
        !(stat.mode & 0o077) &&
        stat.nlink === 1,
    );
    fixture = JSON.parse(await handle.readFile("utf8"));
  } finally {
    await handle.close();
  }
  assert.equal(fixture.database, identity.db);
  child = spawn(
    process.execPath,
    ["--import", require.resolve("tsx"), "src/index.ts"],
    {
      cwd: new URL("../packages/backend", import.meta.url),
      env: process.env,
      stdio: "ignore",
    },
  );
  const origin = process.env.ECOGLOBE_API_BASE_URL;
  assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      ready = (await fetch(origin + "/health")).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready);
  async function call(path, method = "GET", body, token, status = 200) {
    const res = await fetch(origin + path, {
      method,
      signal: AbortSignal.timeout(30000),
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status !== status) {
      const failure = await res.json().catch(() => ({}));
      assert.equal(
        res.status,
        status,
        phase +
          " " +
          method +
          " " +
          path +
          ": " +
          String(failure.error ?? "").slice(0, 200),
      );
    }
    return res.json();
  }
  const seller = await call("/auth/login", "POST", {
    email: fixture.seller.email,
    password: fixture.password,
    role: "seller",
  });
  const admin = await call("/auth/login", "POST", {
    email: fixture.admin.email,
    password: fixture.password,
    role: "admin",
  });
  const buyer = await call("/auth/login", "POST", {
    email: fixture.buyer.email,
    password: fixture.password,
    role: "buyer",
  });
  // Remaining scenarios are populated from the reviewed API contract.
  const listingId =
    fixture.listings.find((item) => item.status === "published")?.id ??
    fixture.listings[0].id;
  phase = "draft panels remain private";
  const config = (await call(`/api/lab/config?listingId=${listingId}`)).config;
  assert.equal(config.panel, null);
  assert.equal(config.scopeToBeConfirmed, true);
  const panels = (
    await call("/api/admin/lab/panels", "GET", undefined, admin.token)
  ).panels;
  assert.ok(panels.length >= 4);
  assert.ok(panels.every((panel) => panel.status === "draft"));
  await call("/api/admin/lab/panels", "GET", undefined, buyer.token, 403);
  await call("/api/admin/lab/requests", "GET", undefined, seller.token, 403);
  await call("/api/lab/requests", "GET", undefined, undefined, 401);
  const body = {
    listingId,
    idempotencyKey: randomUUID(),
    panelId: null,
    panelVersion: null,
    optionalTestIds: [],
    concerns: "Synthetic lab verification only",
    turnaround: "standard",
    sharing: "private",
  };
  phase = "request validation";
  await call("/api/lab/requests", "POST", body, undefined, 401);
  await call("/api/lab/requests", "POST", body, seller.token, 403);
  await call(
    "/api/lab/requests",
    "POST",
    { ...body, listingId: 2147483647 },
    buyer.token,
    404,
  );
  await call(
    "/api/lab/requests",
    "POST",
    { ...body, turnaround: "tomorrow" },
    buyer.token,
    400,
  );
  await call(
    "/api/lab/requests",
    "POST",
    { ...body, optionalTestIds: ["not-a-real-test"] },
    buyer.token,
    400,
  );
  await call(
    "/api/admin/lab/panels",
    "POST",
    {
      familyCode: "synthetic-unreviewed",
      name: "Synthetic unpublished scope",
      materialTypeCodes: [config.categoryCode],
      tests: ["Synthetic test"],
      optionalTests: [],
      status: "published",
    },
    admin.token,
    400,
  );
  phase = "private request and duplicate retry";
  const created = (
    await call("/api/lab/requests", "POST", body, buyer.token, 201)
  ).request;
  const repeated = (await call("/api/lab/requests", "POST", body, buyer.token))
    .request;
  assert.equal(repeated.id, created.id);
  await call(
    "/api/lab/requests",
    "POST",
    { ...body, concerns: "Changed payload" },
    buyer.token,
    409,
  );
  const notificationCount = (
    await pool
      .request()
      .input("id", sql.Int, listingId)
      .input("actor", sql.Int, buyer.user.id)
      .query(
        "SELECT COUNT(*) AS n FROM dbo.Notifications WHERE RelatedRecordId=@id AND CreatedByUserId=@actor AND Subject LIKE '%lab%'",
      )
  ).recordset[0].n;
  assert.ok(
    notificationCount > 0,
    "Referral reaches the existing staff notification feed",
  );
  assert.equal(created.sharing, "private");
  const buyerRequests = (
    await call("/api/lab/requests", "GET", undefined, buyer.token)
  ).requests;
  const sellerRequests = (
    await call("/api/lab/requests", "GET", undefined, seller.token)
  ).requests;
  assert.equal(buyerRequests.filter((r) => r.id === created.id).length, 1);
  assert.ok(!sellerRequests.some((r) => r.id === created.id));
  assert.ok(!("notes" in buyerRequests.find((r) => r.id === created.id)));
  assert.ok(!("requestedByEmail" in buyerRequests.find((r) => r.id === created.id)));
  const internalRequest = (await call("/api/admin/lab/requests", "GET", undefined, admin.token)).requests.find((r) => r.id === created.id);
  assert.equal(internalRequest.requestedByEmail, fixture.buyer.email);
  assert.ok(internalRequest.companyName);
  phase = "internal handling and owner validation";
  const assignees = (
    await call("/api/admin/lab/assignees", "GET", undefined, admin.token)
  ).assignees;
  assert.ok(assignees.length);
  await call(
    `/api/admin/lab/requests/${created.id}`,
    "PATCH",
    {
      status: "reviewing",
      notes: "Internal-only lab note",
      ownerUserId: admin.user.id,
    },
    admin.token,
  );
  await call(
    `/api/admin/lab/requests/${created.id}`,
    "PATCH",
    { ownerUserId: buyer.user.id },
    admin.token,
    400,
  );
  const afterNote = (
    await call("/api/lab/requests", "GET", undefined, buyer.token)
  ).requests.find((r) => r.id === created.id);
  assert.ok(!JSON.stringify(afterNote).includes("Internal-only lab note"));
  phase = "PDF validation and private report";
  // A real minimal PDF with an xref table; all content is explicitly synthetic.
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Contents 4 0 R >>",
    "<< /Length 0 >>\nstream\n\nendstream",
  ];
  let pdf = "%PDF-1.4\n",
    offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 5\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
    .join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const pdfBytes = Buffer.from(pdf);
  const reportBody = {
    laboratoryName: "Synthetic Verification Laboratory",
    batchReference: "LOCAL-" + randomUUID(),
    sampleDate: "2026-09-07",
    reportDate: "2026-09-08",
    results: [{ label: "Synthetic moisture", value: "8.1", unit: "%" }],
    fileName: "synthetic-lab-report.pdf",
    contentBase64: pdfBytes.toString("base64"),
    published: true,
  };
  await call(
    `/api/admin/lab/requests/${created.id}/reports`,
    "POST",
    {
      ...reportBody,
      contentBase64: Buffer.from("not a PDF").toString("base64"),
    },
    admin.token,
    400,
  );
  await call(
    `/api/admin/lab/requests/${created.id}/reports`,
    "POST",
    { ...reportBody, reportDate: "2026-09-06" },
    admin.token,
    400,
  );
  const report = (
    await call(
      `/api/admin/lab/requests/${created.id}/reports`,
      "POST",
      reportBody,
      admin.token,
      201,
    )
  ).report;
  const reportPath = `/api/listings/${listingId}/lab-reports`;
  assert.ok(
    (await call(reportPath, "GET", undefined, buyer.token)).reports.some(
      (r) => r.id === report.id,
    ),
  );
  assert.ok(!(await call(reportPath)).reports.some((r) => r.id === report.id));
  assert.ok(
    !(await call(reportPath, "GET", undefined, seller.token)).reports.some(
      (r) => r.id === report.id,
    ),
  );
  async function download(token, expected) {
    const response = await fetch(
      origin + `/api/lab/reports/${report.id}/file`,
      {
        headers: token ? { authorization: "Bearer " + token } : {},
        signal: AbortSignal.timeout(30000),
      },
    );
    assert.equal(response.status, expected, phase);
    if (expected === 200) {
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.match(
        response.headers.get("content-type") ?? "",
        /application\/pdf/,
      );
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdfBytes);
    }
  }
  await download(buyer.token, 200);
  await download(undefined, 404);
  await download(seller.token, 404);
  phase = "sharing and revocation";
  await call(
    `/api/lab/requests/${created.id}/sharing`,
    "PATCH",
    { sharing: "shared" },
    seller.token,
    404,
  );
  await call(
    `/api/lab/requests/${created.id}/sharing`,
    "PATCH",
    { sharing: "shared" },
    buyer.token,
  );
  assert.ok((await call(reportPath)).reports.some((r) => r.id === report.id));
  await download(undefined, 200);
  await download(seller.token, 200);
  await call(`/api/admin/lab/requests/${created.id}`, "PATCH", {status: "cancelled"}, admin.token);
  await call(`/api/admin/lab/requests/${created.id}/reports`, "POST", reportBody, admin.token, 409);
  await call(
    `/api/lab/requests/${created.id}/sharing`,
    "PATCH",
    { sharing: "private" },
    buyer.token,
  );
  await download(undefined, 404);
  await download(seller.token, 404);
  await download(buyer.token, 200);
  phase = "sample-linked referral";
  const sample = (
    await call(
      "/api/sample-requests",
      "POST",
      {
        listingId,
        quantityLb: 5,
        note: "Synthetic lab sample",
        idempotencyKey: randomUUID(),
      },
      buyer.token,
      201,
    )
  ).sample;
  const sampleRetryBody = {
    listingId,
    quantityLb: 5,
    note: "Synthetic duplicate sample",
    idempotencyKey: randomUUID(),
  };
  const firstSample = (
    await call(
      "/api/sample-requests",
      "POST",
      sampleRetryBody,
      buyer.token,
      201,
    )
  ).sample;
  const secondSample = (
    await call("/api/sample-requests", "POST", sampleRetryBody, buyer.token)
  ).sample;
  assert.equal(firstSample.id, secondSample.id);
  await call(
    "/api/lab/requests",
    "POST",
    { ...body, idempotencyKey: randomUUID(), sampleRequestId: 2147483647 },
    buyer.token,
    400,
  );
  const linked = (
    await call(
      "/api/lab/requests",
      "POST",
      { ...body, idempotencyKey: randomUUID(), sampleRequestId: sample.id },
      buyer.token,
      201,
    )
  ).request;
  assert.equal(linked.sampleRequestId, sample.id);
  await call(
    `/api/sample-requests/${sample.id}`,
    "PATCH",
    { status: "accepted" },
    buyer.token,
    403,
  );
  await call(
    `/api/sample-requests/${sample.id}`,
    "PATCH",
    { status: "accepted", sellerResponse: "Synthetic acceptance" },
    seller.token,
  );
  await call(
    `/api/sample-requests/${sample.id}`,
    "PATCH",
    { status: "shipped", trackingNumber: "SYNTHETIC-NOT-A-SHIPMENT" },
    seller.token,
  );
  await call(
    `/api/sample-requests/${sample.id}`,
    "PATCH",
    { status: "received" },
    buyer.token,
  );
  phase = "merged live marketplace routes and sample conversion";
  const fullListing = (await call(`/api/listings/${listingId}`, "GET", undefined, buyer.token)).listing;
  const onboarding = await call("/api/onboarding", "GET", undefined, buyer.token);
  assert.ok(onboarding.company && onboarding.onboarding && onboarding.checklist);
  const members = (await call(`/api/companies/${onboarding.company.id}/members`, "GET", undefined, buyer.token)).members;
  await call(`/api/company-members/${members[0].id}`, "PATCH", {permissionTierCode:"admin_override"}, buyer.token, 403);

  await call(`/api/listings/${listingId}/favorite`, "POST", {}, buyer.token);
  await call(`/api/listings/${listingId}/favorite`, "DELETE", undefined, buyer.token);
  await call(`/api/listings/${listingId}/interest`, "POST", {eventType:"detail_view"}, buyer.token, 201);
  const order = (await call("/api/orders", "POST", {
    listingId, buyerCompanyId: onboarding.company.id, creationSourceCode:"listing_checkout",
    quantity: fullListing.minimumOrderQuantity, quantityUnit:fullListing.quantityUnit,
    currencyCode:fullListing.currencyCode, deliveryMethod:"pickup",
  }, buyer.token, 201)).order;
  assert.equal(Number(order.totalAmount), fullListing.minimumOrderQuantity * fullListing.pricePerUnit);
  await call(`/api/sample-requests/${sample.id}`, "PATCH", {convertedOrderId:order.id}, buyer.token);
  await call("/api/reports/summary", "GET", undefined, admin.token);
  console.log(
    JSON.stringify({
      labIntegration: true,
      listingId,
      privateRequestId: created.id,
      reportId: report.id,
      sampleId: sample.id,
      linkedRequestId: linked.id,
      checks: [
        "draft privacy",
        "role boundaries",
        "invalid inputs",
        "idempotency",
        "queue notes",
        "PDF bytes",
        "private visibility",
        "sharing revocation",
        "sample linkage",
        "sample-to-order conversion",
        "favorites and interest routes",
        "merged onboarding and reports",
      ],
    }),
  );
} catch (error) {
  console.error(
    "Lab integration failed at " +
      phase +
      ": " +
      (error instanceof Error ? error.message : "unknown"),
  );
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
  if (pool) await pool.close();
  await sql.close();
}
