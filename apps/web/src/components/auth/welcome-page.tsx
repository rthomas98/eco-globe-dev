"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Compass,
  Search,
  ShoppingCart,
  Store,
} from "lucide-react";
import { Button } from "@eco-globe/ui";
import {
  fetchOnboardingState,
  type OnboardingState,
} from "@/lib/backend-auth";
import { getUserRoles, readDemoUser, useDemoUser } from "@/lib/demo-user";

type StepStatus = "approved" | "in_progress" | "under_review" | "not_started";

const STATUS_LABELS: Record<StepStatus, string> = {
  approved: "Approved",
  in_progress: "In progress",
  under_review: "Under review",
  not_started: "Not started",
};

const STATUS_STYLES: Record<StepStatus, string> = {
  approved: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-amber-50 text-amber-700",
  under_review: "bg-sky-50 text-sky-700",
  not_started: "bg-neutral-100 text-neutral-500",
};

function StatusBadge({ status }: { status: StepStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ChecklistRow({
  title,
  description,
  status,
  href,
  cta,
}: {
  title: string;
  description: string;
  status: StepStatus;
  href?: string;
  cta?: string;
}) {
  const Icon =
    status === "approved"
      ? CheckCircle2
      : status === "under_review"
        ? Clock3
        : Circle;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 size-5 ${
            status === "approved"
              ? "text-emerald-600"
              : status === "under_review"
                ? "text-sky-600"
                : "text-neutral-300"
          }`}
        />
        <div>
          <p className="font-semibold text-neutral-900">{title}</p>
          <p className="text-sm text-neutral-500">{description}</p>
          {href && cta && status !== "approved" && (
            <Link
              href={href}
              className="mt-1 inline-block text-sm font-bold text-neutral-900 underline"
            >
              {cta}
            </Link>
          )}
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

export function WelcomePage() {
  const router = useRouter();
  const user = useDemoUser();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // No local session — skip the API call so pre-login views stay quiet.
    if (!readDemoUser()) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    fetchOnboardingState()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        // Without a valid session the welcome page renders the explorer view.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded && !user) {
      router.replace("/login?next=%2Fwelcome");
    }
  }, [loaded, user, router]);

  const roles = user ? getUserRoles(user) : [];
  const company = state?.company;
  const isExplorer = loaded && !company;
  const isPendingJoin = Boolean(
    company &&
      company.memberRoleCode !== "owner" &&
      company.memberStatusCode !== "active",
  );
  const isSellerJourney =
    company?.companyTypeCode === "seller" || company?.companyTypeCode === "both";
  const isBuyerJourney =
    company?.companyTypeCode === "buyer" || company?.companyTypeCode === "both";

  const companyStatus: StepStatus = company ? "approved" : "not_started";
  const addressStatus: StepStatus = state?.checklist.addressProvided
    ? "approved"
    : company
      ? "in_progress"
      : "not_started";
  const sellerOnboardingStatus: StepStatus = state?.sellerProfile
    ? "approved"
    : isSellerJourney
      ? "in_progress"
      : "not_started";
  const buyerOnboardingStatus: StepStatus = state?.buyerProfile
    ? "approved"
    : isBuyerJourney
      ? "in_progress"
      : "not_started";
  const verificationStatus: StepStatus =
    company?.verificationStatusCode === "verified"
      ? "approved"
      : company
        ? "under_review"
        : "not_started";

  const portalHref = roles.includes("seller")
    ? "/seller/listings"
    : roles.includes("buyer")
      ? "/buyer/browse"
      : "/browse";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm sm:px-10">
        <Link href="/">
          <Image
            src="/logo.svg"
            alt="EcoGlobe"
            width={110}
            height={32}
            className="invert"
            priority
          />
        </Link>
        <Link href={portalHref} className="text-sm font-bold underline">
          Skip to marketplace
        </Link>
      </header>

      <main className="mx-auto max-w-[860px] px-6 py-12">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-600">
          {isExplorer ? "Explorer" : "Welcome"}
        </p>
        <h1 className="mb-3 text-4xl font-bold text-neutral-900">
          Welcome to EcoGlobe{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mb-10 max-w-[600px] text-base leading-7 text-neutral-500">
          {isPendingJoin
            ? "Your company already has an EcoGlobe account, so we sent a request to join its team instead of creating a duplicate."
            : isExplorer
              ? "Your explorer account is permanent and free. Browse the marketplace, save interests, and set up your company whenever you are ready to transact."
              : "Sign-up confirmed who you are and what you want to do. The steps below confirm your company and unlock marketplace capabilities as they are approved."}
        </p>

        {isPendingJoin ? (
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 size-5 text-sky-600" />
                  <div>
                    <p className="font-semibold text-neutral-900">
                      Join request sent to {company?.legalName}
                    </p>
                    <p className="mt-1 max-w-[520px] text-sm text-neutral-500">
                      The Company Owner decides what each team member is
                      allowed to do. You&apos;ll get access to the company
                      workspace once they approve your request and assign your
                      responsibilities.
                    </p>
                  </div>
                </div>
                <StatusBadge status="under_review" />
              </div>
            </section>
            <div className="flex flex-wrap gap-4">
              <Link href="/browse">
                <Button variant="primary" size="lg">
                  Browse the marketplace while you wait
                </Button>
              </Link>
            </div>
          </div>
        ) : isExplorer ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/browse"
              className="rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <Search className="mb-3 size-6 text-neutral-900" />
              <p className="font-bold text-neutral-900">Browse listings</p>
              <p className="mt-1 text-sm text-neutral-500">
                Explore material categories and regional availability.
              </p>
            </Link>
            <Link
              href="/buyer/onboarding"
              className="rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <ShoppingCart className="mb-3 size-6 text-neutral-900" />
              <p className="font-bold text-neutral-900">Become a buyer</p>
              <p className="mt-1 text-sm text-neutral-500">
                Set up your company to request quotes and purchase.
              </p>
            </Link>
            <Link
              href="/seller/onboarding"
              className="rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <Store className="mb-3 size-6 text-neutral-900" />
              <p className="font-bold text-neutral-900">Become a seller</p>
              <p className="mt-1 text-sm text-neutral-500">
                List your material streams for verified buyers.
              </p>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-neutral-900">
                Required now
              </h2>
              <p className="mb-4 text-sm text-neutral-500">
                These unlock your day-to-day marketplace tools.
              </p>
              <ChecklistRow
                title="Create your company"
                description={
                  company
                    ? `${company.legalName} is set up with you as ${
                        company.memberRoleCode === "owner"
                          ? "Company Owner"
                          : company.memberRoleCode
                      }.`
                    : "Tell us who you are transacting as."
                }
                status={companyStatus}
              />
              {isSellerJourney && (
                <ChecklistRow
                  title="Complete seller onboarding"
                  description="Business details, materials you generate, and payout readiness."
                  status={sellerOnboardingStatus}
                  href="/seller/onboarding"
                  cta="Continue seller onboarding"
                />
              )}
              {state?.sellerProfile?.licenceTierCode && (
                <ChecklistRow
                  title="Licence tier"
                  description={`Your seller licence is on the ${state.sellerProfile.licenceTierCode} tier.`}
                  status="approved"
                />
              )}
              {isBuyerJourney && (
                <ChecklistRow
                  title="Complete buyer onboarding"
                  description="Receiving site and the materials you want to source."
                  status={buyerOnboardingStatus}
                  href="/buyer/onboarding"
                  cta="Continue buyer onboarding"
                />
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-neutral-900">
                Required later
              </h2>
              <p className="mb-4 text-sm text-neutral-500">
                Needed before you publish listings or move money — not before
                you look around.
              </p>
              <ChecklistRow
                title="Facility address"
                description="Your default pickup or delivery site."
                status={addressStatus}
              />
              <ChecklistRow
                title="Company verification"
                description="EcoGlobe reviews your company details and confirms your account."
                status={verificationStatus}
              />
            </section>

            <div className="flex flex-wrap gap-4">
              <Link href={portalHref}>
                <Button variant="primary" size="lg">
                  Go to your dashboard
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="secondary" size="lg">
                  <Compass className="mr-2 inline size-4" />
                  Browse the marketplace
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
