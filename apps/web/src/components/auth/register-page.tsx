"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";
import { buildDemoUser, writeDemoUser } from "@/lib/demo-user";

type Role = "buyer" | "seller" | null;
type Step = "form" | "verify";

function PasswordInput({ id, label, value, onChange }: {
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

function VerifyEmailStep({ email, onVerified, onResend }: {
  email: string;
  onVerified: () => void;
  onResend: () => void;
}) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(23);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 3) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handleResend = () => {
    onResend();
    setSecondsLeft(23);
  };

  const isComplete = code.every((c) => c !== "");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/">
          <Image src="/logo.svg" alt="EcoGlobe" width={110} height={32} className="invert" priority />
        </Link>
        <Link
          href="/"
          aria-label="Close"
          className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
        >
          <X className="size-5" />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex w-full max-w-[500px] flex-col items-center text-center">
          <div className="mb-8 text-5xl">✉️</div>
          <h1 className="mb-3 text-3xl font-bold text-neutral-900 sm:text-4xl">
            Enter the code
          </h1>
          <p className="mb-8 text-base text-neutral-700">
            Enter the code we sent to your phone number at{" "}
            <span className="font-bold">{email || "example@mail.com"}</span>
          </p>

          <div className="mb-8 flex gap-3">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="size-16 rounded-lg bg-white text-center text-2xl font-medium text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/20"
                style={{ border: "1px solid #E0E0E0" }}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            className="mb-6 w-full max-w-[400px]"
            disabled={!isComplete}
            style={!isComplete ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            onClick={onVerified}
          >
            Submit
          </Button>

          <p className="text-base text-neutral-700">
            Didn&apos;t received it?{" "}
            {secondsLeft > 0 ? (
              <span className="text-neutral-700">resend in… {secondsLeft}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Resend Code
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [role, setRole] = useState<Role>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isFormValid =
    role !== null &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    password === confirmPassword;

  const handleCreateAccount = () => {
    if (!isFormValid) return;
    setStep("verify");
  };

  const handleVerified = () => {
    if (!role) return;
    writeDemoUser(
      buildDemoUser(role, { email, name: `${firstName} ${lastName}`.trim() }),
    );
    router.push(role === "seller" ? "/seller/onboarding" : "/buyer/onboarding");
  };

  if (step === "verify") {
    return (
      <VerifyEmailStep
        email={email}
        onVerified={handleVerified}
        onResend={() => {
          // Demo: pretend we resent
        }}
      />
    );
  }

  const buttonLabel = role === "buyer"
    ? "Create Buyer Account"
    : role === "seller"
      ? "Create Seller Account"
      : "Create Account";

  return (
    <AuthLayout cardWidth="max-w-[960px]">
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Create Account
        </h1>

        {/* Role toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className={`rounded-lg py-3.5 text-center text-base text-neutral-900 transition-colors ${
              role === "buyer" ? "bg-neutral-100" : "bg-white hover:bg-neutral-50"
            }`}
            style={{ border: "1px solid #E0E0E0" }}
          >
            I am a <span className="font-bold">Buyer</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("seller")}
            className={`rounded-lg py-3.5 text-center text-base text-neutral-900 transition-colors ${
              role === "seller" ? "bg-neutral-100" : "bg-white hover:bg-neutral-50"
            }`}
            style={{ border: "1px solid #E0E0E0" }}
          >
            I am a <span className="font-bold">Seller</span>
          </button>
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
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isFormValid}
          style={!isFormValid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          onClick={handleCreateAccount}
        >
          {buttonLabel}
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
