"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  ShoppingCart,
  DollarSign,
  HelpCircle,
  Bell,
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  Building2,
  Home,
  LogOut,
  TrendingDown,
} from "lucide-react";
import { NotificationsPanel } from "../seller/notifications-panel";

interface NavIcon {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: { href: string; label: string }[];
}

const navIcons: NavIcon[] = [
  { href: "/buyer/browse", icon: Search, label: "Search" },
  { href: "/buyer/orders", icon: ShoppingCart, label: "My Orders" },
  {
    href: "/buyer/carbon-calculator",
    icon: TrendingDown,
    label: "Carbon Calculator",
  },
  {
    href: "/buyer/accounting",
    icon: DollarSign,
    label: "Accounting",
    children: [
      { href: "/buyer/accounting/transactions", label: "Transactions" },
      { href: "/buyer/accounting/escrow", label: "Escrow" },
      { href: "/buyer/accounting/bank-account", label: "Bank Account" },
    ],
  },
  { href: "/buyer/help", icon: HelpCircle, label: "Help" },
];

function UserMenu({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute bottom-16 left-3 z-50 w-[280px] rounded-2xl bg-white p-5"
        style={{ border: "1px solid #F0F0F0", boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
      >
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-rose-200 text-lg font-semibold text-rose-700">
            J
          </div>
          <div>
            <p className="text-base font-bold text-neutral-900">Joanna Bell</p>
            <p className="text-sm text-neutral-500">joanna@buyer.com</p>
          </div>
        </div>
        <div className="my-3" style={{ borderTop: "1px solid #F0F0F0" }} />
        <Link
          href="/buyer/browse"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <LayoutDashboard className="size-[18px] text-neutral-500" />
          Dashboard
        </Link>
        <Link
          href="/buyer/company"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Building2 className="size-[18px] text-neutral-500" />
          Company
        </Link>
        <Link
          href="/buyer/account"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Home className="size-[18px] text-neutral-500" />
          My Account
        </Link>
        <div className="my-3" style={{ borderTop: "1px solid #F0F0F0" }} />
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <LogOut className="size-[18px] text-neutral-500" />
          Log Out
        </button>
      </div>
    </>
  );
}

export function BuyerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecoglobe.demoUser");
    }
    setUserMenuOpen(false);
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-white">
      <aside
        className="relative flex h-screen w-[220px] shrink-0 flex-col bg-white"
        style={{ borderRight: "1px solid #E0E0E0" }}
      >
        <div className="flex h-16 items-center px-6">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={100}
              height={28}
              className="invert"
              priority
            />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
          {navIcons.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const hasChildren = !!item.children?.length;
            return (
              <div key={item.href} className="flex flex-col gap-1">
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive && !hasChildren
                      ? "bg-neutral-900 text-white"
                      : isActive
                        ? "text-neutral-900"
                        : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <item.icon className="size-5" />
                  <span className="flex-1">{item.label}</span>
                  {hasChildren && (
                    <ChevronUp
                      className={`size-4 transition-transform ${
                        isActive ? "" : "rotate-180"
                      }`}
                    />
                  )}
                </Link>
                {hasChildren && isActive && (
                  <div className="ml-3 flex flex-col gap-0.5 pl-6">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                            childActive
                              ? "bg-neutral-100 font-medium text-neutral-900"
                              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
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

        <div className="flex flex-col gap-1 px-3 pb-4">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifsOpen(true)}
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              notifsOpen
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <div className="relative">
              <Bell className={`size-5 ${notifsOpen ? "fill-white" : ""}`} />
              <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                8
              </span>
            </div>
            Notifications
          </button>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-rose-200 text-sm font-semibold text-rose-700">
              J
            </div>
            <span className="flex-1 text-left text-sm font-semibold text-neutral-900">
              Joanna B
            </span>
            {userMenuOpen ? (
              <ChevronUp className="size-4 text-neutral-400" />
            ) : (
              <ChevronDown className="size-4 text-neutral-400" />
            )}
          </button>
        </div>

        {userMenuOpen && (
          <UserMenu
            onClose={() => setUserMenuOpen(false)}
            onLogout={handleLogout}
          />
        )}
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>

      {notifsOpen && (
        <NotificationsPanel
          onClose={() => setNotifsOpen(false)}
          seeAllHref="/buyer/notifications"
        />
      )}
    </div>
  );
}
