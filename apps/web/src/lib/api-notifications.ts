"use client";

import { apiFetch } from "./backend-client";

/** Persisted in-app notification row from `GET /api/notifications`. */
export interface ApiNotification {
  id: number;
  userId: number | null;
  companyId: number | null;
  relatedRecordTypeCode: string | null;
  relatedRecordId: number | null;
  notificationChannelCode: string;
  notificationCategoryCode: string;
  notificationStatusCode: string;
  subject: string;
  body: string | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchNotifications(options: { userId?: number; categoryCode?: string } = {}) {
  const params = new URLSearchParams();
  if (options.userId) params.set("userId", String(options.userId));
  if (options.categoryCode) params.set("categoryCode", options.categoryCode);
  const query = params.toString();
  const response = await apiFetch<{ ok: true; notifications: ApiNotification[] }>(
    `/api/notifications${query ? `?${query}` : ""}`,
    { method: "GET", cache: "no-store" },
  );
  return response.notifications ?? [];
}

export async function markNotificationRead(id: number) {
  const response = await apiFetch<{ ok: true; notification: ApiNotification }>(`/api/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ notificationStatusCode: "read" }),
  });
  return response.notification;
}

/** Internal lab referral notifications are persisted with this subject by the backend. */
export const LAB_REFERRAL_SUBJECT = "Lab testing referral received";

export function isLabReferralNotification(notification: ApiNotification) {
  return notification.subject === LAB_REFERRAL_SUBJECT || /lab testing referral/i.test(notification.subject);
}
