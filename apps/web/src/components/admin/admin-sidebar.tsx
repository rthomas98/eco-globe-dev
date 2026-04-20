"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Users,
  UserCheck,
  Globe,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Settings,
  Bell,
  Info,
  MoreHorizontal,
  Home,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Sales", href: "/admin/sales", icon: ShoppingCart },
  { label: "Listings", href: "/admin/listings", icon: ClipboardList },
  { label: "Sellers", href: "/admin/sellers", icon: Users },
  { label: "Buyers", href: "/admin/buyers", icon: UserCheck },
  {
    label: "Accounting",
    href: "/admin/accounting",
    icon: Globe,
    children: [
      { label: "Transactions", href: "/admin/accounting/transactions" },
      { label: "Escrow", href: "/admin/accounting/escrow" },
    ],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    children: [
      { label: "Sales", href: "/admin/reports/sales" },
      { label: "Products", href: "/admin/reports/products" },
      { label: "Escrow", href: "/admin/reports/escrow" },
      { label: "Carbon", href: "/admin/reports/carbon" },
    ],
  },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const notifications = [
  { group: "Earlier", items: [
    { msg: "A new seller EcoPack Co has registered and is awaiting approval.", source: "System", time: "an hour ago", unread: true },
    { msg: "GreenTex Ltd submitted verification documents. Review is required.", source: "System", time: "2 hours ago", unread: true },
  ]},
  { group: "Last 7 days", items: [
    { msg: 'A new product "Bio-based Resin Pellets" is pending approval.', source: "Admin", time: "2025-01-07 10:55 AM", unread: false },
    { msg: 'A buyer flagged a sustainability claim on "Recycled Aluminum Sheet". Review is required.', source: "System", time: "2025-01-07 10:55 AM", unread: false },
    { msg: "Certification GRS for EcoPack Co will expire in 7 days.", source: "System", time: "2025-01-07 10:55 AM", unread: false },
  ]},
  { group: "Last 30 days", items: [
    { msg: "A transaction over $100,000 has been initiated: Order #EG-50021.", source: "Admin", time: "2025-01-07 10:55 AM", unread: false },
    { msg: "Escrow release for Order #EG-50012 requires admin review due to dispute history.", source: "System", time: "2025-01-07 10:55 AM", unread: false },
    { msg: "Dispute for Order #EG-50009 has been escalated. Action required within 24 hours.", source: "System", time: "2025-01-07 10:55 AM", unread: false },
  ]},
];

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex h-full w-[420px] flex-col overflow-y-auto bg-white shadow-xl" style={{ borderRight: "1px solid #F0F0F0" }}>
        <div className="sticky top-0 z-10 bg-white px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Notifications</h2>
            <div className="flex items-center gap-2">
              <Link href="/admin/account" onClick={onClose} className="text-sm font-medium text-neutral-900">View All</Link>
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="text-neutral-400 hover:text-neutral-700"><MoreHorizontal className="size-5" /></button>
                {showMenu && (
                  <div className="absolute right-0 top-8 z-30 w-[180px] rounded-lg bg-white py-1" style={{ border: "1px solid #F0F0F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                    <button className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">Mark all as read</button>
                    <button className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">View all</button>
                    <Link href="/admin/settings/notifications" onClick={onClose} className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">Notification settings</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-0 rounded-full bg-neutral-100 p-1">
            <button onClick={() => setTab("all")} className={`flex-1 rounded-full py-1.5 text-sm font-medium ${tab === "all" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>All</button>
            <button onClick={() => setTab("unread")} className={`flex-1 rounded-full py-1.5 text-sm font-medium ${tab === "unread" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>Unread</button>
          </div>
        </div>
        <div className="flex-1 px-5 pb-5">
          {notifications.map((group) => {
            const items = tab === "unread" ? group.items.filter((i) => i.unread) : group.items;
            if (items.length === 0) return null;
            return (
              <div key={group.group} className="mb-4">
                <h3 className="mb-2 text-xs font-bold text-neutral-900">{group.group}</h3>
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 py-3" style={{ borderBottom: "1px solid #F8F8F8" }}>
                    {item.unread && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-neutral-900" />}
                    <Info className="mt-0.5 size-5 shrink-0 text-neutral-400" />
                    <div className="flex-1">
                      <p className="text-sm text-neutral-700">{item.msg}</p>
                      <p className="mt-1 text-xs text-neutral-400">{item.source} · {item.time}</p>
                    </div>
                    <button className="shrink-0 text-neutral-400"><MoreHorizontal className="size-4" /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UserMenu({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-14 left-3 z-50 w-[220px] rounded-xl bg-white p-5" style={{ border: "1px solid #F0F0F0", boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-500">A</div>
          <div>
            <p className="text-sm font-bold text-neutral-900">Katarina Jenkins</p>
            <p className="text-xs text-neutral-500">katarinajenkins@mail.com</p>
          </div>
        </div>
        <div className="mb-2" style={{ borderTop: "1px solid #F0F0F0" }} />
        <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-50"><LayoutDashboard className="size-4" /> Dashboard</Link>
        <Link href="/admin/account" onClick={onClose} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-50"><Home className="size-4" /> My Account</Link>
        <div className="my-2" style={{ borderTop: "1px solid #F0F0F0" }} />
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-50"><LogOut className="size-4" /> Log Out</button>
      </div>
    </>
  );
}

function SidebarBottom() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="relative flex flex-col gap-2 px-3 pb-4">
      <button onClick={() => setShowNotifs(true)} className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900">
        <Bell className="size-[18px]" />
        Notifications
        <span className="absolute left-[18px] top-2 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">8</span>
      </button>
      <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 rounded-lg px-3 py-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">A</div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-neutral-900">Anabea</span>
          {showUserMenu ? <ChevronUp className="size-3.5 text-neutral-400" /> : <ChevronDown className="size-3.5 text-neutral-400" />}
        </div>
      </button>
      {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
      {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
    </div>
  );
}

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navItems.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) {
        initial.add(item.label);
      }
    });
    return initial;
  });

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <aside
      className={`flex h-screen w-[200px] shrink-0 flex-col bg-white ${className ?? ""}`}
      style={{ borderRight: "1px solid #F0F0F0" }}
    >
      <div className="flex h-16 items-center px-5">
        <Link href="/">
          <Image src="/logo.svg" alt="EcoGlobe" width={100} height={28} className="invert" priority />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
        {navItems.map((item) => {
          const isActive = item.children
            ? pathname.startsWith(item.href)
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const isExpanded = expandedMenus.has(item.label);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="size-[18px]" />
                    {item.label}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="size-4 text-neutral-400" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="size-[18px]" />
                    {item.label}
                  </div>
                </Link>
              )}
              {hasChildren && isExpanded && (
                <div className="ml-8 flex flex-col gap-0.5 py-1">
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          childActive
                            ? "bg-neutral-100 text-neutral-900"
                            : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <SidebarBottom />
    </aside>
  );
}
