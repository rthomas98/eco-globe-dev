"use client";

import {
  buildDemoUser,
  COOKIE_SESSION_TOKEN,
  clearDemoUser,
  readDemoUser,
  writeDemoUser,
  type BackendCompanyMembership,
  type DemoUser,
  type UserRole,
} from "./demo-user";

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
  token?: string;
  expiresAt: string;
  user: BackendUser;
};

type RegisterResponse = {
  ok: true;
  verificationRequired?: boolean;
  intent?: RegistrationIntent;
  company?: { id: number; legalName: string };
  companyMembership?: "owner_created" | "join_requested" | "already_member";
  user: {
    id: number;
    name: string;
    email: string;
    accountStatusCode: string;
  };
};

export type RegistrationIntent = "buy" | "sell" | "both" | "explore";

export type OnboardingState = {
  ok: true;
  company?: {
    id: number;
    legalName: string;
    companyTypeCode: string;
    verificationStatusCode: string;
    memberRoleCode: string;
    memberStatusCode: string;
  };
  location?: {
    id: number;
    name: string;
    addressLine1: string;
    city: string;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string;
  };
  buyerProfile?: {
    id: number;
    onboardingStatusCode: string;
    subscriptionStatusCode: string;
    billingStatusCode: string;
    approvalStatusCode: string;
  };
  sellerProfile?: {
    id: number;
    onboardingStatusCode: string;
    subscriptionStatusCode: string;
    payoutStatusCode: string;
    approvalStatusCode: string;
    licenceTierCode?: string | null;
  };
  checklist: {
    companyCreated: boolean;
    addressProvided: boolean;
    buyerOnboardingComplete: boolean;
    sellerOnboardingComplete: boolean;
    companyVerified: boolean;
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

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`/api/backend${path}`, {
    ...requestOptions,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(token && token !== COOKIE_SESSION_TOKEN
        ? { authorization: `Bearer ${token}` }
        : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    const record =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : undefined;
    const message =
      typeof record?.error === "string"
        ? record.error
        : typeof record?.message === "string"
          ? record.message
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
    token: COOKIE_SESSION_TOKEN,
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
  token: string | undefined,
  fallbackRole: UserRole,
  fallbackRoles: UserRole[] = [fallbackRole],
) {
  const existingUser = readDemoUser();
  const role = normalizeRole(backendUser.activeRoleCode, fallbackRole);
  const nextUser = buildDemoUser(role, {
    ...existingUser,
    id: backendUser.id,
    token: token ?? COOKIE_SESSION_TOKEN,
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
  companyName,
  country,
  intent,
  termsAccepted,
}: {
  name: string;
  email: string;
  password: string;
  accountStatusCode?: string;
  companyName?: string;
  country?: string;
  intent?: RegistrationIntent;
  termsAccepted?: boolean;
}) {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      accountStatusCode,
      companyName,
      country,
      intent,
      termsAccepted,
    }),
  });
}

export async function fetchOnboardingState(token?: string) {
  return apiFetch<OnboardingState>("/api/onboarding", {
    method: "GET",
    token: token ?? COOKIE_SESSION_TOKEN,
  });
}

export async function verifyBackendEmail(token: string) {
  return apiFetch<{ ok: true; user: { id: number; email: string } }>(
    "/auth/verify-email",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );
}

export async function resendBackendVerification(email: string) {
  return apiFetch<{ ok: true; message: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestBackendPasswordReset(email: string) {
  return apiFetch<{ ok: true; message: string }>(
    "/auth/request-password-reset",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function resetBackendPassword(token: string, password: string) {
  return apiFetch<{ ok: true }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
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

export async function refreshBackendSession(token?: string) {
  const existingUser = readDemoUser();
  const response = await apiFetch<SessionResponse>("/auth/session", {
    method: "GET",
    token: token ?? COOKIE_SESSION_TOKEN,
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
    token: token ?? COOKIE_SESSION_TOKEN,
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
    role ?? normalizeRole(response.user.activeRoleCode, "buyer"),
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
  licenceTier,
}: {
  token?: string;
  role: "buyer" | "seller" | "both";
  activeRole: UserRole;
  fallbackRoles?: UserRole[];
  companyName: string;
  industry?: string;
  jobTitle?: string;
  website?: string;
  address?: string;
  licenceTier?: string;
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
    token: token ?? COOKIE_SESSION_TOKEN,
    body: JSON.stringify({
      role,
      activeRole,
      companyName,
      industry,
      jobTitle,
      website,
      address,
      licenceTier,
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
  token?: string;
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
    token: token ?? COOKIE_SESSION_TOKEN,
    body: JSON.stringify({
      role,
      returnUrl,
      refreshUrl,
    }),
  });
}
