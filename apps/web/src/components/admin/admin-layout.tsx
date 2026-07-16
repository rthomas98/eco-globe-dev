"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
        <header
          className="flex h-14 items-center px-4 lg:hidden"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <button
            type="button"
            aria-label="Open admin navigation"
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
