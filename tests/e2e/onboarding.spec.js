const { test, expect } = require("@playwright/test");
const { randomBytes } = require("node:crypto");

const baseUrl = process.env.ECOGLOBE_WEB_BASE_URL ?? "http://localhost:4040";
const password =
  process.env.ECOGLOBE_E2E_PASSWORD ??
  `${randomBytes(24).toString("base64url")}Aa1!`;

async function expectStripeHandoff(page, { successHeading, expectedHost }) {
  const outcome = await Promise.race([
    page
      .waitForURL((url) => url.hostname === expectedHost, { timeout: 10_000 })
      .then(() => "stripe"),
    page
      .getByRole("heading", { name: successHeading })
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => "demo"),
  ]);

  expect(["stripe", "demo"]).toContain(outcome);
}

async function register(page, { role, email }) {
  await page.goto(`${baseUrl}/register`);

  if (role === "both") {
    await page
      .getByRole("button", { name: "I am both — Buyer & Seller" })
      .click();
  } else {
    await page
      .getByRole("button", {
        name: `I am a ${role === "buyer" ? "Buyer" : "Seller"}`,
      })
      .click();
  }

  await page.getByLabel("First Name").fill("Browser");
  await page
    .getByLabel("Last Name")
    .fill(role === "seller" ? "Seller" : "Onboarding");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);

  const submitName =
    role === "both"
      ? "Create Buyer & Seller Account"
      : role === "seller"
        ? "Create Seller Account"
        : "Create Buyer Account";
  await page.getByRole("button", { name: submitName }).click();
}

test("buyer plus seller signup completes buyer onboarding with both backend profiles", async ({
  page,
}) => {
  const runId = Date.now();
  const companyName = `Browser Both Circular Materials ${runId}`;
  const email = `browser-both-${runId}@ecoglobe.test`;

  await register(page, { role: "both", email });
  await expect(page).toHaveURL(`${baseUrl}/choose-dashboard`);
  await page.getByRole("button", { name: "Continue as Buyer" }).click();
  await expect(page).toHaveURL(`${baseUrl}/buyer/onboarding`);

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Job title").fill("Sustainability Manager");
  await page
    .getByLabel("What industry are you working on?")
    .fill("Carbon Black");
  await page.getByLabel("Address").fill("400 Browser Way, Houston, TX 77002");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page
    .getByLabel("What type of feedstock are you looking for?")
    .selectOption("biomass");
  await page
    .getByLabel("What will you use this feedstock for?")
    .fill("Industrial process feedstock");
  await page.getByLabel("Any restrictions?").selectOption("none");
  await page
    .getByLabel("How much feedstock will you need per year?")
    .fill("1000 tons");
  await page
    .getByLabel("What are the specs of the feedstock")
    .fill("Low moisture, verified origin");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("Preferred certifications").selectOption("iscc-plus");
  await page.getByLabel("Regions").selectOption("north-america");
  await page.getByLabel("Compliance requirements").selectOption("us-tsca");
  const onboardingResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/onboarding") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const response = await onboardingResponse;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();

  expect(body.onboarding.company.legalName).toBe(companyName);
  expect(body.onboarding.profiles.buyerProfileId).toBeTruthy();
  expect(body.onboarding.profiles.sellerProfileId).toBeTruthy();
  expect(body.onboarding.location.name).toBe("Primary delivery site");
  expect(body.user.companies[0].companyTypeCode).toBe("both");
  expect(body.user.companies[0].canApproveTransactions).toBe(true);
  expect(body.user.companies[0].canExecuteTransactions).toBe(true);

  await expect(
    page.getByRole("heading", {
      name: "Connect Stripe for secure buyer payments",
    }),
  ).toBeVisible();
  const stripeResponse = page.waitForResponse(
    (stripeResult) =>
      stripeResult.url().endsWith("/api/stripe/onboarding") &&
      stripeResult.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Set up Stripe billing" }).click();
  const stripeResult = await stripeResponse;
  expect(stripeResult.ok()).toBeTruthy();
  expect(stripeResult.request().postDataJSON().role).toBe("buyer");

  await expectStripeHandoff(page, {
    successHeading: "Your Buyer Account Is Ready",
    expectedHost: "checkout.stripe.com",
  });
});

test("seller signup completes seller onboarding with backend seller profile", async ({
  page,
}) => {
  const runId = Date.now();
  const companyName = `Browser Seller Materials ${runId}`;
  const email = `browser-seller-${runId}@ecoglobe.test`;

  await register(page, { role: "seller", email });
  await expect(page).toHaveURL(`${baseUrl}/seller/onboarding`);

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("What industry are you working on?").fill("Refinery");
  await page.getByLabel("Address").fill("100 Seller Way, Deer Park, TX 77536");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page
    .getByLabel("What type of feedstock are you generating?")
    .selectOption("plastics");
  await page
    .getByLabel("Could you tell us how this feedstock was generated?")
    .fill("Off-spec process stream");
  await page.getByLabel("Any restrictions?").selectOption("none");
  await page
    .getByLabel("How much feedstock will you generate per year?")
    .fill("2500 tons");
  await page
    .getByLabel("What are the specs of the feedstock")
    .fill("Sorted, dry, documented");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const onboardingResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/onboarding") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const response = await onboardingResponse;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();

  expect(body.onboarding.company.legalName).toBe(companyName);
  expect(body.onboarding.profiles.buyerProfileId).toBeFalsy();
  expect(body.onboarding.profiles.sellerProfileId).toBeTruthy();
  expect(body.onboarding.location.name).toBe("Primary pickup site");
  expect(body.user.companies[0].companyTypeCode).toBe("seller");

  await expect(
    page.getByRole("heading", { name: "Connect Stripe for seller payouts" }),
  ).toBeVisible();
  const stripeResponse = page.waitForResponse(
    (stripeResult) =>
      stripeResult.url().endsWith("/api/stripe/onboarding") &&
      stripeResult.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Set up Stripe payouts" }).click();
  const stripeResult = await stripeResponse;
  expect(stripeResult.ok()).toBeTruthy();
  expect(stripeResult.request().postDataJSON().role).toBe("seller");

  await expectStripeHandoff(page, {
    successHeading: "Your Seller Account Is Created",
    expectedHost: "connect.stripe.com",
  });
});
