"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Receipt,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Building2,
  Home,
  LogOut,
} from "lucide-react";
import { NotificationsPanel } from "./notifications-panel";

type NavChild = { label: string; href: string };
type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Listings", href: "/seller/listings", icon: LayoutGrid },
  { label: "Sales", href: "/seller/sales", icon: TrendingUp },
  {
    label: "Carbon Calculator",
    href: "/seller/carbon-calculator",
    icon: TrendingDown,
  },
  {
    label: "Accounting",
    href: "/seller/accounting",
    icon: Receipt,
    children: [
      { label: "Transactions", href: "/seller/accounting/transactions" },
      { label: "Escrow", href: "/seller/accounting/escrow" },
      { label: "Bank Account", href: "/seller/accounting/bank-account" },
    ],
  },
  {
    label: "Reports",
    href: "/seller/reports",
    icon: BarChart3,
    children: [
      { label: "Sales", href: "/seller/reports/sales" },
      { label: "Products", href: "/seller/reports/products" },
      { label: "Carbon", href: "/seller/reports/carbon" },
    ],
  },
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
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-200 text-lg font-semibold text-amber-700">
            JS
          </div>
          <div>
            <p className="text-base font-bold text-neutral-900">John Senna</p>
            <p className="text-sm text-neutral-500">johnsenna@mail.com</p>
          </div>
        </div>
        <div className="my-3" style={{ borderTop: "1px solid #F0F0F0" }} />
        <Link
          href="/seller/listings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <LayoutDashboard className="size-[18px] text-neutral-500" />
          Dashboard
        </Link>
        <Link
          href="/seller/company"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Building2 className="size-[18px] text-neutral-500" />
          Company
        </Link>
        <Link
          href="/seller/account"
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

export function SellerSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const [openSection, setOpenSection] = useState<string | null>(() => {
    const match = navItems.find(
      (i) => i.children && pathname.startsWith(i.href),
    );
    return match?.label ?? null;
  });
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
    <aside
      className={`relative flex h-screen w-[240px] shrink-0 flex-col bg-white ${className ?? ""}`}
      style={{ borderRight: "1px solid #E0E0E0" }}
    >
      {/* Logo */}
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

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isOpen = openSection === item.label;

          if (item.children) {
            return (
              <div key={item.href} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : item.label)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <item.icon className="size-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-1 flex flex-col gap-1 pl-9">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            childActive
                              ? "bg-neutral-100 text-neutral-900"
                              : "text-neutral-600 hover:bg-neutral-50"
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
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Notifications + user */}
      <div className="flex flex-col gap-1 px-3 pb-4">
        <button
          type="button"
          onClick={() => setNotifsOpen(true)}
          className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            notifsOpen
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          <div className="relative">
            <Bell className={`size-5 ${notifsOpen ? "fill-neutral-900" : ""}`} />
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
          <div className="flex size-8 items-center justify-center rounded-full bg-amber-200 text-sm font-semibold text-amber-700">
            JS
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-neutral-900">John S</span>
          {userMenuOpen ? (
            <ChevronUp className="size-4 text-neutral-400" />
          ) : (
            <ChevronDown className="size-4 text-neutral-400" />
          )}
        </button>
      </div>

      {userMenuOpen && (
        <UserMenu onClose={() => setUserMenuOpen(false)} onLogout={handleLogout} />
      )}
      {notifsOpen && <NotificationsPanel onClose={() => setNotifsOpen(false)} />}
    </aside>
  );
}
