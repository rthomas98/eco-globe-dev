export interface AdminNotification {
  msg: string;
  source: "System" | "Admin" | "Compliance" | "Finance";
  time: string;
  unread: boolean;
  category: "Approvals" | "Compliance" | "Transactions" | "Disputes" | "System";
  href?: string;
}

export interface AdminNotificationGroup {
  group: string;
  items: AdminNotification[];
}

export const adminNotificationGroups: AdminNotificationGroup[] = [
  {
    group: "Earlier",
    items: [
      {
        msg: "A new seller EcoPack Co has registered and is awaiting approval.",
        source: "System",
        time: "an hour ago",
        unread: true,
        category: "Approvals",
        href: "/admin/sellers",
      },
      {
        msg: "GreenTex Ltd submitted verification documents. Review is required.",
        source: "System",
        time: "2 hours ago",
        unread: true,
        category: "Compliance",
        href: "/admin/kyc",
      },
    ],
  },
  {
    group: "Last 7 days",
    items: [
      {
        msg: 'A new product "Bio-based Resin Pellets" is pending approval.',
        source: "Admin",
        time: "2026-04-30 10:55 AM",
        unread: false,
        category: "Approvals",
        href: "/admin/moderation",
      },
      {
        msg: 'A buyer flagged a sustainability claim on "Recycled Aluminum Sheet". Review is required.',
        source: "System",
        time: "2026-04-29 09:12 AM",
        unread: false,
        category: "Compliance",
        href: "/admin/moderation",
      },
      {
        msg: "Certification GRS for EcoPack Co will expire in 7 days.",
        source: "Compliance",
        time: "2026-04-28 02:21 PM",
        unread: false,
        category: "Compliance",
        href: "/admin/sellers",
      },
    ],
  },
  {
    group: "Last 30 days",
    items: [
      {
        msg: "A transaction over $100,000 has been initiated: Order #EG-50021.",
        source: "Finance",
        time: "2026-04-20 04:40 PM",
        unread: false,
        category: "Transactions",
        href: "/admin/accounting/transactions",
      },
      {
        msg: "Escrow release for Order #EG-50012 requires admin review due to dispute history.",
        source: "System",
        time: "2026-04-17 11:08 AM",
        unread: false,
        category: "Disputes",
        href: "/admin/disputes",
      },
      {
        msg: "Dispute for Order #EG-50009 has been escalated. Action required within 24 hours.",
        source: "System",
        time: "2026-04-15 08:30 AM",
        unread: false,
        category: "Disputes",
        href: "/admin/disputes",
      },
    ],
  },
];
