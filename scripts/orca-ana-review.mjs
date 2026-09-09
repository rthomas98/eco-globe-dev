/** Focused SQL review regressions; does not change the retained browser fixtures. */
import assert from "node:assert/strict";
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
    assert.equal(res.status, status, phase + " " + method + " " + path);
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
  const snapshots = [];
  for (const item of fixture.listings)
    snapshots.push(
      (
        await call(
          "/api/listings/" + item.id + "?scope=owned",
          "GET",
          undefined,
          seller.token,
        )
      ).listing,
    );
  phase = "explicit material type and partial draft";
  const base = {
    sellerCompanyId: fixture.seller.companyId,
    locationId: fixture.locationId,
    title: "Review-only retained draft",
  };
  await call("/api/listings", "POST", base, seller.token, 400);
  const draft = (
    await call(
      "/api/listings",
      "POST",
      { ...base, materialTypeCode: "other" },
      seller.token,
      201,
    )
  ).listing;
  assert.equal(draft.pricePerUnit, null);
  assert.equal(draft.quantity, null);
  await call(
    "/api/listings/" + draft.id,
    "PATCH",
    { materialTypeCode: null },
    seller.token,
    400,
  );
  phase = "typed ID and slug lookup";
  assert.deepEqual(
    (
      await call(
        "/api/listings/" + draft.slug + "?scope=owned",
        "GET",
        undefined,
        seller.token,
      )
    ).listing,
    draft,
  );
  await call(
    "/api/listings/999999999999999999999999999",
    "GET",
    undefined,
    undefined,
    404,
  );
  await call(
    "/api/listings/missing-review-slug",
    "GET",
    undefined,
    undefined,
    404,
  );
  phase = "concurrent partial updates preserve separate fields";
  await Promise.all([
    call(
      "/api/listings/" + draft.id,
      "PATCH",
      { title: "Concurrent title" },
      seller.token,
    ),
    call(
      "/api/listings/" + draft.id,
      "PATCH",
      { description: "Concurrent description" },
      seller.token,
    ),
  ]);
  const changed = (
    await call(
      "/api/listings/" + draft.id + "?scope=owned",
      "GET",
      undefined,
      seller.token,
    )
  ).listing;
  assert.equal(changed.title, "Concurrent title");
  assert.equal(changed.description, "Concurrent description");
  phase = "legacy URL-only records retained but unavailable";
  const legacy = (
    await pool
      .request()
      .input("listing", sql.Int, draft.id)
      .query(
        "INSERT dbo.ListingDocuments(ListingId,DocumentTypeId,FileName,FileUrl,VerificationStatusId) OUTPUT INSERTED.Id AS id VALUES(@listing,(SELECT Id FROM dbo.DocumentTypes WHERE Code='sds'),'Legacy.pdf','https://example.test/legacy.pdf',(SELECT Id FROM dbo.AccountStatuses WHERE Code='pending_verification'))",
      )
  ).recordset[0];
  assert.equal(
    (
      await call(
        "/api/listing-documents?listingId=" + draft.id + "&scope=owned",
        "GET",
        undefined,
        seller.token,
      )
    ).documents.length,
    0,
  );
  await call(
    "/api/listing-documents/" + legacy.id + "/download",
    "GET",
    undefined,
    seller.token,
    404,
  );
  assert.equal(
    (
      await pool
        .request()
        .input("id", sql.Int, legacy.id)
        .query("SELECT FileUrl FROM dbo.ListingDocuments WHERE Id=@id")
    ).recordset[0].FileUrl,
    "https://example.test/legacy.pdf",
  );
  phase = "reviewed file removals";
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
  );
  const upload = async (type) =>
    (
      await call(
        "/api/listing-documents",
        "POST",
        {
          listingId: draft.id,
          documentTypeCode: type,
          fileName: type + ".pdf",
          contentType: "application/pdf",
          contentBase64: pdf.toString("base64"),
        },
        seller.token,
        201,
      )
    ).document;
  const sds = await upload("sds"),
    cert = await upload("certification");
  await call(
    "/api/listings/" + draft.id,
    "PATCH",
    {
      quantity: 10,
      minimumOrderQuantity: 1,
      pricePerUnit: 450,
      currencyCode: "USD",
      quantityUnit: "ton",
      listingStatusCode: "published",
    },
    admin.token,
  );
  await call(
    "/api/listing-documents/" + cert.id,
    "DELETE",
    undefined,
    seller.token,
  );
  assert.equal(
    (
      await call(
        "/api/listings/" + draft.id + "?scope=owned",
        "GET",
        undefined,
        seller.token,
      )
    ).listing.listingStatusCode,
    "pending_review",
  );
  await call(
    "/api/listings/" + draft.id,
    "PATCH",
    { listingStatusCode: "published" },
    admin.token,
  );
  await call(
    "/api/listing-documents/" + sds.id,
    "DELETE",
    undefined,
    seller.token,
  );
  assert.equal(
    (
      await call(
        "/api/listings/" + draft.id + "?scope=owned",
        "GET",
        undefined,
        seller.token,
      )
    ).listing.listingStatusCode,
    "draft",
  );
  phase = "approval cannot race last SDS removal";
  const secondSds = await upload("sds");
  const approval = fetch(origin + "/api/listings/" + draft.id, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + admin.token,
    },
    body: JSON.stringify({ listingStatusCode: "published" }),
    signal: AbortSignal.timeout(30000),
  });
  const removal = call(
    "/api/listing-documents/" + secondSds.id,
    "DELETE",
    undefined,
    seller.token,
  );
  const [approved] = await Promise.all([approval, removal]);
  assert.ok([200, 400].includes(approved.status));
  assert.equal(
    (
      await call(
        "/api/listings/" + draft.id + "?scope=owned",
        "GET",
        undefined,
        seller.token,
      )
    ).listing.listingStatusCode,
    "draft",
  );
  await call("/api/listings/" + draft.id, "GET", undefined, undefined, 404);
  phase = "stable browser fixtures";
  for (let i = 0; i < fixture.listings.length; i++)
    assert.deepEqual(
      (
        await call(
          "/api/listings/" + fixture.listings[i].id + "?scope=owned",
          "GET",
          undefined,
          seller.token,
        )
      ).listing,
      snapshots[i],
    );
  console.log(
    JSON.stringify({
      reviewIntegration: true,
      reviewListingId: draft.id,
      legacyDocumentId: legacy.id,
      browserListingIds: fixture.listings.map((x) => x.id),
      browserFixturesUnchanged: true,
    }),
  );
} catch (error) {
  console.error(
    "Ana review failed at " +
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
