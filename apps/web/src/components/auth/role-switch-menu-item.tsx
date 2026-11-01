"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight, Plus } from "lucide-react";
import { buildDemoUser, getUserRoles, hasRole, useDemoUser, writeDemoUser } from "@/lib/demo-user";

type MarketplaceRole = "buyer" | "seller";

const LABEL: Record<MarketplaceRole, string> = { buyer: "Buyer", seller: "Seller" };

/**
 * Sidebar user-menu item for moving between the buyer and seller portals. Accounts that hold the
 * target role switch directly; others are offered "Add … access", which opens the dashboard
 * chooser and that role's onboarding, matching the header menu. A switch the backend would
 * refuse (a buyer-only company switching to seller) is never offered.
 */
export function RoleSwitchMenuItem({
  target,
  onSwitch,
  onNavigate,
  disabled,
}: {
  target: MarketplaceRole;
  onSwitch: () => void;
  onNavigate: () => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const user = useDemoUser();
  const canSwitch = !!user && hasRole(user, target);
  const addAccess = () => {
    if (!user) return;
    writeDemoUser(
      buildDemoUser(user.role, {
        name: user.name,
        email: user.email,
        roles: Array.from(new Set([...getUserRoles(user), target])),
      }),
    );
    onNavigate();
    router.push("/choose-dashboard");
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={canSwitch ? onSwitch : addAccess}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
    >
      {canSwitch ? (
        <>
          <ArrowLeftRight className="size-[18px] text-neutral-500" />
          Switch to {LABEL[target]}
        </>
      ) : (
        <>
          <Plus className="size-[18px] text-neutral-500" />
          Add {LABEL[target]} access
        </>
      )}
    </button>
  );
}
