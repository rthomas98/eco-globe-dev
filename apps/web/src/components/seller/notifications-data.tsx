import type { LucideIcon } from "lucide-react";
import { ShoppingCart, DollarSign, Info } from "lucide-react";

export type NotificationGroup = "Earlier" | "Last 7 days" | "Last 30 days";

export interface SellerNotification {
  id: string;
  group: NotificationGroup;
  icon: LucideIcon;
  message: React.ReactNode;
  source: "System" | "Admin";
  time: string;
  unread: boolean;
}

const orderLink = (id: string) => (
  <a className="font-medium text-neutral-900 underline underline-offset-2">{id}</a>
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
    source: "System",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
  {
    id: "n5",
    group: "Last 7 days",
    icon: Info,
    message: <>Your product &ldquo;Recycled PET Flakes – Clear Grade&rdquo; is now live and visible to buyers.</>,
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
    source: "System",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
  {
    id: "n8",
    group: "Last 30 days",
    icon: Info,
    message: <>Your document &ldquo;Business Registration Certificate&rdquo; has been approved.</>,
    source: "System",
    time: "2025-01-07 10:55 AM",
    unread: false,
  },
];
