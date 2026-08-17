const { test, expect } = require("@playwright/test");

const baseUrl = process.env.ECOGLOBE_WEB_BASE_URL ?? "http://localhost:4040";

function backendUser(role) {
  const companyTypeCode = role === "admin" ? "both" : role;
  return {
    id: 9001,
    name: `Route Guard ${role}`,
    email: `route-guard-${role}@ecoglobe.test`,
    accountStatusCode:
      role === "seller"
        ? "subscribed_seller"
        : role === "buyer"
          ? "subscribed_buyer"
          : "active",
    activeCompanyId: 501,
    activeRoleCode: role,
    companies: [
      {
        id: 501,
        legalName: "Route Guard Test Company",
        companyTypeCode,
        memberRoleCode: role === "admin" ? "admin" : "owner",
        permissionTierCode: role === "admin" ? "admin_override" : "executor",
        canApproveTransactions: true,
        canExecuteTransactions: true,
      },
    ],
  };
}

async function installSession(page, role) {
  const user = backendUser(role);
  await page.addInitScript((sessionUser) => {
    localStorage.setItem(
      "ecoglobe.demoUser",
      JSON.stringify({
        ...sessionUser,
        token: "route-guard-test-token",
        role: sessionUser.activeRoleCode,
        roles: [sessionUser.activeRoleCode],
      }),
    );
  }, user);
  await page.route(`${baseUrl}/api/backend/auth/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, user }),
    });
  });
}

test("anonymous portal visits are redirected to sign in with the original destination", async ({
  page,
}) => {
  await page.goto(`${baseUrl}/buyer/browse`);
  await expect(page).toHaveURL(
    `${baseUrl}/login?next=%2Fbuyer%2Fbrowse&reason=authentication-required`,
  );
});

test("a seller session cannot enter the buyer portal", async ({ page }) => {
  await installSession(page, "seller");
  await page.goto(`${baseUrl}/buyer/browse`);
  await expect(page).toHaveURL(
    `${baseUrl}/choose-dashboard?reason=access-denied&required=buyer`,
  );
});

for (const { role, path } of [
  { role: "buyer", path: "/buyer/browse" },
  { role: "seller", path: "/seller/listings" },
  { role: "admin", path: "/admin/sales" },
]) {
  test(`${role} sessions can enter their own portal`, async ({ page }) => {
    await installSession(page, role);
    await page.goto(`${baseUrl}${path}`);
    await expect(page).toHaveURL(`${baseUrl}${path}`);
    await expect(page.getByText(`Securing the ${role} workspace`)).toBeHidden();
  });
}

test("an expired or revoked backend session is cleared and redirected", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "ecoglobe.demoUser",
      JSON.stringify({
        token: "expired-token",
        role: "buyer",
        roles: ["buyer"],
        name: "Expired Buyer",
        email: "expired@ecoglobe.test",
      }),
    );
  });
  await page.route(`${baseUrl}/api/backend/auth/session`, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Missing or invalid bearer session token.",
      }),
    });
  });

  await page.goto(`${baseUrl}/buyer/browse`);
  await expect(page).toHaveURL(
    `${baseUrl}/login?next=%2Fbuyer%2Fbrowse&reason=authentication-required`,
  );
  expect(
    await page.evaluate(() => localStorage.getItem("ecoglobe.demoUser")),
  ).toBeNull();
});

test("legacy bearer tokens are removed from browser storage before session revalidation", async ({
  page,
}) => {
  await installSession(page, "buyer");
  await page.goto(`${baseUrl}/buyer/browse`);

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("ecoglobe.demoUser");
    return raw ? JSON.parse(raw) : null;
  });

  expect(stored).not.toBeNull();
  expect(stored.token).toBeUndefined();
  expect(stored.sessionExpiresAt).toBeUndefined();
});
