"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import {
  BackendApiError,
  completeBackendOnboarding,
  startBackendStripeOnboarding,
} from "@/lib/backend-auth";
import { getUserRoles, useDemoUser } from "@/lib/demo-user";

type Step =
  | "welcome"
  | "business"
  | "products"
  | "sustainability"
  | "stripe"
  | "success";

const totalSteps = 5;

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
        {step !== "welcome" && (
          <Link
            href="/"
            className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          >
            <X className="size-5" />
          </Link>
        )}
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      {showNav && (
        <div className="relative">
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
        <div className="flex w-full max-w-[1000px] flex-col items-center gap-10 lg:flex-row lg:gap-16">
          <div className="flex-1">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600">
              Buyer
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-neutral-900 lg:text-5xl">
              Welcome to
              <br />
              EcoGlobe
            </h1>
            <p className="mb-2 text-base leading-relaxed text-neutral-500">
              Ecoglobe is a global platform connecting verified sellers and
              responsible buyers through transparent sustainability data and
              trusted trade workflows.
            </p>
            <p className="text-base leading-relaxed text-neutral-500">
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

/* ─── Step 2: Sourcing Needs ─── */
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
            Tell Us About Your Sourcing Needs
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            This helps us surface the most relevant sellers.
          </p>
          <div className="flex flex-col gap-6">
            <Input
              label="Company name"
              id="company"
              value={data.company}
              onChange={(e) => onChange("company", e.target.value)}
            />
            <Input
              label="Job title"
              id="jobTitle"
              value={data.jobTitle}
              onChange={(e) => onChange("jobTitle", e.target.value)}
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

/* ─── Step 3: Products of Interest ─── */
function ProductsStep({
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
      step="products"
      currentStep={2}
      onBack={onBack}
      onNext={onNext}
    >
      <div className="flex flex-1 justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">
            Products of interest
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            Tell us about the products you&apos;re interested
          </p>
          <div className="flex flex-col gap-6">
            <Select
              label="What type of feedstock are you looking for?"
              id="feedstockType"
              options={feedstockTypes}
              value={data.feedstockType}
              onChange={(e) => onChange("feedstockType", e.target.value)}
            />
            <Input
              label="What will you use this feedstock for?"
              id="usage"
              value={data.usage}
              onChange={(e) => onChange("usage", e.target.value)}
            />
            <Select
              label="Any restrictions?"
              id="restrictions"
              options={restrictionOptions}
              value={data.restrictions}
              onChange={(e) => onChange("restrictions", e.target.value)}
            />
            <Input
              label="How much feedstock will you need per year?"
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

/* ─── Step 4: Sustainability Preferences ─── */
function SustainabilityStep({
  data,
  onChange,
  onBack,
  onNext,
  onSkip,
  isBusy,
  error,
}: {
  data: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  isBusy?: boolean;
  error?: string;
}) {
  const certOptions = [
    { value: "", label: "-- Choose --" },
    { value: "iscc-eu", label: "ISCC EU" },
    { value: "iscc-plus", label: "ISCC PLUS" },
    { value: "rsb", label: "RSB" },
    { value: "fsc", label: "FSC" },
    { value: "grs", label: "GRS" },
  ];
  const regionOptions = [
    { value: "", label: "-- Choose --" },
    { value: "north-america", label: "North America" },
    { value: "south-america", label: "South America" },
    { value: "europe", label: "Europe" },
    { value: "asia", label: "Asia" },
    { value: "africa", label: "Africa" },
    { value: "oceania", label: "Oceania" },
  ];
  const complianceOptions = [
    { value: "", label: "-- Choose --" },
    { value: "reach", label: "REACH" },
    { value: "rohs", label: "RoHS" },
    { value: "eu-deforestation", label: "EU Deforestation Regulation" },
    { value: "us-tsca", label: "US TSCA" },
  ];

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
            Sustainability Preferences
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            you can update this anytime.
          </p>
          <div className="flex flex-col gap-6">
            <Select
              label="Preferred certifications"
              id="certifications"
              options={certOptions}
              value={data.certifications}
              onChange={(e) => onChange("certifications", e.target.value)}
            />
            <Select
              label="Regions"
              id="regions"
              options={regionOptions}
              value={data.regions}
              onChange={(e) => onChange("regions", e.target.value)}
            />
            <Select
              label="Compliance requirements"
              id="compliance"
              options={complianceOptions}
              value={data.compliance}
              onChange={(e) => onChange("compliance", e.target.value)}
            />
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 5: Stripe Billing ─── */
function StripeBillingStep({
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
      nextLabel="Set up Stripe billing"
      isBusy={isBusy}
      error={error}
    >
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[680px] rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Billing readiness
          </p>
          <h1 className="mb-4 text-3xl font-bold text-neutral-900">
            Connect Stripe for secure buyer payments
          </h1>
          <p className="mb-6 text-base leading-7 text-neutral-600">
            EcoGlobe uses Stripe to securely collect buyer payment methods
            before orders, support escrow funding, and keep card or bank details
            out of EcoGlobe systems.
          </p>
          <div className="grid gap-3 text-sm text-neutral-700 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold text-neutral-900">Payment method</p>
              <p className="mt-2">
                Store buyer billing details through Stripe-hosted setup.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold text-neutral-900">Escrow ready</p>
              <p className="mt-2">
                Prepare funding for transactions above EcoGlobe thresholds.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold text-neutral-900">Demo safe</p>
              <p className="mt-2">
                Local setup records readiness without requiring live keys.
              </p>
            </div>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 5: Success ─── */
function SuccessStep() {
  return (
    <OnboardingLayout step="success" currentStep={5}>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-[500px] flex-col items-center text-center">
          <span className="mb-6 text-6xl">🎉</span>
          <h1 className="mb-3 text-3xl font-bold text-neutral-900">
            Your Buyer Account Is Ready
          </h1>
          <p className="mb-8 text-base text-neutral-500">
            You can now explore verified sellers and start sourcing with
            confidence.
          </p>
          <div className="flex gap-4">
            <Link href="/buyer/browse">
              <Button variant="secondary" size="lg">
                Go to Buyer Dashboard
              </Button>
            </Link>
            <Link href="/buyer/browse">
              <Button variant="primary" size="lg">
                Browse Product
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Main Buyer Onboarding ─── */
export function BuyerOnboardingPage() {
  const user = useDemoUser();
  const [step, setStep] = useState<Step>("welcome");
  const [status, setStatus] = useState<"idle" | "saving" | "stripe">("idle");
  const [error, setError] = useState("");
  const [businessData, setBusinessData] = useState({
    company: "",
    jobTitle: "",
    industry: "",
    address: "",
    website: "",
  });
  const [productData, setProductData] = useState({
    feedstockType: "",
    usage: "",
    restrictions: "",
    annualVolume: "",
    specs: "",
    notes: "",
  });
  const [sustainabilityData, setSustainabilityData] = useState({
    certifications: "",
    regions: "",
    compliance: "",
  });

  const updateBusiness = (k: string, v: string) =>
    setBusinessData((p) => ({ ...p, [k]: v }));
  const updateProduct = (k: string, v: string) =>
    setProductData((p) => ({ ...p, [k]: v }));
  const updateSustainability = (k: string, v: string) =>
    setSustainabilityData((p) => ({ ...p, [k]: v }));
  const getOnboardingRole = () =>
    user && getUserRoles(user).includes("seller") ? "both" : "buyer";

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

  const completeBuyerOnboarding = async () => {
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
        activeRole: "buyer",
        fallbackRoles:
          getOnboardingRole() === "both" ? ["buyer", "seller"] : ["buyer"],
        companyName: businessData.company || `${user.name}'s company`,
        industry: businessData.industry,
        jobTitle: businessData.jobTitle,
        website: businessData.website,
        address: businessData.address,
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

  const startStripeBilling = async () => {
    if (status === "stripe") return;
    if (!user?.token) {
      setError("Please log in again before setting up Stripe billing.");
      return;
    }

    setStatus("stripe");
    setError("");

    try {
      const returnUrl = `${window.location.origin}/buyer/onboarding`;
      const stripe = await startBackendStripeOnboarding({
        token: user.token,
        role: "buyer",
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
          : "Unable to start Stripe billing setup. Please check the backend and try again.",
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
          onNext={() => setStep("products")}
        />
      );
    case "products":
      return (
        <ProductsStep
          data={productData}
          onChange={updateProduct}
          onBack={() => setStep("business")}
          onNext={() => setStep("sustainability")}
        />
      );
    case "sustainability":
      return (
        <SustainabilityStep
          data={sustainabilityData}
          onChange={updateSustainability}
          onBack={() => setStep("products")}
          onNext={() => void completeBuyerOnboarding()}
          onSkip={() => void completeBuyerOnboarding()}
          isBusy={status === "saving"}
          error={error}
        />
      );
    case "stripe":
      return (
        <StripeBillingStep
          onBack={() => setStep("sustainability")}
          onNext={() => void startStripeBilling()}
          onSkip={() => setStep("success")}
          isBusy={status === "stripe"}
          error={error}
        />
      );
    case "success":
      return <SuccessStep />;
  }
}
