const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

const base = process.env.ECOGLOBE_WEB_BASE_URL;
const fixturePath = process.env.ECOGLOBE_ANA_FIXTURE;
if (!base || !fixturePath || !["127.0.0.1", "localhost"].includes(new URL(base).hostname)) {
  throw new Error("Ana tests require an explicit loopback web origin and private synthetic fixture.");
}
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const published = fixture.listings.find((item) => item.status === "published");
const draft = fixture.listings.find((item) => item.status === "draft");
test.use({ browserName: "chromium", channel: "chrome", viewport: { width: 1440, height: 1000 }, actionTimeout: 15_000 });
test.setTimeout(90_000);

async function signIn(page, role) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email Address", { exact: true }).fill(fixture[role].email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  const session = page.waitForResponse((response) => response.url().endsWith("/auth/session") && response.request().method() === "GET");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  expect((await session).status()).toBe(200);
  await expect(page).toHaveURL((url) => url.pathname.startsWith(`/${role}/`), { timeout: 20_000 });
  await expect(page.getByText(`Securing the ${role} workspace`, { exact: true })).toHaveCount(0);
}

async function record(page, id, owned = false) {
  const response = await page.request.get(`${base}/api/backend/api/listings/${id}${owned ? "?scope=owned" : ""}`);
  expect(response.status()).toBe(200);
  return (await response.json()).listing;
}

test("checkout receives the real listing and refuses an unknown requested listing", async ({ page }) => {
  await signIn(page, "buyer");
  const saved = await record(page, published.id);
  await page.goto(`${base}/buyer/browse/${published.id}`);
  await page.getByRole("button", { name: "Buy Now", exact: true }).click();
  await expect(page).toHaveURL(`${base}/buyer/checkout?listing=${published.id}`);
  await expect(page.getByText(saved.title, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(saved.sellerCompanyName, { exact: false }).first()).toBeVisible();
  await expect(page.getByText("$1,125.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Pyrolysis Oil", { exact: true })).toHaveCount(0);
  await page.goto(`${base}/buyer/checkout?listing=ana-unknown`);
  await expect(page.getByText("That listing is not in your cart", { exact: true })).toBeVisible();
});

test("published Tar preserves price and identity; private and unknown records stay unavailable", async ({ page }) => {
  const saved = await record(page, published.id);
  expect(saved.pricePerUnit).toBe(450);
  expect(saved.currencyCode).toBe("USD");
  expect(saved.quantityUnit).toBe("ton");
  await page.goto(`${base}/browse/${published.id}`);
  await expect(page.getByRole("heading", { name: saved.title, exact: true })).toBeVisible();
  await expect(page.getByText(saved.sellerCompanyName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/450/).first()).toBeVisible();
  await expect(page.getByText("Acme Corp", { exact: true })).toHaveCount(0);
  for (const id of [draft.id, "ana-does-not-exist"]) {
    await page.goto(`${base}/browse/${id}`);
    await expect(page.getByText("Listing not found", { exact: true })).toBeVisible();
  }
});

test("seller edit saves distinctive specifications and downloads the original SDS", async ({ page }) => {
  await signIn(page, "seller");
  const before = await record(page, draft.id, true);
  await page.goto(`${base}/seller/listings/${draft.id}/edit`);
  await expect(page.getByLabel("Listing name", { exact: true })).toHaveValue(before.title);
  const color = `Browser verified ${Date.now()}`;
  await page.getByLabel("Color", { exact: true }).fill(color);
  await page.getByLabel("Storage & handling", { exact: true }).fill("Covered storage; keep dry");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(`${base}/seller/listings/${draft.id}`);
  await page.reload();
  await expect(page.getByText(color, { exact: true })).toBeVisible();
  const after = await record(page, draft.id, true);
  expect(after.specifications.color).toBe(color);
  expect(after.specifications.storage).toBe("Covered storage; keep dry");
  expect(after.pricePerUnit).toBe(before.pricePerUnit);
  expect(after.specifications.claims).toEqual(before.specifications.claims);
  const sds = after.documents.find((doc) => doc.documentTypeCode === "sds");
  expect(sds).toBeTruthy();
  const file = await page.request.get(`${base}/api/backend${sds.fileUrl}`);
  expect(file.status()).toBe(200);
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("buyer savings uses the saved price and retains negative results", async ({ page }) => {
  await signIn(page, "buyer");
  await page.goto(`${base}/buyer/browse/${published.id}`);
  await page.getByRole("button", { name: "Estimate savings", exact: true }).last().click();
  await page.getByLabel(/Quantity \(metric tonnes\)/).fill("10");
  await page.getByLabel(/Baseline production \+ delivered cost/).fill("500");
  await expect(page.getByText("Estimated savings · USD", { exact: true })).toBeVisible();
  await expect(page.getByText("$500.00", { exact: true }).first()).toBeVisible();
  await page.getByLabel(/Baseline production \+ delivered cost/).fill("400");
  await expect(page.getByText("Estimated additional cost · USD", { exact: true })).toBeVisible();
  await expect(page.getByText("−$500.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Shipping for the alternative purchase from this seller is not included.")).toBeVisible();
});

test("seller recovery combines disposal costs and sale proceeds", async ({ page }) => {
  await signIn(page, "seller");
  await page.goto(`${base}/seller/listings/${published.id}`);
  await page.getByRole("button", { name: /Estimate.*recovery/i }).first().click();
  await page.getByLabel(/Quantity \(metric tonnes\)/).fill("10");
  await page.getByLabel(/Disposal cost per.*including transport/).fill("50");
  await expect(page.getByText("$5,000.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$4,500.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Shipping and handling costs for the sale itself are not included.")).toBeVisible();
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.context().addInitScript(() => { window.print = () => {}; });
  const reportOpened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Create report", exact: true }).click();
  const report = await reportOpened;
  await expect(report.getByText("$5,000.00", { exact: true }).first()).toBeVisible();
  await expect(report.getByText("$4,500.00", { exact: true }).first()).toBeVisible();
  await expect(report.getByText("Shipping and handling costs for the sale itself are not included.")).toBeVisible();
  await report.close();
});

test("registration recovery and public details fit a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/register`);
  await expect(page.getByRole("link", { name: /forgot.*password|recover/i }).first()).toBeVisible();
  await page.goto(`${base}/browse/${published.id}`);
  await expect(page.getByRole("heading", { name: "Tar", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("seller creates a real draft, uploads SDS and certification, previews and submits", async ({ page }) => {
  await signIn(page, "seller");
  const title = `Browser Tar ${Date.now()}`;
  await page.goto(`${base}/seller/listings/add`);
  await page.getByLabel("Listing name").fill(title);
  await page.getByLabel("Listing category").selectOption("Others");
  await page.getByLabel("Describe the material").fill("Coal tar pitch");
  await page.getByLabel("Material type (marketplace classification)").selectOption("other");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Quality", { exact: true }).fill("Sulfur 1.2%");
  await page.getByLabel("Feedstock state").selectOption("Liquid");
  await page.getByLabel("Frequency", { exact: true }).selectOption("Monthly");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Quantity unit").selectOption("ton");
  await page.getByLabel("Currency", { exact: true }).selectOption("USD");
  await page.getByLabel(/Unit price/).fill("450");
  await page.getByLabel(/Minimum Order Quantity \(MOQ\) in metric tonnes/).fill("5");
  await page.getByLabel(/Quantity available in metric tonnes/).fill("60");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Description text").fill("Distinctive browser verification material.");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const sdsBox = await page.getByText("Safety Data Sheet (SDS) — required to transact").boundingBox();
  const claimsBox = await page.getByText("Sustainability Claims", { exact: true }).boundingBox();
  expect(sdsBox.y).toBeLessThan(claimsBox.y);
  await page.getByRole("checkbox", { name: "Others", exact: true }).check();
  await page.getByLabel("Describe the other claim").fill("Closed-loop take-back");
  const creation = page.waitForResponse((response) => response.url().endsWith("/api/listings") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save as Draft", exact: true }).click();
  const response = await creation;
  expect(response.status()).toBe(201);
  const created = (await response.json()).listing;
  await expect(page.getByText(new RegExp(`Draft saved to EcoGlobe as listing #${created.id}`))).toBeVisible();
  const pdf = Buffer.from("%PDF-1.4\n% synthetic browser verification SDS\n%%EOF\n");
  await page.locator('input[type="file"][accept="application/pdf"]').first().setInputFiles({ name: "browser-sds.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByText("browser-sds.pdf", { exact: true })).toBeVisible();
  await page.locator('input[type="file"][accept="application/pdf"]').last().setInputFiles({ name: "browser-certification.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByText("browser-certification.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sulfur 1.2%", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page).toHaveURL(`${base}/seller/listings/${created.id}`);
  await page.reload();
  const saved = await record(page, created.id, true);
  expect(saved.listingStatusCode).toBe("pending_review");
  expect(saved.specifications.quality).toBe("Sulfur 1.2%");
  expect(saved.specifications.claims).toEqual(["Closed-loop take-back"]);
  expect(saved.pricePerUnit).toBe(450);
  for (const type of ["sds", "certification"]) {
    const doc = saved.documents.find((item) => item.documentTypeCode === type);
    expect(doc).toBeTruthy();
    const download = await page.request.get(`${base}/api/backend${doc.fileUrl}`);
    expect(await download.body()).toEqual(pdf);
  }
  expect((await page.request.get(`${base}/api/backend/api/listings/${created.id}`)).status()).toBe(404);
});

test("seller onboarding retries against SQL without duplicating its company", async ({ page }) => {
  await signIn(page, "seller");
  const companyListing = await record(page, published.id, true);
  let injected = false;
  await page.route(`${base}/api/backend/api/onboarding`, async (route) => {
    if (route.request().method() === "POST" && !injected) {
      injected = true;
      return route.fulfill({ status: 504, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Verification timeout: please retry." }) });
    }
    return route.continue();
  });
  await page.goto(`${base}/seller/onboarding`);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByLabel("Company name", { exact: true }).fill(companyListing.sellerCompanyName);
  await page.getByLabel("Address", { exact: true }).fill(companyListing.location.addressLine1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/Safety Data Sheet \(SDS\)/).first()).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Verification timeout: please retry.")).toBeVisible();
  const retry = page.waitForResponse((response) => response.url().endsWith("/api/onboarding") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  const result = await retry;
  expect(result.status()).toBe(200);
  expect((await result.json()).onboarding.company.id).toBe(fixture.seller.companyId);
  await expect(page.getByRole("heading", { name: /Connect Stripe/ })).toBeVisible();
  await page.getByRole("button", { name: /Skip, I/ }).click();
  await expect(page.getByRole("heading", { name: "Your Seller Account Is Created" })).toBeVisible();
});
