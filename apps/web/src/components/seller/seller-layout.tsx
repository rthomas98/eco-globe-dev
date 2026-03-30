"use client";

import { Search, Bell, User } from "lucide-react";
import { SellerSidebar } from "./seller-sidebar";

export function SellerLayout({
  children,
  title = "Dashboard",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex h-screen bg-neutral-100">
      <SellerSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between bg-white px-6" style={{ borderBottom: "1px solid #E0E0E0" }}>
          <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
          <div className="flex items-center gap-4">
            <button className="text-neutral-500 hover:text-neutral-900">
              <Search className="size-5" />
            </button>
            <button className="text-neutral-500 hover:text-neutral-900">
              <Bell className="size-5" />
            </button>
            <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200">
              <User className="size-4 text-neutral-600" />
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
