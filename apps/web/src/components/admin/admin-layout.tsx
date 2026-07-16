"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import {
  ADMIN_AUTH_EVENT,
  clearAdminSession,
  readAdminSession,
  type AdminSession,
} from "@eco-globe/shared/admin-auth";
import { AdminSidebar } from "./admin-sidebar";

export function AdminLayout({
  children,
  showLogistics = false,
  showContracts = false,
}: {
  children: React.ReactNode;
  showLogistics?: boolean;
  showContracts?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const syncSession = () => setSession(readAdminSession());
    syncSession();
    window.addEventListener(ADMIN_AUTH_EVENT, syncSession);
    return () => window.removeEventListener(ADMIN_AUTH_EVENT, syncSession);
  }, []);

  const handleSignOut = () => {
    clearAdminSession();
    setSidebarOpen(false);
    window.location.replace("/login?reason=signed-out");
  };

  // Settings pages have their own layout with icon rail + settings nav
  if (pathname.startsWith("/admin/settings")) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <AdminSidebar
        className="hidden lg:flex"
        showLogistics={showLogistics}
        showContracts={showContracts}
        session={session}
        onSignOut={handleSignOut}
      />
      {sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close admin navigation"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <AdminSidebar
              className="flex"
              showLogistics={showLogistics}
              showContracts={showContracts}
              session={session}
              onNavigate={() => setSidebarOpen(false)}
              onSignOut={handleSignOut}
            />
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-2 top-4 flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="size-5" />
            </button>
          </div>
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopNavigation
          pathname={pathname}
          onOpenMobile={() => setSidebarOpen(true)}
          onNavigate={(href) => router.push(href)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

const ADMIN_SEARCH_LINKS = [
  {
    label: "Sales operations",
    href: "/admin/sales",
    keywords: "orders transactions",
  },
  {
    label: "Partner network",
    href: "/admin/partners",
    keywords: "customers sponsors assurers logistics",
  },
  {
    label: "Listings moderation",
    href: "/admin/listings",
    keywords: "products inventory",
  },
  {
    label: "Buyer accounts",
    href: "/admin/buyers",
    keywords: "customers verification",
  },
  {
    label: "Seller accounts",
    href: "/admin/sellers",
    keywords: "suppliers verification",
  },
  { label: "Audit log", href: "/admin/audit", keywords: "security history" },
];

function AdminTopNavigation({
  pathname,
  onOpenMobile,
  onNavigate,
}: {
  pathname: string;
  onOpenMobile: () => void;
  onNavigate: (href: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const pageLabel = segments[0]
    ? segments[0]
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Dashboard";
  const detailLabel = segments[1]?.toUpperCase();
  const results = ADMIN_SEARCH_LINKS.filter((item) =>
    `${item.label} ${item.keywords}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const chooseResult = (href: string) => {
    setSearchOpen(false);
    setSearch("");
    onNavigate(href);
  };

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open admin navigation"
          onClick={onOpenMobile}
          className="flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm"
        >
          <span className="hidden font-medium text-neutral-400 sm:inline">
            Admin
          </span>
          <ChevronRight className="hidden size-3.5 text-neutral-300 sm:block" />
          <span className="truncate font-bold text-neutral-900">
            {pageLabel}
          </span>
          {detailLabel && (
            <>
              <ChevronRight className="size-3.5 shrink-0 text-neutral-300" />
              <span className="hidden truncate font-medium text-neutral-500 md:inline">
                {detailLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-expanded={searchOpen}
          aria-controls="admin-global-search"
          className="hidden h-10 min-w-52 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-left text-sm text-neutral-400 hover:border-neutral-300 hover:bg-white md:flex xl:min-w-72"
        >
          <Search className="size-4" />
          <span className="flex-1">Search admin</span>
          <kbd className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-neutral-400">
            ⌘ K
          </kbd>
        </button>
        <button
          type="button"
          aria-label="Search admin"
          onClick={() => setSearchOpen((open) => !open)}
          className="flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 md:hidden"
        >
          <Search className="size-[18px]" />
        </button>
        <Link
          href="/admin/notifications"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Link>
        <Link
          href="/admin/settings/system/users"
          aria-label="Admin settings"
          className="hidden size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 sm:flex"
        >
          <Settings className="size-[18px]" />
        </Link>
        <Link
          href="/admin/account"
          aria-label="Help and account"
          className="hidden size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 sm:flex"
        >
          <CircleHelp className="size-[18px]" />
        </Link>
      </div>

      {searchOpen && (
        <div
          id="admin-global-search"
          className="absolute right-4 top-[calc(100%+8px)] w-[calc(100vw-32px)] max-w-md rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xl sm:right-5 lg:right-6"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (results[0]) chooseResult(results[0].href);
            }}
          >
            <label className="relative block">
              <span className="sr-only">Search admin destinations</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search partners, sales, accounts…"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none focus:border-neutral-900 focus:bg-white"
              />
            </label>
          </form>
          <div className="mt-2 max-h-72 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.href}
                type="button"
                onClick={() => chooseResult(result.href)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950"
              >
                <span>{result.label}</span>
                <ChevronRight className="size-4 text-neutral-300" />
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-neutral-500">
                No admin destinations found.
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
