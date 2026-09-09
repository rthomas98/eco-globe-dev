"use client";

/**
 * Account, team, favorites, and notification-preference API helpers.
 * All requests go through the same-origin backend proxy so the session
 * cookie authenticates them.
 */

const BASE = "/api/backend/api";

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    ok?: boolean;
    error?: string;
  };
  if (!response.ok || body.ok === false) {
    throw new Error(body.error ?? `Request failed (${response.status}).`);
  }
  return body;
}

/* ── Profile ── */

export async function updateUserName(userId: number, name: string) {
  return requestJson<{ user: { id: number; name: string } }>(
    `/users/${userId}`,
    { method: "PATCH", body: JSON.stringify({ name }) },
  );
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  return requestJson<{ ok: boolean }>("/account/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/* ── Notification preferences ── */

export interface ApiNotificationPreference {
  id: number;
  userId: number | null;
  companyId: number | null;
  notificationChannelCode: string;
  notificationCategoryCode: string;
  enabled: boolean;
}

export async function fetchNotificationPreferences(): Promise<
  ApiNotificationPreference[]
> {
  const body = await requestJson<{ preferences: ApiNotificationPreference[] }>(
    "/notification-preferences",
  );
  return body.preferences ?? [];
}

async function upsertNotificationPreference(
  userId: number,
  categoryCode: string,
  channelCode: string,
  enabled: boolean,
) {
  const existing = (await fetchNotificationPreferences()).find(
    (p) =>
      p.userId === userId &&
      p.notificationCategoryCode === categoryCode &&
      p.notificationChannelCode === channelCode,
  );
  if (existing) {
    return requestJson(`/notification-preferences/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  }
  return requestJson("/notification-preferences", {
    method: "POST",
    body: JSON.stringify({
      userId,
      notificationCategoryCode: categoryCode,
      notificationChannelCode: channelCode,
      enabled,
    }),
  });
}

// Rapid toggles must not race the list-then-create upsert, or the same
// (category, channel) pair ends up with duplicate rows.
let preferenceQueue: Promise<unknown> = Promise.resolve();

/**
 * Upsert one user-level preference for a (category, channel) pair.
 * Calls are serialized so concurrent toggles cannot create duplicates.
 */
export function setNotificationPreference(
  userId: number,
  categoryCode: string,
  channelCode: string,
  enabled: boolean,
): Promise<unknown> {
  const next = preferenceQueue
    .catch(() => {})
    .then(() =>
      upsertNotificationPreference(userId, categoryCode, channelCode, enabled),
    );
  preferenceQueue = next;
  return next;
}

/* ── Team members ── */

export interface ApiTeamMember {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  companyId: number;
  memberRoleCode: string;
  permissionTierCode: string;
  memberStatusCode: string;
  transactionApprovalLimit: number | null;
  canApproveTransactions: boolean;
  canExecuteTransactions: boolean;
}

export async function fetchTeamMembers(
  companyId: number,
): Promise<ApiTeamMember[]> {
  const body = await requestJson<{ members: ApiTeamMember[] }>(
    `/companies/${companyId}/members`,
  );
  return body.members ?? [];
}

export async function inviteTeamMember(
  companyId: number,
  email: string,
  memberRoleCode: string,
) {
  return requestJson(`/companies/${companyId}/members`, {
    method: "POST",
    body: JSON.stringify({
      email,
      memberRoleCode,
      permissionTierCode: memberRoleCode === "viewer" ? "view_only" : "requester",
      memberStatusCode: "active",
    }),
  });
}

export async function updateTeamMember(
  memberId: number,
  patch: {
    memberStatusCode?: string;
    memberRoleCode?: string;
    permissionTierCode?: string;
  },
) {
  return requestJson(`/company-members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function removeTeamMember(memberId: number) {
  return requestJson(`/company-members/${memberId}`, { method: "DELETE" });
}

/* ── Favorites ── */

export interface ApiFavorite {
  id: number;
  listingId: number;
  createdAt: string;
  title: string;
  slug: string;
  pricePerUnit: number | null;
  quantity: number;
  quantityUnit: string;
  currencyCode: string;
  listingStatusCode: string;
  locationCity: string | null;
  locationStateProvince: string | null;
}

export async function fetchFavorites(): Promise<ApiFavorite[]> {
  const body = await requestJson<{ favorites: ApiFavorite[] }>("/favorites");
  return body.favorites ?? [];
}

export async function setFavorite(listingId: number, favorited: boolean) {
  return requestJson(`/listings/${listingId}/favorite`, {
    method: favorited ? "POST" : "DELETE",
  });
}
