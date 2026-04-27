"use client";

import { useState } from "react";
import { Search, User, Menu, X } from "lucide-react";
import { SellerSidebar } from "./seller-sidebar";

export function SellerLayout({
  children,
  title = "Dashboard",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-100">
      {/* Desktop sidebar */}
      <SellerSidebar className="hidden lg:flex" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <SellerSidebar className="flex" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-2 top-4 flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="size-5" />
            </button>
          </div>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between bg-white px-4 sm:px-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-neutral-500 hover:text-neutral-900 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-neutral-500 hover:text-neutral-900">
              <Search className="size-5" />
            </button>
            <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200">
              <User className="size-4 text-neutral-600" />
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
