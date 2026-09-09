// Frontend checks for the lab testing referral: the reusable form on the
// listing page and inside the sample request, idempotent retry, private
// default with explicit sharing consent, listing analysis with a real
// report, the internal admin queue, and 390 px layout. Backend `/api/lab`
// routes are mocked (contract: docs/LAB_API_CONTRACT_2026-09-09.md); the
// coordinator runs SQL-backed verification separately.
const { test, expect } = require("@playwright/test");

const baseUrl = process.env.ECOGLOBE_WEB_BASE_URL ?? "http://localhost:4040";

function listingRecord(overrides = {}) {
  return {
    id: 42,
    slug: "tar-42",
    sellerCompanyId: 900,
    sellerCompanyName: "Gulf Refinery Co",
    sellerVerified: false,
    locationId: 9,
    location: { id: 9, name: "Deer Park Plant", addressLine1: "5900 TX-225", addressLine2: null, city: "Deer Park", stateProvince: "TX", postalCode: "77536", countryCode: "US", latitude: 29.72, longitude: -95.11 },
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
    specifications: { category: "Refinery Byproducts", state: "Liquid", frequency: "Monthly" },
    documents: [{ id: 7, listingId: 42, documentTypeCode: "sds", fileName: "tar-sds.pdf", contentType: "application/pdf", byteLength: 1200, fileUrl: "/api/listing-documents/7/download" }],
    ...overrides,
  };
}

const concernOptions = [
  { id: "processing-concern", group: "processing", label: "Will it run on my line?" },
  { id: "safety-concern", group: "safety", label: "Is anything in here I do not want?" },
  { id: "compliance-concern", group: "compliance", label: "Can I legally receive it?" },
  { id: "consistency-concern", group: "consistency", label: "Will batch two match batch one?" },
];

function config(overrides = {}) {
  return { listingId: 42, listingTitle: "Tar", sellerCompanyName: "Gulf Refinery Co", locationLabel: "Deer Park, TX", categoryCode: "industrial_byproduct", panel: null, scopeToBeConfirmed: true, optionalTests: concernOptions, ...overrides };
}

function report(overrides = {}) {
  return { id: 3, sharing: "shared", listingId: 42, requestId: 11, laboratoryName: "Example Analytical", batchReference: "B-4471", sampleDate: "2026-08-14", reportDate: "2026-08-20", results: [{ label: "Moisture", value: "8.4", unit: "%" }, { label: "Ash", value: "3.1", unit: "%" }], fileName: "tar-b4471.pdf", byteLength: 20480, sha256: "abc", fileUrl: "/api/lab/reports/3/file", published: true, ...overrides };
}

function labRequest(body, id = 11) {
  return { id, listingId: 42, listingTitle: "Tar", sampleRequestId: body.sampleRequestId ?? null, companyId: 501, categoryCode: "industrial_byproduct", panelId: body.panelId, panelVersion: body.panelVersion, scope: config(), optionalTestIds: body.optionalTestIds, concerns: body.concerns ?? "", turnaround: body.turnaround, sharing: body.sharing, status: "requested", createdAt: "2026-09-09T10:00:00Z", reports: [] };
}

function backendUser(role) {
  return { id: 9001, name: `Ana ${role}`, email: `ana-${role}@ecoglobe.test`, accountStatusCode: "subscribed_buyer", activeCompanyId: 501, activeRoleCode: role, companies: [{ id: 501, legalName: "AgriCorp", companyTypeCode: role, memberRoleCode: "owner", permissionTierCode: role === "admin" ? "admin_override" : "executor", canApproveTransactions: true, canExecuteTransactions: true }] };
}

async function installSession(page, role) {
  const user = backendUser(role);
  await page.addInitScript((sessionUser) => {
    localStorage.setItem("ecoglobe.demoUser", JSON.stringify({ ...sessionUser, token: "test-token", role: sessionUser.activeRoleCode, roles: [sessionUser.activeRoleCode] }));
    sessionStorage.setItem("ecoglobe.admin.tab-session", JSON.stringify({ email: "demo.admin@ecoglobe.com", name: "Demo Admin", role: "Platform administrator", expiresAt: Date.now() + 3600000, remembered: false }));
  }, user);
  await page.route(`${baseUrl}/api/backend/auth/session`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, user }) }));
}

function json(route, status, body) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockListing(page, reports = []) {
  await page.route(`${baseUrl}/api/backend/api/listings/42*`, (route) => json(route, 200, { ok: true, listing: listingRecord() }));
  await page.route(`${baseUrl}/api/backend/api/listings/42/lab-reports`, (route) => json(route, 200, { ok: true, reports }));
  await page.route(`${baseUrl}/api/backend/api/lab/config*`, (route) => json(route, 200, { ok: true, config: config() }));
  await page.route(`${baseUrl}/api/backend/api/lab/requests?*`, (route) => json(route, 200, { ok: true, requests: [] }));
}

test("anonymous visitor sees the shared report and a sign-in prompt, never a request button", async ({ page }) => {
  await mockListing(page, [report()]);
  await page.goto(`${baseUrl}/browse/42`);
  await expect(page.getByRole("heading", { name: "Independent analysis" })).toBeVisible();
  await expect(page.getByText("Independently tested", { exact: true })).toBeVisible();
  await expect(page.getByText("Example Analytical, Aug 20, 2026")).toBeVisible();
  await expect(page.getByText("Batch B-4471 · sample drawn Aug 14, 2026")).toBeVisible();
  await expect(page.getByText("8.4%")).toBeVisible();
  await expect(page.getByRole("link", { name: /Download full report/ })).toHaveAttribute("href", "/api/backend/api/lab/reports/3/file");
  await expect(page.getByText(/EcoGlobe certified/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Request lab testing/ })).toHaveCount(0);
  await expect(page.getByText("to request lab testing.")).toBeVisible();
});

test("listing page form: private default, scope to be confirmed, consent required, idempotent retry", async ({ page }) => {
  await installSession(page, "buyer");
  await mockListing(page);
  const posts = [];
  let failFirst = true;
  await page.route(`${baseUrl}/api/backend/api/lab/requests`, async (route) => {
    const body = route.request().postDataJSON();
    posts.push(body);
    if (failFirst) {
      failFirst = false;
      return json(route, 503, { ok: false, error: "EcoGlobe backend is unavailable." });
    }
    return json(route, 201, { ok: true, request: labRequest(body) });
  });
  await page.goto(`${baseUrl}/buyer/browse/42`);
  await expect(page.getByText("No independent analysis on this listing yet.")).toBeVisible();
  await page.getByRole("button", { name: "Request lab testing" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Request lab testing" })).toBeVisible();
  await expect(dialog.getByText("Testing scope to be confirmed").first()).toBeVisible();
  await expect(dialog.getByText("This does not replace your own testing")).toBeVisible();
  await expect(dialog.getByText("Results describe a batch")).toBeVisible();
  await expect(dialog.getByText(/\$\d/)).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: /My company only/ })).toBeChecked();
  await dialog.getByRole("checkbox", { name: /Processing behaviour/ }).check();
  await dialog.getByRole("checkbox", { name: /Consistency across the stream/ }).check();
  await dialog.getByLabel("Something not listed?").fill("Slagging with a previous supplier.");
  await dialog.getByRole("radio", { name: "Expedited" }).check({ force: true });
  await dialog.getByRole("radio", { name: /Share with the seller and the listing/ }).check();
  await dialog.getByRole("button", { name: "Send request to EcoGlobe" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Confirm that the report may be shared");
  expect(posts).toHaveLength(0);
  await dialog.getByRole("checkbox", { name: /I consent to the laboratory report/ }).check();
  await dialog.getByRole("button", { name: "Send request to EcoGlobe" }).click();
  await expect(dialog.getByRole("alert")).toContainText("unavailable");
  await dialog.getByRole("button", { name: /Retry \(your entries are kept\)/ }).click();
  await expect(dialog.getByRole("heading", { name: "Request sent to EcoGlobe" })).toBeVisible();
  await expect(dialog.getByText("LAB-11")).toBeVisible();
  expect(posts).toHaveLength(2);
  expect(posts[0].idempotencyKey).toBe(posts[1].idempotencyKey);
  expect(posts[1].idempotencyKey).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
  expect(posts[1]).toMatchObject({ listingId: 42, sampleRequestId: null, panelId: null, panelVersion: null, optionalTestIds: ["consistency-concern", "processing-concern"], concerns: "Slagging with a previous supplier.", turnaround: "expedited", sharing: "shared" });
});

test("sample request placement links the lab request to the created sample", async ({ page }) => {
  await installSession(page, "buyer");
  await mockListing(page);
  const samplePosts = [];
  await page.route(`${baseUrl}/api/backend/api/sample-requests`, async (route) => {
    samplePosts.push(route.request().postDataJSON());
    return json(route, 201, { ok: true, sample: { id: 55, listingId: 42, status: "requested" } });
  });
  const labPosts = [];
  await page.route(`${baseUrl}/api/backend/api/lab/requests`, async (route) => {
    const body = route.request().postDataJSON();
    labPosts.push(body);
    return json(route, 201, { ok: true, request: labRequest(body, 12) });
  });
  await page.goto(`${baseUrl}/buyer/browse/42`);
  await page.getByRole("button", { name: /Request a Sample/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /Have this lab tested too/ }).check();
  await dialog.getByRole("button", { name: "Send request, then choose tests" }).click();
  await expect(dialog.getByText("Sample request #55 sent to the seller.")).toBeVisible();
  await expect(dialog.getByText("Linked to sample request #55")).toBeVisible();
  await dialog.getByRole("button", { name: "Send request to EcoGlobe" }).click();
  await expect(dialog.getByRole("heading", { name: "Sample requested" })).toBeVisible();
  expect(samplePosts[0]).toMatchObject({ listingId: 42, quantityLb: 5 });
  expect(samplePosts[0].idempotencyKey).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
  expect(labPosts[0]).toMatchObject({ listingId: 42, sampleRequestId: 55, sharing: "private", turnaround: "standard" });
});

test("form works at 390 px with keyboard navigation and Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await installSession(page, "buyer");
  await mockListing(page);
  await page.goto(`${baseUrl}/browse/42`);
  const opener = page.getByRole("button", { name: "Request lab testing" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box.width).toBeLessThanOrEqual(390);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
  await expect(dialog.getByRole("checkbox", { name: /Processing behaviour/ })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(dialog.getByRole("checkbox", { name: /Processing behaviour/ })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("buyer documents show requests with consent withdrawal", async ({ page }) => {
  await installSession(page, "buyer");
  const req = { ...labRequest({ panelId: null, panelVersion: null, optionalTestIds: [], turnaround: "standard", sharing: "shared" }), status: "completed", reports: [report()] };
  await page.route(`${baseUrl}/api/backend/api/lab/requests`, (route) => json(route, 200, { ok: true, requests: [req] }));
  await page.route(`${baseUrl}/api/backend/api/lab/requests/11/sharing`, (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().postDataJSON()).toEqual({ sharing: "private" });
    return json(route, 200, { ok: true, request: { ...req, sharing: "private", reports: [report({ sharing: "private", published: false })] } });
  });
  page.on("dialog", (d) => d.accept());
  await page.goto(`${baseUrl}/buyer/documents`);
  await expect(page.getByRole("heading", { name: "Independent lab reports" })).toBeVisible();
  await expect(page.getByText("LAB-11")).toBeVisible();
  await expect(page.getByText("Testing is complete and the report is attached.")).toBeVisible();
  await page.getByRole("button", { name: "Withdraw sharing" }).click();
  await expect(page.getByText("Reports are private to your company.")).toBeVisible();
});

test("internal admin queue: assignment, status, notes and report attachment with a real PDF", async ({ page }) => {
  await installSession(page, "admin");
  const adminReq = { ...labRequest({ panelId: null, panelVersion: null, optionalTestIds: ["safety-concern"], concerns: "Heavy metals worry", turnaround: "standard", sharing: "shared" }), ownerUserId: null, notes: "", companyName: "AgriCorp", requestedByName: "Ana Sanz", requestedByEmail: "ana@example.test" };
  await page.route(`${baseUrl}/api/backend/api/admin/lab/requests*`, (route) => json(route, 200, { ok: true, requests: [adminReq] }));
  await page.route(`${baseUrl}/api/backend/api/admin/lab/assignees`, (route) => json(route, 200, { ok: true, assignees: [{ userId: 7, name: "Bea Roberts" }] }));
  const patches = [];
  await page.route(`${baseUrl}/api/backend/api/admin/lab/requests/11`, (route) => {
    patches.push(route.request().postDataJSON());
    return json(route, 200, { ok: true, request: { ...adminReq, ownerUserId: 7, status: "reviewing", notes: "Called lab." } });
  });
  const uploads = [];
  await page.route(`${baseUrl}/api/backend/api/admin/lab/requests/11/reports`, (route) => {
    uploads.push(route.request().postDataJSON());
    return json(route, 201, { ok: true, report: report({ published: false, sharing: "shared" }) });
  });
  await page.goto(`${baseUrl}/admin/lab-testing`);
  await expect(page.getByRole("heading", { name: "Lab testing queue" })).toBeVisible();
  await page.getByRole("button", { name: "LAB-11" }).click();
  await expect(page.getByText("Heavy metals worry")).toBeVisible();
  await expect(page.getByText("AgriCorp — Ana Sanz · ana@example.test")).toBeVisible();
  await expect(page.getByRole("link", { name: "ana@example.test" })).toHaveAttribute("href", "mailto:ana@example.test");
  const handling = page.getByRole("region", { name: "Handling" });
  await handling.getByLabel("Owner").selectOption("7");
  await handling.getByLabel("Status").selectOption("reviewing");
  await page.getByLabel(/Internal notes/).fill("Called lab.");
  await page.getByRole("button", { name: "Save handling" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  expect(patches[0]).toEqual({ status: "reviewing", ownerUserId: 7, notes: "Called lab." });

  await page.getByRole("button", { name: "Attach report" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter the laboratory name" })).toBeVisible();
  expect(uploads).toHaveLength(0);
  await page.getByLabel("Laboratory name").fill("Example Analytical");
  await page.getByLabel("Batch reference").fill("B-4471");
  await page.getByLabel("Sample drawn on").fill("2026-08-14");
  await page.getByLabel("Report date").fill("2026-08-20");
  await page.getByLabel("Result 1 label").fill("Moisture");
  await page.getByLabel("Result 1 value").fill("8.4");
  await page.getByLabel("Result 1 unit").fill("%");
  await page.getByLabel(/Report PDF/).setInputFiles({ name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf at all") });
  await page.getByRole("button", { name: "Attach report" }).click();
  await expect(page.getByText("does not start with a PDF signature")).toBeVisible();
  expect(uploads).toHaveLength(0);
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R >> endobj\nxref\n0 4\ntrailer << /Root 1 0 R >>\nstartxref\n180\n%%EOF\n");
  await page.getByLabel(/Report PDF/).setInputFiles({ name: "tar-b4471.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: "Attach report" }).click();
  await expect(page.getByText(/Report tar-b4471.pdf attached/)).toBeVisible();
  expect(uploads[0]).toMatchObject({ laboratoryName: "Example Analytical", batchReference: "B-4471", sampleDate: "2026-08-14", reportDate: "2026-08-20", results: [{ label: "Moisture", value: "8.4", unit: "%" }], fileName: "tar-b4471.pdf", published: false });
  expect(Buffer.from(uploads[0].contentBase64, "base64").equals(pdf)).toBe(true);
  await expect(page.getByText("Independently tested", { exact: true })).toBeVisible();
});

test("draft panel editor blocks publishing without laboratory review evidence", async ({ page }) => {
  await installSession(page, "admin");
  await page.route(`${baseUrl}/api/backend/api/admin/lab/panels`, (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      return json(route, 201, { ok: true, panel: { id: 2, version: 2, ...body, review: body.review ?? null } });
    }
    return json(route, 200, { ok: true, panels: [{ id: 1, familyCode: "biomass_wood", version: 1, name: "Biomass & wood (draft)", materialTypeCodes: [], tests: ["Moisture"], optionalTests: [], status: "draft", review: null }] });
  });
  await page.route(`${baseUrl}/api/backend/api/lookups`, (route) => json(route, 200, { ok: true, lookups: {} }));
  await page.goto(`${baseUrl}/admin/lab-testing/panels`);
  await expect(page.getByRole("heading", { name: "Biomass & wood (draft)" })).toBeVisible();
  await page.getByRole("button", { name: "New version from latest" }).click();
  await page.getByRole("button", { name: "Publish version" }).click();
  const alert = page.getByRole("dialog").getByRole("alert");
  await expect(alert).toContainText("Record which laboratory reviewed the panel.");
  await expect(alert).toContainText("Map the panel to at least one material type code.");
});

test("buyer orders show the ported sample panel with receipt transition and lab entry, no bulk conversion", async ({ page }) => {
  await installSession(page, "buyer");
  const sample = { id: 55, listingId: 42, listingTitle: "Tar", listingSlug: "tar-42", buyerCompanyId: 501, buyerCompanyName: "AgriCorp", sellerCompanyId: 900, sellerCompanyName: "Gulf Refinery Co", quantityLb: 5, note: null, deliveryAddress: null, status: "shipped", sellerResponse: null, trackingNumber: "1Z999", convertedOrderId: null, createdAt: "2026-09-09T10:00:00Z", updatedAt: "2026-09-09T10:00:00Z" };
  let current = sample;
  await page.route(`${baseUrl}/api/backend/api/sample-requests`, (route) => json(route, 200, { ok: true, samples: [current] }));
  const patches = [];
  await page.route(`${baseUrl}/api/backend/api/sample-requests/55`, (route) => {
    patches.push(route.request().postDataJSON());
    current = { ...sample, status: "received" };
    return json(route, 200, { ok: true, sample: { id: 55, status: "received" } });
  });
  await page.route(`${baseUrl}/api/backend/api/orders*`, (route) => json(route, 200, { ok: true, orders: [] }));
  await page.route(`${baseUrl}/api/backend/api/lab/config*`, (route) => json(route, 200, { ok: true, config: config() }));
  await page.goto(`${baseUrl}/buyer/orders`);
  const panel = page.getByRole("region", { name: "Sample requests" });
  await expect(panel.getByText("#55 · 5 lb · Tar")).toBeVisible();
  await expect(panel.getByText("Tracking 1Z999")).toBeVisible();
  await panel.getByRole("button", { name: "Mark received" }).click();
  await expect(panel.getByText("Received")).toBeVisible();
  expect(patches[0]).toEqual({ status: "received" });
  await expect(panel.getByRole("button", { name: /Order in bulk/ })).toHaveCount(0);
  await panel.getByRole("button", { name: "Lab testing" }).click();
  await expect(page.getByRole("dialog").getByText("Linked to sample request #55")).toBeVisible();
});

test("seller sales show the ported sample panel with accept and shipped transitions", async ({ page }) => {
  await installSession(page, "seller");
  let status = "requested";
  await page.route(`${baseUrl}/api/backend/api/sample-requests`, (route) =>
    json(route, 200, { ok: true, samples: [{ id: 56, listingId: 42, listingTitle: "Tar", listingSlug: "tar-42", buyerCompanyId: 700, buyerCompanyName: "Buyer Co", sellerCompanyId: 501, sellerCompanyName: "AgriCorp", quantityLb: 10, note: "Ash content", deliveryAddress: "1 Main St", status, sellerResponse: null, trackingNumber: null, convertedOrderId: null, createdAt: "2026-09-09T10:00:00Z", updatedAt: "2026-09-09T10:00:00Z" }] }),
  );
  const patches = [];
  await page.route(`${baseUrl}/api/backend/api/sample-requests/56`, (route) => {
    const body = route.request().postDataJSON();
    patches.push(body);
    status = body.status;
    return json(route, 200, { ok: true, sample: { id: 56, status } });
  });
  await page.route(`${baseUrl}/api/backend/api/orders*`, (route) => json(route, 200, { ok: true, orders: [] }));
  await page.goto(`${baseUrl}/seller/sales`);
  const panel = page.getByRole("region", { name: "Sample requests" });
  await expect(panel.getByText("For Buyer Co · 1 Main St")).toBeVisible();
  await panel.getByRole("button", { name: "Accept" }).click();
  await expect(panel.getByRole("button", { name: "Mark shipped" })).toBeVisible();
  await panel.getByRole("button", { name: "Mark shipped" }).click();
  await panel.getByLabel("Tracking number (optional)").fill("TRK-1");
  await panel.getByRole("button", { name: "Confirm shipped" }).click();
  await expect(panel.getByText("Shipped")).toBeVisible();
  expect(patches).toEqual([{ status: "accepted" }, { status: "shipped", trackingNumber: "TRK-1" }]);
});

test("admin notifications show actual persisted lab referral rows with queue link, retry and mark read", async ({ page }) => {
  await installSession(page, "admin");
  let allow = false;
  await page.route(`${baseUrl}/api/backend/api/notifications?*`, (route) => {
    if (!allow) return json(route, 503, { ok: false, error: "EcoGlobe backend is unavailable." });
    return json(route, 200, { ok: true, notifications: [
      { id: 501, userId: 9001, companyId: null, relatedRecordTypeCode: "listing", relatedRecordId: 42, notificationChannelCode: "in_app", notificationCategoryCode: "orders", notificationStatusCode: "sent", subject: "Lab testing referral received", body: "Referral 11 for Tar. Review in the internal lab queue; no booking has been made.", sentAt: null, readAt: null, createdAt: "2026-09-09T10:00:00Z", updatedAt: "2026-09-09T10:00:00Z" },
      { id: 502, userId: 9001, companyId: null, relatedRecordTypeCode: "listing", relatedRecordId: 42, notificationChannelCode: "in_app", notificationCategoryCode: "orders", notificationStatusCode: "sent", subject: "Sample requested for \"Tar\"", body: "unrelated", sentAt: null, readAt: null, createdAt: "2026-09-09T10:00:00Z", updatedAt: "2026-09-09T10:00:00Z" },
    ] });
  });
  await page.route(`${baseUrl}/api/backend/api/notifications/501`, (route) => {
    expect(route.request().postDataJSON()).toEqual({ notificationStatusCode: "read" });
    return json(route, 200, { ok: true, notification: { id: 501, notificationStatusCode: "read", readAt: "2026-09-09T11:00:00Z" } });
  });
  await page.goto(`${baseUrl}/admin/notifications`);
  const section = page.getByRole("region", { name: "Lab testing referrals" });
  await expect(section.getByRole("alert")).toContainText("unavailable");
  allow = true;
  await section.getByRole("button", { name: "Retry" }).click();
  await expect(section.getByText("Lab testing referral received")).toBeVisible();
  await expect(section.getByText(/Referral 11 for Tar/)).toBeVisible();
  await expect(section.getByText("LAB-11", { exact: false })).toBeVisible();
  await expect(section.getByText("unrelated")).toHaveCount(0);
  await expect(section.getByRole("link", { name: "Open queue" })).toHaveAttribute("href", "/admin/lab-testing");
  await section.getByRole("button", { name: "Mark read" }).click();
  await expect(section.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  await expect(page.getByText("Demo activity (sample data)")).toBeVisible();
});
