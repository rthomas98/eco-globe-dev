"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign,
  Leaf,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  relativeTime,
  type ApiNotification,
} from "@/lib/api-portal";
import { useDemoUser } from "@/lib/demo-user";
import {
  applyReadIds,
  broadcastNotificationsRead,
  notificationScopeKey,
  subscribeNotificationsRead,
} from "@/lib/notification-read-events";
import { describeBackendError } from "@/lib/backend-client";
import type {
  NotificationCategory,
  NotificationGroup,
  PortalNotification,
} from "./notification-model";

const CATEGORY_BY_CODE: Record<string, NotificationCategory> = {
  orders: "Orders",
  payments: "Payments",
  logistics: "Compliance",
  compliance: "Compliance",
  sustainability: "Sustainability",
  marketplace: "System",
};

const ICON_BY_CODE = {
  orders: ShoppingCart,
  payments: DollarSign,
  logistics: Truck,
  compliance: ShieldCheck,
  sustainability: Leaf,
} as const;

function groupFor(createdAt: string): NotificationGroup {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (ageDays <= 7) return "Last 7 days";
  if (ageDays <= 30) return "Last 30 days";
  return "Earlier";
}

const ACTION_BY_RECORD: Record<string, { label: string; buyer: string; seller: string }> = {
  order: { label: "View order", buyer: "/buyer/orders", seller: "/seller/sales" },
  quote: { label: "View quote", buyer: "/buyer/orders", seller: "/seller/sales" },
  escrow: {
    label: "View escrow",
    buyer: "/buyer/accounting/escrow",
    seller: "/seller/accounting/escrow",
  },
};

export function mapApiNotification(api: ApiNotification): PortalNotification {
  const action =
    ACTION_BY_RECORD[api.relatedRecordTypeCode ?? ""] ?? {
      label: "View details",
      buyer: "/buyer/notifications",
      seller: "/seller/notifications",
    };
  return {
    id: `api-${api.id}`,
    group: groupFor(api.createdAt),
    icon:
      ICON_BY_CODE[api.notificationCategoryCode as keyof typeof ICON_BY_CODE] ??
      ShoppingCart,
    message: api.subject,
    detail: api.body,
    actionLabel: action.label,
    actionHref: { buyer: action.buyer, seller: action.seller },
    source: "System",
    time: relativeTime(api.sentAt ?? api.createdAt),
    unread: api.notificationStatusCode !== "read",
    category: CATEGORY_BY_CODE[api.notificationCategoryCode] ?? "System",
    priority: api.notificationCategoryCode === "payments" ? "High" : "Medium",
    channels: ["inApp"],
    deliveryState: api.notificationStatusCode,
  };
}

export interface LiveNotificationsState {
  status: "loading" | "ready" | "error" | "signed-out";
  items: PortalNotification[];
  error: string | null;
  reload: () => void;
}

/**
 * Live in-app notifications for the signed-in user and their active company.
 * Nothing is shown until the backend answers; failures surface as an error.
 * Results are tagged with the user/company they belong to: after logout or a
 * company switch the previous scope's items are never returned, even before
 * the reload finishes. Reads confirmed anywhere in the app are applied at once.
 */
export function useLiveNotifications(): LiveNotificationsState {
  const user = useDemoUser();
  const scope = notificationScopeKey(user?.id, user?.activeCompanyId);
  const [state, setState] = useState<Omit<LiveNotificationsState, "reload"> & { scope: string | null }>({
    status: "loading",
    items: [],
    error: null,
    scope: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!scope) {
      setState({ status: "signed-out", items: [], error: null, scope: null });
      return;
    }
    let cancelled = false;
    setState((prev) =>
      prev.scope === scope
        ? { ...prev, status: "loading", error: null }
        : { status: "loading", items: [], error: null, scope },
    );
    // No filters: RBAC returns this user's personal alerts (saved-search
    // matches) plus their company's transaction notifications.
    fetchNotifications()
      .then((notifications) => {
        if (!cancelled)
          setState({ status: "ready", items: notifications.map(mapApiNotification), error: null, scope });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            status: "error",
            items: [],
            error: describeBackendError(error, "Notifications could not be loaded."),
            scope,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [scope, version]);

  // Apply reads the backend confirmed in any other view (panel, page, badge).
  useEffect(
    () =>
      subscribeNotificationsRead((ids) =>
        setState((prev) => {
          const items = applyReadIds(prev.items, ids);
          return items === prev.items ? prev : { ...prev, items };
        }),
      ),
    [],
  );

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  if (!user && state.status !== "signed-out") return { status: "loading", items: [], error: null, reload };
  if (scope && state.scope !== scope) return { status: "loading", items: [], error: null, reload };
  const { scope: _scope, ...current } = state;
  return { ...current, reload };
}

/**
 * Persists read state on the backend. Resolves true only when the backend
 * saved it, and then broadcasts the id so every notification view updates.
 */
export async function markLiveNotificationRead(id: string): Promise<boolean> {
  if (!id.startsWith("api-")) return false;
  const numericId = Number(id.slice(4));
  if (!Number.isInteger(numericId)) return false;
  try {
    await markNotificationRead(numericId);
    broadcastNotificationsRead([id], typeof window === "undefined" ? undefined : window);
    return true;
  } catch {
    return false;
  }
}
