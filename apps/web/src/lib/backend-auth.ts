"use client";

import {
  buildDemoUser,
  clearDemoUser,
  readDemoUser,
  writeDemoUser,
  type BackendCompanyMembership,
  type DemoUser,
  type UserRole,
} from "./demo-user";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:4050";

type BackendUser = {
  id: number;
  name: string;
  email: string;
  accountStatusCode: string;
  activeCompanyId?: number;
  activeRoleCode: string;
  companies: BackendCompanyMembership[];
};

type LoginResponse = {
  ok: true;
  token: string;
  expiresAt: string;
  user: BackendUser;
};

type RegisterResponse = {
  ok: true;
  user: {
    id: number;
    name: string;
    email: string;
    accountStatusCode: string;
  };
};

type SessionResponse = {
  ok: true;
  user: BackendUser;
};

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

function isUserRole(value: string | undefined): value is UserRole {
  return value === "buyer" || value === "seller" || value === "admin";
}

function normalizeRole(
  value: string | undefined,
  fallback: UserRole,
): UserRole {
  return isUserRole(value) ? value : fallback;
}

export function inferRequestedRole(email: string): UserRole | undefined {
  const normalized = email.trim().toLowerCase();
  if (normalized.includes("seller")) return "seller";
  if (normalized.includes("buyer")) return "buyer";
  if (normalized.includes("admin")) return "admin";
  return undefined;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;
    const message =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : "The EcoGlobe backend did not accept this request.";
    throw new BackendApiError(message, response.status);
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  return body as T;
}

function rolesFromBackend(user: BackendUser, fallbackRoles: UserRole[]) {
  const roles = new Set<UserRole>();
  const activeRole = normalizeRole(
    user.activeRoleCode,
    fallbackRoles[0] ?? "buyer",
  );
  roles.add(activeRole);

  if (user.accountStatusCode === "subscribed_buyer") roles.add("buyer");
  if (user.accountStatusCode === "subscribed_seller") roles.add("seller");

  for (const company of user.companies ?? []) {
    if (company.companyTypeCode === "buyer") roles.add("buyer");
    if (company.companyTypeCode === "seller") roles.add("seller");
    if (company.companyTypeCode === "both") {
      roles.add("buyer");
      roles.add("seller");
    }
    if (company.memberRoleCode === "admin") roles.add("admin");
  }

  for (const role of fallbackRoles) roles.add(role);
  return Array.from(roles);
}

export function buildDemoUserFromBackend(
  response: LoginResponse,
  fallbackRole: UserRole,
  fallbackRoles: UserRole[] = [fallbackRole],
): DemoUser {
  const role = normalizeRole(response.user.activeRoleCode, fallbackRole);
  return buildDemoUser(role, {
    id: response.user.id,
    token: response.token,
    sessionExpiresAt: response.expiresAt,
    activeCompanyId: response.user.activeCompanyId,
    accountStatusCode: response.user.accountStatusCode,
    companies: response.user.companies,
    roles: rolesFromBackend(response.user, fallbackRoles),
    name: response.user.name,
    email: response.user.email,
  });
}

function mergeDemoUserFromSession(
  backendUser: BackendUser,
  token: string,
  fallbackRole: UserRole,
  fallbackRoles: UserRole[] = [fallbackRole],
) {
  const existingUser = readDemoUser();
  const role = normalizeRole(backendUser.activeRoleCode, fallbackRole);
  const nextUser = buildDemoUser(role, {
    ...existingUser,
    id: backendUser.id,
    token,
    activeCompanyId: backendUser.activeCompanyId,
    accountStatusCode: backendUser.accountStatusCode,
    companies: backendUser.companies,
    roles: rolesFromBackend(backendUser, fallbackRoles),
    name: backendUser.name,
    email: backendUser.email,
  });
  writeDemoUser(nextUser);
  return nextUser;
}

export async function loginBackendUser({
  email,
  password,
  role,
}: {
  email: string;
  password: string;
  role?: UserRole;
}) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export async function registerBackendUser({
  name,
  email,
  password,
  accountStatusCode,
}: {
  name: string;
  email: string;
  password: string;
  accountStatusCode: string;
}) {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, accountStatusCode }),
  });
}

export async function logoutBackendUser(token: string | undefined) {
  clearDemoUser();

  if (!token) {
    return;
  }

  try {
    await apiFetch<{ ok: true }>("/auth/logout", {
      method: "POST",
      token,
    });
  } catch (error) {
    console.warn("EcoGlobe backend logout failed after local logout.", error);
  } finally {
    clearDemoUser();
  }
}

export async function refreshBackendSession(token: string) {
  const existingUser = readDemoUser();
  const response = await apiFetch<SessionResponse>("/auth/session", {
    method: "GET",
    token,
  });
  const authorizedRoles = rolesFromBackend(response.user, []);
  const pendingRoles =
    response.user.companies.length === 0 ? (existingUser?.roles ?? []) : [];
  const roles = Array.from(new Set([...authorizedRoles, ...pendingRoles]));
  const activeRole = normalizeRole(
    response.user.activeRoleCode,
    authorizedRoles[0] ?? "buyer",
  );
  const selectedRole =
    existingUser && roles.includes(existingUser.role)
      ? existingUser.role
      : activeRole;
  const user = buildDemoUser(selectedRole, {
    ...existingUser,
    id: response.user.id,
    token,
    activeCompanyId: response.user.activeCompanyId,
    accountStatusCode: response.user.accountStatusCode,
    companies: response.user.companies,
    roles,
    name: response.user.name,
    email: response.user.email,
  });

  writeDemoUser(user);
  return { user, authorizedRoles };
}

export async function writeBackendLoginSession({
  email,
  password,
  role,
  fallbackRoles,
}: {
  email: string;
  password: string;
  role?: UserRole;
  fallbackRoles?: UserRole[];
}) {
  const response = await loginBackendUser({ email, password, role });
  const demoUser = buildDemoUserFromBackend(
    response,
    role ?? inferRequestedRole(email) ?? "buyer",
    fallbackRoles,
  );
  writeDemoUser(demoUser);
  return demoUser;
}

export async function completeBackendOnboarding({
  token,
  role,
  activeRole,
  fallbackRoles,
  companyName,
  industry,
  jobTitle,
  website,
  address,
}: {
  token: string;
  role: "buyer" | "seller" | "both";
  activeRole: UserRole;
  fallbackRoles?: UserRole[];
  companyName: string;
  industry?: string;
  jobTitle?: string;
  website?: string;
  address?: string;
}) {
  const response = await apiFetch<{
    ok: true;
    user: BackendUser;
    onboarding: {
      company: { id: number; legalName: string };
      location?: { id: number; companyId: number; name: string };
      profiles: { buyerProfileId?: number; sellerProfileId?: number };
      activeRoleCode: UserRole;
    };
  }>("/api/onboarding", {
    method: "POST",
    token,
    body: JSON.stringify({
      role,
      activeRole,
      companyName,
      industry,
      jobTitle,
      website,
      address,
    }),
  });

  return mergeDemoUserFromSession(
    response.user,
    token,
    activeRole,
    fallbackRoles ?? (role === "both" ? ["buyer", "seller"] : [activeRole]),
  );
}

export async function startBackendStripeOnboarding({
  token,
  role,
  returnUrl,
  refreshUrl,
}: {
  token: string;
  role: "buyer" | "seller";
  returnUrl?: string;
  refreshUrl?: string;
}) {
  return apiFetch<{
    ok: true;
    provider: "stripe";
    mode: "demo" | "stripe";
    role: "buyer" | "seller";
    companyId: number;
    redirectUrl: string;
    providerReference: string;
    statusCode: string;
    message: string;
  }>("/api/stripe/onboarding", {
    method: "POST",
    token,
    body: JSON.stringify({
      role,
      returnUrl,
      refreshUrl,
    }),
  });
}
