import type {
  NotificationCategory,
  NotificationChannel,
  NotificationGroup,
} from "@/components/notifications/notification-model";

/** A live notification as shown on the admin notifications page. */
export interface AdminNotification {
  id: string;
  group: NotificationGroup;
  msg: string;
  source: "System" | "Admin" | "Compliance" | "Finance";
  time: string;
  unread: boolean;
  category: NotificationCategory;
  href?: string;
  channels: NotificationChannel[];
  detail: string;
}
