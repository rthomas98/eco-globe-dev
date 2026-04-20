"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Settings pages have their own layout with icon rail + settings nav
  if (pathname.startsWith("/admin/settings")) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-white">
      <AdminSidebar className="hidden lg:flex" />
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <AdminSidebar className="flex" />
            <button onClick={() => setSidebarOpen(false)} className="absolute right-2 top-4 flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
              <X className="size-5" />
            </button>
          </div>
        </>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center px-4 lg:hidden" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <button onClick={() => setSidebarOpen(true)} className="text-neutral-500 hover:text-neutral-900"><Menu className="size-5" /></button>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
