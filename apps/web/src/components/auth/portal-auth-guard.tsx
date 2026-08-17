"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { refreshBackendSession } from "@/lib/backend-auth";
import {
  clearDemoUser,
  getUserRoles,
  readDemoUser,
  type UserRole,
} from "@/lib/demo-user";

type AccessState = "checking" | "allowed" | "redirecting";

export function PortalAuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("checking");

  useEffect(() => {
    let cancelled = false;

    const redirectToLogin = () => {
      if (cancelled) return;
      clearDemoUser();
      setAccess("redirecting");
      router.replace(
        `/login?next=${encodeURIComponent(pathname)}&reason=authentication-required`,
      );
    };

    const checkAccess = async () => {
      setAccess("checking");
      const localUser = readDemoUser();

      if (!localUser) {
        redirectToLogin();
        return;
      }

      const pendingOnboardingAccess =
        pathname === `/${requiredRole}/onboarding` &&
        !localUser.companies?.length &&
        getUserRoles(localUser).includes(requiredRole);

      try {
        const { authorizedRoles } = await refreshBackendSession(
          localUser.token,
        );
        if (cancelled) return;

        if (
          !authorizedRoles.includes(requiredRole) &&
          !pendingOnboardingAccess
        ) {
          setAccess("redirecting");
          router.replace(
            `/choose-dashboard?reason=access-denied&required=${requiredRole}`,
          );
          return;
        }

        setAccess("allowed");
      } catch {
        redirectToLogin();
      }
    };

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [pathname, requiredRole, router]);

  if (access !== "allowed") {
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-neutral-50 px-6"
        aria-live="polite"
      >
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-neutral-950">
              Securing the {requiredRole} workspace
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {access === "redirecting"
                ? "Redirecting you to the correct sign-in or dashboard…"
                : "Verifying your account and role…"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return children;
}
