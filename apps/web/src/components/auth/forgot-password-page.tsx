"use client";

import Link from "next/link";
import { Button, Input } from "@eco-globe/ui";
import { AuthLayout } from "./auth-layout";

export function ForgotPasswordPage() {
  return (
    <AuthLayout showImage={false} cardWidth="max-w-[500px]">
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Lock icon */}
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-50">
          <svg
            className="size-8 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-[32px] font-bold leading-10 text-neutral-900">
            Forgot password?
          </h1>
          <p className="text-base text-neutral-700">
            Enter your email address and we&apos;ll send you instructions to
            reset your password.
          </p>
        </div>

        <div className="w-full text-left">
          <Input
            label="Email Address"
            id="email"
            type="email"
            placeholder="Enter your email"
          />
        </div>

        <Button variant="primary" size="lg" className="w-full">
          Send reset link
        </Button>

        <Link
          href="/login"
          className="text-base font-medium text-neutral-900 underline"
        >
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
}
