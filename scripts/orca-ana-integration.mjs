/** Launched only by the owned SQL helper; fixture records are deliberately retained. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { open } from "node:fs/promises";
import { constants } from "node:fs";
const require = createRequire(
  new URL("../packages/backend/package.json", import.meta.url),
);
const sql = require("mssql");
let pool,
  child,
  phase = "local database ownership";
try {
  const connection = process.env.AZURE_SQL_CONNECTION_STRING;
  assert.match(connection ?? "", /^Server=127\.0\.0\.1,/);
  assert.match(process.env.ORCA_SQL_DATABASE ?? "", /^eco_[a-f0-9]{24}$/);
  pool = await new sql.ConnectionPool(connection).connect();
  const identity = (
    await pool
      .request()
      .query("SELECT DB_NAME() AS db,Token FROM dbo.OrcaOwner")
  ).recordset[0];
  assert.equal(identity.db, process.env.ORCA_SQL_DATABASE);
  assert.equal(identity.Token, process.env.ORCA_SQL_MARKER);
  const password = "Eg9!" + randomBytes(24).toString("hex");
  process.env.ECOGLOBE_DEMO_PASSWORD = password;
  const { seedDemoAuthAccounts, markUserEmailVerified } =
    await import("../packages/backend/src/auth.ts");
  await seedDemoAuthAccounts();
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
  phase = "API readiness";
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
    const response = await fetch(origin + path, {
      method,
      signal: AbortSignal.timeout(20000),
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status !== status) {
      const payload = await response.json();
      throw new Error(
        `${phase}: ${method} ${path} expected ${status} got ${response.status}: ${String(payload.error).slice(0, 180)}`,
      );
    }
    return response.json();
  }
  const suffix = randomBytes(8).toString("hex");
  phase = "synthetic registration and local verification fixture";
  const accounts = [];
  for (const role of ["seller", "buyer"]) {
    const email = `ana-${role}-${suffix}@example.test`;
    const registered = await call(
      "/auth/register",
      "POST",
      {
        email,
        name: `Ana ${role} fixture`,
        password,
        accountStatusCode: `subscribed_${role}`,
      },
      undefined,
      503,
    );
    const user = (
      await pool
        .request()
        .input("email", sql.NVarChar, email)
        .query("SELECT Id AS id FROM dbo.Users WHERE Email=@email")
    ).recordset[0];
    assert.ok(user);
    // Email provider is disabled; only these just-created synthetic users are verified locally.
    await markUserEmailVerified(user.id);
    accounts.push(await call("/auth/login", "POST", { email, password, role }));
  }
  const [seller, buyer] = accounts;
  const admin = await call("/auth/login", "POST", {
    email: "demo.admin@ecoglobe.com",
    password,
    role: "admin",
  });
  phase = "concurrent free seller onboarding retries";
  const business = {
    role: "seller",
    companyName: `Ana Seller ${suffix}`,
    industry: "Recovered oils",
    jobTitle: "Operations",
    website: "https://example.test",
    location: {
      name: "Recovery facility",
      addressLine1: "10 Synthetic Road",
      city: "Houston",
      stateProvince: "TX",
      countryCode: "US",
      postalCode: "77001",
      latitude: 29.76,
      longitude: -95.37,
    },
  };
  const onboard = await Promise.all([
    call("/api/onboarding", "POST", business, seller.token),
    call("/api/onboarding", "POST", business, seller.token),
  ]);
  assert.equal(
    onboard[0].onboarding.company.id,
    onboard[1].onboarding.company.id,
  );
  assert.equal(
    onboard[0].onboarding.location.id,
    onboard[1].onboarding.location.id,
  );
  assert.equal(onboard[0].user.activeRoleCode, "seller");
  const companyId = onboard[0].onboarding.company.id,
    locationId = onboard[0].onboarding.location.id;
  assert.equal(
    (
      await pool
        .request()
        .input("id", sql.Int, seller.user.id)
        .query("SELECT COUNT(*) AS n FROM dbo.CompanyMembers WHERE UserId=@id")
    ).recordset[0].n,
    1,
  );
  phase = "Others buyer preference persistence";
  const buyerBusiness = {
    role: "buyer",
    companyName: `Ana Buyer ${suffix}`,
    feedstockInterests: ["Others", "Used products"],
    otherFeedstockInterest: "Recovered catalyst",
    location: {
      addressLine1: "20 Synthetic Road",
      city: "Austin",
      countryCode: "US",
    },
  };
  await call("/api/onboarding", "POST", buyerBusiness, buyer.token);
  const preferences = (
    await call("/api/onboarding", "GET", undefined, buyer.token)
  ).onboarding;
  assert.deepEqual(
    preferences.feedstockInterests,
    buyerBusiness.feedstockInterests,
  );
  assert.equal(preferences.otherFeedstockInterest, "Recovered catalyst");
  await call(
    "/api/onboarding",
    "POST",
    { ...buyerBusiness, otherFeedstockInterest: "" },
    buyer.token,
    400,
  );
  phase = "company facilities isolation";
  const facilities = (
    await call("/api/locations", "GET", undefined, seller.token)
  ).locations;
  assert.ok(facilities.some((row) => row.id === locationId));
  await call(
    "/api/locations?companyId=" + companyId,
    "GET",
    undefined,
    buyer.token,
    403,
  );
  const newFacility = (
    await call(
      "/api/locations",
      "POST",
      {
        companyId,
        name: "Additional pickup site",
        addressLine1: "30 Synthetic Road",
        city: "Houston",
        countryCode: "US",
        latitude: 29.7,
        longitude: -95.3,
        locationTypeCode: "pickup",
      },
      seller.token,
      201,
    )
  ).location;
  assert.equal(newFacility.city, "Houston");
  assert.equal(newFacility.latitude, 29.7);
  assert.equal(newFacility.locationTypeCode, "pickup");
  phase = "complete listing field round trip";
  const specifications = {
    category: "Others",
    material: "Offspec gasoline",
    listingType: "Recurring",
    grade: "G-17",
    color: "Amber",
    shelfLife: "6 months",
    storage: "Sealed tank",
    packaging: "Bulk",
    weight: "1000 kg",
    usage: "Industrial recovery",
    origin: "Refinery",
    quality: "Offspec",
    composition: "Hydrocarbons",
    frequency: "Monthly",
    state: "Liquid",
    availabilityFrom: "2026-09-10",
    availabilityTo: "2026-12-31",
    sustainabilityNotes: "Synthetic evidence fixture",
    originLocation: "Houston recovery site",
    sameAsCompany: false,
    claims: ["Recovered material"],
    additionalSpecs: [
      { label: "Flash point", value: "-40 C" },
      { label: "Viscosity", value: "0.6 cSt" },
    ],
  };
  const listingBody = {
    sellerCompanyId: companyId,
    locationId,
    title: `Gasoline offspec ${suffix}`,
    materialTypeCode: "other",
    quantity: 123.456,
    quantityUnit: "ton",
    minimumOrderQuantity: 2.5,
    pricePerUnit: 450,
    currencyCode: "USD",
    listingStatusCode: "draft",
    carbonIntensityKgCo2e: 17.321,
    description: "Distinctive saved description",
    specifications,
  };
  let listing = (
    await call("/api/listings", "POST", listingBody, seller.token, 201)
  ).listing;
  const listingId = listing.id;
  for (const [key, value] of Object.entries(listingBody))
    assert.deepEqual(listing[key], value, key);
  assert.equal(listing.sellerCompanyName, business.companyName);
  assert.equal(listing.sellerVerified, false);
  assert.equal(listing.location.city, "Houston");
  assert.deepEqual(listing.documents, []);
  phase = "draft visibility and ownership enforcement";
  await call("/api/listings/" + listingId, "GET", undefined, undefined, 404);
  await call(
    "/api/listings/" + listingId + "?scope=owned",
    "GET",
    undefined,
    buyer.token,
    404,
  );
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    { title: "attack" },
    buyer.token,
    404,
  );
  await call(
    "/api/listings/" + listingId,
    "DELETE",
    undefined,
    buyer.token,
    404,
  );
  assert.ok(
    !(await call("/api/listings?statusCode=draft&sellerCompanyId=" + companyId))
      .listings.length,
  );
  await call("/api/listings?scope=owned", "GET", undefined, undefined, 401);
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    { listingStatusCode: "published" },
    seller.token,
    403,
  );
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    { listingStatusCode: "pending_review" },
    seller.token,
    400,
  );
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    { minimumOrderQuantity: 999 },
    seller.token,
    400,
  );
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    {
      locationId: (await call("/api/locations", "GET", undefined, buyer.token))
        .locations[0].id,
    },
    seller.token,
    403,
  );
  phase = "real file storage and private download";
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
  );
  const sds = (
    await call(
      "/api/listing-documents",
      "POST",
      {
        listingId,
        documentTypeCode: "sds",
        fileName: "Safety sheet.pdf",
        contentType: "application/pdf",
        contentBase64: pdf.toString("base64"),
      },
      seller.token,
      201,
    )
  ).document;
  const cert = (
    await call(
      "/api/listing-documents",
      "POST",
      {
        listingId,
        documentTypeCode: "certificate",
        fileName: "Certificate.pdf",
        contentType: "application/pdf",
        contentBase64: pdf.toString("base64"),
      },
      seller.token,
      201,
    )
  ).document;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/dsAAAAASUVORK5CYII=",
    "base64",
  );
  const photo = (
    await call(
      "/api/listing-documents",
      "POST",
      {
        listingId,
        documentTypeCode: "photo",
        fileName: "Photo.png",
        contentType: "image/png",
        contentBase64: png.toString("base64"),
      },
      seller.token,
      201,
    )
  ).document;
  for (const [doc, bytes] of [
    [sds, pdf],
    [cert, pdf],
    [photo, png],
  ]) {
    assert.equal((await fetch(origin + doc.fileUrl)).status, 404);
    assert.equal(
      (
        await fetch(origin + doc.fileUrl, {
          headers: { authorization: "Bearer " + buyer.token },
        })
      ).status,
      404,
    );
    const response = await fetch(origin + doc.fileUrl, {
      headers: { authorization: "Bearer " + seller.token },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    const stored = (
      await pool
        .request()
        .input("id", sql.Int, doc.id)
        .query(
          "SELECT Content,ByteLength,Sha256 FROM dbo.ListingDocuments WHERE Id=@id",
        )
    ).recordset[0];
    assert.deepEqual(stored.Content, bytes);
    assert.equal(stored.ByteLength, bytes.length);
    assert.equal(stored.Sha256, doc.sha256);
  }
  await call(
    "/api/listing-documents?listingId=" + listingId,
    "GET",
    undefined,
    undefined,
    404,
  );
  await call("/api/listing-documents", "GET", undefined, undefined, 401);
  await call("/api/listing-documents", "GET", undefined, buyer.token, 403);
  assert.ok((await call("/api/listing-documents", "GET", undefined, admin.token)).documents.some(d => d.id === sds.id));
  await call(
    "/api/listing-documents",
    "POST",
    {
      listingId,
      documentTypeCode: "sds",
      fileName: "invalid.pdf",
      contentType: "application/pdf",
      contentBase64: Buffer.from("not PDF").toString("base64"),
    },
    seller.token,
    400,
  );
  await call(
    "/api/listing-documents/" + sds.id,
    "DELETE",
    undefined,
    buyer.token,
    404,
  );
  phase = "field preservation and second authorized session";
  listing = (
    await call(
      "/api/listings/" + listingId,
      "PATCH",
      {
        title: "Updated " + listing.title,
        currencyCode: "EUR",
        quantityUnit: "kg",
        pricePerUnit: 0,
      },
      seller.token,
    )
  ).listing;
  assert.deepEqual(listing.specifications, specifications);
  assert.equal(listing.pricePerUnit, 0);
  assert.equal(listing.currencyCode, "EUR");
  assert.equal(listing.quantityUnit, "kg");
  const second = await call("/auth/login", "POST", {
    email: seller.user.email,
    password,
    role: "seller",
  });
  const reloaded = (
    await call(
      "/api/listings/" + listing.slug + "?scope=owned",
      "GET",
      undefined,
      second.token,
    )
  ).listing;
  assert.deepEqual(reloaded, listing);
  phase = "missing price distinct from zero";
  listing = (
    await call(
      "/api/listings/" + listingId,
      "PATCH",
      { pricePerUnit: null, description: null },
      seller.token,
    )
  ).listing;
  assert.equal(listing.pricePerUnit, null);
  assert.equal(listing.description, null);
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    { listingStatusCode: "pending_review" },
    seller.token,
    400,
  );
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    {
      pricePerUnit: 450,
      currencyCode: "USD",
      quantityUnit: "ton",
      listingStatusCode: "pending_review",
    },
    seller.token,
  );
  phase = "admin approval public projection";
  await call(
    "/api/listings/" + listingId,
    "PATCH",
    { listingStatusCode: "published" },
    admin.token,
  );
  const published = (await call("/api/listings/" + listingId)).listing;
  assert.equal(published.pricePerUnit, null);
  assert.equal(published.teaser, true);
  assert.equal((await call("/api/listings/" + listingId,"GET",undefined,buyer.token)).listing.pricePerUnit,450);
  assert.equal(published.sellerVerified, false);
  assert.ok(
    (await call("/api/listings?search=" + suffix)).listings.some(
      (row) => row.id === listingId,
    ),
  );
  assert.equal((await fetch(origin + sds.fileUrl)).status, 401);
  assert.equal((await fetch(origin + sds.fileUrl,{headers:{authorization:"Bearer "+buyer.token}})).status,200);
  await call(
    "/api/listings/not-a-real-listing",
    "GET",
    undefined,
    undefined,
    404,
  );
  phase = "quote quantity and unit validation";
  const quoteBody = {
    listingId,
    buyerCompanyId: preferences.companyId,
    quantity: 999,
  };
  await call("/api/quotes", "POST", quoteBody, buyer.token, 400);
  await call(
    "/api/quotes",
    "POST",
    { ...quoteBody, quantity: 1 },
    buyer.token,
    400,
  );
  await call(
    "/api/quotes",
    "POST",
    { ...quoteBody, quantity: 3, quantityUnit: "kg" },
    buyer.token,
    400,
  );
  await call(
    "/api/quotes",
    "POST",
    { ...quoteBody, quantity: 3, currencyCode: "EUR" },
    buyer.token,
    400,
  );
  phase = "editing published records requires renewed approval";
  listing = (
    await call(
      "/api/listings/" + listingId,
      "PATCH",
      { description: "Requires review" },
      seller.token,
    )
  ).listing;
  assert.equal(listing.listingStatusCode, "pending_review");
  await call("/api/listings/" + listingId, "GET", undefined, undefined, 404);
  phase = "document removal preserves bytes and revokes references";
  await call(
    "/api/listing-documents/" + cert.id,
    "DELETE",
    undefined,
    seller.token,
  );
  assert.equal(
    (
      await fetch(origin + cert.fileUrl, {
        headers: { authorization: "Bearer " + seller.token },
      })
    ).status,
    404,
  );
  assert.equal(
    Number(
      (
        await pool
          .request()
          .input("id", sql.Int, cert.id)
          .query(
            "SELECT DATALENGTH(Content) AS n FROM dbo.ListingDocuments WHERE Id=@id",
          )
      ).recordset[0].n,
    ),
    pdf.length,
  );
  phase = "company admins cannot obtain platform permissions";
  await pool
    .request()
    .input("company", sql.Int, companyId)
    .input("user", sql.Int, seller.user.id)
    .query(
      "UPDATE dbo.CompanyMembers SET MemberRoleId=(SELECT Id FROM dbo.MemberRoles WHERE Code='admin') WHERE CompanyId=@company AND UserId=@user",
    );
  await call(
    "/auth/login",
    "POST",
    { email: seller.user.email, password, role: "admin" },
    undefined,
    403,
  );
  await call(
    "/api/companies/" + companyId + "/members",
    "POST",
    {
      userId: buyer.user.id,
      memberRoleCode: "admin",
      permissionTierCode: "ADMIN_OVERRIDE",
    },
    seller.token,
    403,
  );
  await call(
    "/api/listings/" + listingId + "?scope=owned",
    "GET",
    undefined,
    seller.token,
  );
  phase = "inactive active-company membership invalidates session";
  await pool
    .request()
    .input("company", sql.Int, companyId)
    .input("user", sql.Int, seller.user.id)
    .query(
      "UPDATE dbo.CompanyMembers SET MemberStatusId=(SELECT Id FROM dbo.AccountStatuses WHERE Code='inactive') WHERE CompanyId=@company AND UserId=@user",
    );
  await call(
    "/api/listings/" + listingId + "?scope=owned",
    "GET",
    undefined,
    seller.token,
    401,
  );
  await pool
    .request()
    .input("company", sql.Int, companyId)
    .input("user", sql.Int, seller.user.id)
    .query(
      "UPDATE dbo.CompanyMembers SET MemberStatusId=(SELECT Id FROM dbo.AccountStatuses WHERE Code='active') WHERE CompanyId=@company AND UserId=@user",
    );
  phase = "onboarding cannot elevate existing member";
  await pool
    .request()
    .input("company", sql.Int, companyId)
    .input("user", sql.Int, seller.user.id)
    .query(
      "UPDATE dbo.CompanyMembers SET MemberRoleId=(SELECT Id FROM dbo.MemberRoles WHERE Code='seller_operator') WHERE CompanyId=@company AND UserId=@user",
    );
  await call("/api/onboarding", "POST", business, seller.token, 403);
  await pool
    .request()
    .input("company", sql.Int, companyId)
    .input("user", sql.Int, seller.user.id)
    .query(
      "UPDATE dbo.CompanyMembers SET MemberRoleId=(SELECT Id FROM dbo.MemberRoles WHERE Code='owner') WHERE CompanyId=@company AND UserId=@user",
    );
  phase = "expiration and retry rejection";
  await call("/auth/logout", "POST", undefined, second.token);
  await call("/api/onboarding", "POST", business, second.token, 401);
  phase = "soft close and retained fixture";
  await call("/api/listings/" + listingId, "DELETE", undefined, seller.token);
  assert.equal(
    (
      await call(
        "/api/listings/" + listingId + "?scope=owned",
        "GET",
        undefined,
        seller.token,
      )
    ).listing.listingStatusCode,
    "closed",
  );
  phase = "retained browser fixtures";
  const browserListings = [];
  for (const state of ["published", "draft"]) {
    const saved = (
      await call(
        "/api/listings",
        "POST",
        {
          ...listingBody,
          title: state === "published" ? "Tar" : "Gasoline offspec draft",
          specifications: {
            ...specifications,
            material: state === "published" ? "Tar" : "Offspec gasoline",
          },
        },
        seller.token,
        201,
      )
    ).listing;
    for (const file of [
      {
        documentTypeCode: "sds",
        fileName: "Safety sheet.pdf",
        contentType: "application/pdf",
        contentBase64: pdf.toString("base64"),
      },
      {
        documentTypeCode: "photo",
        fileName: "Photo.png",
        contentType: "image/png",
        contentBase64: png.toString("base64"),
      },
    ])
      await call(
        "/api/listing-documents",
        "POST",
        { listingId: saved.id, ...file },
        seller.token,
        201,
      );
    if (state === "published")
      await call(
        "/api/listings/" + saved.id,
        "PATCH",
        { listingStatusCode: "published" },
        admin.token,
      );
    browserListings.push({ id: saved.id, slug: saved.slug, status: state });
  }
  const receipt = await open(
    process.env.ORCA_ANA_FIXTURE,
    constants.O_RDWR | constants.O_NOFOLLOW,
  );
  try {
    const stat = await receipt.stat();
    assert.ok(
      stat.isFile() &&
        stat.uid === process.getuid() &&
        !(stat.mode & 0o077) &&
        stat.nlink === 1,
    );
    const data = JSON.stringify({
      database: process.env.ORCA_SQL_DATABASE,
      apiOrigin: origin,
      password,
      seller: { email: seller.user.email, userId: seller.user.id, companyId },
      buyer: {
        email: buyer.user.email,
        userId: buyer.user.id,
        companyId: preferences.companyId,
      },
      admin: { email: "demo.admin@ecoglobe.com" },
      locationId,
      listings: browserListings,
    });
    await receipt.write(data, 0, "utf8");
    await receipt.truncate(Buffer.byteLength(data));
    await receipt.sync();
  } finally {
    await receipt.close();
  }
  console.log(
    JSON.stringify({
      anaIntegration: true,
      browserListings,
      fixturePath: process.env.ORCA_ANA_FIXTURE,
      companyId,
      locationId,
      listingId,
      documentIds: [sds.id, cert.id, photo.id],
      sellerUserId: seller.user.id,
      buyerUserId: buyer.user.id,
      syntheticEmailVerification: true,
      filesRetained: true,
    }),
  );
} catch (error) {
  console.error(
    "Ana integration failed at " +
      phase +
      ": " +
      (error instanceof Error ? error.message : "unknown error"),
  );
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
  if (pool) await pool.close();
  // Imported backend helpers own a second mssql pool.
  await sql.close();
}
