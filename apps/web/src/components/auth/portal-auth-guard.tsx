"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@eco-globe/ui";
import { isBackendApiError, refreshBackendSession } from "@/lib/backend-auth";
import {
  clearDemoUser,
  getUserRoles,
  readDemoUser,
  type UserRole,
} from "@/lib/demo-user";

type AccessState = "checking" | "allowed" | "redirecting" | "unavailable";

/** Only a definitive 401/403 from the session endpoint ends the local session. */
function isSessionRejected(error: unknown) {
  return (
    isBackendApiError(error) &&
    (error.kind === "unauthorized" || error.kind === "forbidden")
  );
}

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
  const [attempt, setAttempt] = useState(0);

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
      } catch (error) {
        if (cancelled) return;
        // Network, timeout, server or unexpected errors do not prove the
        // session is invalid: stay fail-closed (children hidden) but keep the
        // local session so a retry or the next navigation can recover.
        if (isSessionRejected(error)) redirectToLogin();
        else setAccess("unavailable");
      }
    };

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [attempt, pathname, requiredRole, router]);

  if (access === "unavailable") {
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-neutral-50 px-6"
        role="alert"
      >
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <ShieldAlert className="size-7" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-neutral-950">
              We couldn&apos;t verify your {requiredRole} access
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              The EcoGlobe service didn&apos;t respond. You&apos;re still signed
              in — try again in a moment.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setAttempt((value) => value + 1)}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </main>
    );
  }

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
