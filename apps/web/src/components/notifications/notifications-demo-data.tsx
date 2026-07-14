import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Leaf,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";

export type NotificationGroup = "Earlier" | "Last 7 days" | "Last 30 days";
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

const orderLink = (id: string) => (
  <span className="font-medium text-neutral-900 underline underline-offset-2">
    {id}
  </span>
);

export const buyerNotifications: PortalNotification[] = [
  {
    id: "buyer-order-confirmed",
    group: "Earlier",
    icon: ShoppingCart,
    message: (
      <>
        Order {orderLink("#EG-50021")} was accepted by EcoPack Co. Delivery
        coordination is ready.
      </>
    ),
    detail:
      "The seller confirmed availability and accepted the order. Review delivery timing, confirm the destination facility, and watch for the next logistics milestone.",
    actionLabel: "View order",
    actionHref: { buyer: "/buyer/orders/EG-50021", seller: "/seller/sales/EG-50021" },
    source: "System",
    time: "2 minutes ago",
    unread: true,
    category: "Orders",
    priority: "High",
    channels: ["email", "sms", "inApp"],
    deliveryState: "Sent by in-app alert, email, and SMS because this order needs buyer action.",
  },
  {
    id: "buyer-escrow-funded",
    group: "Earlier",
    icon: DollarSign,
    message: (
      <>
        Escrow for Order {orderLink("#EG-50021")} is funded and protected until
        delivery confirmation.
      </>
    ),
    detail:
      "Funds are being held while the seller fulfills the order. EcoGlobe will release escrow only after delivery confirmation and the inspection window pass without a dispute.",
    actionLabel: "View escrow",
    actionHref: { buyer: "/buyer/accounting/escrow", seller: "/seller/accounting/escrow" },
    source: "Finance",
    time: "8 minutes ago",
    unread: true,
    category: "Payments",
    priority: "High",
    channels: ["email", "inApp"],
    deliveryState: "Email and in-app alert sent. SMS is off for routine payment receipts.",
  },
  {
    id: "buyer-sustainability-milestone",
    group: "Last 7 days",
    icon: Leaf,
    message: (
      <>
        Sustainability milestone reached: Order {orderLink("#EG-50012")} saved
        18.4 tCO₂e versus the baseline feedstock.
      </>
    ),
    detail:
      "The carbon calculator has posted a verified savings milestone for this completed order. The result is available for sustainability reporting and procurement summaries.",
    actionLabel: "Open sustainability report",
    actionHref: { buyer: "/buyer/orders/EG-50012", seller: "/seller/reports/carbon" },
    source: "System",
    time: "May 15, 2026 01:20 PM",
    unread: false,
    category: "Sustainability",
    priority: "Medium",
    channels: ["email", "inApp"],
    deliveryState: "Digest email and in-app alert delivered.",
  },
  {
    id: "buyer-compliance-deadline",
    group: "Last 7 days",
    icon: CalendarClock,
    message: <>Delivery acceptance for Order {orderLink("#EG-50009")} closes in 18 hours.</>,
    detail:
      "The inspection window is still open. Confirm delivery if the load matches expectations, or report an issue before escrow is automatically released.",
    actionLabel: "Review escrow",
    actionHref: { buyer: "/buyer/accounting/escrow", seller: "/seller/accounting/escrow" },
    source: "Compliance",
    time: "May 22, 2026 05:30 PM",
    unread: false,
    category: "Compliance",
    priority: "High",
    channels: ["sms", "inApp"],
    deliveryState: "SMS and in-app deadline warning sent because escrow auto-release is approaching.",
  },
];

export const sellerNotifications: PortalNotification[] = [
  {
    id: "seller-new-order",
    group: "Earlier",
    icon: ShoppingCart,
    message: (
      <>
        Order {orderLink("#EG-50021")} has been placed by AgriCorp Solutions.
        Confirm availability to keep the buyer timeline active.
      </>
    ),
    detail:
      "A new order is waiting for seller confirmation. Review requested volume, destination, and delivery requirements before accepting.",
    actionLabel: "View order",
    actionHref: { buyer: "/buyer/orders/EG-50021", seller: "/seller/sales/EG-50021" },
    source: "System",
    time: "4 minutes ago",
    unread: true,
    category: "Orders",
    priority: "High",
    channels: ["email", "sms", "inApp"],
    deliveryState: "Real-time in-app alert, email, and SMS sent to the seller operations contact.",
  },
  {
    id: "seller-escrow-secured",
    group: "Earlier",
    icon: DollarSign,
    message: (
      <>
        Payment for Order {orderLink("#EG-50021")} is secured in escrow. You can
        begin fulfillment.
      </>
    ),
    detail:
      "The buyer funded escrow. Upload shipping proof and delivery documents so the release trigger can proceed after buyer confirmation.",
    actionLabel: "View escrow",
    actionHref: { buyer: "/buyer/accounting/escrow", seller: "/seller/accounting/escrow" },
    source: "Finance",
    time: "12 minutes ago",
    unread: true,
    category: "Payments",
    priority: "High",
    channels: ["email", "inApp"],
    deliveryState: "Finance notification sent by email and in-app alert.",
  },
  {
    id: "seller-shipment-deadline",
    group: "Last 7 days",
    icon: Truck,
    message: <>Shipment proof for Order {orderLink("#EG-50021")} is due today.</>,
    detail:
      "Upload bill of lading, pickup confirmation, or tracking details before the compliance window closes. Missing proof can delay escrow release.",
    actionLabel: "Upload proof",
    actionHref: { buyer: "/buyer/orders/EG-50021", seller: "/seller/sales/EG-50021" },
    source: "Compliance",
    time: "May 18, 2026 09:00 AM",
    unread: false,
    category: "Compliance",
    priority: "High",
    channels: ["sms", "inApp"],
    deliveryState: "Deadline reminder delivered by SMS and in-app alert.",
  },
  {
    id: "seller-carbon-report",
    group: "Last 7 days",
    icon: Leaf,
    message: <>Monthly sustainability report is ready for your top three listings.</>,
    detail:
      "EcoGlobe generated a sustainability milestone summary showing buyer demand, estimated carbon savings, and verified-feedstock coverage for your active listings.",
    actionLabel: "View carbon report",
    actionHref: { buyer: "/buyer/orders", seller: "/seller/reports/carbon" },
    source: "System",
    time: "May 14, 2026 08:45 AM",
    unread: false,
    category: "Sustainability",
    priority: "Medium",
    channels: ["email", "inApp"],
    deliveryState: "Sent as an email digest and in-app report alert.",
  },
  {
    id: "seller-cert-expiring",
    group: "Last 30 days",
    icon: ShieldCheck,
    message: <>GRS certification expires in 14 days. Renew it to maintain verified status.</>,
    detail:
      "Certification renewal is required to keep related listings verified. Upload the renewed document before the deadline to avoid marketplace visibility restrictions.",
    actionLabel: "Manage company documents",
    actionHref: { buyer: "/buyer/company", seller: "/seller/company" },
    source: "Compliance",
    time: "May 3, 2026 10:10 AM",
    unread: false,
    category: "Compliance",
    priority: "Medium",
    channels: ["email", "sms", "inApp"],
    deliveryState: "Sent across all channels because verification status can affect active listings.",
  },
];

export const adminRealtimeNotifications: PortalNotification[] = [
  {
    id: "admin-dispute-sla",
    summary: "Dispute DSP-2038 is 6 hours from SLA breach.",
    group: "Earlier",
    icon: AlertTriangle,
    message: <>Dispute DSP-2038 is 6 hours from SLA breach.</>,
    detail:
      "Escrow auto-release is paused and the admin team needs to decide whether to request more evidence, issue a partial release, or refund the buyer.",
    actionLabel: "Open disputes",
    actionHref: { buyer: "/buyer/orders", seller: "/seller/disputes" },
    source: "Compliance",
    time: "5 minutes ago",
    unread: true,
    category: "Compliance",
    priority: "High",
    channels: ["email", "sms", "inApp"],
    deliveryState: "Escalated to admin SMS, email, and in-app alert.",
  },
  {
    id: "admin-escrow-release",
    summary: "Escrow ESC-50009 is ready for automatic release review.",
    group: "Earlier",
    icon: DollarSign,
    message: <>Escrow ESC-50009 is ready for automatic release review.</>,
    detail:
      "The buyer confirmed delivery and the inspection window is closing. Admin can allow the scheduled release or hold it if a late dispute appears.",
    actionLabel: "Review escrow",
    actionHref: { buyer: "/buyer/accounting/escrow", seller: "/seller/accounting/escrow" },
    source: "Finance",
    time: "18 minutes ago",
    unread: true,
    category: "Payments",
    priority: "High",
    channels: ["email", "inApp"],
    deliveryState: "Finance email and in-app alert delivered.",
  },
  {
    id: "admin-compliance-deadline",
    summary: "Eight supplier certifications expire within 30 days.",
    group: "Last 7 days",
    icon: CalendarClock,
    message: <>Eight supplier certifications expire within 30 days.</>,
    detail:
      "Compliance should notify account owners and confirm renewal documents. Expiring certifications can impact listing visibility and verified-feedstock claims.",
    actionLabel: "Open KYC queue",
    actionHref: { buyer: "/buyer/company", seller: "/seller/company" },
    source: "Compliance",
    time: "May 18, 2026 07:30 AM",
    unread: false,
    category: "Compliance",
    priority: "Medium",
    channels: ["email", "inApp"],
    deliveryState: "Daily compliance digest and in-app notification delivered.",
  },
  {
    id: "admin-sustainability-milestone",
    summary: "Platform crossed 1,200 tCO2e in tracked feedstock savings this month.",
    group: "Last 30 days",
    icon: BadgeCheck,
    message: <>Platform crossed 1,200 tCO₂e in tracked feedstock savings this month.</>,
    detail:
      "Sustainability reporting has a new milestone. Admin can use it in buyer reports, seller scorecards, and marketplace performance reporting.",
    actionLabel: "View reports",
    actionHref: { buyer: "/buyer/orders", seller: "/seller/reports/carbon" },
    source: "System",
    time: "May 1, 2026 09:00 AM",
    unread: false,
    category: "Sustainability",
    priority: "Low",
    channels: ["email", "inApp"],
    deliveryState: "Monthly admin digest and in-app report alert delivered.",
  },
  {
    id: "admin-order-milestone",
    summary: "Order EG-50012 completed and seller payout was reconciled.",
    group: "Last 30 days",
    icon: CheckCircle2,
    message: <>Order EG-50012 completed and seller payout was reconciled.</>,
    detail:
      "The order lifecycle is complete. Escrow was released, payout reconciled, and sustainability metrics were posted to the buyer report.",
    actionLabel: "View order",
    actionHref: { buyer: "/buyer/orders/EG-50012", seller: "/seller/sales/EG-50012" },
    source: "System",
    time: "May 15, 2026 01:05 PM",
    unread: false,
    category: "Orders",
    priority: "Low",
    channels: ["inApp"],
    deliveryState: "In-app audit notification only.",
  },
];

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
