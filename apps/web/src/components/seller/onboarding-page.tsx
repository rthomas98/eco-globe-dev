"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Plus } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import {
  BackendApiError,
  completeBackendOnboarding,
  fetchOnboardingState,
  startBackendStripeOnboarding,
} from "@/lib/backend-auth";
import { getUserRoles, readDemoUser, useDemoUser } from "@/lib/demo-user";

type Step =
  | "welcome"
  | "business"
  | "product"
  | "sustainability"
  | "licence"
  | "stripe"
  | "success";

const totalSteps = 6; // welcome doesn't count, success doesn't count

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
              <p className="max-w-[420px] rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                {error}
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
              {isBusy ? "Saving..." : (nextLabel ?? "Next")}
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
  onBack,
  onNext,
}: {
  data: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const feedstockTypes = [
    { value: "", label: "-- Choose --" },
    { value: "plastics", label: "Plastics" },
    { value: "biomass", label: "Biomass & Wood" },
    { value: "rubber", label: "Rubber & Tire-Derived" },
    { value: "oils", label: "Oils & Liquid Feedstocks" },
    { value: "metals", label: "Metals & Alloys" },
    { value: "paper", label: "Paper & Cardboard" },
    { value: "textiles", label: "Textiles" },
  ];
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
            <Select
              label="What type of feedstock are you generating?"
              id="feedstockType"
              options={feedstockTypes}
              value={data.feedstockType}
              onChange={(e) => onChange("feedstockType", e.target.value)}
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
  files,
  onFilesChange,
  onBack,
  onNext,
  onSkip,
  isBusy,
  error,
}: {
  files: File[];
  onFilesChange: (f: File[]) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  isBusy?: boolean;
  error?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    onFilesChange([...files, ...Array.from(newFiles)]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <OnboardingLayout
      step="sustainability"
      currentStep={3}
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      isBusy={isBusy}
      error={error}
    >
      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">
            Sustainability Information
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            Upload certifications and supporting documents to get verified and
            increase buyer trust.
          </p>

          <p className="mb-3 text-sm font-medium text-neutral-900">Upload</p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-neutral-50 py-10 transition-colors hover:bg-neutral-100"
            style={{ border: "2px dashed #D0D0D0" }}
          >
            <p className="text-sm text-neutral-700">
              <span className="font-semibold">Drop file here</span> or
            </p>
            <span
              className="rounded-full px-4 py-1.5 text-sm font-medium text-neutral-700"
              style={{ border: "1px solid #D0D0D0" }}
            >
              Browse
            </span>
            <p className="text-xs text-neutral-400">
              Accepts .gif, .jpg, and .png
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".gif,.jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2"
                >
                  <span className="text-sm text-neutral-700">{f.name}</span>
                  <button
                    onClick={() =>
                      onFilesChange(files.filter((_, idx) => idx !== i))
                    }
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-neutral-900"
          >
            <Plus className="size-4" /> Add More
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 5: Licence Tier ─── */
function LicenceTierStep({
  tier,
  onTierChange,
  onBack,
  onNext,
  isBusy,
  error,
}: {
  tier: string;
  onTierChange: (t: string) => void;
  onBack: () => void;
  onNext: () => void;
  isBusy?: boolean;
  error?: string;
}) {
  return (
    <OnboardingLayout
      step="licence"
      currentStep={4}
      onBack={onBack}
      onNext={onNext}
      isBusy={isBusy}
      error={error}
    >
      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-[860px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">
            Choose your licence tier
          </h1>
          <p className="mb-8 max-w-[620px] text-base text-neutral-500">
            Every verified seller starts with a permanently free tier. Paid
            tiers unlock deeper search visibility and buyer-interest analytics
            when they launch.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onTierChange("free")}
              className={`rounded-2xl p-6 text-left transition-colors ${
                tier === "free"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-50 hover:bg-neutral-100"
              }`}
              style={
                tier === "free" ? undefined : { border: "1px solid #E0E0E0" }
              }
            >
              <p className="text-sm font-semibold uppercase tracking-wide">
                Free
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${tier === "free" ? "text-white" : "text-neutral-900"}`}
              >
                $0
              </p>
              <ul
                className={`mt-4 flex flex-col gap-2 text-sm ${tier === "free" ? "text-neutral-200" : "text-neutral-500"}`}
              >
                <li>Publish approved listings</li>
                <li>Teaser visibility to all buyers</li>
                <li>Category &amp; state-level search</li>
              </ul>
            </button>
            <div
              className="rounded-2xl bg-neutral-50 p-6 opacity-60"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Growth — coming soon
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">TBA</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-neutral-500">
                <li>Full listing detail for buyers</li>
                <li>ZIP-radius &amp; feedstock search</li>
                <li>Aggregate buyer-interest data</li>
              </ul>
            </div>
            <div
              className="rounded-2xl bg-neutral-50 p-6 opacity-60"
              style={{ border: "1px solid #E0E0E0" }}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Enterprise — coming soon
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">TBA</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-neutral-500">
                <li>Per-facility licensing</li>
                <li>Multi-site team management</li>
                <li>Assisted onboarding</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 6: Stripe Payouts ─── */
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
      currentStep={5}
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
    <OnboardingLayout step="success" currentStep={6}>
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
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/welcome">
              <Button variant="secondary" size="lg">
                View onboarding status
              </Button>
            </Link>
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
  const [licenceTier, setLicenceTier] = useState("free");
  const [businessData, setBusinessData] = useState({
    company: "",
    industry: "",
    address: "",
    website: "",
  });

  // Prefill from the company shell captured at sign-up.
  useEffect(() => {
    if (!readDemoUser()) return;
    let cancelled = false;
    fetchOnboardingState()
      .then((state) => {
        if (cancelled || !state.company) return;
        setBusinessData((prev) => ({
          ...prev,
          company: prev.company || state.company!.legalName,
        }));
      })
      .catch(() => {
        // No session yet — the guard handles redirects.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [productData, setProductData] = useState({
    feedstockType: "",
    generation: "",
    restrictions: "",
    annualVolume: "",
    specs: "",
    notes: "",
  });
  const [files, setFiles] = useState<File[]>([]);

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

  const completeSellerOnboarding = async () => {
    if (status === "saving") return;
    if (!user?.token) {
      setError("Please log in again before completing onboarding.");
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
        licenceTier,
      });
      setStep("stripe");
    } catch (err) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to save onboarding. Please check the backend and try again.",
      );
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
          onBack={() => setStep("business")}
          onNext={() => setStep("sustainability")}
        />
      );
    case "sustainability":
      return (
        <SustainabilityStep
          files={files}
          onFilesChange={setFiles}
          onBack={() => setStep("product")}
          onNext={() => setStep("licence")}
          onSkip={() => setStep("licence")}
          isBusy={false}
          error={error}
        />
      );
    case "licence":
      return (
        <LicenceTierStep
          tier={licenceTier}
          onTierChange={setLicenceTier}
          onBack={() => setStep("sustainability")}
          onNext={() => void completeSellerOnboarding()}
          isBusy={status === "saving"}
          error={error}
        />
      );
    case "stripe":
      return (
        <StripePayoutStep
          onBack={() => setStep("licence")}
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
