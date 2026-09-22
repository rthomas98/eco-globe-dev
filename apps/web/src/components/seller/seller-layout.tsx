"use client";

import { useState } from "react";
import { Search, User, Menu, X } from "lucide-react";
import Link from "next/link";
import { SellerSidebar, sellerNavItems } from "./seller-sidebar";

export function SellerLayout({
  children,
  title = "Dashboard",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const destinations = sellerNavItems
    .flatMap(
      (item) =>
        item.children?.map((child) => ({
          ...child,
          label: `${item.label} · ${child.label}`,
        })) ?? [{ label: item.label, href: item.href }],
    )
    .filter((item) =>
      item.label.toLowerCase().includes(query.trim().toLowerCase()),
    );

  return (
    <div className="flex h-dvh overflow-hidden bg-neutral-100">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 hidden lg:block">
        <SellerSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close seller navigation"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <SellerSidebar
              className="flex"
              onNavigate={() => setSidebarOpen(false)}
            />
            <button
              type="button"
              aria-label="Close seller navigation"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-2 top-4 flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="size-5" />
            </button>
          </div>
        </>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-[240px]">
        {/* Top bar */}
        <header
          className="flex h-16 shrink-0 items-center justify-between bg-white px-4 sm:px-6"
          style={{ borderBottom: "1px solid #E0E0E0" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open seller navigation"
              onClick={() => setSidebarOpen(true)}
              className="text-neutral-500 hover:text-neutral-900 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="text-neutral-500 hover:text-neutral-900"
            >
              <Search className="size-5" />
            </button>
            <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200">
              <User className="size-4 text-neutral-600" />
            </div>
          </div>
        </header>
        {searchOpen && (
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Search seller portal"
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6 pt-24"
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchOpen(false);
            }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex justify-between">
                <h2 className="font-semibold">Search seller portal</h2>
                <button
                  aria-label="Close search"
                  onClick={() => setSearchOpen(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
              <input
                autoFocus
                aria-label="Search seller pages"
                placeholder="Search listings, payments, contracts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border p-3"
              />
              <nav
                aria-label="Search results"
                className="mt-3 max-h-80 overflow-y-auto"
              >
                {destinations.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="block rounded-lg p-3 hover:bg-neutral-100"
                  >
                    {item.label}
                  </Link>
                ))}
                {destinations.length === 0 && (
                  <p className="p-3">No matching pages.</p>
                )}
              </nav>
            </div>
          </section>
        )}
        {/* Content */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
