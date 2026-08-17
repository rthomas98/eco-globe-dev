const { test, expect } = require("@playwright/test");
const { randomBytes } = require("node:crypto");

const apiBaseUrl = process.env.ECOGLOBE_API_BASE_URL ?? "http://127.0.0.1:4050";

async function registerAndOnboard(request, label) {
  const runId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const email = `rbac-${label}-${runId}@ecoglobe.test`;
  const password = `Rbac-${randomBytes(12).toString("base64url")}Aa1!`;
  const register = await request.post(`${apiBaseUrl}/auth/register`, {
    data: {
      name: `RBAC ${label}`,
      email,
      password,
      accountStatusCode: "subscribed_buyer",
    },
  });
  expect(register.status()).toBe(201);

  const login = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password, role: "buyer" },
  });
  expect(login.ok()).toBeTruthy();
  const loginBody = await login.json();

  const onboarding = await request.post(`${apiBaseUrl}/api/onboarding`, {
    headers: { authorization: `Bearer ${loginBody.token}` },
    data: {
      role: "buyer",
      companyName: `RBAC ${label} Company ${runId}`,
      address: "100 Security Way, Houston, TX 77002",
    },
  });
  expect(onboarding.ok()).toBeTruthy();
  const onboardingBody = await onboarding.json();

  return {
    token: loginBody.token,
    userId: onboardingBody.user.id,
    companyId: onboardingBody.onboarding.company.id,
    locationId: onboardingBody.onboarding.location.id,
  };
}

function bearer(token) {
  return { authorization: `Bearer ${token}` };
}

test("tenant RBAC protects sensitive reads and cross-company writes", async ({
  request,
}) => {
  for (const path of ["/api/users", "/api/companies", "/api/orders", "/api/payments"]) {
    const response = await request.get(`${apiBaseUrl}${path}`);
    expect(response.status(), `${path} must require authentication`).toBe(401);
  }

  const alice = await registerAndOnboard(request, "alice");
  const bob = await registerAndOnboard(request, "bob");

  const ownCompanies = await request.get(`${apiBaseUrl}/api/companies`, {
    headers: bearer(alice.token),
  });
  expect(ownCompanies.ok()).toBeTruthy();
  const ownCompanyIds = (await ownCompanies.json()).companies.map((company) => company.id);
  expect(ownCompanyIds).toContain(alice.companyId);
  expect(ownCompanyIds).not.toContain(bob.companyId);

  const crossUser = await request.patch(`${apiBaseUrl}/api/users/${bob.userId}`, {
    headers: bearer(alice.token),
    data: { name: "Should Not Update" },
  });
  expect(crossUser.status()).toBe(403);

  const crossCompany = await request.patch(`${apiBaseUrl}/api/companies/${bob.companyId}`, {
    headers: bearer(alice.token),
    data: { legalName: "Should Not Update" },
  });
  expect(crossCompany.status()).toBe(403);

  const crossLocation = await request.patch(`${apiBaseUrl}/api/locations/${bob.locationId}`, {
    headers: bearer(alice.token),
    data: { name: "Should Not Update" },
  });
  expect(crossLocation.status()).toBe(403);

  const crossMembers = await request.get(`${apiBaseUrl}/api/companies/${bob.companyId}/members`, {
    headers: bearer(alice.token),
  });
  expect(crossMembers.status()).toBe(403);

  const auditLogs = await request.get(`${apiBaseUrl}/api/audit-logs`, {
    headers: bearer(alice.token),
  });
  expect(auditLogs.status()).toBe(403);
});
