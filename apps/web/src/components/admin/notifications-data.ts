import {
  adminRealtimeNotifications,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPriority,
} from "@/components/notifications/notifications-demo-data";

export interface AdminNotification {
  id: string;
  msg: string;
  source: "System" | "Admin" | "Compliance" | "Finance";
  time: string;
  unread: boolean;
  category: "Approvals" | "Compliance" | "Transactions" | "Disputes" | "System" | "Orders" | "Payments" | "Sustainability";
  href?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  detail: string;
}

export interface AdminNotificationGroup {
  group: string;
  items: AdminNotification[];
}

const hrefByCategory: Record<NotificationCategory, string> = {
  Orders: "/admin/sales",
  Payments: "/admin/accounting/escrow",
  Sustainability: "/admin/reports/carbon",
  Compliance: "/admin/kyc",
  System: "/admin/settings/notifications",
};

export const adminNotificationGroups: AdminNotificationGroup[] = [
  "Earlier",
  "Last 7 days",
  "Last 30 days",
].map((group) => ({
  group,
  items: adminRealtimeNotifications
    .filter((item) => item.group === group)
    .map((item) => ({
      id: item.id,
      msg: item.summary ?? item.detail,
      source: item.source,
      time: item.time,
      unread: item.unread,
      category: item.category,
      href: hrefByCategory[item.category],
      channels: item.channels,
      priority: item.priority,
      detail: item.detail,
    })),
}));
