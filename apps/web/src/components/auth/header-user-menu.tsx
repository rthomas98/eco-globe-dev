"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { clearDemoUser, useDemoUser, type UserRole } from "@/lib/demo-user";

const PORTAL_HREF: Record<UserRole, string> = {
  buyer: "/buyer/browse",
  seller: "/seller/listings",
  admin: "/admin/dashboard",
};

const PORTAL_LABEL: Record<UserRole, string> = {
  buyer: "Buyer dashboard",
  seller: "Seller dashboard",
  admin: "Admin dashboard",
};

export function HeaderUserMenu({
  tone = "dark",
}: {
  tone?: "dark" | "light";
}) {
  const user = useDemoUser();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleLogout = () => {
    clearDemoUser();
    setOpen(false);
    router.push("/");
  };

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className={`hidden sm:inline text-base font-bold ${
            tone === "light" ? "text-white" : "text-neutral-900"
          }`}
        >
          Login
        </Link>
        <Link href="/register" className="hidden sm:inline-flex">
          <Button
            variant={tone === "light" ? "outline-white" : "secondary"}
            size="md"
          >
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();
  const firstName = (user.name || user.email).split(" ")[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full px-2 py-1 transition-colors ${
          tone === "light" ? "hover:bg-white/10" : "hover:bg-neutral-100"
        }`}
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-rose-200 text-sm font-semibold text-rose-700">
          {initial}
        </div>
        <span
          className={`hidden sm:inline text-sm font-semibold ${
            tone === "light" ? "text-white" : "text-neutral-900"
          }`}
        >
          {firstName}
        </span>
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""} ${
            tone === "light" ? "text-white" : "text-neutral-500"
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-2xl bg-white p-3"
          style={{
            border: "1px solid #F0F0F0",
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
          }}
        >
          <div className="flex flex-col gap-0.5 px-3 py-2">
            <p className="text-base font-bold text-neutral-900">{user.name}</p>
            <p className="text-xs text-neutral-500">{user.email}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              {user.role}
            </p>
          </div>
          <div className="my-2" style={{ borderTop: "1px solid #F0F0F0" }} />
          <Link
            href={PORTAL_HREF[user.role]}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            role="menuitem"
          >
            <LayoutDashboard className="size-[18px] text-neutral-500" />
            {PORTAL_LABEL[user.role]}
          </Link>
          {user.role === "buyer" && (
            <Link
              href="/buyer/help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              role="menuitem"
            >
              <Settings className="size-[18px] text-neutral-500" />
              Help & support
            </Link>
          )}
          <div className="my-2" style={{ borderTop: "1px solid #F0F0F0" }} />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            role="menuitem"
          >
            <LogOut className="size-[18px] text-neutral-500" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
