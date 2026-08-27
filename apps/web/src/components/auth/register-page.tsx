"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, Select } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";
import {
  BackendApiError,
  registerBackendUser,
  writeBackendLoginSession,
  type RegistrationIntent,
} from "@/lib/backend-auth";
import type { UserRole } from "@/lib/demo-user";

const COUNTRY_OPTIONS = [
  { value: "", label: "-- Choose a country --" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "MX", label: "Mexico" },
  { value: "BR", label: "Brazil" },
  { value: "GB", label: "United Kingdom" },
  { value: "NL", label: "Netherlands" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
  { value: "AU", label: "Australia" },
];

function PasswordInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-medium text-neutral-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg bg-white px-4 py-3 pr-11 text-base text-neutral-900 outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-neutral-900/20"
          style={{ border: "1px solid #E0E0E0" }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
        >
          {show ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
        </button>
      </div>
    </div>
  );
}

const INTENT_DESTINATIONS: Record<RegistrationIntent, string> = {
  buy: "/buyer/onboarding",
  sell: "/seller/onboarding",
  both: "/seller/onboarding",
  explore: "/welcome",
};

function fallbackRolesForIntent(intent: RegistrationIntent): UserRole[] {
  if (intent === "buy") return ["buyer"];
  if (intent === "sell") return ["seller"];
  if (intent === "both") return ["buyer", "seller"];
  return [];
}

export function RegisterPage() {
  const router = useRouter();
  const [intent, setIntent] = useState<RegistrationIntent | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  const companyRequired = intent !== null && intent !== "explore";
  const isFormValid =
    intent !== null &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    (!companyRequired || companyName.trim()) &&
    country &&
    password.trim() &&
    confirmPassword.trim() &&
    password === confirmPassword &&
    termsAccepted;

  const handleCreateAccount = async () => {
    if (!isFormValid || !intent || status === "loading") return;
    const name = `${firstName} ${lastName}`.trim();

    setStatus("loading");
    setError("");

    try {
      const registration = await registerBackendUser({
        name,
        email,
        password,
        companyName: companyName.trim() || undefined,
        country,
        intent,
        termsAccepted,
      });

      if (registration.verificationRequired) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
        return;
      }

      // Email verification is disabled in this environment — sign the new
      // account in and continue straight to the role's onboarding journey.
      await writeBackendLoginSession({
        email,
        password,
        fallbackRoles: fallbackRolesForIntent(intent),
      });
      // A join request against an existing company waits for the Company
      // Owner's approval — the welcome page shows that pending state.
      router.push(
        registration.companyMembership === "join_requested"
          ? "/welcome"
          : INTENT_DESTINATIONS[intent],
      );
      return;
    } catch (err) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to create this account. Please check the backend is running and try again.",
      );
    }
    setStatus("idle");
  };

  const buttonLabel =
    intent === "buy"
      ? "Create Buyer Account"
      : intent === "sell"
        ? "Create Seller Account"
        : intent === "both"
          ? "Create Buyer & Seller Account"
          : intent === "explore"
            ? "Create Explorer Account"
            : "Create Account";

  const intentButtonClass = (value: RegistrationIntent) =>
    `rounded-lg py-3.5 text-center text-base text-neutral-900 transition-colors ${
      intent === value ? "bg-neutral-100" : "bg-white hover:bg-neutral-50"
    }`;

  return (
    <AuthLayout cardWidth="max-w-[960px]">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
            Create Account
          </h1>
          <p className="mt-2 text-base text-neutral-500">
            Choose how you want to use EcoGlobe. You can add more detail later —
            we only ask for what each step needs.
          </p>
        </div>

        {/* Intent selection */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIntent("buy")}
              className={intentButtonClass("buy")}
              style={{ border: "1px solid #E0E0E0" }}
            >
              I want to <span className="font-bold">Buy</span>
            </button>
            <button
              type="button"
              onClick={() => setIntent("sell")}
              className={intentButtonClass("sell")}
              style={{ border: "1px solid #E0E0E0" }}
            >
              I want to <span className="font-bold">Sell</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIntent("both")}
              className={intentButtonClass("both")}
              style={{ border: "1px solid #E0E0E0" }}
            >
              I want to <span className="font-bold">Buy &amp; Sell</span>
            </button>
            <button
              type="button"
              onClick={() => setIntent("explore")}
              className={intentButtonClass("explore")}
              style={{ border: "1px solid #E0E0E0" }}
            >
              I&apos;m just <span className="font-bold">Exploring</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="First Name"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input
            label="Work email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label={
                intent === "explore"
                  ? "Company name (optional while exploring)"
                  : "Company name"
              }
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Select
              label="Country"
              id="country"
              options={COUNTRY_OPTIONS}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
          />
          <PasswordInput
            id="confirmPassword"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <label className="flex items-start gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 size-4 accent-neutral-900"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-semibold underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isFormValid || status === "loading"}
          style={
            !isFormValid || status === "loading"
              ? { opacity: 0.4, cursor: "not-allowed" }
              : undefined
          }
          onClick={() => void handleCreateAccount()}
        >
          {status === "loading" ? "Creating account..." : buttonLabel}
        </Button>

        <p className="text-base text-neutral-900">
          Already have an account?{" "}
          <Link href="/login" className="font-bold underline">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
