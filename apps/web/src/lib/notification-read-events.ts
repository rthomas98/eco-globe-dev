/**
 * Broadcast of notification read state that the backend has already saved,
 * so every mounted notification view (sidebar badge, panel, full page)
 * updates immediately. Pure and dependency-free for unit tests.
 */

export const NOTIFICATIONS_READ_EVENT = "ecoglobe.notifications.read";

export interface NotificationsReadDetail {
  ids: string[];
}

/** Announces ids the backend confirmed as read. */
export function broadcastNotificationsRead(ids: string[], target: EventTarget | undefined = globalThis) {
  if (!target || ids.length === 0) return;
  target.dispatchEvent(new CustomEvent<NotificationsReadDetail>(NOTIFICATIONS_READ_EVENT, { detail: { ids } }));
}

/** Subscribes to confirmed reads; returns the cleanup function. */
export function subscribeNotificationsRead(
  handler: (ids: string[]) => void,
  target: EventTarget | undefined = globalThis,
) {
  if (!target) return () => {};
  const listener = (event: Event) => {
    const ids = (event as CustomEvent<NotificationsReadDetail>).detail?.ids;
    if (Array.isArray(ids)) handler(ids.filter((id): id is string => typeof id === "string"));
  };
  target.addEventListener(NOTIFICATIONS_READ_EVENT, listener);
  return () => target.removeEventListener(NOTIFICATIONS_READ_EVENT, listener);
}

/** Marks the given ids read; returns the same array when nothing changed. */
export function applyReadIds<T extends { id: string; unread: boolean }>(items: T[], ids: string[]): T[] {
  const read = new Set(ids);
  let changed = false;
  const next = items.map((item) => {
    if (item.unread && read.has(item.id)) {
      changed = true;
      return { ...item, unread: false };
    }
    return item;
  });
  return changed ? next : items;
}

/** Scope key for a user's notifications within their active company. */
export function notificationScopeKey(userId: number | undefined, companyId: number | undefined) {
  return userId ? `${userId}:${companyId ?? "none"}` : null;
}
