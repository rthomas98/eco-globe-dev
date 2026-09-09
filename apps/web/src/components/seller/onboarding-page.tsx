"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, FileText } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import {
  BackendApiError,
  completeBackendOnboarding,
  readBackendOnboarding,
  startBackendStripeOnboarding,
} from "@/lib/backend-auth";
import { getUserRoles, useDemoUser } from "@/lib/demo-user";
import {
  FeedstockInterestsField,
  OTHERS_CODE,
  feedstockInterestsValid,
  type FeedstockInterestValue,
} from "@/components/onboarding/feedstock-interests";

type Step =
  | "welcome"
  | "business"
  | "product"
  | "sustainability"
  | "stripe"
  | "success";

const totalSteps = 5; // welcome doesn't count, success doesn't count

function OnboardingLayout({
  step,
  currentStep,
  children,
  onBack,
  onNext,
  onSkip,
  nextLabel,
  isBusy,
  error,
  retryable,
}: {
  step: Step;
  currentStep: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  isBusy?: boolean;
  error?: string;
  /** True on the step whose Next performs the backend save, so an error offers Retry. */
  retryable?: boolean;
}) {
  const showNav = step !== "welcome" && step !== "success";
  const progress = currentStep / totalSteps;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
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
        {step !== "success" && (
          <Link
            href="/register"
            aria-label="Cancel and return to register"
            title="Cancel"
            className="flex size-10 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200"
          >
            <X className="size-5 text-neutral-700" />
          </Link>
        )}
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col">{children}</div>

      {/* Bottom nav */}
      {showNav && (
        <div className="relative">
          {/* Progress bar */}
          <div className="h-1 w-full bg-neutral-100">
            <div
              className="h-full bg-neutral-900 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-6 py-4 sm:px-10">
            <Button variant="secondary" size="md" onClick={onBack}>
              Back
            </Button>
            {error ? (
              <p role="alert" className="max-w-[420px] rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                {error}
                {error.includes("sign in") && (
                  <>
                    {" "}
                    <Link href="/login?next=%2Fseller%2Fonboarding" className="font-bold underline">Sign in</Link>
                  </>
                )}
              </p>
            ) : (
              <div />
            )}
            <Button
              variant="primary"
              size="md"
              onClick={onNext}
              className="min-w-[160px]"
              disabled={isBusy}
              style={
                isBusy ? { opacity: 0.5, cursor: "not-allowed" } : undefined
              }
            >
              {isBusy ? "Saving..." : error && retryable && !nextLabel ? "Retry" : (nextLabel ?? "Next")}
            </Button>
            {onSkip ? (
              <Button
                variant="secondary"
                size="md"
                onClick={onSkip}
                disabled={isBusy}
              >
                Skip, I&apos;ll do it later
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Step 1: Welcome ─── */
function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <OnboardingLayout step="welcome" currentStep={0}>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-[1000px] w-full flex-col items-center gap-10 lg:flex-row lg:gap-16">
          <div className="flex-1">
            <p className="mb-3 text-sm font-semibold tracking-wide text-amber-600 uppercase">
              Seller
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-neutral-900 lg:text-5xl">
              Welcome to
              <br />
              EcoGlobe
            </h1>
            <p className="mb-2 text-base text-neutral-500 leading-relaxed">
              Ecoglobe is a global platform connecting verified sellers and
              responsible buyers through transparent sustainability data and
              trusted trade workflows.
            </p>
            <p className="text-base text-neutral-500 leading-relaxed">
              Get started by choosing how you&apos;d like to use the platform.
            </p>
          </div>
          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl">
            <img
              src="/hero.jpg"
              alt="Industrial facility"
              className="h-[360px] w-full object-cover"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-center px-6 pb-10">
        <Button
          variant="primary"
          size="lg"
          className="min-w-[200px]"
          onClick={onStart}
        >
          Start
        </Button>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 2: Business Info ─── */
function BusinessStep({
  data,
  onChange,
  onBack,
  onNext,
}: {
  data: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <OnboardingLayout
      step="business"
      currentStep={1}
      onBack={onBack}
      onNext={onNext}
    >
      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">
            Tell us about your business
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            This information helps buyers understand who you are.
          </p>
          <div className="flex flex-col gap-6">
            <Input
              label="Company name"
              id="company"
              value={data.company}
              onChange={(e) => onChange("company", e.target.value)}
            />
            <Input
              label="What industry are you working on?"
              id="industry"
              value={data.industry}
              onChange={(e) => onChange("industry", e.target.value)}
            />
            <Input
              label="Address"
              id="address"
              value={data.address}
              onChange={(e) => onChange("address", e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">
                Website <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                type="text"
                value={data.website}
                onChange={(e) => onChange("website", e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400"
                style={{ border: "1px solid #E0E0E0" }}
              />
            </div>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 3: What Do You Sell ─── */
function ProductStep({
  data,
  onChange,
  interests,
  onInterestsChange,
  onBack,
  onNext,
  error,
}: {
  data: Record<string, string>;
  onChange: (k: string, v: string) => void;
  interests: FeedstockInterestValue;
  onInterestsChange: (next: FeedstockInterestValue) => void;
  onBack: () => void;
  onNext: () => void;
  error?: string;
}) {
  const restrictionOptions = [
    { value: "", label: "-- Choose --" },
    { value: "none", label: "No restrictions" },
    { value: "hazardous", label: "Hazardous material handling required" },
    { value: "export", label: "Export restrictions apply" },
    { value: "temperature", label: "Temperature-controlled storage needed" },
  ];

  return (
    <OnboardingLayout
      step="product"
      currentStep={2}
      onBack={onBack}
      onNext={onNext}
      error={error}
    >
      <div className="flex flex-1 justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">
            What Do You Sell?
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            You can add detailed product information later.
          </p>
          <div className="flex flex-col gap-6">
            <FeedstockInterestsField
              label="What type of feedstock are you generating?"
              value={interests}
              onChange={onInterestsChange}
              otherLabel="Describe the feedstock you generate"
            />
            <Input
              label="Could you tell us how this feedstock was generated?"
              id="generation"
              value={data.generation}
              onChange={(e) => onChange("generation", e.target.value)}
            />
            <Select
              label="Any restrictions?"
              id="restrictions"
              options={restrictionOptions}
              value={data.restrictions}
              onChange={(e) => onChange("restrictions", e.target.value)}
            />
            <Input
              label="How much feedstock will you generate per year?"
              id="annualVolume"
              value={data.annualVolume}
              onChange={(e) => onChange("annualVolume", e.target.value)}
            />
            <Input
              label="What are the specs of the feedstock"
              id="specs"
              value={data.specs}
              onChange={(e) => onChange("specs", e.target.value)}
            />
            <Input
              label="Something else that we should know?"
              id="notes"
              value={data.notes}
              onChange={(e) => onChange("notes", e.target.value)}
            />
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 4: Sustainability ─── */
function SustainabilityStep({
  onBack,
  onNext,
  onSkip,
  isBusy,
  error,
}: {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  isBusy?: boolean;
  error?: string;
}) {
  return (
    <OnboardingLayout
      step="sustainability"
      currentStep={3}
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      isBusy={isBusy}
      error={error}
      retryable
    >
      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">
            Safety &amp; Sustainability Information
          </h1>
          <p className="mb-6 text-base text-neutral-500">
            Every feedstock you list must carry a Safety Data Sheet (SDS). Sustainability
            certifications increase buyer trust and help your listings get verified.
          </p>

          <div className="mb-4 rounded-xl bg-amber-50 p-4" style={{ border: "1px solid #FDE68A" }}>
            <p className="mb-1 flex items-center gap-2 text-sm font-bold text-neutral-900">
              <FileText className="size-4" />
              Safety Data Sheet (SDS) — required per listing
            </p>
            <p className="text-sm text-neutral-700">
              Upload the SDS as a PDF (EU REACH or equivalent local format) when you create each
              listing. Buyers cannot purchase a feedstock until its SDS is on file.
            </p>
          </div>

          <div className="rounded-xl bg-neutral-50 p-4" style={{ border: "1px solid #E0E0E0" }}>
            <p className="mb-1 text-sm font-bold text-neutral-900">Sustainability certifications</p>
            <p className="text-sm text-neutral-700">
              Certifications such as ISCC, RSB, FSC or GRS are uploaded as PDF documents on each
              listing, alongside listing photos (PNG, JPEG or WebP). Files up to 5 MB are stored
              with the listing and shown to buyers once the listing is published.
            </p>
          </div>

          <p className="mt-6 text-xs text-neutral-500">
            Documents are attached to individual listings so buyers always see the SDS that matches
            the material they are buying. Finish onboarding, then add your first listing to upload them.
          </p>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 5: Stripe Payouts ─── */
function StripePayoutStep({
  onBack,
  onNext,
  onSkip,
  isBusy,
  error,
}: {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  isBusy?: boolean;
  error?: string;
}) {
  return (
    <OnboardingLayout
      step="stripe"
      currentStep={4}
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      nextLabel="Set up Stripe payouts"
      isBusy={isBusy}
      error={error}
    >
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[680px] rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Payout readiness
          </p>
          <h1 className="mb-4 text-3xl font-bold text-neutral-900">
            Connect Stripe for seller payouts
          </h1>
          <p className="mb-6 text-base leading-7 text-neutral-600">
            EcoGlobe uses Stripe Connect to verify sellers, route escrow
            releases, and send payouts after delivery and dispute windows are
            complete.
          </p>
          <div className="grid gap-3 text-sm text-neutral-700 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold text-neutral-900">Connect account</p>
              <p className="mt-2">
                Prepare the seller company for payout onboarding.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold text-neutral-900">
                Verification flow
              </p>
              <p className="mt-2">
                Use Stripe-hosted onboarding when live keys are configured.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold text-neutral-900">Demo safe</p>
              <p className="mt-2">
                Local setup records payout readiness without real keys.
              </p>
            </div>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 6: Success ─── */
function SuccessStep() {
  return (
    <OnboardingLayout step="success" currentStep={5}>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-[500px] flex-col items-center text-center">
          <span className="mb-6 text-6xl">🎉</span>
          <h1 className="mb-3 text-3xl font-bold text-neutral-900">
            Your Seller Account Is Created
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            You can now complete verification, manage products, and prepare your
            profile for buyers.
          </p>
          <div className="flex gap-4">
            <Link href="/seller/listings">
              <Button variant="secondary" size="lg">
                Go to Seller Dashboard
              </Button>
            </Link>
            <Link href="/seller/listings">
              <Button variant="primary" size="lg">
                Add Product
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Main Onboarding Component ─── */
export function SellerOnboardingPage() {
  const user = useDemoUser();
  const [step, setStep] = useState<Step>("welcome");
  const [status, setStatus] = useState<"idle" | "saving" | "stripe">("idle");
  const [error, setError] = useState("");
  const [businessData, setBusinessData] = useState({
    company: "",
    industry: "",
    address: "",
    website: "",
  });
  const [productData, setProductData] = useState({
    generation: "",
    restrictions: "",
    annualVolume: "",
    specs: "",
    notes: "",
  });
  const [interests, setInterests] = useState<FeedstockInterestValue>({
    codes: [],
    otherDescription: "",
  });
  const [prefilled, setPrefilled] = useState(false);

  const updateBusiness = (k: string, v: string) =>
    setBusinessData((p) => ({ ...p, [k]: v }));
  const updateProduct = (k: string, v: string) =>
    setProductData((p) => ({ ...p, [k]: v }));
  const getOnboardingRole = () =>
    user && getUserRoles(user).includes("buyer") ? "both" : "seller";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success") {
      setStep("success");
    }
    if (params.get("stripe") === "cancelled") {
      setStep("stripe");
      setError(
        "Stripe setup was cancelled. You can start it again or skip for now.",
      );
    }
  }, []);

  // Recover previously saved onboarding preferences so a retry or a returning
  // user never has to re-enter what the backend already holds.
  useEffect(() => {
    if (!user?.token || prefilled) return;
    let cancelled = false;
    readBackendOnboarding(user.token)
      .then((saved) => {
        if (cancelled || !saved) return;
        setBusinessData((prev) => ({
          ...prev,
          industry: prev.industry || saved.industry || "",
          website: prev.website || saved.website || "",
        }));
        setInterests((prev) =>
          prev.codes.length > 0
            ? prev
            : {
                codes: saved.feedstockInterests ?? [],
                otherDescription: saved.otherFeedstockInterest ?? "",
              },
        );
      })
      .catch(() => {
        // Prefill is best-effort; the form still works without it.
      })
      .finally(() => {
        if (!cancelled) setPrefilled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.token, prefilled]);

  const completeSellerOnboarding = async () => {
    if (status === "saving") return;
    if (!user?.token) {
      setError("Your session has expired. Please sign in again to continue; your entries stay on this page.");
      return;
    }
    if (!feedstockInterestsValid(interests)) {
      setError("Describe the feedstock you generate when Others is selected.");
      setStep("product");
      return;
    }

    setStatus("saving");
    setError("");

    try {
      await completeBackendOnboarding({
        token: user.token,
        role: getOnboardingRole(),
        activeRole: "seller",
        fallbackRoles:
          getOnboardingRole() === "both" ? ["buyer", "seller"] : ["seller"],
        companyName: businessData.company || `${user.name}'s company`,
        industry: businessData.industry,
        website: businessData.website,
        address: businessData.address,
        feedstockInterests: interests.codes,
        otherFeedstockInterest: interests.codes.includes(OTHERS_CODE)
          ? interests.otherDescription.trim()
          : null,
      });
      setStep("stripe");
    } catch (err) {
      if (err instanceof BackendApiError && err.kind === "unauthorized") {
        setError("Your session has expired. Please sign in again; nothing you entered was lost.");
      } else if (err instanceof BackendApiError) {
        setError(`${err.message}${err.retryable ? " Your entries were kept — use Retry." : ""}`);
      } else {
        setError("Unable to save onboarding. Your entries were kept — please try again.");
      }
    } finally {
      setStatus("idle");
    }
  };

  const startStripePayouts = async () => {
    if (status === "stripe") return;
    if (!user?.token) {
      setError("Please log in again before setting up Stripe payouts.");
      return;
    }

    setStatus("stripe");
    setError("");

    try {
      const returnUrl = `${window.location.origin}/seller/onboarding`;
      const stripe = await startBackendStripeOnboarding({
        token: user.token,
        role: "seller",
        returnUrl,
        refreshUrl: returnUrl,
      });

      if (stripe.mode === "stripe") {
        window.location.href = stripe.redirectUrl;
        return;
      }

      setStep("success");
    } catch (err) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to start Stripe payout setup. Please check the backend and try again.",
      );
    } finally {
      setStatus("idle");
    }
  };

  switch (step) {
    case "welcome":
      return <WelcomeStep onStart={() => setStep("business")} />;
    case "business":
      return (
        <BusinessStep
          data={businessData}
          onChange={updateBusiness}
          onBack={() => setStep("welcome")}
          onNext={() => setStep("product")}
        />
      );
    case "product":
      return (
        <ProductStep
          data={productData}
          onChange={updateProduct}
          interests={interests}
          onInterestsChange={setInterests}
          onBack={() => setStep("business")}
          onNext={() => {
            if (!feedstockInterestsValid(interests)) {
              setError("Describe the feedstock you generate when Others is selected.");
              return;
            }
            setError("");
            setStep("sustainability");
          }}
          error={step === "product" ? error : undefined}
        />
      );
    case "sustainability":
      return (
        <SustainabilityStep
          onBack={() => setStep("product")}
          onNext={() => void completeSellerOnboarding()}
          onSkip={() => void completeSellerOnboarding()}
          isBusy={status === "saving"}
          error={error}
        />
      );
    case "stripe":
      return (
        <StripePayoutStep
          onBack={() => setStep("sustainability")}
          onNext={() => void startStripePayouts()}
          onSkip={() => setStep("success")}
          isBusy={status === "stripe"}
          error={error}
        />
      );
    case "success":
      return <SuccessStep />;
  }
}
