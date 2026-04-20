"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Users, UserCheck,
  Globe, BarChart3, Settings, Bell, ChevronDown, ChevronUp,
  PanelLeftOpen, PanelLeftClose,
} from "lucide-react";

const mainNavItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Sales", href: "/admin/sales", icon: ShoppingCart },
  { label: "Listings", href: "/admin/listings", icon: ClipboardList },
  { label: "Sellers", href: "/admin/sellers", icon: Users },
  { label: "Buyers", href: "/admin/buyers", icon: UserCheck },
  { label: "Accounting", href: "/admin/accounting", icon: Globe },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface SettingsNavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const settingsNav: SettingsNavItem[] = [
  { label: "System", href: "/admin/settings/system", children: [
    { label: "Users", href: "/admin/settings/system/users" },
    { label: "Roles", href: "/admin/settings/system/roles" },
  ]},
  { label: "Categories", href: "/admin/settings/categories", children: [] },
  { label: "Seller Settings", href: "/admin/settings/seller" },
  { label: "Buyer Settings", href: "/admin/settings/buyer" },
  { label: "Escrow", href: "/admin/settings/escrow" },
  { label: "Payments", href: "/admin/settings/payments" },
  { label: "Transactions Rule", href: "/admin/settings/transactions-rule" },
  { label: "Notifications", href: "/admin/settings/notifications" },
];

export function SettingsSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [railExpanded, setRailExpanded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const init = new Set<string>();
    settingsNav.forEach((item) => {
      if (item.children && pathname.startsWith(item.href)) init.add(item.label);
    });
    return init;
  });

  const toggle = (label: string) => {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(label)) n.delete(label); else n.add(label); return n; });
  };

  return (
    <div className={`flex h-screen ${className ?? ""}`}>
      {/* Icon rail / Expanded sidebar */}
      <div
        className={`flex shrink-0 flex-col bg-white py-4 transition-all duration-200 ${railExpanded ? "w-[200px] px-3" : "w-[60px] items-center"}`}
        style={{ borderRight: "1px solid #F0F0F0" }}
      >
        {/* Logo + toggle */}
        <div className={`mb-4 flex items-center ${railExpanded ? "justify-between px-3" : "justify-center"}`}>
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={railExpanded ? 100 : 28}
              height={28}
              className="invert"
              priority
            />
          </Link>
          {railExpanded && (
            <button
              onClick={() => setRailExpanded(false)}
              className="flex size-7 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-0.5">
          {mainNavItems.map((item) => {
            const isActive = item.href === "/admin/settings"
              ? pathname.startsWith("/admin/settings")
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg transition-colors ${
                  railExpanded ? "px-3 py-2.5" : "justify-center py-2.5"
                } ${
                  isActive
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                }`}
                style={!railExpanded ? { width: 40, height: 40, margin: "0 auto" } : undefined}
              >
                <item.icon className="size-[18px] shrink-0" />
                {railExpanded && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className={`flex flex-col gap-2 ${railExpanded ? "" : "items-center"}`}>
          {!railExpanded && (
            <button
              onClick={() => setRailExpanded(true)}
              className="flex size-10 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-[18px]" />
            </button>
          )}
          <button className={`relative flex items-center gap-3 rounded-lg text-neutral-400 hover:bg-neutral-100 ${railExpanded ? "px-3 py-2.5" : "justify-center size-10"}`}>
            <Bell className="size-[18px]" />
            {railExpanded && <span className="text-sm font-medium text-neutral-500">Notifications</span>}
            <span className={`absolute flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ${railExpanded ? "left-[18px] top-1" : "right-1.5 top-1.5"}`}>8</span>
          </button>
          <div className={`flex items-center gap-3 ${railExpanded ? "rounded-lg px-3 py-2" : "justify-center"}`}>
            <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">A</div>
            {railExpanded && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-neutral-900">Anabea</span>
                <ChevronDown className="size-3.5 text-neutral-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings nav */}
      <div className="flex w-[180px] shrink-0 flex-col bg-white py-5 px-3" style={{ borderRight: "1px solid #F0F0F0" }}>
        <h2 className="mb-4 px-3 text-base font-bold text-neutral-900">Settings</h2>
        <nav className="flex flex-col gap-0.5">
          {settingsNav.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expanded.has(item.label);
            const isActive = pathname.startsWith(item.href);

            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button onClick={() => toggle(item.label)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}>
                    {item.label}
                    {isExpanded ? <ChevronUp className="size-4 text-neutral-400" /> : <ChevronDown className="size-4 text-neutral-400" />}
                  </button>
                ) : (
                  <Link href={item.href} className={`flex rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}>
                    {item.label}
                  </Link>
                )}
                {hasChildren && isExpanded && (
                  <div className="ml-3 flex flex-col gap-0.5 py-0.5">
                    {item.children!.map((child) => (
                      <Link key={child.href} href={child.href} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === child.href ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
