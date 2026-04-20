"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Plus } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";

type Step = "welcome" | "business" | "product" | "sustainability" | "success";

const totalSteps = 4; // welcome doesn't count, success doesn't count

function OnboardingLayout({ step, currentStep, children, onBack, onNext, onSkip, nextLabel }: {
  step: Step; currentStep: number; children: React.ReactNode;
  onBack?: () => void; onNext?: () => void; onSkip?: () => void; nextLabel?: string;
}) {
  const showNav = step !== "welcome" && step !== "success";
  const progress = currentStep / totalSteps;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/">
          <Image src="/logo.svg" alt="EcoGlobe" width={110} height={32} className="invert" priority />
        </Link>
        {step !== "welcome" && (
          <Link href="/" className="flex size-10 items-center justify-center rounded-full hover:bg-neutral-100">
            <X className="size-5 text-neutral-500" />
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
            <div className="h-full bg-neutral-900 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="flex items-center justify-between px-6 py-4 sm:px-10">
            <Button variant="secondary" size="md" onClick={onBack}>Back</Button>
            <Button variant="primary" size="md" onClick={onNext} className="min-w-[160px]">{nextLabel ?? "Next"}</Button>
            {onSkip ? (
              <Button variant="secondary" size="md" onClick={onSkip}>Skip, I&apos;ll do it later</Button>
            ) : <div />}
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
            <p className="mb-3 text-sm font-semibold tracking-wide text-amber-600 uppercase">Seller</p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-neutral-900 lg:text-5xl">
              Welcome to
              <br />
              EcoGlobe
            </h1>
            <p className="mb-2 text-base text-neutral-500 leading-relaxed">
              Ecoglobe is a global platform connecting verified sellers and responsible buyers through transparent sustainability data and trusted trade workflows.
            </p>
            <p className="text-base text-neutral-500 leading-relaxed">
              Get started by choosing how you&apos;d like to use the platform.
            </p>
          </div>
          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl">
            <img src="/hero.jpg" alt="Industrial facility" className="h-[360px] w-full object-cover" />
          </div>
        </div>
      </div>
      <div className="flex justify-center px-6 pb-10">
        <Button variant="primary" size="lg" className="min-w-[200px]" onClick={onStart}>Start</Button>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 2: Business Info ─── */
function BusinessStep({ data, onChange, onBack, onNext }: {
  data: Record<string, string>; onChange: (k: string, v: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <OnboardingLayout step="business" currentStep={1} onBack={onBack} onNext={onNext}>
      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">Tell us about your business</h1>
          <p className="mb-8 text-base text-neutral-500">This information helps buyers understand who you are.</p>
          <div className="flex flex-col gap-6">
            <Input label="Company name" id="company" placeholder="Input field" value={data.company} onChange={(e) => onChange("company", e.target.value)} />
            <Input label="What industry are you working on?" id="industry" placeholder="Input field" value={data.industry} onChange={(e) => onChange("industry", e.target.value)} />
            <Input label="Address" id="address" placeholder="Input field" value={data.address} onChange={(e) => onChange("address", e.target.value)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">Website <span className="text-neutral-400">(optional)</span></label>
              <input type="text" placeholder="Input field" value={data.website} onChange={(e) => onChange("website", e.target.value)} className="w-full rounded-lg px-4 py-3 text-sm outline-none placeholder:text-neutral-400" style={{ border: "1px solid #E0E0E0" }} />
            </div>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 3: What Do You Sell ─── */
function ProductStep({ data, onChange, onBack, onNext }: {
  data: Record<string, string>; onChange: (k: string, v: string) => void;
  onBack: () => void; onNext: () => void;
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
    <OnboardingLayout step="product" currentStep={2} onBack={onBack} onNext={onNext}>
      <div className="flex flex-1 justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">What Do You Sell?</h1>
          <p className="mb-8 text-base text-neutral-500">You can add detailed product information later.</p>
          <div className="flex flex-col gap-6">
            <Select label="What type of feedstock are you generating?" id="feedstockType" options={feedstockTypes} value={data.feedstockType} onChange={(e) => onChange("feedstockType", e.target.value)} />
            <Input label="Could you tell us how this feedstock was generated?" id="generation" placeholder="Input field" value={data.generation} onChange={(e) => onChange("generation", e.target.value)} />
            <Select label="Any restrictions?" id="restrictions" options={restrictionOptions} value={data.restrictions} onChange={(e) => onChange("restrictions", e.target.value)} />
            <Input label="How much feedstock will you generate per year?" id="annualVolume" placeholder="Input field" value={data.annualVolume} onChange={(e) => onChange("annualVolume", e.target.value)} />
            <Input label="What are the specs of the feedstock" id="specs" placeholder="Input field" value={data.specs} onChange={(e) => onChange("specs", e.target.value)} />
            <Input label="Something else that we should know?" id="notes" placeholder="Input field" value={data.notes} onChange={(e) => onChange("notes", e.target.value)} />
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 4: Sustainability ─── */
function SustainabilityStep({ files, onFilesChange, onBack, onNext, onSkip }: {
  files: File[]; onFilesChange: (f: File[]) => void;
  onBack: () => void; onNext: () => void; onSkip: () => void;
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
    <OnboardingLayout step="sustainability" currentStep={3} onBack={onBack} onNext={onNext} onSkip={onSkip}>
      <div className="flex flex-1 justify-center px-6 py-10">
        <div className="w-full max-w-[600px]">
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">Sustainability Information</h1>
          <p className="mb-8 text-base text-neutral-500">Upload certifications and supporting documents to get verified and increase buyer trust.</p>

          <p className="mb-3 text-sm font-medium text-neutral-900">Upload</p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-neutral-50 py-10 transition-colors hover:bg-neutral-100"
            style={{ border: "2px dashed #D0D0D0" }}
          >
            <p className="text-sm text-neutral-700"><span className="font-semibold">Drop file here</span> or</p>
            <span className="rounded-full px-4 py-1.5 text-sm font-medium text-neutral-700" style={{ border: "1px solid #D0D0D0" }}>Browse</span>
            <p className="text-xs text-neutral-400">Accepts .gif, .jpg, and .png</p>
            <input ref={fileInputRef} type="file" multiple accept=".gif,.jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2">
                  <span className="text-sm text-neutral-700">{f.name}</span>
                  <button onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))} className="text-neutral-400 hover:text-red-500"><X className="size-4" /></button>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => fileInputRef.current?.click()} className="mt-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Plus className="size-4" /> Add More
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Step 5: Success ─── */
function SuccessStep() {
  return (
    <OnboardingLayout step="success" currentStep={4}>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex max-w-[500px] flex-col items-center text-center">
          <span className="mb-6 text-6xl">🎉</span>
          <h1 className="mb-3 text-3xl font-bold text-neutral-900">Your Seller Account Is Created</h1>
          <p className="mb-8 text-base text-neutral-500">You can now complete verification, manage products, and prepare your profile for buyers.</p>
          <div className="flex gap-4">
            <Link href="/seller/listings">
              <Button variant="secondary" size="lg">Go to Seller Dashboard</Button>
            </Link>
            <Link href="/seller/listings">
              <Button variant="primary" size="lg">Add Product</Button>
            </Link>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ─── Main Onboarding Component ─── */
export function SellerOnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [businessData, setBusinessData] = useState({ company: "", industry: "", address: "", website: "" });
  const [productData, setProductData] = useState({ feedstockType: "", generation: "", restrictions: "", annualVolume: "", specs: "", notes: "" });
  const [files, setFiles] = useState<File[]>([]);

  const updateBusiness = (k: string, v: string) => setBusinessData((p) => ({ ...p, [k]: v }));
  const updateProduct = (k: string, v: string) => setProductData((p) => ({ ...p, [k]: v }));

  switch (step) {
    case "welcome": return <WelcomeStep onStart={() => setStep("business")} />;
    case "business": return <BusinessStep data={businessData} onChange={updateBusiness} onBack={() => setStep("welcome")} onNext={() => setStep("product")} />;
    case "product": return <ProductStep data={productData} onChange={updateProduct} onBack={() => setStep("business")} onNext={() => setStep("sustainability")} />;
    case "sustainability": return <SustainabilityStep files={files} onFilesChange={setFiles} onBack={() => setStep("product")} onNext={() => setStep("success")} onSkip={() => setStep("success")} />;
    case "success": return <SuccessStep />;
  }
}
