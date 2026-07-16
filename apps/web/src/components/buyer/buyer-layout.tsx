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
  ArrowLeftRight,
  LayoutDashboard,
  Building2,
  Home,
  LogOut,
  Heart,
  FileQuestion,
  User as UserIcon,
  Truck,
  FileSignature,
  PenLine,
  FileText,
  ShieldCheck,
  Video,
  Route,
  Network,
  MapPin,
  BarChart3,
  Lightbulb,
  Blocks,
  Workflow,
  Languages,
  Rocket,
  MonitorSmartphone,
  Menu,
  X,
} from "lucide-react";
import { NotificationsPanel } from "../seller/notifications-panel";
import {
  buildDemoUser,
  clearDemoUser,
  readDemoUser,
  writeDemoUser,
} from "@/lib/demo-user";

interface NavIcon {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: { href: string; label: string }[];
}

interface NavGroup {
  label: string;
  items: NavIcon[];
}

const buyerNavGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { href: "/", icon: Home, label: "Home" },
      { href: "/buyer/browse", icon: Search, label: "Search" },
      { href: "/buyer/orders", icon: ShoppingCart, label: "My Orders" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/buyer/partners", icon: Network, label: "Partners" },
      { href: "/buyer/favorites", icon: Heart, label: "Saved" },
      { href: "/buyer/rfq", icon: FileQuestion, label: "Requests for quote" },
    ],
  },
  {
    label: "Logistics",
    items: [
      { href: "/buyer/logistics", icon: Truck, label: "Logistics" },
      {
        href: "/buyer/delivery-tracking",
        icon: Route,
        label: "Delivery Tracking",
      },
      {
        href: "/buyer/map-intelligence",
        icon: MapPin,
        label: "Map Intelligence",
      },
      {
        href: "/buyer/mobile-access",
        icon: MonitorSmartphone,
        label: "Mobile Access",
      },
    ],
  },
  {
    label: "Contracts & Docs",
    items: [
      { href: "/buyer/contracts", icon: FileSignature, label: "Contracts" },
      { href: "/buyer/e-signatures", icon: PenLine, label: "E-signatures" },
      { href: "/buyer/documents", icon: FileText, label: "Documents" },
      { href: "/buyer/verification", icon: ShieldCheck, label: "Verification" },
      {
        href: "/buyer/asset-verification",
        icon: ShieldCheck,
        label: "Asset Verification",
      },
      {
        href: "/buyer/blockchain-traceability",
        icon: Blocks,
        label: "Blockchain",
      },
      {
        href: "/buyer/smart-contracts",
        icon: Workflow,
        label: "Smart Contracts",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/buyer/analytics", icon: BarChart3, label: "Analytics" },
      {
        href: "/buyer/recommendations",
        icon: Lightbulb,
        label: "Recommendations",
      },
      { href: "/buyer/language", icon: Languages, label: "Language" },
      {
        href: "/buyer/national-expansion",
        icon: Rocket,
        label: "National Expansion",
      },
      { href: "/buyer/video-demos", icon: Video, label: "Video demos" },
    ],
  },
  {
    label: "Finance & Support",
    items: [
      {
        href: "/buyer/accounting",
        icon: DollarSign,
        label: "Accounting",
        children: [
          { href: "/buyer/accounting/transactions", label: "Transactions" },
          { href: "/buyer/accounting/payments", label: "Payments" },
          { href: "/buyer/accounting/escrow", label: "Escrow" },
          { href: "/buyer/accounting/bank-account", label: "Bank Account" },
        ],
      },
      { href: "/buyer/account", icon: UserIcon, label: "Account" },
      { href: "/buyer/help", icon: HelpCircle, label: "Help" },
    ],
  },
];

function isNavItemActive(item: NavIcon, pathname: string) {
  if (item.children) {
    return (
      pathname === item.href ||
      pathname.startsWith(item.href + "/") ||
      item.children.some(
        (child) =>
          pathname === child.href || pathname.startsWith(child.href + "/"),
      )
    );
  }

  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function isNavGroupActive(group: NavGroup, pathname: string) {
  return group.items.some((item) => isNavItemActive(item, pathname));
}

function UserMenu({
  onClose,
  onLogout,
  onSwitchToSeller,
}: {
  onClose: () => void;
  onLogout: () => void;
  onSwitchToSeller: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close user menu"
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="absolute bottom-16 left-3 z-50 w-[280px] rounded-2xl bg-white p-5"
        style={{
          border: "1px solid #F0F0F0",
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
        }}
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
        <button
          type="button"
          onClick={onSwitchToSeller}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <ArrowLeftRight className="size-[18px] text-neutral-500" />
          Switch to Seller
        </button>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    buyerNavGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children && isNavItemActive(item, pathname)) {
          initial.add(item.label);
        }
      });
    });
    return initial;
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>(["Core"]);
    buyerNavGroups.forEach((group) => {
      if (isNavGroupActive(group, pathname)) {
        initial.add(group.label);
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleLogout = () => {
    clearDemoUser();
    setUserMenuOpen(false);
    router.push("/login");
  };

  const handleSwitchToSeller = () => {
    const current = readDemoUser();
    writeDemoUser(
      buildDemoUser("seller", {
        name: current?.name || "Joanna Bell",
        email: current?.email || "joanna@buyer.com",
      }),
    );
    setUserMenuOpen(false);
    router.push("/seller/listings");
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close buyer navigation"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[220px] shrink-0 flex-col bg-white transition-transform duration-200 lg:relative lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderRight: "1px solid #E0E0E0" }}
      >
        <div className="flex h-16 items-center justify-between px-6">
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
          <button
            type="button"
            aria-label="Close buyer navigation"
            onClick={() => setSidebarOpen(false)}
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pt-2 pb-4">
          {buyerNavGroups.map((group) => {
            const isGroupExpanded = expandedGroups.has(group.label);
            const isGroupActive = isNavGroupActive(group, pathname);

            return (
              <div key={group.label} className="rounded-xl">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={`flex w-full items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.04em] whitespace-nowrap transition-colors ${
                    isGroupActive
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                  }`}
                  aria-expanded={isGroupExpanded}
                >
                  <span className="shrink-0 whitespace-nowrap">
                    {group.label}
                  </span>
                  {isGroupExpanded ? (
                    <ChevronUp className="size-3 shrink-0" />
                  ) : (
                    <ChevronDown className="size-3 shrink-0" />
                  )}
                </button>

                {isGroupExpanded && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const isActive = isNavItemActive(item, pathname);
                      const isExpanded = expandedMenus.has(item.label);
                      const hasChildren = !!item.children?.length;

                      return (
                        <div key={item.href}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleMenu(item.label)}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                  ? "bg-neutral-100 text-neutral-900"
                                  : "text-neutral-700 hover:bg-neutral-100"
                              }`}
                              aria-expanded={isExpanded}
                            >
                              <span className="flex items-center gap-3">
                                <item.icon className="size-5" />
                                <span className="whitespace-nowrap">
                                  {item.label}
                                </span>
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="size-4 text-neutral-400" />
                              ) : (
                                <ChevronDown className="size-4 text-neutral-400" />
                              )}
                            </button>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                  ? "bg-neutral-900 text-white"
                                  : "text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              <item.icon className="size-5" />
                              <span className="whitespace-nowrap">
                                {item.label}
                              </span>
                            </Link>
                          )}

                          {hasChildren && isExpanded && (
                            <div className="ml-8 flex flex-col gap-0.5 py-1">
                              {item.children!.map((child) => {
                                const childActive =
                                  pathname === child.href ||
                                  pathname.startsWith(child.href + "/");
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                      childActive
                                        ? "bg-neutral-100 text-neutral-900"
                                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                                    }`}
                                  >
                                    <span className="whitespace-nowrap">
                                      {child.label}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
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
            onSwitchToSeller={handleSwitchToSeller}
          />
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 shrink-0 items-center gap-3 px-4 lg:hidden"
          style={{ borderBottom: "1px solid #E0E0E0" }}
        >
          <button
            type="button"
            aria-label="Open buyer navigation"
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-500 hover:text-neutral-900"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" className="shrink-0">
            <Image
              src="/logo.svg"
              alt="EcoGlobe"
              width={96}
              height={27}
              className="invert"
              priority
            />
          </Link>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </main>

      {notifsOpen && (
        <NotificationsPanel
          onClose={() => setNotifsOpen(false)}
          seeAllHref="/buyer/notifications"
        />
      )}
    </div>
  );
}
