"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  ADMIN_AUTH_EVENT,
  readAdminSession,
  type AdminSession,
} from "@eco-globe/shared/admin-auth";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const syncSession = () => {
      const nextSession = readAdminSession();
      setSession(nextSession);
      setChecking(false);
    };

    syncSession();
    window.addEventListener(ADMIN_AUTH_EVENT, syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(ADMIN_AUTH_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!checking && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [checking, pathname, router, session]);

  if (checking || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-400 text-neutral-950">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold">Securing the admin workspace</p>
            <p className="mt-1 text-sm text-neutral-400">
              Checking your access…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return children;
}
