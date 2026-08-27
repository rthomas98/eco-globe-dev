"use client";

import { useEffect, useState } from "react";
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
import { readDemoUser } from "@/lib/demo-user";
import type {
  NotificationCategory,
  NotificationGroup,
  PortalNotification,
} from "./notifications-demo-data";

const CATEGORY_BY_CODE: Record<string, NotificationCategory> = {
  orders: "Orders",
  payments: "Payments",
  logistics: "Compliance",
  compliance: "Compliance",
  sustainability: "Sustainability",
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

/**
 * Live in-app notifications for the signed-in user's active company, mapped
 * into the portal notification shape. Returns [] until loaded or when the
 * session has no active company.
 */
export function useLiveNotifications(): PortalNotification[] {
  const [items, setItems] = useState<PortalNotification[]>([]);

  useEffect(() => {
    const user = readDemoUser();
    if (!user?.activeCompanyId) return;
    let cancelled = false;
    fetchNotifications(user.activeCompanyId)
      .then((notifications) => {
        if (!cancelled) setItems(notifications.map(mapApiNotification));
      })
      .catch(() => {
        // Demo rows remain when the backend is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}

/** Marks a live notification read on the backend (no-op for demo rows). */
export function markLiveNotificationRead(id: string) {
  if (!id.startsWith("api-")) return;
  const numericId = Number(id.slice(4));
  if (!Number.isInteger(numericId)) return;
  void markNotificationRead(numericId).catch(() => {
    // Read-state persistence is best-effort.
  });
}
