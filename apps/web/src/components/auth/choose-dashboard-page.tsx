"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ShoppingCart, Store } from "lucide-react";
import { AuthLayout } from "./auth-layout";
import {
  buildDemoUser,
  getUserRoles,
  useDemoUser,
  writeDemoUser,
  type UserRole,
} from "@/lib/demo-user";

const ONBOARDING_HREF: Record<UserRole, string> = {
  buyer: "/buyer/onboarding",
  seller: "/seller/onboarding",
  admin: "/admin/dashboard",
};

const OPTIONS: Array<{
  role: UserRole;
  title: string;
  description: string;
  Icon: typeof ShoppingCart;
}> = [
  {
    role: "buyer",
    title: "Continue as Buyer",
    description: "Search verified feedstocks, request quotes, and manage orders.",
    Icon: ShoppingCart,
  },
  {
    role: "seller",
    title: "Continue as Seller",
    description: "List byproducts, manage your pipeline, and track settlements.",
    Icon: Store,
  },
];

export function ChooseDashboardPage() {
  const user = useDemoUser();
  const router = useRouter();

  // Only offer the roles the account actually holds. Falls back to both when
  // the page is reached without a session (e.g. direct navigation).
  const available = user ? getUserRoles(user) : (["buyer", "seller"] as UserRole[]);
  const options = OPTIONS.filter((o) => available.includes(o.role));

  const choose = (role: UserRole) => {
    writeDemoUser(
      buildDemoUser(role, {
        name: user?.name,
        email: user?.email,
        roles: available,
      }),
    );
    router.push(ONBOARDING_HREF[role]);
  };

  return (
    <AuthLayout showImage={false} cardWidth="max-w-[640px]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Where would you like to start?
          </h1>
          <p className="text-base text-neutral-700">
            Your account has both buyer and seller access. Pick a dashboard to
            begin — you can switch anytime from the account menu.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {options.map(({ role, title, description, Icon }) => (
            <button
              key={role}
              type="button"
              onClick={() => choose(role)}
              className="group flex items-center gap-4 rounded-xl bg-white p-5 text-left transition-colors hover:bg-neutral-50"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                <Icon className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-neutral-900">{title}</p>
                <p className="text-sm text-neutral-600">{description}</p>
              </div>
              <ArrowRight className="size-5 text-neutral-400 transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
