import Link from "next/link";
import { Clock } from "lucide-react";

export type FeaturePortal = "buyer" | "seller" | "admin" | "public";

const homeFor: Record<FeaturePortal, { href: string; label: string }> = {
  buyer: { href: "/buyer/browse", label: "Back to marketplace" },
  seller: { href: "/seller/listings", label: "Back to listings" },
  admin: { href: "/admin/sales", label: "Back to sales" },
  public: { href: "/", label: "Back to home" },
};

/**
 * Truthful placeholder for features that are not part of the current release.
 * It never renders example records, so nothing here can be mistaken for live data.
 */
export function FeatureUnavailable({
  role,
  eyebrow,
  title,
  description,
}: {
  role: FeaturePortal;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const home = homeFor[role];
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-emerald-700">
          {eyebrow}
        </p>
        <h1 className="max-w-4xl text-3xl font-bold text-neutral-950">{title}</h1>
        <div className="mt-6 flex max-w-2xl gap-4 rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100">
            <Clock className="size-5 text-neutral-600" />
          </div>
          <div className="flex min-w-0 flex-col gap-2 text-sm">
            <p className="font-bold text-neutral-900">Not available in this release</p>
            <p className="text-neutral-600">{description}</p>
            <p className="text-neutral-500">
              No records are shown here because this feature is not connected to EcoGlobe data yet.
            </p>
            <Link
              href={home.href}
              className="mt-1 w-fit text-sm font-bold text-neutral-900 underline"
            >
              {home.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
