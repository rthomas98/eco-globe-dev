export const ADMIN_AUTH_EVENT = "ecoglobe.admin-auth.changed";

const PERSISTENT_SESSION_KEY = "ecoglobe.admin.session";
const TAB_SESSION_KEY = "ecoglobe.admin.tab-session";
// Keys written by an earlier offline-credential build; removed on use.
const LEGACY_KEYS = ["ecoglobe.admin.password-hash", "ecoglobe.admin.recovery"];

export interface AdminSession {
  email: string;
  name: string;
  role: "Platform administrator";
  expiresAt: number;
  remembered: boolean;
}

function inBrowser() {
  return typeof window !== "undefined";
}

function parseSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Partial<AdminSession>;
    if (
      typeof session.expiresAt !== "number" ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now() ||
      typeof session.email !== "string" ||
      !session.email.includes("@") ||
      typeof session.name !== "string" ||
      session.role !== "Platform administrator" ||
      typeof session.remembered !== "boolean"
    )
      return null;
    // This is a UI mirror only. Every data request still requires the
    // backend-validated, HttpOnly bearer session and administrator role.
    return session as AdminSession;
  } catch {
    return null;
  }
}

function announceAuthChange() {
  if (!inBrowser()) return;
  window.dispatchEvent(new CustomEvent(ADMIN_AUTH_EVENT));
}

export function readAdminSession(): AdminSession | null {
  if (!inBrowser()) return null;
  const tabSession = parseSession(sessionStorage.getItem(TAB_SESSION_KEY));
  if (tabSession) return tabSession;

  const persistentSession = parseSession(
    localStorage.getItem(PERSISTENT_SESSION_KEY),
  );
  if (persistentSession) return persistentSession;

  sessionStorage.removeItem(TAB_SESSION_KEY);
  localStorage.removeItem(PERSISTENT_SESSION_KEY);
  return null;
}

export function clearAdminSession() {
  if (!inBrowser()) return;
  sessionStorage.removeItem(TAB_SESSION_KEY);
  localStorage.removeItem(PERSISTENT_SESSION_KEY);
  announceAuthChange();
}

/** Persist the admin session locally and announce the change. */
function storeAdminSession(
  name: string,
  email: string,
  remember: boolean,
): AdminSession {
  const session: AdminSession = {
    email,
    name,
    role: "Platform administrator",
    expiresAt:
      Date.now() + (remember ? 7 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000),
    remembered: remember,
  };
  clearAdminSession();
  const storage = remember ? localStorage : sessionStorage;
  const key = remember ? PERSISTENT_SESSION_KEY : TAB_SESSION_KEY;
  storage.setItem(key, JSON.stringify(session));
  announceAuthChange();
  return session;
}

export type AdminLoginResult =
  | { ok: true; session: AdminSession }
  | { ok: false; reason: "invalid" | "not-admin" | "unavailable"; message: string };

function removeLegacyKeys() {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Storage unavailable.
    }
  }
}

/**
 * Backend admin login through the same-origin proxy: the proxy stores the
 * bearer token as an httpOnly session cookie. There is no offline or
 * hardcoded credential path; if the backend cannot be reached, sign-in fails.
 */
export async function authenticateAdmin({
  email,
  password,
  remember,
}: {
  email: string;
  password: string;
  remember: boolean;
}): Promise<AdminLoginResult> {
  if (!inBrowser())
    return { ok: false, reason: "unavailable", message: "Sign-in is only available in the browser." };
  removeLegacyKeys();

  let response: Response;
  try {
    response = await fetch("/api/backend/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, role: "admin" }),
    });
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      message: "The EcoGlobe sign-in service could not be reached. Please try again shortly.",
    };
  }

  if (response.status >= 500)
    return {
      ok: false,
      reason: "unavailable",
      message: "The EcoGlobe sign-in service is unavailable right now. Please try again shortly.",
    };
  if (!response.ok)
    return { ok: false, reason: "invalid", message: "The email or password is incorrect." };

  const payload = (await response.json().catch(() => ({}))) as {
    user?: {
      id: number;
      name: string;
      email: string;
      activeCompanyId?: number;
      activeRoleCode?: string;
    };
  };
  const user = payload.user;
  if (!user || user.activeRoleCode !== "admin")
    return {
      ok: false,
      reason: "not-admin",
      message: "This account does not have EcoGlobe administrator access.",
    };
  // The aliased portal components read this session mirror; the bearer
  // token itself lives only in the httpOnly cookie the proxy set.
  try {
    localStorage.setItem(
      "ecoglobe.demoUser",
      JSON.stringify({
        id: user.id,
        role: "admin",
        roles: ["admin"],
        name: user.name,
        email: user.email,
        activeCompanyId: user.activeCompanyId,
      }),
    );
  } catch {
    // Best-effort mirror; the cookie session still authenticates requests.
  }
  return { ok: true, session: storeAdminSession(user.name, user.email, remember) };
}

async function postAuth(path: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/backend${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!response.ok)
    throw new Error(payload.error ?? "The request could not be completed. Please try again.");
  return payload;
}

/**
 * Asks the backend to email a password-reset link. The response is the same
 * whether or not the account exists.
 */
export async function requestAdminPasswordReset(email: string) {
  return postAuth("/auth/request-password-reset", { email: email.trim().toLowerCase() });
}

/** Completes a reset with the single-use token from the emailed link. */
export async function resetAdminPassword({ token, password }: { token: string; password: string }) {
  await postAuth("/auth/reset-password", { token, password });
  clearAdminSession();
}
