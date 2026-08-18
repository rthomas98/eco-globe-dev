"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BackendApiError,
  requestBackendPasswordReset,
} from "@/lib/backend-auth";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

function LockIcon() {
  return <Image src="/icons/password-lock.svg" alt="" width={80} height={80} />;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      await requestBackendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof BackendApiError
          ? err.message
          : "Unable to request a password reset. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout showImage={false} cardWidth="max-w-[500px]">
      {sent ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <LockIcon />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
              Check your inbox
            </h1>
            <p className="text-base text-neutral-500">
              If an account exists for{" "}
              <span className="font-semibold text-neutral-900">{email}</span>,
              we sent a password reset link. The link expires in 30 minutes.
            </p>
          </div>
          <Link href="/login" className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 text-center">
          <LockIcon />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-[32px] font-bold leading-10 text-neutral-900">
              Password recovery
            </h1>
            <p className="text-base text-neutral-500">
              Enter the email address associated with your EcoGlobe account.
            </p>
          </div>
          <div className="w-full text-left">
            <Input
              label="Email Address"
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {error && (
            <p className="w-full text-left text-sm text-red-700">{error}</p>
          )}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!email.trim() || loading}
            style={
              !email.trim() || loading
                ? { opacity: 0.4, cursor: "not-allowed" }
                : undefined
            }
            onClick={handleSubmit}
          >
            {loading ? "Sending…" : "Continue"}
          </Button>
          <p className="text-base text-neutral-900">
            Remember your password?{" "}
            <Link href="/login" className="font-bold underline">
              Back to Login
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
