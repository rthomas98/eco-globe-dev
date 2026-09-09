// Frontend-focused checks for the Ana corrections: persisted-listing consumers,
// price/MOQ semantics, value-recovery estimators, onboarding recovery and
// registration recovery links. Backend routes are mocked so the checks run
// against the isolated web runtime without SQL; SQL-backed verification is a
// separate step run by the coordinator.
const { test, expect } = require("@playwright/test");

const baseUrl = process.env.ECOGLOBE_WEB_BASE_URL ?? "http://localhost:4040";

function listingRecord(overrides = {}) {
  return {
    id: 42,
    slug: "tar-42",
    sellerCompanyId: 501,
    sellerCompanyName: "Gulf Refinery Co",
    sellerVerificationStatusCode: "pending_verification",
    sellerVerified: false,
    locationId: 9,
    location: {
      id: 9,
      name: "Deer Park Plant",
      addressLine1: "5900 TX-225",
      addressLine2: null,
      city: "Deer Park",
      stateProvince: "TX",
      postalCode: "77536",
      countryCode: "US",
      latitude: 29.7218,
      longitude: -95.1158,
    },
    title: "Tar",
    materialTypeCode: "industrial_byproduct",
    quantity: 60,
    quantityUnit: "ton",
    minimumOrderQuantity: 5,
    pricePerUnit: 450,
    currencyCode: "USD",
    listingStatusCode: "published",
    carbonIntensityKgCo2e: null,
    description: "Refinery tar stream.",
    specifications: { category: "Refinery Byproducts", state: "Liquid", frequency: "Monthly", claims: ["Waste-derived Feedstock"] },
    documents: [
      { id: 7, listingId: 42, documentTypeCode: "sds", fileName: "tar-sds.pdf", contentType: "application/pdf", byteLength: 1200, sha256: "abc", fileUrl: "/api/listing-documents/7/download", verificationStatusCode: "pending_verification" },
    ],
    ...overrides,
  };
}

function backendUser(role) {
  return {
    id: 9001,
    name: `Ana ${role}`,
    email: `ana-${role}@ecoglobe.test`,
    accountStatusCode: role === "seller" ? "subscribed_seller" : "subscribed_buyer",
    activeCompanyId: 501,
    activeRoleCode: role,
    companies: [
      { id: 501, legalName: "Gulf Refinery Co", companyTypeCode: role, memberRoleCode: "owner", permissionTierCode: "executor", canApproveTransactions: true, canExecuteTransactions: true },
    ],
  };
}

async function installSession(page, role) {
  const user = backendUser(role);
  await page.addInitScript((sessionUser) => {
    localStorage.setItem("ecoglobe.demoUser", JSON.stringify({ ...sessionUser, token: "test-token", role: sessionUser.activeRoleCode, roles: [sessionUser.activeRoleCode] }));
  }, user);
  await page.route(`${baseUrl}/api/backend/auth/session`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, user }) }),
  );
}

function json(route, status, body) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("public detail shows persisted price, explicit MOQ unit and no invented seller data", async ({ page }) => {
  await page.route(`${baseUrl}/api/backend/api/listings/42*`, (route) => json(route, 200, { ok: true, listing: listingRecord() }));
  await page.goto(`${baseUrl}/browse/42`);
  await expect(page.getByRole("heading", { name: "Tar" })).toBeVisible();
  await expect(page.getByText("$450.00").first()).toBeVisible();
  await expect(page.getByText("Minimum Order Quantity (MOQ): 5 t (metric tonnes)")).toBeVisible();
  await expect(page.getByText("Gulf Refinery Co")).toBeVisible();
  await expect(page.getByText("verified", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Acme")).toHaveCount(0);
  await expect(page.getByText("Quoted per order")).toBeVisible();
});

test("unknown public id is not found and never shows another product", async ({ page }) => {
  await page.route(`${baseUrl}/api/backend/api/listings/999*`, (route) => json(route, 404, { ok: false, error: "Listing not found." }));
  await page.goto(`${baseUrl}/browse/999`);
  await expect(page.getByText("Listing not found")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tar" })).toHaveCount(0);
});

test("missing price renders as unavailable rather than zero", async ({ page }) => {
  await page.route(`${baseUrl}/api/backend/api/listings/43*`, (route) =>
    json(route, 200, { ok: true, listing: listingRecord({ id: 43, slug: "gasoline-offspec-43", title: "Gasoline offspec", pricePerUnit: null }) }),
  );
  await page.goto(`${baseUrl}/browse/43`);
  await expect(page.getByText("Price unavailable").first()).toBeVisible();
  await expect(page.getByText("$0.00")).toHaveCount(0);
});

test("buyer savings estimator matches the deck example and shows negative results", async ({ page }) => {
  await installSession(page, "buyer");
  await page.route(`${baseUrl}/api/backend/api/listings/44*`, (route) =>
    json(route, 200, { ok: true, listing: listingRecord({ id: 44, slug: "bagasse-44", title: "Bagasse", pricePerUnit: 150, quantity: 1000, minimumOrderQuantity: 1 }) }),
  );
  await page.route(`${baseUrl}/api/backend/api/listings?*`, (route) => json(route, 200, { ok: true, listings: [] }));
  await page.route(`${baseUrl}/api/backend/api/locations*`, (route) => json(route, 200, { ok: true, locations: [] }));
  await page.goto(`${baseUrl}/browse/44`);
  await page.getByLabel("Quantity", { exact: true }).fill("500");
  await page.getByRole("button", { name: "Estimate savings" }).first().click();
  await expect(page.getByRole("heading", { name: /Savings estimate/ })).toBeVisible();
  await page.getByLabel(/Baseline production \+ delivered cost/).fill("155");
  await expect(page.getByText("$2,500.00").first()).toBeVisible();
  await page.getByLabel(/Baseline production \+ delivered cost/).fill("100");
  await expect(page.getByText("Estimated additional cost")).toBeVisible();
  await expect(page.getByText("−$25,000.00").first()).toBeVisible();
  await expect(page.getByText(/Shipping for the alternative purchase .* not included/)).toBeVisible();
});

test("seller add-listing round-trips every field, uploads SDS, then submits for review", async ({ page }) => {
  await installSession(page, "seller");
  const requests = [];
  await page.route(`${baseUrl}/api/backend/api/locations*`, async (route) => {
    if (route.request().method() === "GET") return json(route, 200, { ok: true, locations: [{ id: 9, companyId: 501, locationTypeCode: "pickup", name: "Deer Park Plant", addressLine1: "5900 TX-225", addressLine2: null, city: "Deer Park", stateProvince: "TX", postalCode: "77536", countryCode: "US", latitude: 29.7218, longitude: -95.1158, isDefault: true }] });
    return json(route, 201, { ok: true, location: {} });
  });
  await page.route(`${baseUrl}/api/backend/api/listings`, async (route) => {
    const body = route.request().postDataJSON();
    requests.push({ method: "POST", body });
    return json(route, 201, { ok: true, listing: listingRecord({ ...body, id: 77, slug: "distinctive-77", listingStatusCode: "draft", documents: [] }) });
  });
  await page.route(`${baseUrl}/api/backend/api/listings/77`, async (route) => {
    const body = route.request().postDataJSON();
    requests.push({ method: "PATCH", body });
    return json(route, 200, { ok: true, listing: listingRecord({ ...body, id: 77, slug: "distinctive-77", documents: [{ id: 8, listingId: 77, documentTypeCode: "sds", fileName: "sds.pdf", fileUrl: "/api/listing-documents/8/download" }] }) });
  });
  await page.route(`${baseUrl}/api/backend/api/listing-documents`, async (route) => {
    const body = route.request().postDataJSON();
    requests.push({ method: "UPLOAD", body: { ...body, contentBase64: body.contentBase64.length } });
    return json(route, 201, { ok: true, document: { id: 8, listingId: 77, documentTypeCode: body.documentTypeCode, fileName: body.fileName, contentType: body.contentType, byteLength: 4, sha256: "x", fileUrl: "/api/listing-documents/8/download", verificationStatusCode: "pending_verification" } });
  });
  await page.route(`${baseUrl}/api/backend/api/listings/77?scope=owned`, (route) => json(route, 200, { ok: true, listing: listingRecord({ id: 77, slug: "distinctive-77", title: "Distinctive Tar 2026", listingStatusCode: "pending_review" }) }));

  await page.goto(`${baseUrl}/seller/listings/add`);
  await page.getByLabel("Listing name").fill("Distinctive Tar 2026");
  await page.getByLabel("Listing category").selectOption("Others");
  await page.getByLabel("Describe the material").fill("Coal tar pitch");
  await page.getByLabel("Material type (marketplace classification)").selectOption("other");
  await page.getByRole("radio", { name: /Deer Park Plant/ }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Quality").fill("Sulfur 1.2%");
  await page.getByLabel("Feedstock state").selectOption("Liquid");
  await page.getByLabel("Frequency").selectOption("Monthly");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Quantity unit").selectOption("ton");
  await page.getByLabel("Currency", { exact: true }).selectOption("USD");
  await page.getByLabel(/Unit price/).fill("450");
  await page.getByLabel(/Minimum Order Quantity \(MOQ\) in metric tonnes/).fill("5");
  await page.getByLabel(/Quantity available in metric tonnes/).fill("60");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Description text").fill("A distinctive tar listing.");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // SDS first, then claims and certifications.
  const sdsBox = page.getByText("Safety Data Sheet (SDS) — required to transact");
  const claims = page.getByText("Sustainability Claims");
  const sdsY = (await sdsBox.boundingBox()).y;
  const claimsY = (await claims.boundingBox()).y;
  expect(sdsY).toBeLessThan(claimsY);
  await page.getByRole("checkbox", { name: "Others" }).check();
  await page.getByLabel("Describe the other claim").fill("Closed-loop take-back");

  await page.getByRole("button", { name: "Save as Draft" }).click();
  await expect(page.getByText(/Draft saved to EcoGlobe as listing #77/)).toBeVisible();
  const created = requests.find((r) => r.method === "POST");
  expect(created.body.title).toBe("Distinctive Tar 2026");
  expect(created.body.sellerCompanyId).toBe(501);
  expect(created.body.locationId).toBe(9);
  expect(created.body.materialTypeCode).toBe("other");
  expect(created.body.pricePerUnit).toBe(450);
  expect(created.body.currencyCode).toBe("USD");
  expect(created.body.quantityUnit).toBe("ton");
  expect(created.body.minimumOrderQuantity).toBe(5);
  expect(created.body.quantity).toBe(60);
  expect(created.body.description).toBe("A distinctive tar listing.");
  expect(created.body.specifications.category).toBe("Others");
  expect(created.body.specifications.material).toBe("Coal tar pitch");
  expect(created.body.specifications.quality).toBe("Sulfur 1.2%");
  expect(created.body.specifications.state).toBe("Liquid");
  expect(created.body.specifications.frequency).toBe("Monthly");
  expect(created.body.specifications.claims).toEqual(["Closed-loop take-back"]);
  expect(created.body.listingStatusCode).toBe("draft");

  await page.locator('input[type="file"][accept="application/pdf"]').first().setInputFiles({ name: "sds.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  await expect(page.getByText("SDS on file for this listing.")).toBeVisible();
  const upload = requests.find((r) => r.method === "UPLOAD");
  expect(upload.body.listingId).toBe(77);
  expect(upload.body.documentTypeCode).toBe("sds");
  expect(upload.body.contentType).toBe("application/pdf");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Distinctive Tar 2026").first()).toBeVisible();
  await expect(page.getByText("Gulf Refinery Co")).toBeVisible();
  await expect(page.getByText("Acme")).toHaveCount(0);
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page).toHaveURL(`${baseUrl}/seller/listings/77`);
  const submitted = requests.filter((r) => r.method === "PATCH").pop();
  expect(submitted.body.listingStatusCode).toBe("pending_review");
  expect(submitted.body.specifications.claims).toEqual(["Closed-loop take-back"]);
});

test("seller value recovery sums avoided disposal and proceeds from the listing detail", async ({ page }) => {
  await installSession(page, "seller");
  await page.route(`${baseUrl}/api/backend/api/listings/42?scope=owned`, (route) => json(route, 200, { ok: true, listing: listingRecord({ pricePerUnit: 150, quantity: 500, listingStatusCode: "draft" }) }));
  await page.route(`${baseUrl}/api/backend/api/listings?*`, (route) => json(route, 200, { ok: true, listings: [] }));
  await page.route(`${baseUrl}/api/backend/api/locations*`, (route) => json(route, 200, { ok: true, locations: [] }));
  await page.goto(`${baseUrl}/seller/listings/42`);
  await page.getByRole("button", { name: "Estimate value recovery" }).click();
  await expect(page.getByRole("heading", { name: /Value recovery/ })).toBeVisible();
  await page.getByLabel(/Disposal cost per metric tonne, including transport to disposal/).fill("50");
  await expect(page.getByText("$100,000.00").first()).toBeVisible();
  await expect(page.getByText("Avoided disposal costs")).toBeVisible();
  await expect(page.getByText("$25,000.00").first()).toBeVisible();
  await expect(page.getByText("$75,000.00").first()).toBeVisible();
});

test("buyer onboarding persists feedstock interests with Others and recovers from a backend timeout", async ({ page }) => {
  await installSession(page, "buyer");
  let attempts = 0;
  let saved = null;
  await page.route(`${baseUrl}/api/backend/api/onboarding`, async (route) => {
    if (route.request().method() === "GET") return json(route, 200, { ok: true, onboarding: null });
    attempts += 1;
    if (attempts === 1) return json(route, 504, { ok: false, error: "EcoGlobe backend did not respond within 25 seconds." });
    saved = route.request().postDataJSON();
    return json(route, 200, { ok: true, user: backendUser("buyer"), onboarding: { company: { id: 501, legalName: "Gulf Refinery Co" }, profiles: {}, activeRoleCode: "buyer" } });
  });
  await page.goto(`${baseUrl}/buyer/onboarding`);
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Company name").fill("Gulf Refinery Co");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("checkbox", { name: "Others" }).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/Describe the feedstock you are looking for when Others is selected/)).toBeVisible();
  await page.getByLabel("Describe the feedstock you are looking for").fill("Spent catalyst");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/did not respond within 25 seconds/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: /Stripe/ })).toBeVisible();
  expect(saved.feedstockInterests).toEqual(["others"]);
  expect(saved.otherFeedstockInterest).toBe("Spent catalyst");
  expect(saved.companyName).toBe("Gulf Refinery Co");
});

test("registration offers account recovery when the email already exists", async ({ page }) => {
  await page.route(`${baseUrl}/api/backend/auth/register`, (route) => json(route, 409, { ok: false, error: "A user with that email already exists." }));
  await page.goto(`${baseUrl}/register`);
  await expect(page.getByRole("link", { name: "Recover it here" })).toBeVisible();
  await page.getByRole("button", { name: "I am a Seller" }).click();
  await page.getByLabel("First Name").fill("Ana");
  await page.getByLabel("Last Name").fill("Tester");
  await page.getByLabel("Work email").fill("ana@ecoglobe.test");
  await page.getByLabel("Password", { exact: true }).fill("Passw0rd!!Passw0rd");
  await page.getByLabel("Confirm Password").fill("Passw0rd!!Passw0rd");
  await page.getByRole("button", { name: "Create Seller Account" }).click();
  await expect(page.getByText("A user with that email already exists.")).toBeVisible();
  await expect(page.getByRole("link", { name: "recover your password" })).toHaveAttribute("href", "/forgot-password");
});

test("seller listings page preserves browser-only drafts with an explicit resume path", async ({ page }) => {
  await installSession(page, "seller");
  await page.addInitScript(() => {
    localStorage.setItem("ecoglobe.customListings", JSON.stringify([{ id: "custom-1700000000000", title: "Legacy Local Draft", price: "$40", unit: "/ton", qtyNum: 12, moq: "3 tons", category: "Plastics", location: "Houston, Texas", image: "/products/wood-chips.png", state: "Solid", frequency: "Monthly" }]));
  });
  await page.route(`${baseUrl}/api/backend/api/listings?scope=owned`, (route) => json(route, 200, { ok: true, listings: [] }));
  await page.goto(`${baseUrl}/seller/listings`);
  await expect(page.getByText("1 draft saved only on this device")).toBeVisible();
  await expect(page.getByText("Legacy Local Draft")).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume" })).toHaveAttribute("href", "/seller/listings/add?draft=custom-1700000000000");
  const stored = await page.evaluate(() => localStorage.getItem("ecoglobe.customListings"));
  expect(stored).toContain("Legacy Local Draft");
});
