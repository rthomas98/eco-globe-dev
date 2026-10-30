import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createServer, type IncomingMessage } from "node:http";
import { once } from "node:events";
import sql from "mssql";

import { ApiError, readJsonBody } from "./http.js";
import { parseListingRadius, withinListingRadius } from "./listing-radius.js";
import { validateLocationFields } from "./location-validation.js";

// Configure before importing database consumers; all driver calls below are stubbed.
process.env.AZURE_SQL_CONNECTION_STRING = "synthetic-test-no-network";
process.env.SQL_CONNECTION_STRING = "synthetic-test-no-network";
const { validateSpecifications, validateUpload, listingForViewer, handleListingRoute } = await import("./listing-routes.js");
const { validateOnboardingPreferences } = await import("./onboarding-preferences.js");
const { usableListingDocumentSql } = await import("./listing-safety.js");

test("specifications reject impossible dates, reversed availability, arbitrary properties and malformed arrays", () => {
  for (const invalid of [
    { availabilityFrom: "2026-02-30" },
    { availabilityFrom: "2026-12-31", availabilityTo: "2026-01-01" },
    { claims: [42] },
    { additionalSpecs: [{ label: "x", value: "" }] },
    { sellerVerified: true },
    { sameAsCompany: "true" },
  ]) {
    assert.throws(() => validateSpecifications(invalid), ApiError);
  }
  assert.equal(validateSpecifications({ quality: null }).quality, null);
});
test("uploads reject mismatched signatures, remote URLs, invalid base64 and oversized content", () => {
  const upload = {
    fileName: "sds.pdf",
    documentTypeCode: "sds",
    contentType: "application/pdf",
    contentBase64: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
  };
  assert.equal(validateUpload(upload).bytes.toString(), "%PDF-1.4\n%%EOF");
  for (const invalid of [
    { ...upload, contentType: "image/png" },
    { ...upload, contentBase64: "!!!!" },
    { ...upload, fileName: "../x.pdf" },
    {
      ...upload,
      contentBase64: undefined,
      fileUrl: "https://example.test/sds.pdf",
    },
    {
      ...upload,
      contentBase64: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
    },
  ])
    assert.throws(() => validateUpload(invalid), ApiError);
});
test("Others onboarding interests require a persisted description", () => {
  assert.throws(
    () => validateOnboardingPreferences({ feedstockInterests: ["Others"] }),
    ApiError,
  );
  assert.throws(
    () => validateOnboardingPreferences({ feedstockInterests: [42] }),
    ApiError,
  );
  assert.deepEqual(
    validateOnboardingPreferences({
      feedstockInterests: ["Others"],
      otherFeedstockInterest: "Tar",
    }),
    { interests: ["Others"], other: "Tar" },
  );
});
test("body reader caps accumulated bytes before parsing", async () => {
  const request = Readable.from([
    Buffer.alloc(8 * 1024 * 1024),
    Buffer.from("x"),
  ]);
  await assert.rejects(
    readJsonBody(request as IncomingMessage),
    (error: unknown) => error instanceof ApiError && error.status === 413,
  );
});

test("listing teasers retain region but never disclose gated price, identity or specifications", () => {
  const listing = { id: 7, pricePerUnit: 225, quantity: 234, minimumOrderQuantity: 10, sellerCompanyId: 3, sellerCompanyName: "Private", specifications: { composition: "Private" }, documents: [{ fileUrl: "private" }], location: { city: "Private", stateProvince: "LA", addressLine1: "Private", latitude: 30 } };
  const teaser = listingForViewer(listing);
  assert.equal(listingForViewer({...listing,quantity:null}).quantity,null);
  assert.equal(teaser.pricePerUnit, null);
  assert.equal(teaser.sellerCompanyName, null);
  assert.deepEqual(teaser.specifications, {});
  assert.deepEqual(teaser.documents, []);
  assert.equal(teaser.location.city, null);
  assert.equal(teaser.location.stateProvince, "LA");
});

test("anonymous teasers retain the saved public photo URL while documents stay gated", () => {
  const listing = { id: 7, listingImageUrl: "/api/listing-documents/42/download", documents: [{ documentTypeCode: "sds", fileUrl: "private" }], location: { postalCode: "70801", longitude: -91 } };
  const teaser = listingForViewer(listing);
  assert.equal(teaser.listingImageUrl, listing.listingImageUrl);
  assert.deepEqual(teaser.documents, []);
  assert.equal(teaser.location.postalCode, null);
  assert.equal(teaser.location.longitude, null);
  assert.equal(listingForViewer({ ...listing, listingImageUrl: null }).listingImageUrl, null);
});

test("radius excludes distant and unlocated feedstocks and handles zero and dateline coordinates", () => {
  const origin = parseListingRadius(new URLSearchParams({ latitude: "30.4524", longitude: "-91.2103", radiusMiles: "2" }))!;
  assert.equal(withinListingRadius(30.4524, -91.2103, origin), true);
  assert.equal(withinListingRadius(29.7604, -95.3698, origin), false);
  assert.equal(withinListingRadius(51.9244, 4.4777, origin), false);
  assert.equal(withinListingRadius(null, null, origin), false);
  assert.equal(withinListingRadius(0, -179.99, { latitude: 0, longitude: 179.99, radiusMiles: 2 }), true);
  assert.equal(parseListingRadius(new URLSearchParams()), null);
  for (const query of ["radiusMiles=2", "latitude=&longitude=0&radiusMiles=2", "latitude=91&longitude=0&radiusMiles=2", "latitude=0&longitude=181&radiusMiles=2", "latitude=0&longitude=0&radiusMiles=Infinity", "latitude=0&longitude=0&radiusMiles=0"])
    assert.throws(() => parseListingRadius(new URLSearchParams(query)), ApiError);
});

test("anonymous radius probes are denied before private SQL coordinates can be inferred", async () => {
  const server = createServer(async (request, response) => {
    try {
      await handleListingRoute(request, response, new URL(request.url!, "http://127.0.0.1"));
    } catch (error) {
      response.writeHead(error instanceof ApiError ? error.status : 500);
      response.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/listings?latitude=30&longitude=-91&radiusMiles=2`);
    assert.equal(response.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("facility validation preserves full address and clears stale coordinates when address is edited", () => {
  const address = { name: "Facility", addressLine1: "4801 Riverside Dr", city: "Baton Rouge", stateProvince: "LA", postalCode: "70801", countryCode: "us", latitude: 30.4524, longitude: -91.2103 };
  assert.equal(validateLocationFields(address).postalCode, "70801");
  assert.equal(validateLocationFields(address).countryCode, "US");
  assert.equal(validateLocationFields({ postalCode: "70801" }, true).latitude, null);
  assert.equal(validateLocationFields({ name: "New name" }, true).latitude, undefined);
  assert.equal(validateLocationFields({ latitude: null, longitude: null }, true).longitude, null);
  for (const patch of [{ latitude: 91, longitude: 0 }, { latitude: 0 }, { latitude: null, longitude: 0 }, { latitude: "30", longitude: -91 }, { countryCode: "1!" }, { name: null }])
    assert.throws(() => validateLocationFields(patch, true), ApiError);
});

test("deleting an already-deleted document returns 404 without starting a transaction", async (t) => {
  const pool = new sql.ConnectionPool("Server=127.0.0.1;Database=synthetic");
  t.mock.method(sql, "connect", async () => pool);
  t.mock.method(sql.ConnectionPool.prototype, "request", () => new sql.Request());
  const begin = t.mock.method(sql.Transaction.prototype, "begin", async () => undefined);
  t.mock.method(sql.Request.prototype, "query", async (statement: string) => {
    assert.match(statement, /FROM dbo.ListingDocuments WHERE Id=@id AND DeletedAt IS NULL$/);
    return { recordset: [] };
  });
  const request = Readable.from([]) as IncomingMessage;
  request.method = "DELETE";
  request.headers = { authorization: "Bearer synthetic" };
  await assert.rejects(
    handleListingRoute(request, {} as import("node:http").ServerResponse, new URL("http://local/api/listing-documents/42")),
    (error: unknown) => error instanceof ApiError && error.status === 404,
  );
  assert.equal(begin.mock.callCount(), 0);
});

// These handler tests assert emitted SQL/parameters, not SQL Server CASE execution.
for (const scenario of [
  { name: "admin upload keeps published", admin: true, method: "POST", before: "published", after: "published" },
  { name: "seller upload submits published for review", admin: false, method: "POST", before: "published", after: "pending_review" },
  { name: "admin upload leaves draft unchanged", admin: true, method: "POST", before: "draft", after: "draft" },
  { name: "admin upload leaves pending review unchanged", admin: true, method: "POST", before: "pending_review", after: "pending_review" },
  { name: "admin deletes non-SDS with SDS remaining", admin: true, method: "DELETE", type: "other", before: "published", after: "published" },
  { name: "admin deletes one SDS with another remaining", admin: true, method: "DELETE", type: "sds", before: "published", after: "published" },
  { name: "admin deletes last SDS from published", admin: true, method: "DELETE", type: "sds", before: "published", after: "draft" },
  { name: "admin deletes last SDS from pending review", admin: true, method: "DELETE", type: "sds", before: "pending_review", after: "draft" },
  { name: "admin deletes document with SDS remaining in pending review", admin: true, method: "DELETE", type: "other", before: "pending_review", after: "pending_review" },
  { name: "seller deletes non-SDS with SDS remaining", admin: false, method: "DELETE", type: "other", before: "published", after: "pending_review" },
  { name: "seller deletes one SDS with another remaining", admin: false, method: "DELETE", type: "sds", before: "published", after: "pending_review" },
  { name: "seller deletes last SDS", admin: false, method: "DELETE", type: "sds", before: "published", after: "draft" },
]) {
  test(scenario.name, async (t) => {
    const pool = new sql.ConnectionPool("Server=127.0.0.1;Database=synthetic");
    t.mock.method(sql, "connect", async () => pool);
    t.mock.method(sql.ConnectionPool.prototype, "request", () => new sql.Request());
    const transactionRequest = t.mock.method(sql.Transaction.prototype, "request", () => new sql.Request());
    t.mock.method(sql.Transaction.prototype, "begin", async () => undefined);
    const commit = t.mock.method(sql.Transaction.prototype, "commit", async () => undefined);
    t.mock.method(sql.Transaction.prototype, "rollback", async () => undefined);
    let mutated = false, inserted = false, deleted = false, updates = 0, alerts = 0, locked = false;
    t.mock.method(sql.Request.prototype, "query", async function (this: sql.Request, statement: string) {
      const p = (key: string) => this.parameters[key]?.value;
      let rows: Record<string, unknown>[] = [];
      if (statement.includes("FROM dbo.UserSessions s")) {
        rows = [{ id: 1, userId: 7, activeCompanyId: 2, activeRoleCode: scenario.admin ? "admin" : "seller", accountStatusCode: "active" }];
      } else if (statement.includes("UPDATE dbo.UserSessions")) {
        // Session activity is synthetic too.
      } else if (statement.includes("FROM dbo.CompanyMembers cm")) {
        rows = [{ id: 2, companyTypeCode: "seller", memberRoleCode: scenario.admin ? "admin" : "owner", permissionTierCode: scenario.admin ? "admin_override" : "standard" }];
      } else if (statement === "SELECT Id FROM dbo.Listings WITH (UPDLOCK, HOLDLOCK) WHERE Id=@id") {
        assert.equal(transactionRequest.mock.callCount(), 1, "parent lock is the first transaction statement");
        assert.equal(p("id"), 11);
        assert.equal(locked, false);
        locked = true;
        rows = [{ Id: 11 }];
      } else if (statement.startsWith("SELECT l.Id")) {
        if (transactionRequest.mock.callCount()) assert.ok(locked, "status read follows parent lock");
        rows = [{ id: 11, sellerCompanyId: 2, listingStatusCode: mutated ? scenario.after : scenario.before }];
      } else if (statement.startsWith("SELECT ListingId AS listingId")) {
        assert.match(statement, /WHERE Id=@id AND DeletedAt IS NULL$/);
        rows = [{ listingId: 11, documentTypeCode: scenario.type }];
      } else if (statement.startsWith("INSERT dbo.ListingDocuments")) {
        assert.ok(locked);
        assert.match(statement, /Code='pending_verification'/);
        assert.equal(p("type"), "sds");
        assert.equal(p("listingId"), 11);
        inserted = true;
        rows = [{ id: 42 }];
      } else if (statement.startsWith("UPDATE dbo.ListingDocuments")) {
        assert.ok(locked);
        assert.equal(p("id"), 42);
        deleted = true;
      } else if (statement.startsWith("UPDATE dbo.Listings")) {
        assert.equal(p("id"), 11);
        if (scenario.method === "POST") {
          assert.ok(inserted);
          if (scenario.admin) {
            // Admin may skip the update or guard just the status transition.
            assert.equal(p("admin"), 1);
            assert.match(statement, /CASE WHEN @admin=0 AND ListingStatusId=/);
          } else {
            assert.equal(p("admin"), 0);
          }
          assert.match(statement, /Code='published'\) THEN \(SELECT Id FROM dbo.ListingStatuses WHERE Code='pending_review'\) ELSE ListingStatusId END/);
        } else {
          assert.ok(deleted);
          assert.equal(p("admin"), scenario.admin ? 1 : 0);
          assert.equal(statement, `UPDATE dbo.Listings SET ListingStatusId=CASE WHEN ListingStatusId IN (SELECT Id FROM dbo.ListingStatuses WHERE Code IN ('published','pending_review')) THEN (SELECT Id FROM dbo.ListingStatuses WHERE Code=CASE WHEN EXISTS(SELECT 1 FROM dbo.ListingDocuments d JOIN dbo.DocumentTypes dt ON dt.Id=d.DocumentTypeId WHERE d.ListingId=@id AND dt.Code='sds' AND d.DeletedAt IS NULL AND ${usableListingDocumentSql}) THEN CASE WHEN @admin=1 AND ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='published') THEN 'published' ELSE 'pending_review' END ELSE 'draft' END) ELSE ListingStatusId END,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`);
        }
        updates++;
        mutated = true;
      } else if (statement.startsWith("INSERT dbo.StaffNotificationOutbox")) {
        assert.equal(p("kind"), "listing_pending_review");
        alerts++;
      } else if (statement.startsWith("SELECT d.Id")) {
        rows = [{ id: 42 }];
      } else {
        assert.fail(`Unexpected SQL: ${statement}`);
      }
      return { recordset: rows };
    });
    const req = Readable.from(scenario.method === "POST" ? [JSON.stringify({
      listingId: 11, fileName: "sds.pdf", documentTypeCode: "sds",
      contentType: "application/pdf", contentBase64: Buffer.from("%PDF-1.4").toString("base64"),
    })] : []) as IncomingMessage;
    req.method = scenario.method;
    req.headers = { authorization: "Bearer synthetic" };
    let status = 0;
    const response = {
      writeHead: (value: number) => { status = value; },
      end: () => undefined,
    } as unknown as import("node:http").ServerResponse;
    await handleListingRoute(req, response, new URL(`http://local/api/listing-documents${scenario.method === "DELETE" ? "/42" : ""}`));
    assert.equal(status, scenario.method === "POST" ? 201 : 200);
    assert.equal(updates, 1);
    assert.ok(locked);
    assert.equal(commit.mock.callCount(), 1);
    assert.equal(alerts, scenario.before !== "pending_review" && scenario.after === "pending_review" ? 1 : 0);
  });
}
