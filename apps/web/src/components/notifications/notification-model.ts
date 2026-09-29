import type { LucideIcon } from "lucide-react";

export type NotificationGroup = "Last 7 days" | "Last 30 days" | "Earlier";

/** Most recent first. */
export const notificationGroupOrder: NotificationGroup[] = ["Last 7 days", "Last 30 days", "Earlier"];
export type NotificationChannel = "email" | "sms" | "inApp";
export type NotificationCategory =
  | "Orders"
  | "Payments"
  | "Sustainability"
  | "Compliance"
  | "System";
export type NotificationPriority = "High" | "Medium" | "Low";

export interface PortalNotification {
  id: string;
  summary?: string;
  group: NotificationGroup;
  icon: LucideIcon;
  message: React.ReactNode;
  detail: string;
  actionLabel: string;
  actionHref: {
    buyer: string;
    seller: string;
  };
  source: "System" | "Admin" | "Compliance" | "Finance";
  time: string;
  unread: boolean;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  deliveryState: string;
}

/** Preference topics shown on notification settings screens (configuration, not records). */
export interface NotificationPreferenceItem {
  id: string;
  label: string;
  description: string;
  defaultChannels: Record<NotificationChannel, boolean>;
}

export interface NotificationPreferenceCategory {
  id: NotificationCategory;
  title: string;
  description: string;
  items: NotificationPreferenceItem[];
}

export const notificationPreferenceCategories: NotificationPreferenceCategory[] = [
  {
    id: "Orders",
    title: "Orders",
    description: "Order placement, approval, delivery, and cancellation milestones.",
    items: [
      {
        id: "order-placed",
        label: "New order or quote requires action",
        description: "Real-time alert when a buyer or seller needs to respond.",
        defaultChannels: { email: true, sms: true, inApp: true },
      },
      {
        id: "delivery-milestone",
        label: "Delivery or pickup milestone changes",
        description: "Carrier, pickup, and delivery confirmation updates.",
        defaultChannels: { email: true, sms: false, inApp: true },
      },
    ],
  },
  {
    id: "Payments",
    title: "Payments",
    description: "Escrow funding, release, refund, and payout events.",
    items: [
      {
        id: "escrow-funded",
        label: "Escrow funded or release-ready",
        description: "Funds held, release window started, or payout scheduled.",
        defaultChannels: { email: true, sms: false, inApp: true },
      },
      {
        id: "payment-failure",
        label: "Payment, refund, or payout failure",
        description: "High-priority payment issue that needs immediate attention.",
        defaultChannels: { email: true, sms: true, inApp: true },
      },
    ],
  },
  {
    id: "Sustainability",
    title: "Sustainability",
    description: "Carbon savings, verified-feedstock, and reporting milestones.",
    items: [
      {
        id: "carbon-milestone",
        label: "Carbon savings milestone reached",
        description: "New verified emissions reduction or monthly report is ready.",
        defaultChannels: { email: true, sms: false, inApp: true },
      },
    ],
  },
  {
    id: "Compliance",
    title: "Compliance",
    description: "Deadlines, certification renewals, SDS, KYC, and dispute SLAs.",
    items: [
      {
        id: "deadline-warning",
        label: "Compliance deadline approaching",
        description: "Certification, delivery acceptance, or document deadline warning.",
        defaultChannels: { email: true, sms: true, inApp: true },
      },
      {
        id: "document-required",
        label: "Document or verification required",
        description: "Missing SDS, renewed certification, or account document request.",
        defaultChannels: { email: true, sms: false, inApp: true },
      },
    ],
  },
];
