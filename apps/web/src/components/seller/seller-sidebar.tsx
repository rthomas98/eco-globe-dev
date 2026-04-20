"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutGrid, TrendingUp, Receipt, BarChart3, Settings, User } from "lucide-react";

const navItems = [
  { label: "Listings", href: "/seller/listings", icon: LayoutGrid },
  { label: "Sales", href: "/seller/sales", icon: TrendingUp },
  { label: "Accounting", href: "/seller/accounting", icon: Receipt },
  { label: "Reports", href: "/seller/reports", icon: BarChart3 },
];

export function SellerSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={`flex h-screen w-[240px] shrink-0 flex-col bg-white ${className ?? ""}`} style={{ borderRight: "1px solid #E0E0E0" }}>
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/">
          <Image src="/logo.svg" alt="EcoGlobe" width={100} height={28} className="invert" priority />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
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

      {/* Bottom */}
      <div className="flex flex-col gap-1 px-3 pb-4">
        <Link
          href="/seller/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <Settings className="size-5" />
          Settings
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200">
            <User className="size-4 text-neutral-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Jane S.</p>
            <p className="text-xs text-neutral-500">Seller</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
