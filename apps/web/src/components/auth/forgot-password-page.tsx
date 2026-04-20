"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

type Step = "email" | "code" | "new-password" | "success";

function LockIcon() {
  return <Image src="/icons/password-lock.svg" alt="" width={80} height={80} />;
}

function EnvelopeIcon() {
  return (
    <Image src="/icons/password-envelope.svg" alt="" width={80} height={80} />
  );
}

function PasswordValidation({ password }: { password: string }) {
  const rules = [
    { label: "At least one letter", test: /[a-z]/i.test(password) },
    { label: "At least one capital letter", test: /[A-Z]/.test(password) },
    { label: "At least one number", test: /[0-9]/.test(password) },
    { label: "At one special character", test: /[^a-zA-Z0-9]/.test(password) },
    { label: "At least 8 characters", test: password.length >= 8 },
  ];

  if (!password) return null;

  return (
    <ul className="flex flex-col gap-2 mt-2">
      {rules.map((rule) => (
        <li key={rule.label} className="flex items-center gap-2 text-sm">
          {rule.test ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-green-100">
              <svg
                className="size-3 text-green-600"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : (
            <span className="flex size-5 items-center justify-center rounded-full bg-red-100">
              <svg
                className="size-3 text-red-500"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M3 3L9 9M9 3L3 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          <span className={rule.test ? "text-neutral-700" : "text-neutral-500"}>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CodeInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (val: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newValue = [...value];
    newValue[index] = val.slice(-1);
    onChange(newValue);
    if (val && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-4 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="size-14 rounded-lg text-center text-lg font-medium text-neutral-900 outline-none transition-colors focus:ring-2 focus:ring-neutral-300"
          style={{ border: "1px solid #E0E0E0" }}
        />
      ))}
    </div>
  );
}

/* ─── Step 1: Email ─── */
function EmailStep({
  email,
  setEmail,
  onContinue,
}: {
  email: string;
  setEmail: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <LockIcon />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Password recovery
        </h1>
        <p className="text-base text-neutral-500">
          Enter email address or username associated with
          <br />
          your EcoGlobe account
        </p>
      </div>

      <div className="w-full text-left">
        <Input
          label="Email Address"
          id="email"
          type="email"

          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!email.trim()}
        style={
          !email.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined
        }
        onClick={onContinue}
      >
        Continue
      </Button>

      <p className="text-base text-neutral-900">
        Remember your password?{" "}
        <Link href="/login" className="font-bold underline">
          Back to Login
        </Link>
      </p>
    </div>
  );
}

/* ─── Step 2: Code ─── */
function CodeStep({
  email,
  onSubmit,
}: {
  email: string;
  onSubmit: () => void;
}) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = () => {
    setCountdown(30);
    setCanResend(false);
  };

  const isFilled = code.every((d) => d !== "");

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <EnvelopeIcon />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Enter the code
        </h1>
        <p className="text-base text-neutral-500">
          Enter the code we sent to your email at
          <br />
          <span className="font-semibold text-neutral-900">{email}</span>
        </p>
      </div>

      <CodeInput value={code} onChange={setCode} />

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!isFilled}
        style={!isFilled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
        onClick={onSubmit}
      >
        Submit
      </Button>

      <p className="text-base text-neutral-500">
        Didn&apos;t received it?{" "}
        {canResend ? (
          <button
            onClick={handleResend}
            className="font-bold text-neutral-900 underline"
          >
            Resend Code
          </button>
        ) : (
          <span>resend in... {countdown}s</span>
        )}
      </p>
    </div>
  );
}

/* ─── Step 3: New Password ─── */
function NewPasswordStep({ onConfirm }: { onConfirm: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const allRulesPass =
    /[a-z]/i.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password) &&
    password.length >= 8;

  const isValid = allRulesPass && password === confirmPassword && confirmPassword !== "";

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <LockIcon />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          New Password
        </h1>
        <p className="text-base text-neutral-500">Set up your new password</p>
      </div>

      <div className="flex w-full flex-col gap-5 text-left">
        <div>
          <Input
            label={password ? "Password" : "New password"}
            id="newPassword"
            type="password"

            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordValidation password={password} />
        </div>
        <Input
          label="Re-type new password"
          id="confirmNewPassword"
          type="password"

          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!isValid}
        style={!isValid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
        onClick={onConfirm}
      >
        Confirm
      </Button>
    </div>
  );
}

/* ─── Step 4: Success ─── */
function SuccessStep() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Lock icon with checkmark overlay */}
      <div className="relative">
        <LockIcon />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Password updated
        </h1>
        <p className="text-base text-neutral-500">
          Your password has been changed successfully
        </p>
      </div>

      <Link href="/login">
        <Button variant="primary" size="lg" className="px-16">
          Let&apos;s Go
        </Button>
      </Link>
    </div>
  );
}

/* ─── Main Component ─── */
export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");

  return (
    <AuthLayout showImage={false} cardWidth="max-w-[500px]">
      {step === "email" && (
        <EmailStep
          email={email}
          setEmail={setEmail}
          onContinue={() => setStep("code")}
        />
      )}
      {step === "code" && (
        <CodeStep email={email} onSubmit={() => setStep("new-password")} />
      )}
      {step === "new-password" && (
        <NewPasswordStep onConfirm={() => setStep("success")} />
      )}
      {step === "success" && <SuccessStep />}
    </AuthLayout>
  );
}
