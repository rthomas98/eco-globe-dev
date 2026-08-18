"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";
import { BackendApiError, registerBackendUser } from "@/lib/backend-auth";

type Role = "buyer" | "seller" | "both" | null;

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

export function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  const isFormValid =
    role !== null &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    password === confirmPassword;

  const handleCreateAccount = async () => {
    if (!isFormValid || !role || status === "loading") return;
    if (!role) return;
    const name = `${firstName} ${lastName}`.trim();
    const accountStatusCode =
      role === "seller"
        ? "subscribed_seller"
        : role === "buyer"
          ? "subscribed_buyer"
          : "subscribed_buyer";

    setStatus("loading");
    setError("");

    try {
      await registerBackendUser({
        name,
        email,
        password,
        accountStatusCode,
      });
      router.push(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
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
    role === "buyer"
      ? "Create Buyer Account"
      : role === "seller"
        ? "Create Seller Account"
        : role === "both"
          ? "Create Buyer & Seller Account"
          : "Create Account";

  return (
    <AuthLayout cardWidth="max-w-[960px]">
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
          Create Account
        </h1>

        {/* Role toggle */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={`rounded-lg py-3.5 text-center text-base text-neutral-900 transition-colors ${
                role === "buyer"
                  ? "bg-neutral-100"
                  : "bg-white hover:bg-neutral-50"
              }`}
              style={{ border: "1px solid #E0E0E0" }}
            >
              I am a <span className="font-bold">Buyer</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`rounded-lg py-3.5 text-center text-base text-neutral-900 transition-colors ${
                role === "seller"
                  ? "bg-neutral-100"
                  : "bg-white hover:bg-neutral-50"
              }`}
              style={{ border: "1px solid #E0E0E0" }}
            >
              I am a <span className="font-bold">Seller</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRole("both")}
            className={`rounded-lg py-3.5 text-center text-base text-neutral-900 transition-colors ${
              role === "both"
                ? "bg-neutral-100"
                : "bg-white hover:bg-neutral-50"
            }`}
            style={{ border: "1px solid #E0E0E0" }}
          >
            I am <span className="font-bold">both — Buyer &amp; Seller</span>
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
