"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SettingsSidebar } from "./settings-sidebar";

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <SettingsSidebar className="hidden lg:flex" />
      {sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close settings navigation"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <SettingsSidebar className="flex" onNavigate={() => setSidebarOpen(false)} />
            <button
              type="button"
              aria-label="Close settings navigation"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-2 top-4 flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="size-5" />
            </button>
          </div>
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center px-4 lg:hidden" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <button
            type="button"
            aria-label="Open settings navigation"
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-500 hover:text-neutral-900"
          >
            <Menu className="size-5" />
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
