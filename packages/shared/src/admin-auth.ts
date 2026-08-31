export const ADMIN_DEMO_EMAIL = "demo.admin@ecoglobe.com";
export const ADMIN_DEMO_PASSWORD = "EcoDemo2026!";
export const ADMIN_AUTH_EVENT = "ecoglobe.admin-auth.changed";

const PERSISTENT_SESSION_KEY = "ecoglobe.admin.session";
const TAB_SESSION_KEY = "ecoglobe.admin.tab-session";
const PASSWORD_HASH_KEY = "ecoglobe.admin.password-hash";
const RECOVERY_KEY = "ecoglobe.admin.recovery";

export interface AdminSession {
  email: string;
  name: string;
  role: "Platform administrator";
  expiresAt: number;
  remembered: boolean;
}

interface RecoveryRequest {
  email: string;
  code: string;
  expiresAt: number;
}

function inBrowser() {
  return typeof window !== "undefined";
}

async function hashValue(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AdminSession;
    if (session.expiresAt <= Date.now()) return null;
    if (session.email !== ADMIN_DEMO_EMAIL) return null;
    return session;
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

/**
 * Real backend admin login through the same-origin proxy: the proxy stores
 * the bearer token as an httpOnly session cookie, so every aliased portal
 * component authenticates against live data. The legacy hashed demo
 * credential remains only as an offline fallback when the backend is
 * unreachable.
 */
export async function authenticateAdmin({
  email,
  password,
  remember,
}: {
  email: string;
  password: string;
  remember: boolean;
}): Promise<AdminSession | null> {
  if (!inBrowser()) return null;

  const normalizedEmail = email.trim().toLowerCase();

  let response: Response | null = null;
  try {
    response = await fetch("/api/backend/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password, role: "admin" }),
    });
  } catch {
    response = null;
  }

  if (response) {
    if (!response.ok) return null;
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
    if (!user) return null;
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
    return storeAdminSession(user.name, user.email, remember);
  }

  // Offline fallback: the local demo credential only.
  const storedHash = localStorage.getItem(PASSWORD_HASH_KEY);
  const expectedHash = storedHash ?? (await hashValue(ADMIN_DEMO_PASSWORD));
  const suppliedHash = await hashValue(password);
  if (normalizedEmail !== ADMIN_DEMO_EMAIL || suppliedHash !== expectedHash) {
    return null;
  }
  return storeAdminSession("EcoGlobe Administrator", ADMIN_DEMO_EMAIL, remember);
}

export function createAdminRecoveryRequest(email: string) {
  if (!inBrowser()) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== ADMIN_DEMO_EMAIL) return null;

  const request: RecoveryRequest = {
    email: normalizedEmail,
    code: String(
      crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000,
    ).padStart(6, "0"),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(request));
  return request;
}

export function readAdminRecoveryRequest(): RecoveryRequest | null {
  if (!inBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const request = JSON.parse(raw) as RecoveryRequest;
    if (request.expiresAt <= Date.now()) {
      sessionStorage.removeItem(RECOVERY_KEY);
      return null;
    }
    return request;
  } catch {
    sessionStorage.removeItem(RECOVERY_KEY);
    return null;
  }
}

export function verifyAdminRecoveryCode(email: string, code: string) {
  const request = readAdminRecoveryRequest();
  return Boolean(
    request &&
    request.email === email.trim().toLowerCase() &&
    request.code === code.trim(),
  );
}

export async function resetAdminPassword({
  email,
  code,
  password,
}: {
  email: string;
  code: string;
  password: string;
}) {
  if (!inBrowser() || !verifyAdminRecoveryCode(email, code)) return false;
  localStorage.setItem(PASSWORD_HASH_KEY, await hashValue(password));
  sessionStorage.removeItem(RECOVERY_KEY);
  clearAdminSession();
  return true;
}
