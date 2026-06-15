import type { LucideIcon } from "lucide-react";
import { ShoppingCart, DollarSign, Info } from "lucide-react";

export type NotificationGroup = "Earlier" | "Last 7 days" | "Last 30 days";

export interface SellerNotification {
  id: string;
  group: NotificationGroup;
  icon: LucideIcon;
  message: React.ReactNode;
  detail: string;
  actionLabel: string;
  actionHref: {
    buyer: string;
    seller: string;
  };
  source: "System" | "Admin";
  time: string;
  unread: boolean;
}

const orderLink = (id: string) => (
  <span className="font-medium text-neutral-900 underline underline-offset-2">{id}</span>
);

export const sellerNotifications: SellerNotification[] = [
  {
    id: "n1",
    group: "Earlier",
    icon: ShoppingCart,
    message: (
      <>
        Order {orderLink("#EG-10492")} has been placed by BlueOcean Trading. Review order details to
        confirm availability.
      </>
    ),
    detail:
      "A new order was submitted and is waiting for the next workflow step. Review the order summary, requested quantity, pickup or delivery requirements, and any buyer notes before confirming availability.",
    actionLabel: "View order",
    actionHref: {
      buyer: "/buyer/orders",
      seller: "/seller/sales",
    },
    source: "System",
    time: "an hour ago",
    unread: true,
  },
  {
    id: "n2",
    group: "Earlier",
    icon: DollarSign,
    message: (
      <>
        Payment for Order {orderLink("#EG-10492")} is now secured in escrow. You can begin
        processing the order.
      </>
    ),
    detail:
      "Funds have been reserved in escrow for this transaction. Continue with order processing and keep shipment or pickup updates current so the escrow release can be completed without delays.",
    actionLabel: "View escrow",
    actionHref: {
      buyer: "/buyer/accounting/escrow",
      seller: "/seller/accounting/escrow",
    },
    source: "System",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "n3",
    group: "Last 7 days",
    icon: Info,
    message: (
      <>
        Order {orderLink("#EG-10492")} is due to ship in 2 days. Upload tracking details to avoid
        delays.
      </>
    ),
    detail:
      "This order is approaching its shipment deadline. Confirm pickup readiness or upload tracking details so the buyer and EcoGlobe operations team can monitor the delivery milestone.",
    actionLabel: "Review shipment",
    actionHref: {
      buyer: "/buyer/orders",
      seller: "/seller/sales",
    },
    source: "Admin",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
  {
    id: "n4",
    group: "Last 7 days",
    icon: Info,
    message: (
      <>
        Delivery has been confirmed for Order {orderLink("#EG-10492")}. Escrow release is now in
        progress.
      </>
    ),
    detail:
      "The delivery milestone has been confirmed. EcoGlobe is processing the escrow release according to the transaction terms and the order accounting timeline.",
    actionLabel: "View order",
    actionHref: {
      buyer: "/buyer/orders",
      seller: "/seller/sales",
    },
    source: "System",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
  {
    id: "n5",
    group: "Last 7 days",
    icon: Info,
    message: <>Your product &ldquo;Recycled PET Flakes – Clear Grade&rdquo; is now live and visible to buyers.</>,
    detail:
      "The listing has passed moderation and is now searchable in the marketplace. Buyers can discover it, view product details, and begin the order workflow.",
    actionLabel: "View listing",
    actionHref: {
      buyer: "/buyer/browse",
      seller: "/seller/listings",
    },
    source: "System",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
  {
    id: "n6",
    group: "Last 30 days",
    icon: Info,
    message: (
      <>
        Your product &ldquo;Organic Cotton Waste Fiber&rdquo; requires updates. Reason: Missing
        certification document.
      </>
    ),
    detail:
      "EcoGlobe moderation needs an updated certification document before the listing can remain fully verified. Upload the missing document and resubmit the listing for review.",
    actionLabel: "Update listing",
    actionHref: {
      buyer: "/buyer/browse",
      seller: "/seller/listings",
    },
    source: "Admin",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
  {
    id: "n7",
    group: "Last 30 days",
    icon: Info,
    message: (
      <>
        Your certification GRS will expire in 14 days. Upload a renewed document to maintain
        verification.
      </>
    ),
    detail:
      "The GRS certification on file is nearing expiration. Renewing it before the deadline keeps the account and related listings in verified status.",
    actionLabel: "Manage company documents",
    actionHref: {
      buyer: "/buyer/company",
      seller: "/seller/company",
    },
    source: "System",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
  {
    id: "n8",
    group: "Last 30 days",
    icon: Info,
    message: <>Your document &ldquo;Business Registration Certificate&rdquo; has been approved.</>,
    detail:
      "The submitted business registration document has been reviewed and approved. This helps keep the company profile complete and ready for marketplace transactions.",
    actionLabel: "View company profile",
    actionHref: {
      buyer: "/buyer/company",
      seller: "/seller/company",
    },
    source: "System",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
];
